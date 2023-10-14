import { config } from 'dotenv';
config();
import { Podcast, Episode } from 'podverse-types';
import slug from 'slug';
import { UploadToGCS } from './utils.js';
import { Transcribe } from './transcribe.js';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;

export interface ProcessOptions {
  transcribe?: boolean;
}

/** Process the given episode, transcribing its audio, and creating a text transcript. */
export async function ProcessEpisode(podcastSlug: string, episode: Episode, opts: ProcessOptions): Promise<Episode> {
  const PODVERSE_GCS_BUCKET = process.env.PODVERSE_GCS_BUCKET || '';
  if (!PODVERSE_GCS_BUCKET) throw new Error('Missing PODVERSE_GCS_BUCKET environment variable.');

  term('  Processing episode:').blue(`${episode.title}\n`);
  if (episode.transcriptUrl) {
    term('  Skipping - already transcribed.\n');
    return episode;
  }
  if (opts.transcribe === false) {
    term('  Skipping - transcription disabled.\n');
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
export async function ProcessPodcast(podcast: Podcast, opts: ProcessOptions): Promise<Podcast> {
  if (!podcast.episodes) return podcast;
  const slug = podcast.slug;
  const newEpisodes: Episode[] = [];
  for (const episode of podcast.episodes) {
    newEpisodes.push(await ProcessEpisode(slug, episode, opts));
  }
  podcast.episodes = newEpisodes;
  return podcast;
}
