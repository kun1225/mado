import { describe, expect, it } from 'vitest';

import { LANDING_FAQ, LANDING_SITE_ORIGIN } from './landing-content';
import { buildLandingJsonLd } from './landing-structured-data';

describe('buildLandingJsonLd', () => {
  const json = buildLandingJsonLd();
  const data = JSON.parse(json);
  const findNode = (type: string) =>
    data['@graph'].find((node: { '@type': string }) => node['@type'] === type);

  it('describes Mado as a free web app', () => {
    const app = findNode('WebApplication');
    expect(app.name).toBe('Mado');
    expect(app.url).toBe(`${LANDING_SITE_ORIGIN}/`);
    expect(app.offers.price).toBe('0');
  });

  it('lists every FAQ question with its answer', () => {
    const faq = findNode('FAQPage');
    expect(faq.mainEntity).toHaveLength(LANDING_FAQ.length);
    expect(faq.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: LANDING_FAQ[0].question,
      acceptedAnswer: { '@type': 'Answer', text: LANDING_FAQ[0].answer },
    });
  });

  it('cannot close the script tag it lives in', () => {
    expect(json).not.toContain('<');
  });
});
