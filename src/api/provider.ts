export type ProviderErrorResponse = {
  code?: string;
  message?: string;
};

export type LexiangPptContextInput = {
  projectId: string;
  conversationId: string;
  expertId: string;
  query: string;
};

export type LexiangReferenceDoc = {
  title: string;
  url?: string;
  content?: string;
};

export type LexiangPptContext = {
  configured: boolean;
  content: string;
  sessionId?: string;
  references: LexiangReferenceDoc[];
};

export type WorkBuddyRun = {
  runId: string;
};

type CsrfResponse = {
  headerName: string;
  token: string;
};

async function parseError(response: Response) {
  const result = (await response.json().catch(() => ({}))) as ProviderErrorResponse;
  return result.message || result.code || `请求失败：HTTP ${response.status}`;
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

export async function requestLexiangPptContext(input: LexiangPptContextInput): Promise<LexiangPptContext> {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/provider/lexiang/qa", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify({
      projectId: input.projectId,
      conversationId: input.conversationId,
      expertId: input.expertId,
      query: input.query,
      targets: [],
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const result = (await response.json()) as {
    content?: string;
    sessionId?: string;
    referenceDocs?: LexiangReferenceDoc[];
  };
  return {
    configured: true,
    content: result.content || "",
    sessionId: result.sessionId,
    references: result.referenceDocs || [],
  };
}

export async function submitWorkBuddyRun(text: string): Promise<WorkBuddyRun> {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/provider/workbuddy/runs", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as WorkBuddyRun;
}
