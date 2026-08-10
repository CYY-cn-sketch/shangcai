export type GenerationArtifactType = "PPT" | "VIDEO";
export type GenerationProvider = "LEXIANG" | "WORKBUDDY";
export type GenerationJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

export type SubmitGenerationJobInput = {
  artifactType: GenerationArtifactType;
  projectId: string;
  conversationId: string;
  ideaId?: string;
  expertId: string;
  contextSnapshot: unknown;
  idempotencyKey: string;
  costConfirmed?: boolean;
};

export type GenerationJob = {
  id: string;
  provider: GenerationProvider;
  artifactType: GenerationArtifactType;
  projectId: string;
  conversationId: string;
  ideaId?: string | null;
  expertId: string;
  idempotencyKey: string;
  status: GenerationJobStatus;
  artifactUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

type CsrfResponse = {
  headerName: string;
  token: string;
};

type ErrorResponse = {
  message?: string;
};

async function parseError(response: Response) {
  const result = (await response.json().catch(() => ({}))) as ErrorResponse;
  return result.message || `请求失败：HTTP ${response.status}`;
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as CsrfResponse;
}

export async function submitGenerationJob(input: SubmitGenerationJobInput): Promise<GenerationJob> {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/generation/jobs", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as GenerationJob;
}

export async function loadGenerationJob(jobId: string): Promise<GenerationJob> {
  const response = await fetch(`/api/generation/jobs/${encodeURIComponent(jobId)}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as GenerationJob;
}
