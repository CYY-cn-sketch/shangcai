import type { ExpertHandoffPayload } from "../expertHandoff";

export type RemoteExpertHandoff = {
  id: string;
  ideaId: string;
  sourceArtifactId: string;
  sourceExpertId: string;
  targetExpertId: string;
  status: "CONFIRMED";
  payload: ExpertHandoffPayload;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
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

export async function listExpertHandoffs(ideaId?: string, targetExpertId?: string) {
  const params = new URLSearchParams();
  if (ideaId) params.set("ideaId", ideaId);
  if (targetExpertId) params.set("targetExpertId", targetExpertId);
  const response = await fetch(`/api/student/handoffs${params.size ? `?${params.toString()}` : ""}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as RemoteExpertHandoff[];
}

export async function confirmExpertHandoff(artifactId: string, targetExpertId: "ALL" | "positioning" = "ALL") {
  const csrf = await getCsrfToken();
  const response = await fetch(`/api/student/artifacts/${encodeURIComponent(artifactId)}/handoffs`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify({ targetExpertId }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as RemoteExpertHandoff;
}
