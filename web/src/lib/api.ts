const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options?.headers as Record<string, string>,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  login: (phone: string, password: string) =>
    request<{ success: boolean; data: { user: any; token: string } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ phone, password })
    }),
  register: (data: { phone: string; password: string; name: string; role: string }) =>
    request<{ success: boolean; data: { user: any; token: string } }>('/auth/register', {
      method: 'POST', body: JSON.stringify(data)
    }),
  me: () => request<{ success: boolean; data: any }>('/users/me'),
};

// Buildings
export const buildings = {
  search: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ success: boolean; data: any[]; total: number }>(`/buildings${qs}`);
  },
  detail: (id: string) =>
    request<{ success: boolean; data: any }>(`/buildings/${id}`),
  featured: () =>
    request<{ success: boolean; data: any[] }>('/buildings/featured/list'),
  favorite: (id: string) =>
    request<{ success: boolean; data: { favorited: boolean } }>(`/buildings/${id}/favorite`, { method: 'POST' }),
  checkFavorite: (id: string) =>
    request<{ success: boolean; data: { favorited: boolean } }>(`/buildings/${id}/favorite`),
};

// Recommend
export const recommend = {
  match: (data: {
    keyword?: string;
    industry?: string;
    region?: string;
    min_area?: number;
    max_area?: number;
    max_rent?: number;
    min_height?: number;
    min_load?: number;
    min_power?: number;
    page_size?: string;
  }) =>
    request<{ success: boolean; data: any[]; total: number; cached: boolean }>('/recommend/match', {
      method: 'POST', body: JSON.stringify(data)
    }),
};

// IM
export const im = {
  send: (data: { to_user_id: string; building_id?: string; content: string }) =>
    request<{ success: boolean }>('/im/send', { method: 'POST', body: JSON.stringify(data) }),
  conversations: () =>
    request<{ success: boolean; data: any[] }>('/im/conversations'),
  messages: (partnerId: string) =>
    request<{ success: boolean; data: any[] }>(`/im/messages/${partnerId}`),
  unreadCount: () =>
    request<{ success: boolean; data: { count: number } }>('/im/unread-count'),
};

// Visits
export const visits = {
  create: (data: { building_id: string; visit_time: string; notes?: string }) =>
    request<{ success: boolean; data: any }>('/visits', { method: 'POST', body: JSON.stringify(data) }),
  my: () => request<{ success: boolean; data: any[] }>('/visits/my'),
  confirm: (id: string) =>
    request<{ success: boolean }>(`/visits/${id}/confirm`, { method: 'PATCH' }),
  complete: (id: string) =>
    request<{ success: boolean }>(`/visits/${id}/complete`, { method: 'PATCH' }),
};

// Share
export const share = {
  create: (buildingId: string) =>
    request<{ success: boolean; data: any }>('/share', {
      method: 'POST', body: JSON.stringify({ building_id: buildingId })
    }),
  get: (code: string) =>
    request<{ success: boolean; data: any }>(`/share/${code}`),
  stats: (buildingId: string) =>
    request<{ success: boolean; data: any[] }>(`/share/stats/${buildingId}`),
};

export const api = { auth, buildings, recommend, im, visits, share };
