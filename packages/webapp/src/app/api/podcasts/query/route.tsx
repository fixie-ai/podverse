/** @jsxImportSource ai-jsx/react */
// import * as AI from 'ai-jsx/react'
import * as AI from 'ai-jsx/experimental/next'
import { toTextStream } from 'ai-jsx/stream'
import {
  Corpus,
  DefaultFormatter,
  DocsQAProps,
  FixieCorpus,
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

const ChunkFormatter = ({ doc }: { doc: ScoredChunk<PodcastMetadata> }) => (
  <>
    {/* Title: {doc.chunk.documentName ?? 'Untitled'} */}
    Source: {doc.chunk.metadata?.source}
    {'\n'}
    Content: {doc.chunk.content}
  </>
)

import { JsonObject } from 'type-fest'

type MustBeJsonObject<T> = T extends JsonObject ? T : never
type PodcastMetadata = MustBeJsonObject<{ source: string }>

async function PodcastDocsQA(props: DocsQAProps<PodcastMetadata>) {
  const chunks = await props.corpus.search(props.question, {
    limit: props.chunkLimit ?? 2
  })

  const chunkFormatter = ChunkFormatter

  /**
   * TODO: Implement the following:
   * persona
   * understand that the user can't see the document
   * improve saliency of response
   * work with multiple documents?
   * suggest follow up questions -> UI affordance
   */

  return (
    <>
      <OpenAI chatModel="gpt-4">
        <ChatCompletion>
          <SystemMessage>
            Here is a passage of text. I would like you to rewrite this text
            with Markdown links to Wikipedia articles about people, places,
            things, or events mentioned in the text. For example, if there is a
            mention of China, you could replace the text with{' '}
            {`“[China](https://en.wikipedia.org/wiki/China)“`}. Only return the
            rewritten text, without any explanation. Do not include{' '}
            {'"Passage:"'} in the response.
          </SystemMessage>
          <UserMessage>
            Passage:{'\n'}
            {/* <OpenAI chatModel="gpt-3.5-turbo-16k-0613"> */}
            <OpenAI chatModel="gpt-4">
              <ChatCompletion>
                <SystemMessage>
                  You are a helpful podcast chatbot and a trained question
                  answerer. The user asks you a question about the podcast and
                  you should answer the question truthfully, using only
                  documents below that you retrieved from your internal memory.
                  The documents are relevant pieces from the podcast transcript.
                  Do not use any other knowledge you have about the world. If
                  you {"don't"} know how to answer the question, just say
                  {` "I don't know."`}.{'\n'}
                  Note that the user cannot see the contents of the memory
                  items. Also note that if an information is not present, it
                  might be because your memory is incomplete.
                  {'\n'}
                  If any sources are particularly relevant, make sure to cite
                  them by using a Markdown link format, at the end of your
                  response.{'\n'}
                  If you find interesting follow up questions that the user can
                  ask, you can include them at the very end of your response.
                  {'\n'}
                  Here are the relevant pieces of memory you have retrieved:
                  {'\n```memory-pieces\n'}
                  {chunks.map(chunk => chunkFormatter({ doc: chunk }))}
                  {'\n```\n'}
                  And here is the question you must answer:
                </SystemMessage>
                <UserMessage>{props.question}</UserMessage>
              </ChatCompletion>
            </OpenAI>
          </UserMessage>
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
  const corpus = new FixieCorpus(corpusId) as Corpus<PodcastMetadata>
  return <PodcastDocsQA question={question} corpus={corpus} />
}

export async function POST(request: NextRequest) {
  const json = await request.json()
  const question = json.messages[json.messages.length - 1]
  const corpusId = 'corpusId' in json ? json.corpusId : '1095'

  return new StreamingTextResponse(
    toTextStream(<DocsAgent question={question.content} corpusId={corpusId} />)
  )
}
