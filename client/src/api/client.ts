export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const API = API_BASE;

function getToken(): string | null {
  return localStorage.getItem('trimers_token');
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: object | FormData | BodyInit | null;
};

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers,
    body: opts.body instanceof FormData ? opts.body : opts.body != null && typeof opts.body === 'object' && !(opts.body instanceof Blob) && !ArrayBuffer.isView(opts.body as ArrayBufferView) ? JSON.stringify(opts.body) : opts.body as BodyInit | undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Request failed');
  }

  return data as T;
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
