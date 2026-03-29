const AUTH_RETURN_KEY = 'auth_return_to';

function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path || typeof path !== 'string') return false;
  if (!path.startsWith('/')) return false;
  // Prevent protocol-relative / absolute URL redirects.
  if (path.startsWith('//')) return false;
  return true;
}

export function pickAuthReturnPath(
  queryNext: string | string[] | undefined,
  fallback = '/'
): string {
  const fromQuery = Array.isArray(queryNext) ? queryNext[0] : queryNext;
  if (isSafeInternalPath(fromQuery)) return fromQuery;
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(AUTH_RETURN_KEY);
    if (isSafeInternalPath(stored)) return stored;
  }
  return fallback;
}

export function storeAuthReturnPath(path: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (isSafeInternalPath(path)) {
    window.localStorage.setItem(AUTH_RETURN_KEY, path);
  }
}

export function consumeAuthReturnPath(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(AUTH_RETURN_KEY);
  window.localStorage.removeItem(AUTH_RETURN_KEY);
  return isSafeInternalPath(stored) ? stored : null;
}
