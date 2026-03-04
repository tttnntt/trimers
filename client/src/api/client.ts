const BACKEND_URL = 'https://trimers-dot-com.onrender.com/api';
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const normalizedBase =
  rawBase.startsWith('http') && !rawBase.endsWith('/api')
    ? rawBase.replace(/\/?$/, '') + '/api'
    : rawBase;

function resolveApiBase(): string {
  if (typeof window === 'undefined') return normalizedBase;
  const host = window.location.hostname;
  if (host.includes('vercel.app')) return '/api';
  if (host.includes('onrender.com') && !host.startsWith('trimers-dot-com'))
    return BACKEND_URL;
  return normalizedBase;
}

export const API_BASE = resolveApiBase();
const API = API_BASE;

function getToken(): string | null {
  return localStorage.getItem('trimers_token');
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: object | FormData | BodyInit | null;
};

const isRetryable = (status: number) => status === 502 || status === 503 || status === 504;

const RETRY_DELAYS = [5000, 8000, 10000, 12000, 15000, 15000, 15000, 15000];

async function apiFetch<T>(path: string, opts: ApiOptions, retries = 8): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const body = opts.body instanceof FormData ? opts.body : opts.body != null && typeof opts.body === 'object' && !(opts.body instanceof Blob) && !ArrayBuffer.isView(opts.body as ArrayBufferView) ? JSON.stringify(opts.body) : opts.body as BodyInit | undefined;

  const res = await fetch(`${API}${path}`, { ...opts, headers, body });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const attempt = 8 - retries;
    if (isRetryable(res.status) && retries > 0 && attempt < RETRY_DELAYS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      return apiFetch<T>(path, opts, retries - 1);
    }
    const msg = res.status === 503 || res.status === 502
      ? 'Server is starting up. Wait 30 seconds and try again.'
      : res.status === 401
        ? (data.error || 'Invalid email or password')
        : (data.error || res.statusText || 'Request failed');
    throw new Error(msg);
  }

  return data as T;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  return apiFetch<T>(path, opts);
}

export const authApi = {
  register: (email: string, password: string) =>
    api<{ token: string; userId: string; needsProfile: boolean }>('/auth/register', {
      method: 'POST',
      body: { email, password }
    }),
  login: (email: string, password: string) =>
    api<{ token: string; userId: string; needsProfile: boolean }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    }),
  me: () => api<{ id: string; email: string; username?: string; profile_picture?: string; bio?: string }>('/auth/me')
};

export const usersApi = {
  updateProfile: (data: { username?: string; bio?: string }) =>
    api('/users/profile', { method: 'PATCH', body: data }),
  uploadProfilePicture: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api<{ profile_picture: string; url: string }>('/users/profile/picture', {
      method: 'POST',
      body: fd
    });
  },
  search: (q: string) => api<any[]>(`/users/search?q=${encodeURIComponent(q)}`)
};

export const groupsApi = {
  list: () => api<any[]>('/groups'),
  get: (id: string) => api<any>(`/groups/${id}`),
  create: (name: string) => api<any>('/groups', { method: 'POST', body: { name } }),
  addMember: (groupId: string, userId: string) =>
    api(`/groups/${groupId}/members`, { method: 'POST', body: { user_id: userId } }),
  uploadPicture: (groupId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api<{ url: string }>(`/groups/${groupId}/picture`, { method: 'POST', body: fd });
  }
};

export const albumsApi = {
  startRound: (groupId: string) =>
    api<any>('/albums/rounds', { method: 'POST', body: { group_id: groupId } }),
  uploadAlbum: (roundId: string, files: File[]) => {
    const fd = new FormData();
    fd.append('round_id', roundId);
    files.forEach((f) => fd.append('photos', f));
    return api<any>('/albums/upload', { method: 'POST', body: fd });
  },
  getRound: (roundId: string) => api<any>(`/albums/rounds/${roundId}`),
  getGroupBio: (groupId: string) => api<any>(`/albums/group/${groupId}/bio`),
  vote: (albumId: string, stars: number) =>
    api<any>(`/albums/${albumId}/vote`, { method: 'POST', body: { stars } })
};

export const pushApi = {
  subscribe: (subscription: PushSubscriptionJSON) =>
    api('/push/subscribe', {
      method: 'POST',
      body: {
        endpoint: subscription.endpoint,
        keys: subscription.keys ?? {}
      }
    })
};
