/**
 * This is a command-line utility to manage the set of Podcasts in the Podverse app.
 */

import { config } from 'dotenv';
config();

import { program } from 'commander';
import Parser from 'rss-parser';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;
import slug from 'slug';
import { Episode, Podcast } from 'podverse-types';
import { GetPodcast, SetPodcast, DeletePodcast, ListPodcasts } from './client.js';
import { ProcessPodcast } from './process.js';
import { IndexPodcast } from './index.js';
import { Summarize } from './summary.js';
import { dump, load } from 'js-yaml';
import fs from 'fs';

/** Describes the configuration file YAML format. */
interface ConfigFile {
  podcasts: Podcast[];
}

program.name('podverse-cli').version('0.0.1').description('Ingest a podcast into the Podverse app.');

/** Read the given RSS feed URL and return it as a Podcast object. */
async function readPodcastFeed(podcastUrl: string, podcastSlug?: string): Promise<Podcast> {
  // Read the RSS feed metadata.
  const parser = new Parser();
  const feed = await parser.parseURL(podcastUrl);
  if (!feed.title) {
    throw new Error('No title found for podcast.');
  }
  const titleSlug = podcastSlug ?? slug(feed.title!);
  const episodes: Episode[] = feed.items.map((entry) => {
    return {
      slug: slug(entry.title ?? 'Untitled'),
      podcastSlug: titleSlug,
      title: entry.title ?? 'Untitled',
      description: entry.description ?? entry.itunes.subtitle,
      url: entry.link,
      imageUrl: entry.itunes?.image,
      pubDate: entry.pubDate,
      audioUrl: entry.enclosure?.url,
    };
  });

  const newPodcast: Podcast = {
    slug: titleSlug,
    title: feed.title,
    description: feed.description,
    url: feed.link,
    rssUrl: podcastUrl,
    imageUrl: feed.image?.url ?? feed.itunes?.image,
    episodes,
  };
  return newPodcast;
}

/**
 * Merge two podcasts. Metadata from newPodcast is preferred, but episodes present in oldPodcast
 * are retained by keeping existing epiodes from oldPodcast.
 */
function mergePodcasts(oldPodcast: Podcast, newPodcast: Podcast): Podcast {
  // Retain old corpus ID if one was already set for this podcast, since this does not
  // come from the RSS feed.
  if (oldPodcast.corpusId) {
    newPodcast.corpusId = oldPodcast.corpusId;
  }
  newPodcast.episodes = newPodcast.episodes?.map((newEpisode: Episode) => {
    // If the episode exists in oldPodcast, use that.
    const oldEpisode = oldPodcast.episodes?.find((episode: Episode) => {
      return episode.url === newEpisode.url;
    });
    if (oldEpisode) {
      return oldEpisode;
    } else {
      return newEpisode;
    }
  });
  return newPodcast;
}

program
  .command('ingest')
  .description('Ingest a podcast into the Podverse app.')
  .argument('<podcastUrl>', 'URL of the podcast RSS feed.')
  .action(async (podcastUrl: string) => {
    const newPodcast = await readPodcastFeed(podcastUrl);
    SetPodcast(newPodcast);
    term('Ingested podcast: ').green(newPodcast.slug)(` (${newPodcast.episodes?.length} episodes)\n`);
  });

program
  .command('list')
  .description('List all podcasts in the Podverse app.')
  .action(async () => {
    const slugs = await ListPodcasts();
    for (const slug of slugs) {
      const podcast = await GetPodcast(slug);
      term(slug + ': ')
        .green(podcast.title + ' ')
        .blue(podcast.rssUrl);
      if (podcast.corpusId) {
        term(` (corpus: ${podcast.corpusId})`);
      } else {
        term.red(' (no corpus)');
      }
      term(` - ${podcast.episodes?.length} episodes\n`);
    }
  });

program
  .command('get')
  .description('Get a podcast from the Podverse app.')
  .argument('<slug>', 'Slug of the podcast to get.')
  .action(async (slug: string) => {
    const podcast = await GetPodcast(slug);
    console.log(JSON.stringify(podcast, null, 4));
  });

program
  .command('dump')
  .description('Save the current configuration to a YAML file.')
  .argument('<filename>', 'YAML file to save the configuration to.')
  .action(async (filename: string) => {
    const config: ConfigFile = {
      podcasts: [] as Podcast[],
    };
    const slugs = await ListPodcasts();
    config.podcasts = await Promise.all(slugs.map(async (slug) => await GetPodcast(slug)));
    fs.writeFile(filename, dump(config), (err) => {
      if (err) {
        console.log(err);
      }
    });
    term('Wrote config to ').green(filename);
  });

