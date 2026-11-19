export interface ApiErrorResponse {
  success: false;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message: string }> | Record<string, unknown> | null;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiSuccessResponse<T>> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Mandated by AGENTS.md for HttpOnly cookie sessions
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network connection error';
    throw new ApiClientError(0, 'NETWORK_ERROR', message);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorResponse | null;
    const errorCode = errorBody?.error?.code || `HTTP_${response.status}`;
    const errorMessage =
      errorBody?.message ||
      errorBody?.error?.message ||
      response.statusText ||
      'Unknown error occurred';
    const errorDetails = errorBody?.error?.details;

    throw new ApiClientError(response.status, errorCode, errorMessage, errorDetails);
  }

  return body as ApiSuccessResponse<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
