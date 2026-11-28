export type FeedbackEntry = {
  message: string;
  email: string;
};

export type FeedbackRateLimit = {
  windowMs: number;
  max: number;
};

// One call checks the limit and saves, so parallel sends can't all pass the check.
// The store takes the raw IP and hashes it, so the route never handles the hash.
export type FeedbackStore = {
  /** Resolves false, saving nothing, when the IP already reached the limit. */
  saveWithinLimit: (
    entry: FeedbackEntry,
    ip: string,
    limit: FeedbackRateLimit,
  ) => Promise<boolean>;
};
