export type RemoteDefensePractice = {
  id: string;
  ideaId: string;
  visibility: "self" | "teacher";
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SaveDefensePracticeInput = {
  ideaId: string;
  visibility: "self" | "teacher";
  content: unknown;
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

export async function listDefensePractices() {
  const response = await fetch("/api/student/defense-practices", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as RemoteDefensePractice[];
}

export async function saveDefensePractice(id: string, input: SaveDefensePracticeInput) {
  const csrf = await getCsrfToken();
  const response = await fetch(`/api/student/defense-practices/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as RemoteDefensePractice;
}
