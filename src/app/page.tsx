import { AppHeader } from '@/components/app-header';
import { MainApp } from '@/components/mainapp';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-24">
      <AppHeader />
      <MainApp />
    </main>
  );
}
