// Lee el token CSRF desde la cookie y lo devuelve como header para fetch.
// El servidor lo establece automáticamente en cada visita (csrfCookie middleware).

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Devuelve los headers necesarios para peticiones mutantes (POST/PATCH/DELETE).
 * Uso: fetch('/api/...', { method: 'POST', headers: { ...csrfHeaders(), 'Content-Type': 'application/json' }, ... })
 */
export function csrfHeaders() {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}

/**
 * Si la cookie no está disponible, obtiene el token del endpoint del servidor
 * y lo devuelve. Útil en SPAs donde la cookie puede no haberse establecido aún.
 */
export async function fetchCsrfToken() {
  let token = getCsrfToken();
  if (token) return token;

  try {
    const res  = await fetch('/api/csrf-token');
    const data = await res.json();
    token = data.token;
  } catch {}
  return token;
}
