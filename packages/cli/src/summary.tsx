import * as AI from 'ai-jsx';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';

const tokenLen = (text: string) => text.length / 4;

async function Summarizer({ children, maxTokenLen }: { children: AI.Node, maxTokenLen: number }, { render }: AI.ComponentContext) {
  const text = await render(children);
  if (tokenLen(text) <= maxTokenLen) {
    return (
      <ChatCompletion>
        <SystemMessage>
          Summarize the supplied text into a sentence. Only use the information provided in the text; DO NOT use any
          information you know about the world.
        </SystemMessage>
        <UserMessage>{text}</UserMessage>
      </ChatCompletion>
    );
  }

  return (
    <Summarizer maxTokenLen={maxTokenLen}>
      {text.split('\n\n').map((piece) => (
        <Summarizer maxTokenLen={maxTokenLen}>{piece}</Summarizer>
      ))}
    </Summarizer>
  );
}

export async function Summarize(text: string, maxTokenLen?: number): Promise<string> {
  const app = <Summarizer maxTokenLen={maxTokenLen ?? 250}>{text}</Summarizer>;
  return await AI.createRenderContext().render(app);
}
