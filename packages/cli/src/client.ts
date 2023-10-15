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
  // Read episodes.
  podcast.episodes = await Promise.all(
    (await ListEpisodes(slug)).map((episodeSlug) => {
      return GetEpisode(slug, episodeSlug);
    }),
  );
  return podcast;
}

/** Set metadata for the given podcast. */
export async function SetPodcast(podcast: Podcast) {
  // Don't write episodes to the Podcast entry.
  const writePodcast = { ...podcast, episodes: null };
  await kv.json.set(`podcasts:${podcast.slug}`, '$', writePodcast);
  // Write episodes separately.
  await podcast.episodes?.map(async (episode: Episode) => {
    await SetEpisode(episode);
  });
}

export async function DeletePodcast(slug: string) {
  const podcast = await GetPodcast(slug);
  await podcast.episodes?.map(async (episode: Episode) => {
    await DeleteEpisode(episode);
  });
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
export async function GetEpisode(podcastSlug: string, episodeSlug: string): Promise<Episode> {
  const episodeData = await kv.json.get(`podcasts:${podcastSlug}:${episodeSlug}`, '$');
  if (!episodeData) {
    throw new Error(`Episode with slug ${podcastSlug}:${episodeSlug} not found.`);
  }
  return episodeData[0] as Episode;
}

/** Set metadata for the given episode. */
export async function SetEpisode(episode: Episode) {
  await kv.json.set(`podcasts:${episode.podcastSlug}:${episode.slug}`, '$', episode);
}

export async function DeleteEpisode(episode: Episode) {
  await kv.del(`podcasts:${episode.podcastSlug}:${episode.slug}`);
}

/** Return a list of all episodes in this Podcast. */
export async function ListEpisodes(podcastSlug: string): Promise<string[]> {
  const slugs: string[] = [];
  let cursor = 0;
  do {
    const episodes = await kv.scan(cursor, { match: `podcasts:${podcastSlug}:*` });
    cursor = episodes[0];
    const keys = episodes[1];
    keys.map((key: string) => {
      // Strip the "podcasts:podcastSlug:" prefix.
      key = key.substring(9 + podcastSlug.length + 1);
      slugs.push(key);
    });
  } while (cursor !== 0);
  return slugs;
}