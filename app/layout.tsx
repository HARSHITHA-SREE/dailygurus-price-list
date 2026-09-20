import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

export const metadata: Metadata = {
  title: 'DailyGurus Price List - Daily Wholesale Price List for Vegetables & Fruits',
  description: 'Check today\'s verified wholesale market prices for vegetables and fruits at Koyambedu Mandi, Chennai. Updated daily with transparent bulk rates.',
  keywords: [
    'DailyGurus',
    'Koyambedu market price',
    'wholesale vegetable price Chennai',
    'wholesale fruit price',
    'daily vegetable rates Tamil Nadu',
    'mandi price list',
    'Chennai wholesale produce',
  ],
  authors: [{ name: 'DailyGurus' }],
  openGraph: {
    type: 'website',
    title: 'DailyGurus Price List - Daily Wholesale Price List for Vegetables & Fruits',
    description: 'Check today\'s verified wholesale market prices for vegetables and fruits at Koyambedu Mandi, Chennai. Updated daily with transparent bulk rates.',
    url: 'https://pricelist.reginaldalfret.tech',
    siteName: 'DailyGurus Price List',
    images: [
      {
        url: '/assets/images/hero-produce.jpg',
        width: 1000,
        height: 428,
        alt: 'DailyGurus Fresh Farm Produce Wholesale Rates',
      },
    ],
  },
  icons: {
    icon: '/assets/images/logo.svg',
    shortcut: '/assets/images/logo.svg',
    apple: '/assets/images/logo.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/assets/css/style.css" />
      </head>
      <body>
        <GoogleAnalytics />
        <Header />
        <main id="mainContent">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
