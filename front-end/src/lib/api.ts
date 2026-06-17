import { Todo, TodoStatus } from "../app/types"

let authToken: string | null = null

function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

function getAuthToken() {
  if (authToken) return authToken
  return localStorage.getItem('auth_token')
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = getAuthToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  headers.set('Content-Type', 'application/json')

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch {
      // non-JSON error body, keep the default message
    }
    
    if (response.status === 401) {
      setAuthToken(null)
    }
    
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  setAuthToken,
  listTodos: () => request<Todo[]>("/todos"),

  createTodo: (data: Omit<Todo, "id">) =>
    request<Todo>("/todos", { method: "POST", body: JSON.stringify(data) }),

  updateTodo: (id: string, data: Partial<Omit<Todo, "id">>) =>
    request<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  setTodoStatus: (id: string, status: TodoStatus) =>
    request<Todo>(`/todos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  deleteTodo: (id: string) =>
    request<void>(`/todos/${id}`, { method: "DELETE" }),

  register: (data: { email: string; password: string }) =>
    request<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<any>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
}
