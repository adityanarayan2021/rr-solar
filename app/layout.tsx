import type { Metadata, Viewport } from 'next';
import './globals.css';
import Analytics from '@/components/Analytics';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: 'Solar Panel Installation in Lucknow | RR Solar Solutions',
    template: '%s | RR Solar Solutions',
  },
  description:
    'MNRE and UPNEDA certified solar company in Lucknow. Rooftop, residential, commercial and industrial solar, solar water pumps, street lights, net metering assistance and EPC turnkey projects. Free site survey and subsidy support.',
  applicationName: site.name,
  keywords: [
    'solar panel installation Lucknow',
    'rooftop solar Lucknow',
    'solar company in Lucknow',
    'solar panel price Lucknow',
    'net metering Lucknow',
    'PM Surya Ghar subsidy Uttar Pradesh',
    'commercial solar Uttar Pradesh',
    'solar water pump UP',
    'solar street lights Lucknow',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: site.url,
    siteName: site.name,
    title: 'RR Solar Solutions | Complete Solar Energy Partner, Lucknow',
    description:
      'MNRE and UPNEDA certified rooftop and industrial solar in Lucknow. Free site survey, transparent pricing, full net-metering and subsidy support.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RR Solar Solutions | Solar Installation in Lucknow',
    description: 'MNRE and UPNEDA certified solar EPC. Free site survey, subsidy and net-metering handled end to end.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'Solar Energy',
  // Paste the token from Google Search Console here to verify ownership.
  verification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: '#0E2A5C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
