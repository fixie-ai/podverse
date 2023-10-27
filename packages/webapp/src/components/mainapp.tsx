import { Podcasts } from '@/components/podcasts'
import { cn } from '@/lib/utils'

export function MainApp() {
  return (
    <div className={cn('pb-[200px] pt-4 w-8/12 md:pt-10')}>
      <div className="mx-auto px-4">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-md font-mono">
            Welcome to Podverse: It&apos;s ChatGPT for Podcasts!
          </p>
          <p className="text-sm font-mono pt-4 text-muted-foreground">
            Podverse allows you to ask questions about the content of popular podcasts.
            For each podcast, we pull down the audio, transcribe it using AI, and generate
            summaries and data used by an AI-powered chatbot that can answer questions.
            Click on any of the podcasts below and try it out!
          </p>
          <p className="text-sm font-mono pt-4 text-muted-foreground">
            Podverse is built using <a className="underline" href="https://fixie.ai">Fixie</a>{' '}
            and <a className="underline" href="https://ai-jsx.com">AI.JSX</a>. 
            Check out the <a className="underline" href="https://github.com/fixie-ai/podverse">GitHub repo</a> too!
          </p>
        </div>
        <div className="mx-auto flex justify-center mt-4">
          <Podcasts />
        </div>
      </div>
    </div>
  )
}
