/**
 * This is the handler for the API route /api/podcasts.
 */

export const runtime = 'edge';

import { kv } from '@vercel/kv';

/** Return a list of all podcasts. */
export async function GET(req: Request): Promise<Response> {
  const podcasts = await kv.scan(0, { match: 'podcasts:*' });
  // The keys are the second entry in the list, after the cursor.
  const keys = podcasts[1];
  const podcastData = await Promise.all(
    keys.map(async (key) => {
      const podcast = await kv.json.get(key, '$');
      return podcast[0];
    })
  );
  return new Response(JSON.stringify(podcastData), {
    headers: { 'content-type': 'application/json' },
  });
}
