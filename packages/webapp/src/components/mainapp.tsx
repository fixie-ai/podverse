import { Podcasts } from '@/components/podcasts'
import { cn } from '@/lib/utils'

export function MainApp() {
  return (
    <div className={cn('pb-[200px] pt-4 w-8/12 md:pt-10')}>
      <div className="mx-auto px-4">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-md font-mono">
            Welcome to Podverse: an AI-powered podcast search engine!
          </p>
        </div>
        <div className="mx-auto flex justify-center mt-8">
          <Podcasts />
        </div>
      </div>
    </div>
  )
}
