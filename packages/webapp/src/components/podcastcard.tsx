export function PodcastCard({
  title,
  imageUrl,
  slug
}: {
  title: string
  imageUrl: string
  slug: string
}) {
  return (
    <a href={`/podcasts/${slug}`}>
      <div className="w-full border-2 border-slate-700 rounded-md">
        <div className="font-mono text-md p-4">{title}</div>
        <img src={imageUrl} />
      </div>
    </a>
  )
}
