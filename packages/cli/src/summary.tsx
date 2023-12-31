import ora from 'ora';
import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { OpenAI } from 'ai-jsx/lib/openai';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;

// Rough estimate.
const tokenLen = (text: string) => text.length / 4;

function chunkText(text: string, maxTokenLen: number): string[] {
  // Split text into lines.
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  // Now group lines into chunks of maxTokenLen.
  const chunks = [];
  let chunk = '';
  for (const line of lines) {
    if (tokenLen(chunk + line) > maxTokenLen) {
      chunks.push(chunk);
      chunk = '';
    }
    chunk += line + '\n';
  }
  chunks.push(chunk);
  return chunks;
}

function rechunk(chunks: string[], maxTokenLen: number): string[] {
  const fullText = chunks.join('\n');
  return chunkText(fullText, maxTokenLen);
}

async function Summary(
  { children, systemMessage, maxTokenLen }: { children: AI.Node; systemMessage: string; maxTokenLen: number },
  { render }: AI.ComponentContext,
) {
  const text = await render(children);
  return (
    <ChatCompletion>
      <SystemMessage>{systemMessage}</SystemMessage>
      <UserMessage>{text}</UserMessage>
    </ChatCompletion>
  );
}

const TRANSCRIPT_SUMMARY = `Provide a one or two sentence summary of the
  following segment of a podcast transcript. Only use the information
  provided in the text; DO NOT use any information you know about the world.
  Include the title of the podcast, the name of the episode, and the
  names of the speakers, if known.`;

const TEXT_SUMMARY = `Provide a one or two sentence summary of the
  following text. Only use the information provided in the text; DO NOT
  use any information you know about the world. Include the title of the
  podcast, the name of the episode, and the names of the speakers, if known.`;

const PODCAST_SUMMARY = `Provide a one-paragraph summary of the
  following text, which describes a podcast episode. Start out with
  "This episode..." or "The topic of this episode is...". Use punchy,
  exciting language meant to be colloquial, fun, and engaging.
  If the title of the podcast, the name of the episode, or the names of
  the speakers are mentioned, include them in your summary. Only use the
  information provided in the text; DO NOT use any information you know
  about the world.`;

async function PodcastSummary(
  { children, maxTokenLen, debug }: { children: AI.Node; maxTokenLen: number; debug?: boolean },
  { render }: AI.ComponentContext,
) {
  let text = await render(children);
  let systemMessage = TRANSCRIPT_SUMMARY;


  // Reduce the transcript to a shorter summary.
  while (tokenLen(text) > maxTokenLen) {
    if (debug) {
      term(`Tokens ${tokenLen(text)} > ${maxTokenLen}\n`);
    }
    const chunks = chunkText(text, maxTokenLen);
    if (debug) {
      term(`Generated ${chunks.length} chunks\n`);
    }
    const transcriptSummaries = await Promise.all(
      chunks.map(
        async (chunk) =>
          await render(
            <Summary systemMessage={systemMessage} maxTokenLen={maxTokenLen}>
              {chunk}
            </Summary>,
          ),
      ),
    );
    const summarizedTranscript = rechunk(transcriptSummaries, maxTokenLen);
    text = summarizedTranscript.join('\n');
    if (debug) {
      term('New text is:\n').blue(text)('\n');
    }
    systemMessage = TEXT_SUMMARY;
  }
  // Generate the final podcast summary.
  if (debug) {
    term(`Size is ${tokenLen(text)} - Generating final summary.`);
  }
  return await render(
    <Summary systemMessage={PODCAST_SUMMARY} maxTokenLen={maxTokenLen}>
      {text}
    </Summary>,
  );
}

export async function Summarize(text: string, maxTokenLen?: number, debug?: boolean): Promise<string> {
  term(`Summarizing ${text.length} chars...\n`);
  const app = (
    <OpenAI chatModel="gpt-4-32k">
      <PodcastSummary debug={debug ?? false} maxTokenLen={maxTokenLen ?? 4000}>
        {text}
      </PodcastSummary>
    </OpenAI>
  );
  const result = await AI.createRenderContext().render(app);
  term(`Summarized ${text.length} chars to ${result.length} chars.`);
  return result;
}
