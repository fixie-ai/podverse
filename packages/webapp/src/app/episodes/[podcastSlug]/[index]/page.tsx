'use client'
import { useEffect, useState } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { buttonVariants } from '@/components/ui/button'
import { PodcastHeader } from '@/components/podcastheader'
import { ExternalLink } from '@/components/external-link'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'

type RouteSegment = { params: { podcastSlug: string; index: number } }

function EpisodeSummary({ url }: { url: string }) {
  const [summary, setSummary] = useState<string | null>(null)

  //useEffect(() => {
  //  fetch(url).then(res => res.text()).then(setSummary);
  //}, [url]);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <LinkButton href={url}>Summary link</LinkButton>
      {summary ? (
        summary
      ) : (
        <div className="w-full flex flex-col gap-2">
          <Skeleton className="w-full h-[10px] rounded-full" />
          <Skeleton className="w-full h-[10px] rounded-full" />
          <Skeleton className="w-full h-[10px] rounded-full" />
        </div>
      )}
    </div>
  )
}

function LinkButton({ href, children }: { href: string; children: any }) {
  const className = buttonVariants({ variant: 'link' }) + ' text-sky-600'
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

function EpisodeDetail({ episode }: { episode: Episode }) {
  const pubDate = episode.pubDate
    ? format(new Date(episode.pubDate), 'MMMM dd, yyyy')
    : null
  return (
    <div className="flex flex-row mx-auto w-8/12 mt-4 gap-4 p-4 rounded-lg border bg-background">
      <div className="flex flex-col items-start">
        <div>{episode.title}</div>
        {pubDate && (
          <div className="text-sm text-muted-foreground pt-4">
            Published {pubDate}
          </div>
        )}
        {episode.description && (
          <div className="text-sm pt-4">{episode.description}</div>
        )}
        <div className="flex flex-row pt-4 gap-4 justify-start">
          {episode.url && (
            <LinkButton href={episode.url}>Episode link</LinkButton>
          )}
          {episode.audioUrl && (
            <LinkButton href={episode.audioUrl}>Audio</LinkButton>
          )}
          {episode.transcriptUrl && (
            <LinkButton href={episode.transcriptUrl}>Transcript</LinkButton>
          )}
        </div>
        {episode.summaryUrl && (
          <Accordion className="w-full" type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>AI-generated summary</AccordionTrigger>
              <AccordionContent>
                <EpisodeSummary url={episode.summaryUrl} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
