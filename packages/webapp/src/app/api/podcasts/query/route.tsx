/** @jsxImportSource ai-jsx/react */
import { toTextStream } from 'ai-jsx/stream'
import { DefaultFormatter, DocsQA, FixieCorpus } from 'ai-jsx/batteries/docs'
import { NextRequest } from 'next/server'
import { StreamingTextResponse } from 'ai'

async function DocsAgent({
  question,
  corpusId
}: {
  question: string
  corpusId: string
}) {
  const corpus = new FixieCorpus(corpusId)
  return (
    <DocsQA
      question={question}
      corpus={corpus}
      chunkLimit={1}
      chunkFormatter={DefaultFormatter}
    />
  )
}

export async function POST(request: NextRequest) {
  const json = await request.json()
  const question = json.messages[json.messages.length - 1]
  const corpusId = 'corpusId' in json ? json.corpusId : '6'

  return new StreamingTextResponse(
    toTextStream(<DocsAgent question={question.content} corpusId={corpusId} />)
  )
}
