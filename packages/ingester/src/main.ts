import { kv } from '@vercel/kv';
import { program } from 'commander';
import Parser from 'rss-parser';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;
import slug from 'slug';
import { Episode, Podcast } from 'podverse-types';

program.name('ingester').version('0.0.1').description('Ingest a podcast into the Podverse app.');

/** Return metadata for the given podcast. */
async function getPodcast(slug: string): Promise<Podcast> {
  const podcastData = await kv.json.get(`podcasts:${slug}`, '$');
  return podcastData[0] as Podcast;
}

/** Set metadata for the given podcast. */
async function setPodcast(podcast: Podcast) {
  await kv.json.set(`podcasts:${podcast.slug}`, '$', podcast);
}

/** Return a list of all podcast slugs. */
async function listPodcasts(): Promise<string[]> {
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

/** Read the given RSS feed URL and return it as a Podcast object. */
async function readPodcastFeed(podcastUrl: string): Promise<Podcast> {
  // Read the RSS feed metadata.
  const parser = new Parser();
  const feed = await parser.parseURL(podcastUrl);
  if (!feed.title) {
    throw new Error('No title found for podcast.');
  }
  const titleSlug = slug(feed.title!);
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
    setPodcast(newPodcast);
    console.log(JSON.stringify(newPodcast, null, 4));
  });

program
  .command('list')
  .description('List all podcasts in the Podverse app.')
  .action(async () => {
    const slugs = await listPodcasts();
    for (const slug of slugs) {
      const podcast = await getPodcast(slug);
      term(slug + ': ')
        .green(podcast.title + ' ')
        .blue(podcast.rssUrl);
      if (podcast.corpusId) {
        term(` (corpus: ${podcast.corpusId})`);
      } else {
        term.red(' (no corpus)');
      }
      term('\n');
    }
  });

program
  .command('get')
  .description('Get a podcast from the Podverse app.')
  .argument('<slug>', 'Slug of the podcast to get.')
  .action(async (slug: string) => {
    const podcast = await getPodcast(slug);
    console.log(JSON.stringify(podcast, null, 4));
  });

program
  .command('update')
  .description('Update metadata for a given podcast.')
  .argument('<slug>', 'Slug of the podcast to update.')
  .option('--corpus <corpusId>', 'Fixie Corpus ID to use for this podcast.')
  .option('--suggestedQuery <queries...>', 'Suggested queries to use for this podcast.')
  .action(async (slug: string, options) => {
    const podcast = await getPodcast(slug);
    podcast.corpusId = options.corpusId;
    if (options.suggestedQuery) {
      if (!podcast.suggestedQueries) {
        podcast.suggestedQueries = [];
      }
      podcast.suggestedQueries = podcast.suggestedQueries.concat(options.suggestedQuery);
    }
    setPodcast(podcast);
    console.log(JSON.stringify(podcast, null, 4));
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
  .action(async (slug: string) => {
    let slugs: string[] = [];
    if (slug) {
      slugs.push(slug);
    } else {
      slugs = await listPodcasts();
    }
    for (const slug of slugs) {
      const podcast = await getPodcast(slug);
      if (!podcast.rssUrl) {
        term('Unable to refresh, as podcast is missing RSS URL: ').red(slug + '\n');
        continue;
      }
      const newPodcast = await readPodcastFeed(podcast.rssUrl);
      // Retain old corpus ID if one was already set for this podcast, since this does not
      // come from the RSS feed.
      if (podcast.corpusId) {
        newPodcast.corpusId = podcast.corpusId;
      }
      setPodcast(newPodcast);
      term('Refreshed podcast: ').green(slug + '\n');
    }
  });

program.parse(process.argv);
