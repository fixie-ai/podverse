/** @jsxImportSource ai-jsx/react */
// import * as AI from 'ai-jsx/react'
import * as AI from 'ai-jsx/experimental/next'
import { toTextStream } from 'ai-jsx/stream'
import {
  Corpus,
  DefaultFormatter,
  DocsQAProps,
  // FixieCorpus,
  ScoredChunk
} from 'ai-jsx/batteries/docs'
import { LogImplementation } from 'ai-jsx/core/log'
import { UseToolsProps, Tool } from 'ai-jsx/batteries/use-tools'
import { OpenAI } from 'ai-jsx/lib/openai'
import {
  UserMessage,
  SystemMessage,
  ChatCompletion,
  FunctionCall,
  FunctionResponse
} from 'ai-jsx/core/completion'
import { NextRequest } from 'next/server'
import { Jsonifiable } from 'type-fest'
import { StreamingTextResponse } from 'ai'
import z from 'zod'
import { kv } from '@vercel/kv'
import { Episode, Podcast } from 'podverse-types'

import { JsonObject } from 'type-fest'

type MustBeJsonObject<T> = T extends JsonObject ? T : never
type PodcastMetadata = MustBeJsonObject<{ source: string }>

async function* UseToolsFunctionCall(
  props: Omit<UseToolsProps, 'fallback'> & { children?: AI.Element<any>[] },
  { render }: AI.RenderContext
) {
  // yield ''
  yield AI.AppendOnlyStream
  let lastLen = 0
  // TODO:
  // 1. streaming
  // 2. UI affordance for function call and retrieval
  const messages: AI.Element<any>[] =
    props.children == undefined
      ? [
          // eslint-disable-next-line react/jsx-key
          <SystemMessage>
            You are a smart agent that may use functions to answer a user
            question.
          </SystemMessage>
        ]
      : props.children
  // if (props.fallback) {
  //   messages.push(
  //     <SystemMessage>
  //       Here{"'"}s the fallback strategy/message if something failed:{' '}
  //       {props.fallback}
  //     </SystemMessage>
  //   )
  // }
  messages.push(<UserMessage>{props.query}</UserMessage>)

  do {
    const modelResponse = (
      <ChatCompletion functionDefinitions={props.tools}>
        {messages}
      </ChatCompletion>
    )

    console.log('starting yield* render')
    const renderResult = render(modelResponse, {
      stop: el => el.tag == FunctionCall
    })[Symbol.asyncIterator]()
    console.log('ended yield* render')

    const stringResponses: String[] = []
    let functionCallElement: AI.Element<any> | null = null

    // for await (const element of renderResult) {
    while (true) {
      const next = await renderResult.next()
      const element = next.value
      if (typeof element === 'string') {
        // Model has generated a string response. Record it.
        // yield stringResponses.join('')
        yield element.substring(lastLen)
        stringResponses.push(element.substring(lastLen))
        lastLen = element.length
        // console.log('yielding', element)
        // console.log("responding with '" + stringResponses.join('') + "'")
      } else if (AI.isElement(element[0])) {
        // Model has generated a function call.
        if (functionCallElement) {
          throw new Error(
            `ChatCompletion returned 2 function calls at the same time `
          )
        }
        functionCallElement = element[0]
        // @ts-ignore
      } else {
        // if ( element[0]  )
        // throw new Error(`Unexpected result from render ${next.value}`)
      }
      if (next.done) {
        break
      }
    }

    if (functionCallElement) {
      messages.push(functionCallElement)
      const msg = `\n\n_... consulting the database ..._\n\n`
      yield msg
      stringResponses.push(msg)
      // yield functionCallElement
      // Call the selected function and append the result to the messages.
      console.log("Calling function '" + functionCallElement.props.name + "'")
      let response
      try {
        const callable = props.tools[functionCallElement.props.name].func
        response = await callable(functionCallElement.props.args)
        console.log("Got response '" + response + "'")
      } catch (e: any) {
        console.log("Got error '" + e.message + "'")
        response = `Function called failed with error: ${e.message}.`
      } finally {
        const functionResponse = (
          <FunctionResponse name={functionCallElement.props.name}>
            {response}
          </FunctionResponse>
        )
        // yield functionResponse
        messages.push(functionResponse)
      }
    } else {
      // console.log('returning final response')
      // return stringResponses.join('')
      return AI.AppendOnlyStream
      // Model did not generate any function call. Return the string responses.
      // return stringResponses.join('')
      // return AI.AppendOnlyStream
    }
  } while (true)
}

