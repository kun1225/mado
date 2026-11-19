export type WorkerEnv = {
  HYPERDRIVE: { connectionString: string };
};

export type WorkerContext = {
  waitUntil: (promise: Promise<unknown>) => void;
};
