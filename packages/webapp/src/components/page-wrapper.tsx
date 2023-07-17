'use client';
import { createTheme, NextUIProvider } from '@nextui-org/react';
import * as React from 'react';

import { AppHeader } from '@/components/app-header';

const darkTheme = createTheme({
  type: 'dark',
  theme: {
    // colors: {...},
  },
});

export function PageBase({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider theme={darkTheme}>
      <main className="flex min-h-screen flex-col items-center justify-start p-24">
        <AppHeader />
        {children}
      </main>
    </NextUIProvider>
  );
}
