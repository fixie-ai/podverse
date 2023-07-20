'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { Button } from '@/components/ui/button'
import { IconArrowRight } from '@/components/ui/icons'
import { ExternalLink } from '@/components/external-link'

function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <div className="flex flex-col w-full p-4 rounded-lg border bg-background">
      <div className="flex flex-col w-full">
        <a
          href={episode.url ?? ''}
          className="inline-flex flex-1 justify-center gap-1 leading-4 hover:underline"
          target="_blank"
        >
          <h1 className="mb-2 text-lg font-semibold">{episode.title}</h1>
        </a>
        <p className="mb-2 leading-normal text-muted-foreground">
          {episode.description ?? ''}
        </p>
      </div>
    </div>
  )
}

function EpisodeList({ podcast }: { podcast: Podcast }) {
  return (
    <div className="grid grid-cols-8 w-full gap-4 p-24">
      {podcast.episodes?.map(episode => (
        <EpisodeCard key={nanoid()} episode={episode} />
      ))}
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
          <p className="mb-2 leading-normal text-muted-foreground">
            {podcast.description ?? ''}
          </p>
          <p className="mb-2 leading-normal text-muted-foreground">
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
      <EpisodeList podcast={podcastData!} />
      <Chat id={nanoid()} apiPath="/api/podcasts/query" />
    </>
  ) : (
    <div></div>
  )
}
