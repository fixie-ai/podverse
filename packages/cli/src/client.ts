/** This module has client functions for accessing the podcast KV metadata store. */

import { kv } from '@vercel/kv';
import { Episode, Podcast } from 'podverse-types';

/** Return metadata for the given podcast. */
export async function GetPodcast(slug: string): Promise<Podcast> {
  const podcastData = await kv.json.get(`podcasts:${slug}`, '$');
  if (!podcastData) {
    throw new Error(`Podcast with slug ${slug} not found.`);
  }
  const podcast = podcastData[0] as Podcast;
  return podcast;
}

/** Set metadata for the given podcast. */
export async function SetPodcast(podcast: Podcast) {
  await kv.json.set(`podcasts:${podcast.slug}`, '$', podcast);
}

export async function DeletePodcast(slug: string) {
  await kv.del(`podcasts:${slug}`);
}

/** Return a list of all podcast slugs. */
export async function ListPodcasts(): Promise<string[]> {
  const slugs: string[] = [];
  let cursor = 0;
  do {
    const podcasts = await kv.scan(cursor, { match: `podcasts:*` });
    cursor = podcasts[0];
    const keys = podcasts[1];
    keys.map((key: string) => {
      // Strip the "podcasts:" prefix.
      key = key.substring(9);
      slugs.push(key);
    });
  } while (cursor !== 0);
  return slugs;
}

/** Return metadata for the given episode. */
export async function GetEpisode(podcastSlug: string, episodeSlug: string): Promise<Episode | undefined> {
  const podcast = await GetPodcast(podcastSlug);
  return podcast.episodes?.find((e: Episode) => e.slug === episodeSlug);
}

/** Set metadata for the given episode. */
export async function SetEpisode(episode: Episode) {
  const podcast = await GetPodcast(episode.podcastSlug);
  if (!podcast.episodes) {
    podcast.episodes = [episode];
  } else {
    const index = podcast.episodes?.findIndex((ep: Episode) => ep.slug === episode.slug) ?? -1;
    if (podcast.episodes && index !== -1) {
      podcast.episodes[index] = episode;
    } else {
      podcast.episodes.push(episode);
    }
  }
  await SetPodcast(podcast);
}

export async function DeleteEpisode(episode: Episode) {
  const podcast = await GetPodcast(episode.podcastSlug);
  podcast.episodes = podcast.episodes?.filter((ep: Episode) => ep.slug !== episode.slug);
  await SetPodcast(podcast);
}

/** Return a list of all episodes in this Podcast. */
export async function ListEpisodes(podcastSlug: string): Promise<string[]> {
  const podcast = await GetPodcast(podcastSlug);
  return podcast.episodes?.map((e: Episode) => e.slug) ?? [];
}
