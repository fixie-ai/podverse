import { Logo } from '@/components/logo';

export function AppHeader() {
  return (
    <div className="z-10 w-full max-w-5xl items-center justify-between lg:flex">
      <div className="font-mono text-lg">Podverse.ai</div>
      <div className="fixed top-0 left-0 flex h-48 w-full items-end justify-center lg:static lg:h-auto lg:w-auto lg:bg-none">
        <Logo />
      </div>
    </div>
  );
}
