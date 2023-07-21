'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { EpisodeCard } from '@/components/episodecard'
import { PodcastHeader } from '@/components/podcastheader'
import { ExternalLink } from '@/components/external-link'

type RouteSegment = { params: { podcastSlug: string; index: number } }

function EpisodeDetail({ episode }: { episode: Episode }) {
  return (
    <div className="flex flex-row mx-auto w-8/12 mt-12 gap-4 p-8 rounded-lg border bg-background">
      <div className="flex flex-col items-start">
        <div className="px-6">{episode.title}</div>
        {episode.pubDate && (
          <div className="text-sm text-muted-foreground p-6">
            Published {episode.pubDate}
          </div>
        )}
        {episode.description && (
          <div className="px-6 text-sm">{episode.description}</div>
        )}
        {episode.url && (
          <div className="pt-6 px-6">
            <ExternalLink href={episode.url}>Link to episode</ExternalLink>
          </div>
        )}
        {episode.audioUrl && (
          <div className="px-6">
            <ExternalLink href={episode.audioUrl}>Audio</ExternalLink>
          </div>
        )}
        {episode.transcriptUrl && (
          <div className="px-6">
            <ExternalLink href={episode.transcriptUrl}>Transcript</ExternalLink>
          </div>
        )}
      </div>
      {episode.imageUrl && (
        <div className="w-72">
          <img src={episode.imageUrl} />
        </div>
      )}
    </div>
  )
}

export default function EpisodeSinglePage({ params }: RouteSegment) {
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)

  useEffect(() => {
    async function loadPodcast() {
      const res = await fetch(`/api/podcast/${params.podcastSlug}`, {
        method: 'GET'
      }).catch(err => {
        throw err
      })
      const data = await res.json()
      setPodcast(data)
      setEpisode(data.episodes[params.index])
    }
    loadPodcast()
  }, [params.index, params.podcastSlug])

  return episode != null && podcast != null ? (
    <>
      <PodcastHeader podcast={podcast} />
      <EpisodeDetail episode={episode} />
      <Chat
        id={nanoid()}
        apiPath="/api/podcasts/query"
        corpusId={podcast.corpusId!}
      />
    </>
  ) : (
    <div></div>
  )
}
