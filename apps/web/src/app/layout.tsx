import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NavbarT2 from '@/templates/template-two/components/Navbar';
import FooterT2 from '@/templates/template-two/components/Footer';
import NavbarT3 from '@/templates/template-three/components/Navbar';
import FooterT3 from '@/templates/template-three/components/Footer';
import JsonLd from '@/components/seo/JsonLd';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { getSettings } from '@/lib/resort-api';
import { siteUrl } from '@/lib/site';
import logoMark from '@/assets/logo-mark.png';
import logoFull from '@/assets/logo-full.png';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Pina Vista | Sreemangal',
    template: '%s | Pina Vista',
  },
  description:
    'Peaceful eco-friendly resort near Sreemangal—tea gardens, green trails, and calm hospitality. Book your stay in nature.',
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    siteName: 'Pina Vista',
    title: 'Pina Vista | Sreemangal',
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
  const isT2 = settings.activeTemplate === 'template-two';
  const isT3 = settings.activeTemplate === 'template-three';
  // Admin → Settings → Logo URL overrides the bundled pineapple mark.
  const logoSrc = settings.logoUrl || logoMark.src;

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
    logo: `${siteUrl}${logoFull.src}`,
  };

  return (
    <html lang="en">
      <head>
        {/* Runtime browser config: PUBLIC_API_URL is set by docker-compose at start-up, so the
            public API URL does not have to be known when the image is built (see lib/resort-api). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__=${JSON.stringify({ API_URL: process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || '' })};`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`font-sans overflow-x-hidden${isT2 ? ' bg-[#09100a] text-forest-100' : isT3 ? ' bg-[#030d04] text-[#e8f5e9]' : ''}`}>
        <JsonLd data={jsonLd} />
        <LanguageProvider>
          {isT3 ? (
            <NavbarT3
              resortName={settings.resortName}
              resortNameBn={settings.resortNameBn}
              phone={settings.phone}
              email={settings.email}
              logoSrc={logoSrc}
            />
          ) : isT2 ? (
            <NavbarT2
              resortName={settings.resortName}
              resortNameBn={settings.resortNameBn}
              phone={settings.phone}
              email={settings.email}
              logoSrc={logoSrc}
            />
          ) : (
            <Navbar
              resortName={settings.resortName}
              resortNameBn={settings.resortNameBn}
              phone={settings.phone}
              email={settings.email}
              logoSrc={logoSrc}
            />
          )}
          <main className="min-h-screen">{children}</main>
          {isT3 ? (
            <FooterT3 settings={settings} logoSrc={logoSrc} />
          ) : isT2 ? (
            <FooterT2 settings={settings} logoSrc={logoSrc} />
          ) : (
            <Footer settings={settings} logoSrc={logoSrc} />
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
