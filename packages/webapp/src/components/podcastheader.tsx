import { Podcast } from 'podverse-types'
import { ExternalLink } from '@/components/external-link'

/** A header section with information about a podcast. */
export function PodcastHeader({ podcast }: { podcast: Podcast }) {
  return (
    <div className="flex mx-auto w-8/12 pt-12 gap-4">
      <div className="flex-col w-12 grow">
        <img
          src={podcast.imageUrl ?? '/podverse-logo.png'}
          className="rounded-lg"
        />
      </div>
      <div className="flex flex-col w-8/12 grow">
        <div className="rounded-lg border bg-background p-8 grow">
          <h1 className="mb-2 text-lg font-semibold">{podcast.title}</h1>
          <p className="mb-2 leading-normal text-sm text-muted-foreground">
            {podcast.description ?? ''}
          </p>
          <p className="mb-2 leading-normal text-sm text-muted-foreground">
            <ExternalLink href={podcast.url ?? ''}>
              {podcast.url ?? ''}
            </ExternalLink>
          </p>
        </div>
      </div>
    </div>
  )
}
