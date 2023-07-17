import { kv } from '@vercel/kv';
import { program } from 'commander';
import Parser from 'rss-parser';
import terminal from 'terminal-kit';
const { terminal: term } = terminal;
import slug from 'slug';

program.name('ingester').version('0.0.1').description('Ingest a podcast into the Podverse app.');

type Podcast = {
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;
  corpusId?: string;
};

program
  .command('ingest <podcastUrl>')
  .option('-f, --force', 'Force ingestion even if podcast already exists.')
  .action(async (podcastUrl: string) => {
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
    if (podcasts && !program.opts().force) {
      term.red('Podcast already exists. Aborting.\n');
      term.red('  (Use --force to override.)\n');
      return;
    }

    const newPodcast: Podcast = {
      slug: titleSlug,
      title: feed.title,
      description: feed.description,
      imageUrl: feed.image?.url,
    };

    // Write the podcast to KV.
    await kv.json.set(`podcasts:${titleSlug}`, '$', newPodcast);
    term('Wrote: ').blue(JSON.stringify(newPodcast) + '\n');

    // TODO: Create Fixie corpus and add this information to the Podcast object.
  });

program.parse(process.argv);
