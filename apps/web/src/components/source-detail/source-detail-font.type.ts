export type SourceDetailFontView = 'Cover' | 'Waterfall' | 'Glyphs';

/** The cover sentence being typed in the sidebar, shared with the poster. */
export type SourceDetailFontSample = {
  draft: string;
  error: string | null;
  isDirty: boolean;
  /** What the poster draws: the default while the box is empty. */
  sentence: string;
  setDraft: (draft: string) => void;
  commit: () => void;
  revert: () => void;
};
