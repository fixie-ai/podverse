import { config } from 'dotenv';
config();
import { Podcast, Episode } from 'podverse-types';
import slug from 'slug';
import { UploadToGCS } from './utils.js';
import { Transcribe } from './transcribe.js';
import { Summarize } from './summary.js';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;

export interface ProcessOptions {
  force?: boolean;
  transcribe?: boolean;
  summarize?: boolean;
  maxEpisodes?: number;
}

async function maybeTranscribe(episode: Episode, opts: ProcessOptions): Promise<Episode> {
  const PODVERSE_GCS_BUCKET = process.env.PODVERSE_GCS_BUCKET || '';
  if (!PODVERSE_GCS_BUCKET) throw new Error('Missing PODVERSE_GCS_BUCKET environment variable.');

  if (episode.transcriptUrl && !opts.force) {
    term('  Skipping transcription - already transcribed.\n');
    return episode;
  }
  if (opts.transcribe === false) {
    term('  Skipping transcription - transcription disabled.\n');
    return episode;
  }
  if (!episode.audioUrl) throw new Error('Episode missing audioUrl field.');
  const transcript = await Transcribe(episode.audioUrl);
  const tslug = slug(episode.title);
  const transcriptUrl = await UploadToGCS(
    PODVERSE_GCS_BUCKET,
    `${episode.podcastSlug}/transcript/${tslug}.txt`,
    transcript
  );
  term(`Uploaded transcript: ${transcriptUrl}\n`);
  episode.transcriptUrl = transcriptUrl;
  return episode;
}

async function maybeSummarize(podcast: Podcast, episode: Episode, opts: ProcessOptions): Promise<Episode> {
  const PODVERSE_GCS_BUCKET = process.env.PODVERSE_GCS_BUCKET || '';
  if (!PODVERSE_GCS_BUCKET) throw new Error('Missing PODVERSE_GCS_BUCKET environment variable.');

  if (episode.summaryUrl && !opts.force) {
    term('  Skipping summarization - already summarized.\n');
    return episode;
  }
  if (opts.summarize === false) {
    term('  Skipping summarization - summarization disabled.\n');
    return episode;
  }
  if (!episode.transcriptUrl) throw new Error('Episode missing transcriptUrl field.');
  const res = await fetch(episode.transcriptUrl);
  const transcript = await res.text();
  const summary = await Summarize(transcript);

  const finalSummary = `
    Podcast: ${podcast.title}
    Episode: ${episode.title}
    Published: ${episode.pubDate ?? 'unknown'}
    URL: ${episode.url ?? 'unknown'}\n
    Summary: ${summary}`;

  term('\n\n  Summary: ').green(finalSummary).green('\n\n');
  const tslug = slug(episode.title);
  const summaryUrl = await UploadToGCS(
    PODVERSE_GCS_BUCKET,
    `${episode.podcastSlug}/summary/${tslug}.txt`,
    finalSummary
  );
  term(`Uploaded summary: ${summaryUrl}\n`);
  episode.summaryUrl = summaryUrl;
  return episode;
}

/** Process the given episode, transcribing its audio, and creating a text transcript. */
export async function ProcessEpisode(podcast: Podcast, episode: Episode, opts: ProcessOptions): Promise<Episode> {
  term('  Processing episode: ').blue(`${episode.title}\n`);
  let ep = await maybeTranscribe(episode, opts);
  ep = await maybeSummarize(podcast, ep, opts);
  return ep;
}

/** Process the given Podcast. */
export async function ProcessPodcast(podcast: Podcast, opts: ProcessOptions): Promise<Podcast> {
  if (!podcast.episodes) return podcast;
  const newEpisodes: Episode[] = [];
  for (const episode of podcast.episodes) {
    newEpisodes.push(await ProcessEpisode(podcast, episode, opts));
    if (opts.maxEpisodes && newEpisodes.length >= opts.maxEpisodes) break;
  }
  podcast.episodes = newEpisodes;
  return podcast;
}
