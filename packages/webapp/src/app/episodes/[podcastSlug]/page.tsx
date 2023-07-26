'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Podcast } from 'podverse-types'
import { EpisodeCard } from '@/components/episodecard'
import { PodcastHeader } from '@/components/podcastheader'

function EpisodeGrid({ podcast }: { podcast: Podcast }) {
  return (
    <div className="flex items-center flex-col mx-auto w-4/5 pt-4 gap-4 border-2">
      <div className="flex flex-row w-full justify-center">
        <div className="grid grid-cols-4 gap-4">
          {podcast.episodes?.map((episode, index) => (
            <EpisodeCard
              key={nanoid()}
              podcast={podcast}
              episode={episode}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type RouteSegment = { params: { podcastSlug: string } }

export default function EpisodePage({ params }: RouteSegment) {
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
      <EpisodeGrid podcast={podcastData!} />
      <Chat
        id={nanoid()}
        apiPath="/api/podcasts/query"
        corpusId={podcastData.corpusId!}
        podcastSlug={podcastData.slug!}
      />
    </>
  ) : (
    <div></div>
  )
}
