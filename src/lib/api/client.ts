import { apiBaseUrl } from '@/lib/api/config';

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    readonly status: number, // 0 = network failure
    message: string,
    readonly code?: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenProvider = () => string | null;
let tokenProvider: TokenProvider = () => null;

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export type RequestOptions = { body?: unknown; formData?: FormData };

export async function apiRequest<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokenProvider();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: string | FormData | undefined;
  if (options.formData) {
    body = options.formData; // fetch sets the multipart boundary itself
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}/api/mobile/v1${path}`, { method, headers, body });
  } catch {
    throw new ApiError(0, 'No connection — check your network and try again.', 'network');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const data = (payload ?? {}) as { message?: string; code?: string; errors?: FieldErrors };
    if (response.status === 401) unauthorizedListeners.forEach((l) => l());
    throw new ApiError(
      response.status,
      data.message ?? `Request failed (${response.status})`,
      data.code,
      data.errors,
    );
  }

  return payload as T;
}
