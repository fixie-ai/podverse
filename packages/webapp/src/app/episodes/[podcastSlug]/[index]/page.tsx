'use client'
import { useEffect, useState, ReactNode } from 'react'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { Episode, Podcast } from 'podverse-types'
import { buttonVariants } from '@/components/ui/button'
import { PodcastHeader } from '@/components/podcastheader'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  LightBulbIcon,
  LinkIcon,
  SpeakerWaveIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleBottomCenterIcon
} from '@heroicons/react/24/outline'

type RouteSegment = { params: { podcastSlug: string; index: number } }

function EpisodeSummary({ summary }: { summary: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div>{summary}</div>
    </div>
  )
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  const className = buttonVariants({ variant: 'outline' })
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
        <div className="grid grid-cols-2 pt-4 gap-2 justify-center">
          {episode.url && (
            <LinkButton href={episode.url}>
              <LinkIcon className="h-full pr-2" />
              Episode link
            </LinkButton>
          )}
          {episode.audioUrl && (
            <LinkButton href={episode.audioUrl}>
              <SpeakerWaveIcon className="h-full pr-2" />
              Audio
            </LinkButton>
          )}
          {episode.transcriptUrl && (
            <LinkButton href={episode.transcriptUrl}>
              <ChatBubbleBottomCenterTextIcon className="h-full pr-2" />
              Transcript
            </LinkButton>
          )}
          {episode.summary && (
            <Dialog>
              <DialogTrigger>
                <Button variant={'outline'} className="">
                  <LightBulbIcon className="h-full pr-2" />
                  AI-generated summary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{episode.title}</DialogTitle>
                  <DialogDescription>
                    <div className="text-sm font-mono pt-4">{episode.summary}</div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
