import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Explain what the podcast is about',
    message: `What is the podcast about?`
  },
  {
    heading: 'Summarize a concept discussed on the podcast',
    message: 'Summarize the opinion of the speakers about: \n'
  },
  {
    heading: "Find out the speakers' names",
    message: `Who are the speakers?`
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto w-8/12 px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Welcome to Podverse: an AI-powered podcast search engine!
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          This is an open source AI chatbot app built with{' '}
          <ExternalLink href="https://ai-jsx.com/">AI.JSX</ExternalLink> and a{' '}
          <ExternalLink href="https://app.fixie.ai/">
            Fixie Audio Corpus
          </ExternalLink>
          .
        </p>
        <p className="leading-normal text-muted-foreground">
          You can ask questions about the podcast or try one of the following
          examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
