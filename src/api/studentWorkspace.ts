export type RemoteStudentIdea = {
  id: string;
  title: string;
  description: string;
  stage: string;
  createdAt: string;
  updatedAt: string;
};

export type RemoteConversationMessage = {
  id: string;
  clientMessageId: string;
  ideaId: string;
  sender: "USER" | "AI";
  inputMode?: string;
  expertId?: string;
  expertName?: string;
  skillName?: string;
  artifactType?: string;
  content: string;
  blocks?: unknown;
  createdAt: string;
};

export type RemoteStudentConversation = {
  id: string;
  ideaId: string;
  selectedExpertId: string;
  selectedSkillId: string;
  modelMode: string;
  knowledgeSelection: unknown;
  messages: RemoteConversationMessage[];
  updatedAt: string;
};

export type RemoteStudentWorkspace = {
  ideas: RemoteStudentIdea[];
  conversations: RemoteStudentConversation[];
};

export type ConversationSettingsInput = {
  selectedExpertId: string;
  selectedSkillId: string;
  modelMode: string;
  knowledgeSelection: unknown;
};

export type AppendMessageInput = {
  clientMessageId: string;
  sender: "USER" | "AI";
  inputMode?: string;
  expertId?: string;
  expertName?: string;
  skillName?: string;
  artifactType?: string;
  content: string;
  blocks?: unknown;
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
  return result.message || "请求失败：HTTP " + response.status;
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

async function mutateJson<T>(url: string, method: "POST" | "PATCH" | "PUT", body: unknown): Promise<T> {
  const csrf = await getCsrfToken();
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as T;
}

export function loadStudentWorkspace() {
  return readJson<RemoteStudentWorkspace>("/api/student/workspace");
}

export function createStudentIdea(input: Pick<RemoteStudentIdea, "title" | "description" | "stage">) {
  return mutateJson<RemoteStudentIdea>("/api/student/ideas", "POST", input);
}

export function updateStudentIdea(
  ideaId: string,
  input: Partial<Pick<RemoteStudentIdea, "title" | "description" | "stage">>,
) {
  return mutateJson<RemoteStudentIdea>("/api/student/ideas/" + encodeURIComponent(ideaId), "PATCH", input);
}

export async function deleteStudentIdea(ideaId: string) {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/student/ideas/" + encodeURIComponent(ideaId), {
    method: "DELETE",
    credentials: "include",
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export function saveStudentConversation(ideaId: string, input: ConversationSettingsInput) {
  return mutateJson<RemoteStudentConversation>(
    "/api/student/ideas/" + encodeURIComponent(ideaId) + "/conversation",
    "PUT",
    input,
  );
}

export function appendStudentMessage(ideaId: string, input: AppendMessageInput) {
  return mutateJson<RemoteConversationMessage>(
    "/api/student/ideas/" + encodeURIComponent(ideaId) + "/messages",
    "POST",
    input,
  );
}
