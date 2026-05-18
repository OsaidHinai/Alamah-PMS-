const API_URL = '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(() => resolve(true));
    });
  }
  isRefreshing = true;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' });
    refreshQueue.forEach((fn) => fn());
    refreshQueue = [];
    return res.ok;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'SESSION_EXPIRED', 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body: { error?: string; code?: string; details?: unknown } = {};
    try { body = JSON.parse(text); } catch { body = { error: text.slice(0, 200) || `HTTP ${res.status}`, code: 'UNKNOWN' }; }
    throw new ApiError(res.status, body.code || 'UNKNOWN', body.error || `HTTP ${res.status}`, body.details);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
