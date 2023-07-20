/**
 * This is the handler for the API route /api/podcast/[podcastSlug].
 */

export const runtime = 'edge'

import { kv } from '@vercel/kv'
import { Podcast } from 'podverse-types'

type RouteSegment = { params: { podcastSlug: string } };

/** Return metadata for the given podcast. */
export async function GET(req: Request, { params } : RouteSegment): Promise<Response> {
  const podcastData = await kv.json.get(`podcasts:${params.podcastSlug}`, '$');
  return new Response(JSON.stringify(podcastData[0] as Podcast), {
    headers: { 'content-type': 'application/json' }
  })
}
