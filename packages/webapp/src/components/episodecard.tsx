import { Episode, Podcast } from 'podverse-types'

/** A card showing information about a given episode. */
export function EpisodeCard({
  index,
  podcast,
  episode
}: {
  index: number
  podcast: Podcast
  episode: Episode
}) {
  return (
    <div className="flex flex-col w-48 gap-4 h-full p-4 mx-4 rounded-lg border bg-background bg-gray-700 dark:bg-gray-700 text-white dark:text-white">
      <div className="flex flex-col w-full">
        <img src={episode.imageUrl} />
        <a
          href={`/episodes/${podcast.slug}/${index}`}
          className="inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
        >
          <p className="mb-2 text-sm">{episode.title}</p>
        </a>
        {episode.description && (
          <p className="mb-2 leading-normal text-muted-foreground text-xs h-32">
            <p className="text-ellipsis overflow-hidden h-32">
              {episode.description ?? ''}
            </p>
          </p>
        )}
      </div>
    </div>
  )
}
