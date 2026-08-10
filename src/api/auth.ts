export type RemoteAuthSession = {
  id: string;
  role: "student" | "teacher" | "admin";
  name: string;
  account: string;
  title: string;
  avatarId: string;
  groupId?: string;
  groupLabel?: string;
  groupName?: string;
  quota: number;
  lexiangPptQuota: number;
  workbuddyVideoQuota: number;
  disabledPermissions: string[];
};

export type AuthProfileUpdate = {
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
  avatarId?: string;
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

export async function loadCurrentAuth(): Promise<RemoteAuthSession | null> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as RemoteAuthSession;
}

export async function loginWithPassword(account: string, password: string): Promise<RemoteAuthSession> {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify({ account, password }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as RemoteAuthSession;
}

export async function updateAuthProfile(profile: AuthProfileUpdate): Promise<RemoteAuthSession> {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/auth/me", {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return (await response.json()) as RemoteAuthSession;
}

export async function logoutRemoteSession() {
  const csrf = await getCsrfToken();
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok && response.status !== 401) {
    throw new Error(await parseError(response));
  }
}
