import { SearchBox } from '@/components/searchbox';

export default function PodcastPage({ params }: { params: { podcast_id: string } }) {
  return (
    <div className="w-full max-w-5xl mt-8">
      <div className="w-full flex justify-center mt-8">
        <SearchBox podcast_id={params.podcast_id} endpoint={'../api/podcasts/query'} />
      </div>
    </div>
  );
}
