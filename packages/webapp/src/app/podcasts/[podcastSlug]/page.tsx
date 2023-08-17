'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { ExternalLink } from '@/components/external-link'
import { EpisodeCard } from '@/components/episodecard'
import { PodcastHeader } from '@/components/podcastheader'
import { Skeleton } from '@/components/ui/skeleton'

function LatestEpisodes({ podcast }: { podcast: Podcast | null }) {
  return (
    <div className="flex items-center flex-col mx-auto w-4/5 pt-4 gap-4">
      <div className="flex flex-row w-full justify-stretch">
        <div className="text-sm text-muted-foreground w-full">
          Latest episodes
        </div>
        <div className="flex-auto w-full"></div>
        <div className="text-sm text-muted-foreground w-full text-end">
          {podcast && <a href={`/episodes/${podcast.slug}`}>All episodes ≫</a>}
        </div>
      </div>
      {podcast ? (
        <div className="flex flex-row w-full">
          {podcast!.episodes?.slice(0, 5).map((episode, index) => (
            <EpisodeCard
              key={nanoid()}
              episode={episode}
              index={index}
              podcast={podcast}
            />
          ))}
        </div>
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}

function SuggestedQueries({ podcast }: { podcast: Podcast | null }) {
  return podcast && podcast.suggestedQueries ? (
    <div className="flex items-center flex-col mx-auto mt-8">
      <div className="text-sm text-muted-foreground w-full mx-auto text-center justify-center">
        Try one of these queries:
      </div>
      <div className="w-full flex flex-row justify-center">
        <div className="flex flex-row w-full items-center justify-center">
          {podcast.suggestedQueries.map((query, index) => (
            <div
              className="justify-center flex mt-4 mx-8 px-4 py-2 text-sm text-white bg-slate-500 border rounded-full"
              key={index}
            >
              {query}
            </div>
          ))}
        </div>
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
  }, [params.podcastSlug])

  return (
    <div>
      <PodcastHeader podcast={podcastData} />
      <LatestEpisodes podcast={podcastData} />
      <SuggestedQueries podcast={podcastData} />
      <Chat
        id={nanoid()}
        apiPath="/api/podcasts/query"
        corpusId={podcastData?.corpusId!}
      />
    </div>
  )
}
