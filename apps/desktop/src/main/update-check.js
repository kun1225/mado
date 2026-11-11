const LATEST_RELEASE_API =
  'https://api.github.com/repos/kun1225/mado/releases/latest';
const RELEASE_PAGE_PREFIX = 'https://github.com/kun1225/mado/releases/';
const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

/**
 * Asks GitHub for the newest release. The app is not signed by Apple, so it can't
 * replace itself; the best it can do is point the user to the new download.
 */
export async function checkForUpdate(currentVersion) {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub answered ${response.status} for the latest release`,
    );
  }
  return findUpdate(currentVersion, await response.json());
}

// *** findUpdate ***
// The page is opened in the browser, so only a GitHub release page of this repo is trusted.
function findUpdate(currentVersion, release) {
  if (release.draft || release.prerelease) return null;
  if (!release.html_url?.startsWith(RELEASE_PAGE_PREFIX)) return null;

  const latest = parseVersion(release.tag_name);
  const current = parseVersion(currentVersion);
  if (!latest || !current || compareVersions(latest, current) <= 0) {
    return null;
  }
  return { version: latest.join('.'), url: release.html_url };
}

// *** parseVersion ***
function parseVersion(text) {
  const match = VERSION_PATTERN.exec(text ?? '');
  return match ? match.slice(1).map(Number) : null;
}

// *** compareVersions ***
function compareVersions(a, b) {
  const index = a.findIndex((part, i) => part !== b[i]);
  return index === -1 ? 0 : a[index] - b[index];
}

export { findUpdate };
