import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { getSettings } from '@/lib/resort-api';
import { siteUrl } from '@/lib/site';
import logo from '@/assets/logo.jpg';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Nirjon Nature Escape | Sreemangal',
    template: '%s | Nirjon Nature Escape',
  },
  description:
    'Peaceful eco-friendly resort near Sreemangal—tea gardens, green trails, and calm hospitality. Book your stay in nature.',
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    siteName: 'Nirjon Nature Escape',
    title: 'Nirjon Nature Escape | Sreemangal',
    description:
      'Peaceful eco-friendly resort—tea gardens, swimming pool, and seasonal dining.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: settings.resortName,
    description: settings.aboutShort,
    url: siteUrl,
    telephone: settings.phone,
    email: settings.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressCountry: 'BD',
    },
    image: settings.heroImage,
    logo: `${siteUrl}${logo.src}`,
  };

  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans overflow-x-hidden">
        <JsonLd data={jsonLd} />
        <LanguageProvider>
          <Navbar 
              resortName={settings.resortName} 
              resortNameBn={settings.resortNameBn} 
              phone={settings.phone} 
              email={settings.email} 
              logoSrc={logo.src} 
            />
          <main className="min-h-screen">{children}</main>
          <Footer settings={settings} logoSrc={logo.src} />
        </LanguageProvider>
      </body>
    </html>
  );
}
