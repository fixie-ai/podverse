import { SearchBox } from '@/components/searchbox';

export default function PodcastPage({ params }: { params: { podcastSlug: string } }) {
  return (
    <div className="w-full max-w-5xl mt-8">
      <div className="w-full flex justify-center mt-8">
        <SearchBox podcastSlug={params.podcastSlug} endpoint={'../api/podcasts/query'} />
      </div>
    </div>
  );
}
