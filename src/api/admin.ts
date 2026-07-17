export type AdminAccount = {
  id: string;
  account: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  displayName: string;
  title: string;
  status: "ACTIVE" | "DISABLED";
  quotaRemaining: number;
  disabledPermissions: string[];
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
};

export type AdminGroup = {
  id: string;
  groupLabel: string;
  projectName: string;
  active: boolean;
  memberCount: number;
};

export type AiUsageRange = "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "ALL";

export type AiUsageProvider = "LEXIANG" | "WORKBUDDY";

export type AdminAiUsageSummary = {
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  activeUserCount: number;
  activeGroupCount: number;
};

export type AdminUserAiUsage = {
  userId: string;
  displayName: string;
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providers: AiUsageProvider[];
  lastUsedAt: string;
};

export type AdminGroupAiUsage = {
  groupId: string;
  groupLabel: string;
  groupName: string;
  memberCount: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providers: AiUsageProvider[];
  lastUsedAt?: string | null;
};

export type AdminAiUsageReport = {
  range: AiUsageRange;
  periodStart?: string;
  generatedAt: string;
  summary: AdminAiUsageSummary;
  users: AdminUserAiUsage[];
  groups: AdminGroupAiUsage[];
};

export type CreateAdminAccount = {
  account: string;
  password: string;
  role: AdminAccount["role"];
  displayName: string;
  title: string;
  quotaRemaining: number;
  groupId?: string;
};

export type UpdateAdminAccount = {
  role: AdminAccount["role"];
  displayName: string;
  title: string;
  status: AdminAccount["status"];
  quotaRemaining: number;
  disabledPermissions: string[];
  groupId?: string;
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

async function mutateJson<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
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

async function deleteResource(url: string) {
  const csrf = await getCsrfToken();
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export function listAdminAccounts() {
  return readJson<AdminAccount[]>("/api/admin/accounts");
}

export function createAdminAccount(input: CreateAdminAccount) {
  return mutateJson<AdminAccount>("/api/admin/accounts", "POST", input);
}

export function updateAdminAccount(accountId: string, input: UpdateAdminAccount) {
  return mutateJson<AdminAccount>(`/api/admin/accounts/${encodeURIComponent(accountId)}`, "PATCH", input);
}

export function deleteAdminAccount(accountId: string) {
  return deleteResource(`/api/admin/accounts/${encodeURIComponent(accountId)}`);
}

export function listAdminGroups() {
  return readJson<AdminGroup[]>("/api/admin/groups");
}

export function createAdminGroup(groupLabel: string, projectName: string) {
  return mutateJson<AdminGroup>("/api/admin/groups", "POST", { groupLabel, projectName });
}

export function updateAdminGroup(groupId: string, groupLabel: string, projectName: string, active = true) {
  return mutateJson<AdminGroup>(`/api/admin/groups/${encodeURIComponent(groupId)}`, "PATCH", {
    groupLabel,
    projectName,
    active,
  });
}

export function deleteAdminGroup(groupId: string) {
  return deleteResource(`/api/admin/groups/${encodeURIComponent(groupId)}`);
}

export function getAdminAiUsage(range: AiUsageRange) {
  return readJson<AdminAiUsageReport>(`/api/admin/ai-usage?range=${encodeURIComponent(range)}`);
}
