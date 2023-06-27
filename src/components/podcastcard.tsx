export function PodcastCard({ title } : { title: string }) {
  return (
    <div className="w-full border-2 border-slate-700 rounded-md">
      <div className="font-mono text-md p-4">{title}</div>
    </div>
  );
}
