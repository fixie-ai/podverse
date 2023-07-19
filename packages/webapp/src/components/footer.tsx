import React from 'react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      Open source AI chatbot built with{' '}
      <ExternalLink href="https://ai-jsx.com/">AI.JSX</ExternalLink> and a{' '}
      <ExternalLink href="https://app.fixie.ai/">
        Fixie Audio Corpus
      </ExternalLink>
      .
    </p>
  )
}
