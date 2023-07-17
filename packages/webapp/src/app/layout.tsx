import { PageBase } from '@/components/page-wrapper';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Podverse.ai',
  description: 'The Podcast AI Search Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PageBase>{children}</PageBase>
      </body>
    </html>
  );
}
