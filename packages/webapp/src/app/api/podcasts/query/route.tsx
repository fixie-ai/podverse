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
  try {
    const chunks = await props.corpus.search(props.question, {
      limit: props.chunkLimit ?? 2
    })
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
            episode by looking at its transcript. The relevant parts of the
            transcript is given to you below, and you are to answer the user
            question only based on what has been said in the podcast.
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
            {'\n```txt filename="transcripts.txt"\n'}
            {chunks.map(chunk => chunkFormatter({ doc: chunk }))}
            {'\n```\n'}
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
  const corpus = new FixieCorpus(corpusId) as Corpus<PodcastMetadata>
  return <PodcastDocsQA question={question} corpus={corpus} />
}

export async function POST(request: NextRequest) {
  const json = await request.json()
  const question = json.messages[json.messages.length - 1]
  const corpusId = json.corpusId

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
