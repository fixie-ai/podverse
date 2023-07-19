// import { SearchBox } from '@/components/searchbox';

// export default function PodcastPage({ params }: { params: { podcastSlug: string } }) {
//   return (
//     <div className="w-full max-w-5xl mt-8">
//       <div className="w-full flex justify-center mt-8">
//         <SearchBox podcastSlug={params.podcastSlug} endpoint={'../api/podcasts/query'} />
//       </div>
//     </div>
//   );
// }

import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'

export const runtime = 'edge'

export default function IndexPage() {
  const id = nanoid()

  return <Chat id={id} apiPath="/api/podcasts/query" />
}
