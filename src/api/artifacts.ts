export type RemoteArtifact = {
  id: string;
  ideaId: string;
  sourceMessageId?: string;
  artifactType: string;
  title: string;
  summary: string;
  content: unknown;
  fileAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RemoteSubmission = {
  id: string;
  artifactId: string;
  submissionVersion: number;
  ideaId: string;
  sourceMessageId?: string;
  student: string;
  group: string;
  groupName?: string;
  artifactType: string;
  artifactTitle: string;
  artifactSummary: string;
  content: unknown;
  status: "PENDING" | "APPROVED" | "REVISION" | "WITHDRAWN";
  teacherComment?: string;
  aiDiagnosis?: TeacherAiDiagnosis;
  excellent: boolean;
  submittedAt: string;
  reviewedAt?: string;
  updatedAt: string;
};

export type TeacherAiDiagnosis = {
  summary?: string;
  problems: string[];
  risks: string[];
  questions: string[];
  tasks: string[];
  scores?: Array<{ name: string; score: number; reason?: string }>;
  feedbackDraft?: string;
};

export type SaveArtifactInput = {
  ideaId: string;
  sourceMessageId?: string;
  artifactType: string;
  title: string;
  summary: string;
  content: unknown;
};

export type ReviewSubmissionInput = {
  status?: "PENDING" | "APPROVED" | "REVISION";
  teacherComment?: string;
  excellent?: boolean;
};

type CsrfResponse = { headerName: string; token: string };
type ErrorResponse = { message?: string };

async function parseError(response: Response) {
  const result = (await response.json().catch(() => ({}))) as ErrorResponse;
  return result.message || `请求失败：HTTP ${response.status}`;
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as CsrfResponse;
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
}

async function mutateJson<T>(url: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const csrf = await getCsrfToken();
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      [csrf.headerName]: csrf.token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
}

async function mutateWithoutResponse(url: string, method: "POST" | "DELETE") {
  const csrf = await getCsrfToken();
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export function listStudentArtifacts() {
  return readJson<RemoteArtifact[]>("/api/student/artifacts");
}

export function saveStudentArtifact(input: SaveArtifactInput) {
  return mutateJson<RemoteArtifact>("/api/student/artifacts", "POST", input);
}

export async function uploadStudentArtifactPptx(artifactId: string, file: File) {
  const csrf = await getCsrfToken();
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await fetch(`/api/student/artifacts/${encodeURIComponent(artifactId)}/pptx`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", [csrf.headerName]: csrf.token },
    body: form,
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as RemoteArtifact;
}

export function submitStudentArtifact(artifactId: string) {
  return mutateJson<RemoteSubmission>(`/api/student/artifacts/${encodeURIComponent(artifactId)}/submit`, "POST");
}

export function recordArtifactClientDownload(artifactId: string) {
  return mutateWithoutResponse(`/api/student/artifacts/${encodeURIComponent(artifactId)}/download-events`, "POST");
}

export function listStudentSubmissions() {
  return readJson<RemoteSubmission[]>("/api/student/submissions");
}

export function withdrawStudentSubmission(submissionId: string) {
  return mutateJson<RemoteSubmission>(`/api/student/submissions/${encodeURIComponent(submissionId)}/withdraw`, "PATCH");
}

export function deleteStudentSubmission(submissionId: string) {
  return mutateWithoutResponse(`/api/student/submissions/${encodeURIComponent(submissionId)}`, "DELETE");
}

export function listTeacherSubmissions() {
  return readJson<RemoteSubmission[]>("/api/teacher/submissions");
}

export function reviewTeacherSubmission(submissionId: string, input: ReviewSubmissionInput) {
  return mutateJson<RemoteSubmission>(`/api/teacher/submissions/${encodeURIComponent(submissionId)}`, "PATCH", input);
}

export function diagnoseTeacherSubmission(submissionId: string) {
  return mutateJson<TeacherAiDiagnosis>(
    `/api/teacher/submissions/${encodeURIComponent(submissionId)}/ai-diagnosis`,
    "POST",
  );
}

export function artifactDownloadUrl(artifactId: string) {
  return `/api/artifacts/${encodeURIComponent(artifactId)}/download`;
}