export class FixieCorpus<ChunkMetadata extends Jsonifiable = Jsonifiable>
  implements Corpus<ChunkMetadata>
{
  private static readonly DEFAULT_FIXIE_API_URL = 'https://app.fixie.ai/api'

  private readonly fixieApiUrl: string

  constructor(
    private readonly corpusId: string,
    private readonly fixieApiKey?: string
  ) {
    if (!fixieApiKey) {
      this.fixieApiKey = process.env['FIXIE_API_KEY']
      if (!this.fixieApiKey) {
        throw new Error(
          'You must provide a Fixie API key to access Fixie corpora. Find yours at https://app.fixie.ai/profile.'
        )
      }
    }
    this.fixieApiUrl =
      process.env['FIXIE_API_URL'] ?? FixieCorpus.DEFAULT_FIXIE_API_URL
  }

  async search(
    query: string,
    params?: { limit?: number; metadata_filter?: any }
  ): Promise<ScoredChunk<ChunkMetadata>[]> {
    console.log('Hey there!')
    const response = await fetch(
      `${this.fixieApiUrl}/corpora/${this.corpusId}:query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.fixieApiKey}`
        },
        body: JSON.stringify({
          query_string: query,
          chunk_limit: params?.limit,
          metadata_filter: params?.metadata_filter
        })
      }
    )
    if (response.status !== 200) {
      throw new Error(
        `Fixie API returned status ${response.status}: ${await response.text()}`
      )
    }
    const apiResults = await response.json()
    return apiResults.chunks.map((result: any) => ({
      chunk: {
        content: result.content,
        metadata: result.metadata,
        documentName: result.document_name
      },
      score: result.score
    }))
  }
}

const ChunkFormatter = ({ doc }: { doc: ScoredChunk<PodcastMetadata> }) => (
  <>
    {`\n\`\`\`transcript source="${doc.chunk.metadata?.source}" \n`}
    {doc.chunk.content}
    {'\n```\n'}
  </>
)

async function PodcastDocsQA(
  props: {
    corpus: FixieCorpus
    question: string
    podcastSlug: string
    chunkLimit?: number
  },
  { render }: AI.ComponentContext
) {
  // let chunks: ScoredChunk<PodcastMetadata>[]
  // try {
  //   chunks = (await props.corpus.search(props.question, {
  //     limit: props.chunkLimit ?? 6,
  //     metadata_filter: { chunk_size: 1000 }
  //   })) as ScoredChunk<PodcastMetadata>[]
  // } catch (e: any) {
  //   return <>Sorry there was an error. {e.message}</>
  // }

  const chunkFormatter = ChunkFormatter

  const podcastData = (
    await kv.json.get(`podcasts:${props.podcastSlug}`, '$')
  )[0] as Podcast

  const numEpisodes = podcastData.episodes?.length ?? 0
  const maxEpisodesToList = 20

  function episodeByNumber(episodeNumber: number): Episode | undefined {
    if (episodeNumber < 1 || episodeNumber > numEpisodes) {
      return undefined
    }
    return podcastData.episodes?.[numEpisodes - episodeNumber]
  }

  const tools: Record<string, Tool> = {
    retrieve_related_transcripts: {
      description:
        'Retrieves related transcripts from podcast. Can optionally take an episode number, which will be used to filter the results.',
      parameters: z.object({
        query: z.string(),
        filter_episode: z.number().optional()
      }),
      func: async ({
        query,
        filter_episode
      }: {
        query: string
        filter_episode?: number
      }) => {
        console.log(
          `Retrieving related transcripts for query: ${query} and episode: ${filter_episode}`
        )
        if (filter_episode) {
          // console.log('url', episodeByNumber(filter_episode)?.url)
          console.log('episode', episodeByNumber(filter_episode))
        }
        const chunks = (await props.corpus.search(query, {
          limit: props.chunkLimit ?? 6,
          metadata_filter: {
            chunk_size: 1000,
            source: filter_episode
              ? episodeByNumber(filter_episode)?.audioUrl
              : undefined
          }
        })) as ScoredChunk<PodcastMetadata>[]

        return (
          await Promise.all(
            chunks
              .reverse()
              .map(chunk => render(chunkFormatter({ doc: chunk })))
          )
        ).join('')
      }
    },
    get_episode_list: {
      description: `Returns a list of episodes with their basic information. If there are too many episodes, only the latest ${maxEpisodesToList} will be listed.`,
      parameters: z.object({}),
      func: () => {
        // TODO: does index correspond to episode number?
        if (!podcastData.episodes) {
          return 'No episodes found.'
        }
        const episodeList = podcastData.episodes
          ?.slice(0, maxEpisodesToList)
          .map(
            episode =>
              `[${episode.title}](${episode.url}): ${episode.description}`
          )
          .join('\n')
        return episodeList + (numEpisodes > maxEpisodesToList ? '\n...' : '')
      }
    }
    // episode_info: {
    //   description: 'Returns information about a specific episode.',
    //   parameters: z.object({ episode: z.number() }),
    //   func: ({ episode }: { episode: number }) => {
    //     const episodeData = episodeByNumber(episode)
    //     if (!episodeData) {
    //       return `Episode ${episode} does not exist.`
    //     }
    //     return `Episode ${episode}: [${episodeData.title}](${episodeData.url})`
    //   }
    // }
  }

  return (
    <>
      <OpenAI chatModel="gpt-4">
        {/* <OpenAI chatModel="gpt-3.5-turbo-16k"> */}
        <UseToolsFunctionCall
          query={`User's question about the podcast: ${props.question}`}
          tools={tools}
        >
          <SystemMessage>
            You are a helpful chatbot that answers questions about the podcast *
            {podcastData.title}* by looking at its transcript. Whenever you need
            it, you can retrieve a set of documents that are related to a query
            using retrieve_related_transcripts function. You must answer the
            user question only based on what the retrieved documents say.
            {/* The transcripts are relevant pieces from the podcast transcript. */}
          </SystemMessage>
          <SystemMessage>
            Do not use any other knowledge you have about the world. If you{' '}
            {"don't"} know how to answer the question, just say
            {` "I don't think the podcast covered this subject."`}.{'\n'}
            {'\n'}
            {/* If any sources are particularly relevant, make sure to cite
            them by using a Markdown link format, at the end of your
            response.{'\n'} */}
            You may suggest follow up questions to the user, if you know the
            answer to them.
            {'\n'}Whenever in doubt use the retrieve_related_transcripts
            function to retrieve more transcripts. If you need info on a
            specific episode, if you know the episode number, you can use
            retrieve_related_transcripts with the episode number as a parameter.
          </SystemMessage>
          <SystemMessage>
            You ALWAYS include a link to the wikipidia page of well known
            People, Places, Technologies, or Events. Even if that is not
            mentioned in the transcript. If you know the link to the entity{"'"}
            s wikipedia page, you get extra points for including the link in
            markdown format. For example, if you are to mention React, you MUST
            write it as{' '}
            {`"[React](https://en.wikipedia.org/wiki/React_(software))"`}
          </SystemMessage>
          <SystemMessage>
            The user question about the podcast follows below. You can assume
            that the user question is always about the podcast, and not a
            personal question from you. As such, if you are unsure about the
            answer, use the retrieve_related_transcripts function to retrieve
            more transcripts before answering.
          </SystemMessage>
        </UseToolsFunctionCall>
        {/* <UserMessage>{props.question}</UserMessage> */}
      </OpenAI>
      {/* {'<table><tr>'}
      {chunks.map(
        async (doc, idx) =>
          `\n<td key={${idx}}><details><summary>Doc #${idx}</summary>Source: ${doc.chunk.metadata?.source}<br/><br/>${doc.chunk.content}</details></td>`
      )}
      {'</tr></table>'} */}
    </>
  )
}

