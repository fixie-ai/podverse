/** @jsxImportSource ai-jsx/react */
import { DefaultFormatter, DocsQA, FixieCorpus } from 'ai-jsx/batteries/docs';

export async function DocsAgent({ question, corpusId = '6' }: { question: string; corpusId?: string }) {
  const corpus = new FixieCorpus(corpusId);
  return <DocsQA question={question} corpus={corpus} chunkLimit={1} chunkFormatter={DefaultFormatter} />;
}
