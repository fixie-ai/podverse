/** This module performs audio->text transcription using Deepgram. */

import { config } from 'dotenv';
config();

import { program } from 'commander';
import { Podcast, Episode, GetPodcast, ListPodcasts, SetPodcast } from 'podverse-types';
import slug from 'slug';
import { UploadToGCS } from './utils.js';
import { Transcribe } from './transcribe.js';

const PODVERSE_GCS_BUCKET = process.env.PODVERSE_GCS_BUCKET || '';
if (!PODVERSE_GCS_BUCKET) throw new Error('Missing PODVERSE_GCS_BUCKET environment variable.');

/** Process the given episode, transcribing its audio, and creating a text transcript. */
async function ProcessEpisode(podcastSlug: string, episode: Episode): Promise<Episode> {
  console.log(`Processing episode: ${episode.title}`);
  if (episode.transcriptUrl) {
    console.log('Skipping - already transcribed.');
    return episode;
  }
  if (!episode.audioUrl) throw new Error('Episode missing audioUrl field.');
  const transcript = await Transcribe(episode.audioUrl);
  const tslug = slug(episode.title);
  const transcriptUrl = await UploadToGCS(PODVERSE_GCS_BUCKET, `${podcastSlug}/transcript/${tslug}.txt`, transcript);
  console.log(`Transcript URL: ${transcriptUrl}`);
  episode.transcriptUrl = transcriptUrl;
  // TODO: Generate summary.
  return episode;
}

/** Process the given Podcast. */
async function ProcessPodcast(podcast: Podcast): Promise<Podcast> {
  if (!podcast.episodes) return podcast;
  const slug = podcast.slug;
  const newEpisodes: Episode[] = [];
  for (const episode of podcast.episodes) {
    newEpisodes.push(await ProcessEpisode(slug, episode));
  }
  podcast.episodes = newEpisodes;
  return podcast;
}

async function Process(podcast?: string) {
  const podcasts = podcast ? [podcast] : await ListPodcasts();
  for (const podcastSlug of podcasts) {
    console.log(`Processing: ${podcastSlug}...`);
    const podcast = await GetPodcast(podcastSlug);
    const processed = await ProcessPodcast(podcast);
    await SetPodcast(processed);
    console.log(`Finished processing ${podcastSlug}`);
  }
}

program.name('preprocessor').version('0.0.1').description('Preprocess Podcasts.');
program
  .command('process [podcast]')
  .description('Process all podcasts.')
  .action(async (podcast?: string) => {
    await Process(podcast);
  });

program.parse(process.argv);
