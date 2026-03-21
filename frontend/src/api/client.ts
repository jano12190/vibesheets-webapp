import { config } from '../config';

type GetTokenFn = () => Promise<string | null>;

let getTokenFn: GetTokenFn | null = null;

export function setTokenGetter(fn: GetTokenFn) {
  getTokenFn = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getTokenFn ? await getTokenFn() : null;

  if (!token) {
    console.error('API request made without auth token - user may need to sign in again');
  }

  const response = await fetch(`${config.apiEndpoint}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Time Entries API
export interface TimeEntry {
  entry_id: string;
  user_id: string;
  date: string;
  project_id: string;
  hours: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryData {
  date: string;
  project_id: string;
  hours: number;
  description?: string;
}

export const entriesApi = {
  list: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const query = params.toString();
    return request<{ entries: TimeEntry[] }>(`/entries${query ? `?${query}` : ''}`);
  },

  create: (data: CreateEntryData) =>
    request<{ entry: TimeEntry }>('/entries', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<CreateEntryData>) =>
    request<{ entry: TimeEntry }>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    request<void>(`/entries/${id}`, { method: 'DELETE' })
};

// Projects API
export interface Project {
  project_id: string;
  user_id: string;
  name: string;
  client: string;
  hourly_rate: number;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  client?: string;
  hourly_rate?: number;
  color?: string;
}

export const projectsApi = {
  list: () => request<{ projects: Project[] }>('/projects'),

  create: (data: CreateProjectData) =>
    request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<CreateProjectData & { active: boolean }>) =>
    request<{ project: Project }>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'DELETE' })
};
