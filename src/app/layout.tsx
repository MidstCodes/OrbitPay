import type { Metadata, Viewport } from 'next';
import { APP_NAME, APP_DESCRIPTION } from '@/constants';
import { AppProviders } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - Decentralized Payment Tracking`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'Stellar',
    'blockchain',
    'payments',
    'smart contracts',
    'Soroban',
    'Web3',
    'decentralized',
  ],
  authors: [{ name: 'OrbitPay Team' }],
  creator: 'OrbitPay',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: APP_NAME,
    title: `${APP_NAME} - Decentralized Payment Tracking`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} - Decentralized Payment Tracking`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
