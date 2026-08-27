const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('lm_token')
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  }
}

export class ApiError extends Error {
  status: number
  detail?: string
  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('lm_token')
    localStorage.removeItem('lm_user')
    window.location.href = '/login'
    throw new ApiError(401, 'Non autorisé')
  }
  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = await res.json()
      detail = body.detail ?? body.message ?? body.title
    } catch {}
    throw new ApiError(res.status, detail ?? `Erreur ${res.status}`, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string): Promise<T> {
    return fetch(`${BASE}${path}`, { headers: buildHeaders() }).then(handleResponse<T>)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handleResponse<T>)
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse<T>)
  },
  delete<T = void>(path: string): Promise<T> {
    return fetch(`${BASE}${path}`, { method: 'DELETE', headers: buildHeaders() }).then(handleResponse<T>)
  },
}
