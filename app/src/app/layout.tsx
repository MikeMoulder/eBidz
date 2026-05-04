import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SolanaProviders } from '@/components/providers/SolanaProviders';
import './globals.css';

// Inter is the closest free, well-supported neo-grotesque to Arcium's Aeonik Pro.
// JetBrains Mono provides the technical/monospace counterpoint.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const interDisplay = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800', '900'],
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
      className={`${inter.variable} ${interDisplay.variable} ${jetbrainsMono.variable}`}
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
