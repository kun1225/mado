import { createLocalPreference } from '#/hooks/use-local-preference';

import { SOURCE_CAPTION_POSITIONS } from './source-types';

export function useSourceCaption() {
  const [sourceCaption, setSourceCaption] =
    sourceCaptionPreference.usePreference();

  return { sourceCaption, setSourceCaption };
}

// Per browser, like the theme: it is about how the app looks, not about the account's data.
const sourceCaptionPreference = createLocalPreference({
  key: 'mado:source-caption',
  values: SOURCE_CAPTION_POSITIONS,
  fallback: 'overlay',
});
