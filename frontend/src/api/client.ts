import { config } from '../config';

type GetTokenFn = () => Promise<string | null>;

let getTokenFn: GetTokenFn | null = null;

export function setTokenGetter(fn: GetTokenFn) {
  getTokenFn = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getTokenFn ? await getTokenFn() : null;

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
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEntryData {
  date: string;
  project_id: string;
  hours?: number;
  description?: string;
  start_time?: string;
  end_time?: string;
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
    request<void>(`/entries/${id}`, { method: 'DELETE' }),

  clockIn: (projectId: string, description?: string) => {
    const now = new Date();
    return request<{ entry: TimeEntry }>('/entries', {
      method: 'POST',
      body: JSON.stringify({
        date: now.toISOString().split('T')[0],
        project_id: projectId,
        start_time: now.toISOString(),
        description: description || ''
      })
    });
  },

  clockOut: (id: string, startTime: string, description?: string) => {
    const now = new Date();
    return request<{ entry: TimeEntry }>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        start_time: startTime,
        end_time: now.toISOString(),
        ...(description !== undefined && { description })
      })
    });
  }
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
