export type FeedbackEntry = {
  message: string;
  /** Null when the sender leaves it empty, so we can't reply. */
  email: string | null;
};

export type SaveFeedback = (entry: FeedbackEntry) => Promise<void>;
