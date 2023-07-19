import { Podcasts } from '@/components/podcasts'
import { cn } from '@/lib/utils'

export function MainApp() {
  return (
    <div className={cn('pb-[200px] pt-4 md:pt-10')}>
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-lg border bg-background p-8">
          <h1 className="mb-2 text-lg font-semibold">
            Welcome to Podverse: an AI-powered podcast search engine!
          </h1>
        </div>
        <div className="mx-auto flex justify-center mt-8">
          <Podcasts />
        </div>
      </div>
    </div>
  )
}
