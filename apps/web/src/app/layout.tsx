import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { QueryProvider } from '@/providers/query-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'FlowSpace — Collaborative Project Management SaaS',
  description:
    'Modern, collaborative project management platform combining Trello Kanban simplicity, Linear sleek UX, and Jira workflow power.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
