'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { ExternalLink } from '@/components/external-link'
import { Carousel } from 'flowbite-react'
import { EpisodeCard } from '@/components/episodecard'
import { PodcastHeader } from '@/components/podcastheader'

function EpisodeCarousel({ podcast }: { podcast: Podcast }) {
  return (
    <div className="flex items-center flex-col mx-auto w-4/5 pt-4 gap-4">
      <div className="flex flex-row w-full justify-stretch">
        <div className="text-sm text-muted-foreground w-full">
          Latest episodes
        </div>
        <div className="flex-auto w-full"></div>
        <div className="text-sm text-muted-foreground w-full text-end">
          <a href={`/episodes/${podcast.slug}`}>All episodes ≫</a>
        </div>
      </div>
      <Carousel slide={false}>
        {/* Only show the first 10 episodes. */}
        {podcast.episodes?.slice(0, 10).map((episode, index) => (
          <EpisodeCard
            key={nanoid()}
            episode={episode}
            index={index}
            podcast={podcast}
          />
        ))}
      </Carousel>
    </div>
  )
}

function SuggestedQueries({ podcast }: { podcast: Podcast }) {
  return podcast.suggestedQueries ? (
    <div className="flex items-center flex-col mx-auto mt-8">
      <div className="text-sm text-muted-foreground w-full mx-auto text-center justify-center">
        Try one of these queries:
      </div>
      <div className="flex flex-row w-full justify-stretch">
        {podcast.suggestedQueries.map((query, index) => (
          <div
            className="mt-4 mx-8 px-4 py-2 text-sm text-white bg-slate-500 border rounded-full"
            key={index}
          >
            {query}
          </div>
        ))}
      </div>
    </div>
  ) : (
    <></>
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
      <SuggestedQueries podcast={podcastData!} />
      <Chat id={nanoid()} apiPath="/api/podcasts/query" />
    </>
  ) : (
    <div></div>
  )
}
