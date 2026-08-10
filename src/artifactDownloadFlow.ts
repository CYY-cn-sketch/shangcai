export type ArtifactDownloadOutcome =
  | { recorded: true; recordError?: never }
  | { recorded: false; recordError?: unknown };

export async function downloadThenRecord(
  download: () => void | Promise<void>,
  record?: () => Promise<void>,
): Promise<ArtifactDownloadOutcome> {
  await download();
  if (!record) return { recorded: false };
  try {
    await record();
    return { recorded: true };
  } catch (recordError) {
    return { recorded: false, recordError };
  }
}
