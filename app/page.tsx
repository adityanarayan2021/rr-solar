import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import WhyUs from '@/components/WhyUs';
import Segments from '@/components/Segments';
import Process from '@/components/Process';
import CtaBanner from '@/components/CtaBanner';
import Faq from '@/components/Faq';
import Projects from '@/components/Projects';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import WhatsAppFab from '@/components/WhatsAppFab';
import { faqs, services, site } from '@/lib/site';
import { listProjects } from '@/lib/server/projects.service';
import { mediaUrl } from '@/lib/project-types';

/**
 * Structured data. LocalBusiness drives the Google Business / map panel,
 * FAQPage can win an expandable rich result in search listings.
 */
const localBusiness = {
  '@context': 'https://schema.org',
  '@type': 'ElectricalContractor',
  '@id': `${site.url}#business`,
  name: site.name,
  description:
    'MNRE-approved solar EPC company in Lucknow offering rooftop, residential, commercial and industrial solar installation, solar water pumps, street lights, net metering assistance and turnkey projects.',
  slogan: site.tagline,
  url: site.url,
  email: site.email,
  telephone: site.phones.map((p) => `+91${p}`),
  priceRange: '₹₹',
  currenciesAccepted: 'INR',
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.city,
    postalCode: site.address.postalCode,
    addressRegion: site.address.region,
    addressCountry: site.address.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: 26.8467, longitude: 80.9462 },
  areaServed: [
    { '@type': 'City', name: 'Lucknow' },
    { '@type': 'State', name: 'Uttar Pradesh' },
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00',
    },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Solar Services',
    itemListElement: services.map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: s.title, description: s.blurb, areaServed: 'Lucknow, Uttar Pradesh' },
    })),
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

/** Rebuilt at most every 5 minutes, and immediately whenever a project photo
 *  changes (the projects API calls revalidatePath('/')). Keeps the page static
 *  and fast while still being editable from the admin panel. */
export const revalidate = 300;

export default async function Page() {
  // A database hiccup must never take the public website down.
  const projects = await listProjects({ publishedOnly: true }).catch(() => []);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <main>
        <Hero />
        <Services />
        <WhyUs />
        <Segments />
        <Process />
        <Projects projects={projects} />
        <CtaBanner />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
