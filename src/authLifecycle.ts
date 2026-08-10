export type RestoredAuthSession<T> = {
  session: T;
  expiresAt: number;
};

export async function restoreRetainedSession<T>(options: {
  loadSession: () => Promise<T | null>;
  getRetentionExpiry: () => number | null;
  clearRetention: () => void;
  logoutRemote: () => Promise<void>;
}): Promise<RestoredAuthSession<T> | null> {
  const session = await options.loadSession();
  if (!session) {
    options.clearRetention();
    return null;
  }
  const expiresAt = options.getRetentionExpiry();
  if (expiresAt !== null) return { session, expiresAt };

  options.clearRetention();
  await options.logoutRemote().catch(() => undefined);
  return null;
}

export async function logoutAndClearSession(options: {
  logoutRemote: () => Promise<void>;
  clearLocalSession: () => void;
}) {
  let logoutError: unknown = null;
  try {
    await options.logoutRemote();
  } catch (error) {
    logoutError = error;
  } finally {
    options.clearLocalSession();
  }
  return logoutError;
}
