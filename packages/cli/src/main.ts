/**
 * This is a command-line utility to manage the set of Podcasts
 * in the Podverse app.
 */

import { kv } from '@vercel/kv';
import { program } from 'commander';
import Parser from 'rss-parser';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;
import slug from 'slug';
import { Episode, Podcast, GetPodcast, SetPodcast, ListPodcasts } from 'podverse-types';
import { dump, load } from 'js-yaml';
import fs from 'fs';

/** Describes the configuration file YAML format. */
interface ConfigFile {
  podcasts: Podcast[];
}

program.name('ingester').version('0.0.1').description('Ingest a podcast into the Podverse app.');

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
    episodes: episodes,
  };
  return newPodcast;
}

/** Merge two podcasts by keeping existing epiodes from oldPostcast. */
function mergePodcasts(oldPodcast: Podcast, newPodcast: Podcast): Podcast {
  // Retain old corpus ID if one was already set for this podcast, since this does not
  // come from the RSS feed.
  if (oldPodcast.corpusId) {
    newPodcast.corpusId = oldPodcast.corpusId;
  }
  newPodcast.episodes = newPodcast.episodes?.map((newEpisode) => {
    // If the episode exists in oldPodcast, use that.
    const oldEpisode = oldPodcast.episodes?.find((episode) => {
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
  .option('-f, --force', 'Force ingestion even if podcast already exists.')
  .option('--corpus <corpusId>', 'Fixie Corpus ID to use for this podcast.')
  .option('--suggestedQuery <queries...>', 'Suggested queries to use for this podcast.')
  .action(async (podcastUrl: string, options) => {
    const newPodcast = await readPodcastFeed(podcastUrl);
    // TODO: Create Fixie corpus and add this information to the Podcast object,
    // if --corpus is not specified.
    if (options.corpus) {
      newPodcast.corpusId = options.corpus;
    }
    if (options.suggestedQuery) {
      newPodcast.suggestedQueries = options.suggestedQuery;
    }
    SetPodcast(newPodcast);
    console.log(JSON.stringify(newPodcast, null, 4));
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
      if (podcast.episodes) {
        term(` - ${podcast.episodes.length} episodes`);
      } else {
        term.red(' - no episodes');
      }
      term('\n');
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
    for (const slug of slugs) {
      const podcast = await GetPodcast(slug);
      // Strip out the list of episodes, since these are populated from the RSS feed.
      podcast.episodes = undefined;
      config.podcasts.push(podcast);
    }
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
  .action(async (filename: string) => {
    const configFile = load(fs.readFileSync(filename, 'utf8')) as ConfigFile;
    for (const podcastConfig of configFile.podcasts) {
      let podcast = null;
      try {
        // Check to see if it exists.
        podcast = await GetPodcast(podcastConfig.slug);
        term('Updating: ').green(podcastConfig.slug);
      } catch (err) {
        // Assume the podcast does not exist, let's create it.
        term().yellow('Creating: ').green(podcastConfig.slug);
      }
      // Override all fields from the YAML file.
      podcast = podcastConfig;
      // Update the episode list.
      if (podcast.rssUrl) {
        const newPodcast = await readPodcastFeed(podcast.rssUrl);
        podcast.episodes = newPodcast.episodes;
        term(' - ').yellow(podcast.episodes?.length)(' episodes');
      }
      term('\n');
      SetPodcast(podcast);
    }
    term('Reloaded config from ').green(filename);
  });

program
  .command('delete')
  .description('Delete a podcast from the Podverse app.')
  .argument('<slug>', 'Slug of the podcast to delete.')
  .action(async (slug: string) => {
    await kv.del(`podcasts:${slug}`);
    term('Deleted podcast: ').green(slug + '\n');
  });

program
  .command('refresh')
  .description('Refresh the list of podcasts.')
  .argument('[slug]', 'Slug of the podcast to refresh. If not specified, all podcasts will be refreshed.')
  .option('-f, --force', 'Force re-ingestion of podcast episodes.')
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
      let newPodcast = await readPodcastFeed(podcast.rssUrl);
      if (!options.force) {
        newPodcast = mergePodcasts(podcast, newPodcast);
      }
      SetPodcast(newPodcast);
      const diff = (newPodcast.episodes?.length ?? 0) - (podcast.episodes?.length ?? 0);
      term('Refreshed podcast: ').green(slug)(` (${newPodcast.episodes?.length} episodes, ${diff} new)\n`);
    }
  });

program.parse(process.argv);
