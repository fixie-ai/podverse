'use client'

import { useState, useEffect } from 'react'
import { PodcastCard } from '@/components/podcastcard'
import { Podcast } from 'podverse-types'
import { Skeleton } from '@/components/ui/skeleton'

export function Podcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])

  // The state of this app is stored in the Vercel KV service (which is backed by Redis).
  // However, to access the state we need to invoke a server-side API route which has
  // the requisite API keys to access the KV service.
  useEffect(() => {
    async function loadPodcasts() {
      const res = await fetch('/api/podcasts', {
        method: 'GET'
      }).catch(err => {
        throw err
      })
      const data = await res.json()
      setPodcasts(data)
    }
    loadPodcasts()
  }, [])

  const cards = podcasts.map((podcast, index) => (
    <PodcastCard
      title={podcast.title}
      imageUrl={podcast.imageUrl ?? '/podverse-logo.png'}
      key={index}
      slug={podcast.slug}
    />
  ))

  const cardSkeleton = Array.from(Array(9).keys()).map((_, index) => (
    <Skeleton className="h-72 w-full" key={index} />
  ))

  return (
    <div className="w-full grid grid-cols-3 gap-4 p-12">
      {podcasts.length === 0 ? <>{cardSkeleton}</> : <>{cards}</>}
    </div>
  )
}
