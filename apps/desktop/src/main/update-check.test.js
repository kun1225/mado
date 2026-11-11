import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findUpdate } from './update-check.js';

const RELEASE_URL = 'https://github.com/kun1225/mado/releases/tag/v0.2.0';

function release(tag, extra = {}) {
  return { tag_name: tag, html_url: RELEASE_URL, ...extra };
}

describe('findUpdate', () => {
  it('returns the newer version and its page', () => {
    assert.deepEqual(findUpdate('0.1.0', release('v0.2.0')), {
      version: '0.2.0',
      url: RELEASE_URL,
    });
  });

  it('compares each part as a number, not as text', () => {
    assert.equal(findUpdate('0.9.0', release('v0.10.0'))?.version, '0.10.0');
  });

  it('accepts a tag without the v', () => {
    assert.equal(findUpdate('0.1.0', release('0.1.1'))?.version, '0.1.1');
  });

  it('returns null for the same version', () => {
    assert.equal(findUpdate('0.2.0', release('v0.2.0')), null);
  });

  it('returns null for an older version', () => {
    assert.equal(findUpdate('1.0.0', release('v0.9.9')), null);
  });

  it('returns null for a tag that is not a version', () => {
    assert.equal(findUpdate('0.1.0', release('nightly')), null);
  });

  it('returns null for a draft or a prerelease', () => {
    assert.equal(findUpdate('0.1.0', release('v0.2.0', { draft: true })), null);
    assert.equal(
      findUpdate('0.1.0', release('v0.2.0', { prerelease: true })),
      null,
    );
  });

  it('returns null when the page is not on GitHub', () => {
    const fake = release('v0.2.0', { html_url: 'https://evil.example/mado' });
    assert.equal(findUpdate('0.1.0', fake), null);
  });
});
