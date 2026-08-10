export type PostMutationRefreshOutcome =
  | { refreshed: true; error?: never }
  | { refreshed: false; error: unknown };

export async function attemptPostMutationRefresh(
  refresh: () => Promise<void>,
): Promise<PostMutationRefreshOutcome> {
  try {
    await refresh();
    return { refreshed: true };
  } catch (error) {
    return { refreshed: false, error };
  }
}
