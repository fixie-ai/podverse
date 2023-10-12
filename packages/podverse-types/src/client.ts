/** This module has client functions for accessing the podcast KV metadata store. */

import { kv } from '@vercel/kv';
import { Podcast } from './types.js';

/** Return metadata for the given podcast. */
export async function GetPodcast(slug: string): Promise<Podcast> {
  const podcastData = await kv.json.get(`podcasts:${slug}`, '$');
  if (!podcastData) {
    throw new Error(`Podcast with slug ${slug} not found.`);
  }
  return podcastData[0] as Podcast;
}

/** Set metadata for the given podcast. */
export async function SetPodcast(podcast: Podcast) {
  await kv.json.set(`podcasts:${podcast.slug}`, '$', podcast);
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
