import Image from 'next/image';

import { SearchBox } from '@/components/searchbox';
import { Podcasts } from '@/components/podcasts';

export function MainApp() {
  return (
    <div className="w-full max-w-5xl mt-8">
      <div className="font-mono text-md p-4 border-2 border-slate-700 rounded-md">
        Podverse is an AI-powered podcast search engine.
      </div>
      <div className="w-full flex justify-center mt-8">
        <SearchBox />
      </div>
      <div className="w-full flex justify-center mt-8">
        <Podcasts />
      </div>
    </div>
  );
}
