import type { Metadata } from 'next';
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SolanaProviders } from '@/components/providers/SolanaProviders';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['300', '400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'eBidz',
  description:
    'Fair, manipulation-resistant onchain auctions powered by Arcium MPC. Bids stay encrypted until the auction closes.',
  metadataBase: new URL('https://ebidz.app'),
  openGraph: {
    title: 'eBidz',
    description:
      'Fair, manipulation-resistant onchain auctions powered by Arcium MPC.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        <SolanaProviders>
          <Navbar />
          <main className="relative">{children}</main>
          <Footer />
        </SolanaProviders>
      </body>
    </html>
  );
}