program
  .command('load')
  .description('Load the current configuration from a YAML file.')
  .argument('<filename>', 'YAML file to read the configuration from.')
  .option('--overwrite', 'Overwrite existing podcast data in the KV store.')
  .action(async (filename: string, opts) => {
    const configFile = load(fs.readFileSync(filename, 'utf8')) as ConfigFile;
    for (const podcastConfig of configFile.podcasts) {
      let podcast: Podcast | null = null;
      try {
        // Check to see if it exists.
        podcast = await GetPodcast(podcastConfig.slug);
        if (opts.overwrite) {
          term('Overwriting: ').green(podcastConfig.slug + '\n');
        } else {
          term('Updating: ').green(podcastConfig.slug + '\n');
          podcast = mergePodcasts(podcast, podcastConfig);
        }
      } catch (err) {
        // Assume the podcast does not exist, let's create it.
        term()
          .yellow('Creating: ')
          .green(podcastConfig.slug + '\n');
      }
      // Override all fields from the YAML file.
      podcast = podcastConfig;
      SetPodcast(podcast);
    }
    term('Reloaded config from ').green(filename);
  });

program
  .command('delete')
  .description('Delete a podcast from the Podverse app.')
  .argument('<slug>', 'Slug of the podcast to delete.')
  .action(async (slug: string) => {
    await DeletePodcast(slug);
    term('Deleted podcast: ').green(slug + '\n');
  });

program
  .command('refresh')
  .description('Refresh podcast episode lists by adding new episodes from their RSS feeds.')
  .argument('[slug]', 'Slug of the podcast to refresh. If not specified, all podcasts will be refreshed.')
  .option('--overwrite', 'Overwrite existing podcast data in the KV store.')
  .action(async (slug: string, options) => {
    let slugs: string[] = [];
    if (slug) {
      slugs.push(slug);
    } else {
      slugs = await ListPodcasts();
    }
    for (const slug of slugs) {
      const podcast = await GetPodcast(slug);
      if (!podcast.rssUrl) {
        term('Unable to refresh, as podcast is missing RSS URL: ').red(slug + '\n');
        continue;
      }
      const newPodcast = await readPodcastFeed(podcast.rssUrl);
      if (options.overwrite) {
        SetPodcast(newPodcast);
      } else {
        const setPodcast = mergePodcasts(podcast, newPodcast);
        SetPodcast(setPodcast);
      }
      const diff = (newPodcast.episodes?.length ?? 0) - (podcast.episodes?.length ?? 0);
      term('Refreshed podcast: ').green(slug)(` (${newPodcast.episodes?.length} episodes, ${diff} new)\n`);
    }
  });

program
  .command('process [podcast]')
  .description('Process the given podcast, or all podcasts if not specified.')
  .option('-f, --force', 'Force re-processing of already-processed episodes.')
  .option('--no-transcribe', 'Disable audio transcription.')
  .option('--no-summarize', 'Disable summarization.')
  .option('--max-episodes [number]', 'Maximum number of episodes to process.')
  .action(async (podcast: string | null, opts) => {
    const podcasts = podcast ? [podcast] : await ListPodcasts();
    for (const podcastSlug of podcasts) {
      term('Processing: ').green(`${podcastSlug}...\n`);
      const podcast = await GetPodcast(podcastSlug);
      const processed = await ProcessPodcast(podcast, {
        transcribe: opts.transcribe,
        summarize: opts.summarize,
        force: opts.force,
        maxEpisodes: opts.maxEpisodes,
      });
      await SetPodcast(processed);
      term('Finished processing: ').green(`${podcastSlug}\n`);
    }
  });

program
  .command('index [podcast]')
  .description('Generate a Fixie Corpus for the given podcast, or all podcasts if not specified.')
  .option('-f, --force', 'Force re-indexing of already-processed podcasts.')
  .action(async (podcast: string | null, opts) => {
    const podcasts = podcast ? [podcast] : await ListPodcasts();
    for (const podcastSlug of podcasts) {
      term('Indexing: ').green(`${podcastSlug}...\n`);
      const podcast = await GetPodcast(podcastSlug);
      const indexed = await IndexPodcast(podcast, { force: opts.force });
      await SetPodcast(indexed);
      term('Started indexing: ').green(`${podcastSlug}\n`);
    }
  });

program
  .command('summarize <url>')
  .description('Summarize the text content at the given URL.')
  .action(async (url: string) => {
    term(`Summarizing ${url}...`);
    const res = await fetch(url);
    const text = await res.text();
    const result = await Summarize(text);
    term('Summary:\n').green(result + '\n');
  });

program.parse(process.argv);
