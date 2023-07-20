'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { Button } from '@/components/ui/button'
import { IconArrowRight } from '@/components/ui/icons'
import { ExternalLink } from '@/components/external-link'
import { Carousel } from 'flowbite-react'

function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <div className="flex flex-col w-48 gap-4 h-full p-4 mx-4 rounded-lg border bg-background bg-gray-700 dark:bg-gray-700 text-white dark:text-white">
      <div className="flex flex-col w-full">
        <img src={episode.imageUrl} />
        <a
          href={episode.url ?? ''}
          className="inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
          target="_blank"
        >
          <p className="mb-2 text-sm">{episode.title}</p>
        </a>
        <p className="mb-2 leading-normal text-muted-foreground">
          {episode.description ?? ''}
        </p>
      </div>
    </div>
  )
}

function EpisodeCarousel({ podcast }: { podcast: Podcast }) {
  return (
    <div className="flex items-center flex-col mx-auto w-4/5 pt-4 gap-4">
      <div className="flex flex-row w-full justify-stretch">
        <div className="text-sm text-muted-foreground w-full">Latest episodes</div>
        <div className="flex-auto w-full"></div>
        <div className="text-sm text-muted-foreground w-full text-end">
          <a href="/episodes/${podcast.slug}">All episodes ≫</a>
        </div>
      </div>
      <Carousel slide={false}>
        {/* Only show the first 10 episodes. */}
        {podcast.episodes?.slice(0, 10).map(episode => (
          <EpisodeCard key={nanoid()} episode={episode} />
        ))}
      </Carousel>
    </div>
  )
}

function PodcastHeader({ podcast }: { podcast: Podcast }) {
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

type RouteSegment = { params: { podcastSlug: string } }

export default function PodcastPage({ params }: RouteSegment) {
  const [podcastData, setPodcastData] = useState<Podcast | null>(null)

  useEffect(() => {
    async function loadPodcast() {
      const res = await fetch(`/api/podcast/${params.podcastSlug}`, {
        method: 'GET'
      }).catch(err => {
        throw err
      })
      const data = await res.json()
      setPodcastData(data)
    }
    loadPodcast()
  }, [])

  return podcastData != null ? (
    <>
      <PodcastHeader podcast={podcastData!} />
      <EpisodeCarousel podcast={podcastData!} />
      <Chat id={nanoid()} apiPath="/api/podcasts/query" />
    </>
  ) : (
    <div></div>
  )
}
