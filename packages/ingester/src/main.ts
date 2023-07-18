import { kv } from '@vercel/kv';
import { program } from 'commander';
import Parser from 'rss-parser';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;
import slug from 'slug';
import { Episode, Podcast } from 'podverse-types';

program.name('ingester').version('0.0.1').description('Ingest a podcast into the Podverse app.');

program
  .command('ingest')
  .description('Ingest a podcast into the Podverse app.')
  .argument('<podcastUrl>', 'URL of the podcast RSS feed.')
  .option('-f, --force', 'Force ingestion even if podcast already exists.')
  .option('--corpus [corpusId]', 'Fixie Corpus ID to use for this podcast.')
  .action(async (podcastUrl: string, options) => {
    // Read the RSS feed metadata.
    const parser = new Parser();
    const feed = await parser.parseURL(podcastUrl);
    term('Found podcast: ').green(feed.title + '\n');
    if (!feed.title) {
      term('No title found for podcast. Aborting.\n').red();
      return;
    }
    const titleSlug = slug(feed.title);
    term('Slug: ').green(titleSlug + '\n');

    // Read the podcast from KV.
    const podcasts = (await kv.json.get('podcasts:' + titleSlug, '$')) as Podcast[];
    if (podcasts && !options.force) {
      term.red('Podcast already exists. Aborting.\n');
      term.red('  (Use --force to override.)\n');
      return;
    }

    const episodes: Episode[] = feed.items.map((entry) => {
      return {
        title: entry.title ?? 'Untitled',
        description: entry.description,
        url: entry.link,
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
      corpusId: options.corpus,
      episodes: episodes,
    };

    // Write the podcast to KV.
    await kv.json.set(`podcasts:${titleSlug}`, '$', newPodcast);
    console.log(JSON.stringify(newPodcast, null, 4));

    // TODO: Create Fixie corpus and add this information to the Podcast object,
    // if --corpus is not specified.
  });

program
  .command('list')
  .description('List all podcasts in the Podverse app.')
  .action(async () => {
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

    for (const slug of slugs) {
      const podcast = await kv.json.get(`podcasts:${slug}`, '$');
      term(slug + ': ').green(podcast[0].title + '\n');
    }
  });

program
  .command('get')
  .description('Get a podcast from the Podverse app.')
  .argument('<slug>', 'Slug of the podcast to get.')
  .action(async (slug: string) => {
    const podcast = await kv.json.get(`podcasts:${slug}`, '$');
    console.log(JSON.stringify(podcast[0], null, 4));
  });

program
  .command('delete')
  .description('Delete a podcast from the Podverse app.')
  .argument('<slug>', 'Slug of the podcast to delete.')
  .action(async (slug: string) => {
    await kv.del(`podcasts:${slug}`);
    term('Deleted podcast: ').green(slug + '\n');
  });

program.parse(process.argv);
