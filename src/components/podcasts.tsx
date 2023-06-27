import { PodcastCard } from "@/components/podcastcard";

export function Podcasts() {

    return (
        <div className="w-full grid grid-cols-3 gap-4 p-12">
            <PodcastCard title="The Omnibus Project" />
            <PodcastCard title="99% Invisible" />
            <PodcastCard title="A Problem Squared" />
            <PodcastCard title="Stuff You Should Know" />
        </div>
    );


}