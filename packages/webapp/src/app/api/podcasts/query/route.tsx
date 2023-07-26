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
import { OpenAI } from 'ai-jsx/lib/openai'
import {
  UserMessage,
  SystemMessage,
  ChatCompletion
} from 'ai-jsx/core/completion'
import { NextRequest } from 'next/server'
import { Jsonifiable } from 'type-fest'
import { StreamingTextResponse } from 'ai'

import { JsonObject } from 'type-fest'

type MustBeJsonObject<T> = T extends JsonObject ? T : never
type PodcastMetadata = MustBeJsonObject<{ source: string }>

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

async function PodcastDocsQA(props: {
  corpus: FixieCorpus
  question: string
  chunkLimit?: number
}) {
  let chunks: ScoredChunk<PodcastMetadata>[]
  try {
    chunks = (await props.corpus.search(props.question, {
      limit: props.chunkLimit ?? 6,
      metadata_filter: { chunk_size: 1000 }
    })) as ScoredChunk<PodcastMetadata>[]
  } catch (e: any) {
    return <>Sorry there was an error. {e.message}</>
  }

  const chunkFormatter = ChunkFormatter

  return (
    <>
      <OpenAI chatModel="gpt-4">
        {/* <OpenAI chatModel="gpt-3.5-turbo-16k"> */}
        <ChatCompletion>
          <SystemMessage>
            You are a helpful chatbot that answers questions about a podcast
            episode by looking at its transcript. You have managed to find the
            transcripts below that might or might not be relevant to the
            question. You must answer the user question only based on what the
            retrieved documents say.
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
            Here are the relevant transcript texts:
            {/* {'\n```txt filename="transcripts.txt"\n'} */}
            {'\n'}
            ------
            {chunks.reverse().map(chunk => chunkFormatter({ doc: chunk }))}
            ------
            {/* TODO: closest on the bottom */}
            {'\n'}
            {/* {'\n```\n'} */}
            The user question follows below.
          </SystemMessage>
          <UserMessage>{props.question}</UserMessage>
        </ChatCompletion>
      </OpenAI>
      {'<table><tr>'}
      {chunks.map(
        async (doc, idx) =>
          `\n<td key={${idx}}><details><summary>Doc #${idx}</summary>Source: ${doc.chunk.metadata?.source}<br/><br/>${doc.chunk.content}</details></td>`
      )}
      {'</tr></table>'}
    </>
  )
}

async function DocsAgent({
  question,
  corpusId
}: {
  question: string
  corpusId: string
}) {
  const corpus = new FixieCorpus(corpusId)
  return <PodcastDocsQA question={question} corpus={corpus} />
}

export async function POST(request: NextRequest) {
  const json = await request.json()
  const question = json.messages[json.messages.length - 1]
  // const corpusId = json.corpusId
  const corpusId = '3'

  // @ts-ignore
  if (corpusId == null || corpusId == '') {
    toTextStream(
      <div>
        Sorry there was an error. Corpus ID is missing from the request.
      </div>
    )
  }

  return new StreamingTextResponse(
    toTextStream(<DocsAgent question={question.content} corpusId={corpusId} />)
  )
}
