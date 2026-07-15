export type KnowledgeBaseRecord = {
  id: string;
  category: string;
  description: string;
  usedBy: string;
  active: boolean;
  assetCount: number;
};

export type KnowledgeAssetRecord = {
  id: string;
  category: string;
  name: string;
  sizeLabel: string;
  fileType: string;
  preview: string;
  contentText?: string | null;
  uploadedBy: string;
  enabled: boolean;
  createdAt: string;
};

export type KnowledgeExpertSkill = {
  id: string;
  name: string;
  stage: string;
  description: string;
};

export type KnowledgeExpertRecord = {
  id: string;
  name: string;
  role: string;
  scenario: string;
  accent: string;
  active: boolean;
  sourceSkillName?: string | null;
  sourceSkillContent?: string | null;
  sourceSkillUploadedBy?: string | null;
  systemPrompt?: string | null;
  userPrompt?: string | null;
  skills: KnowledgeExpertSkill[];
  knowledgeCategories: string[];
};

export type SaveKnowledgeBaseInput = Pick<KnowledgeBaseRecord, "category" | "description" | "usedBy"> & {
  active: boolean;
};

export type SaveKnowledgeAssetInput = Omit<KnowledgeAssetRecord, "id" | "createdAt">;

export type SaveKnowledgeExpertInput = Omit<KnowledgeExpertRecord, "sourceSkillName" | "sourceSkillContent" | "sourceSkillUploadedBy" | "systemPrompt" | "userPrompt"> & {
  sourceSkillName?: string;
  sourceSkillContent?: string;
  sourceSkillUploadedBy?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type CsrfResponse = { headerName: string; token: string };
type ErrorResponse = { message?: string };

export class KnowledgeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response) {
  const result = (await response.json().catch(() => ({}))) as ErrorResponse;
  return new KnowledgeApiError(result.message || `请求失败：HTTP ${response.status}`, response.status);
}

async function getCsrfToken() {
  const response = await fetch("/api/auth/csrf", { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as CsrfResponse;
}

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include", headers: { Accept: "application/json" } });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

async function mutateJson<T>(path: string, method: "POST" | "PATCH", input: unknown): Promise<T> {
  const csrf = await getCsrfToken();
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

async function deleteResource(path: string) {
  const csrf = await getCsrfToken();
  const response = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok) throw await parseError(response);
}

export function listKnowledgeBases() {
  return readJson<KnowledgeBaseRecord[]>("/api/knowledge/knowledge-bases");
}

export function createKnowledgeBase(input: Omit<SaveKnowledgeBaseInput, "active">) {
  return mutateJson<KnowledgeBaseRecord>("/api/knowledge/knowledge-bases", "POST", input);
}

export function updateKnowledgeBase(id: string, input: SaveKnowledgeBaseInput) {
  return mutateJson<KnowledgeBaseRecord>(`/api/knowledge/knowledge-bases/${encodeURIComponent(id)}`, "PATCH", input);
}

export function deleteKnowledgeBase(id: string) {
  return deleteResource(`/api/knowledge/knowledge-bases/${encodeURIComponent(id)}`);
}

export function listKnowledgeAssets() {
  return readJson<KnowledgeAssetRecord[]>("/api/knowledge/knowledge-assets");
}

export function createKnowledgeAsset(input: SaveKnowledgeAssetInput) {
  return mutateJson<KnowledgeAssetRecord>("/api/knowledge/knowledge-assets", "POST", input);
}

export function updateKnowledgeAsset(id: string, input: Omit<SaveKnowledgeAssetInput, "category" | "uploadedBy">) {
  return mutateJson<KnowledgeAssetRecord>(`/api/knowledge/knowledge-assets/${encodeURIComponent(id)}`, "PATCH", input);
}

export function deleteKnowledgeAsset(id: string) {
  return deleteResource(`/api/knowledge/knowledge-assets/${encodeURIComponent(id)}`);
}

export function listKnowledgeExperts() {
  return readJson<KnowledgeExpertRecord[]>("/api/knowledge/experts");
}

export async function saveKnowledgeExpert(input: SaveKnowledgeExpertInput) {
  const path = `/api/knowledge/experts/${encodeURIComponent(input.id)}`;
  const updateInput = { ...input } as Partial<SaveKnowledgeExpertInput>;
  delete updateInput.id;
  try {
    return await mutateJson<KnowledgeExpertRecord>(path, "PATCH", updateInput);
  } catch (error) {
    if (!(error instanceof KnowledgeApiError) || error.status !== 404) throw error;
    return mutateJson<KnowledgeExpertRecord>("/api/knowledge/experts", "POST", input);
  }
}

export function deleteKnowledgeExpert(id: string) {
  return deleteResource(`/api/knowledge/experts/${encodeURIComponent(id)}`);
}