async function DocsAgent({
  question,
  podcastSlug,
  corpusId
}: {
  question: string
  podcastSlug: string
  corpusId: string
}) {
  const corpus = new FixieCorpus(corpusId)
  return (
    <PodcastDocsQA
      question={question}
      corpus={corpus}
      podcastSlug={podcastSlug}
    />
  )
}

/**
 * Converts a {@link Renderable} to a {@link ReadableStream} that will stream the rendered
 * content as an append-only UTF-8 encoded text stream. Compared to {@link toStreamResponse},
 * this allows the response to be easily consumed by other frameworks (such as https://sdk.vercel.ai/)
 * but does not support UI components or concurrently streaming multiple parts of the tree.
 */
// export function toTextStream(
//   renderable: AI.Renderable,
//   logger?: LogImplementation
// ): ReadableStream<Uint8Array> {
//   let previousValue = ''
//   const generator = AI.createRenderContext({ logger })
//     .render(renderable, { appendOnly: true })
//     [Symbol.asyncIterator]()
//   return new ReadableStream({
//     async pull(controller) {
//       const next = await generator.next()
//       console.log('next', next)
//       const delta = next.value.slice(previousValue.length)
//       controller.enqueue(delta)
//       previousValue = next.value

//       if (next.done) {
//         controller.close()
//       }
//     }
//   }).pipeThrough(new TextEncoderStream())
// }

export async function POST(request: NextRequest) {
  const json = await request.json()
  const question = json.messages[json.messages.length - 1]
  // const corpusId = json.corpusId
  const corpusId = '3'

  // @ts-ignore
  if (corpusId == null || corpusId == '') {
    return new StreamingTextResponse(
      toTextStream(
        <div>
          Sorry there was an error. Corpus ID is missing from the request.
        </div>
      )
    )
  }

  return new StreamingTextResponse(
    toTextStream(
      <DocsAgent
        question={question.content}
        corpusId={corpusId}
        podcastSlug={json.podcastSlug}
      />
    )
  )
}
