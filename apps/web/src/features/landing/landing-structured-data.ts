import {
  LANDING_DESCRIPTION,
  LANDING_FAQ,
  LANDING_SITE_ORIGIN,
} from './landing-content';

/** JSON-LD for the landing page, so search and AI answer tools can read what Mado is and quote the FAQ. */
export function buildLandingJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [buildWebApplication(), buildFaqPage()],
  };
  // The JSON sits inside a <script> tag, so a "<" in the copy must not end it early.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// *** buildWebApplication ***
function buildWebApplication() {
  return {
    '@type': 'WebApplication',
    name: 'Mado',
    url: `${LANDING_SITE_ORIGIN}/`,
    description: LANDING_DESCRIPTION,
    image: `${LANDING_SITE_ORIGIN}/og.png`,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any modern web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };
}

// *** buildFaqPage ***
function buildFaqPage() {
  return {
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
