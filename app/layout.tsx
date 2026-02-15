import type { Metadata } from 'next';
import { Cormorant_Garamond, Fraunces } from 'next/font/google';
import './globals.css';

const bodyFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body'
});

const displayFont = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display'
});

export const metadata: Metadata = {
  title: 'StreamlinePRO',
  description: 'Asana-style work orchestration for focused teams.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
