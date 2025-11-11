// config.js
// Parche completo para API_BASE — incluye helpers y un 'prober' que intenta detectar
// automáticamente la URL correcta del backend probando variantes comunes.
// Úsalo en el frontend así:
//   import { API_BASE, probeApi, buildUrl } from './config.js'
//   const base = await probeApi() || API_BASE
//
// Si prefieres forzar una URL fija, modifica API_BASE abajo.

// --- EDITA AQUÍ si quieres forzar manualmente la URL final ---
// Debe empezar con https:// o http:// y no debe terminar con slash (/)
// Ejemplo (según tus logs): "https://quinieaganadora.onrender.com"
const API_BASE = "https://quinieaganadora.onrender.com";
// ----------------------------------------------------------------

// Variantes a probar (internas). No tocar salvo que sepas lo que haces.
const _candidates = [
  // base tal cual
  (b) => b,
  // base + /api (mucha gente sirve la API en /api)
  (b) => `${b}/api`,
  // base + /api/ (por si alguien trae slash)
  (b) => `${b}/api/`,
];

// Endpoints heurísticos para probar health / readiness
const _healthPaths = [
  "/api/health",
  "/health",
  "/api/ping",
  "/ping",
  "/",
];

// Timeout helper
function _timeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

/**
 * buildUrl(base, path)
 * Ensures proper slashes and returns full URL for fetch calls.
 */
function buildUrl(base, path = "") {
  if (!base) return path;
  // remove trailing slash from base
  const b = base.replace(/\/+$/, "");
  // ensure path starts with single slash if non-empty
  const p = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${b}${p}`;
}

/**
 * tryEndpoint(url, method='GET', timeoutMs=1800)
 * Intenta hacer fetch al endpoint con CORS mode y devuelve true si responde 2xx.
 */
async function tryEndpoint(url, method = "GET", timeoutMs = 1800) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method,
      mode: "cors",
      signal: controller.signal,
      // no-cache para evitar respuestas cacheadas
      cache: "no-store",
    });
    clearTimeout(id);
    // Consideramos aceptables 200-399 (200 OK, 204 No Content, 3xx etc)
    return res && res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * probeApi(base = API_BASE, timeoutMs = 1800)
 * Intenta detectar la URL de la API probando variantes.
 * Devuelve la URL válida (ej: "https://.../api" o "https://...") o null si no encontró nada.
 *
 * Uso recomendado: llamar al inicio del frontend y guardar resultado en una variable global.
 */
async function probeApi(base = API_BASE, timeoutMs = 1800) {
  if (!base) return null;
  // Primero probar las variantes candidatas (base, base + /api, ...)
  for (const candidateFn of _candidates) {
    const candidate = candidateFn(base);
    // Para cada candidate, probar rutas de health/ping y la raíz
    for (const hp of _healthPaths) {
      const url = buildUrl(candidate, hp);
      // console.debug("probeApi: probando", url);
      // intentamos HEAD primero (rápido) y si falla intentamos GET
      const headOk = await tryEndpoint(url, "HEAD", timeoutMs).catch(() => false);
      if (headOk) return candidate;
      const getOk = await tryEndpoint(url, "GET", timeoutMs).catch(() => false);
      if (getOk) return candidate;
    }
    // como último recurso probamos la raíz del candidate
    const rootOk = await tryEndpoint(buildUrl(candidate, "/"), "GET", timeoutMs).catch(() => false);
    if (rootOk) return candidate;
  }
  // nada funcionó
  return null;
}

/**
 * export por defecto y helpers:
 * - API_BASE: valor por defecto (edítalo arriba)
 * - probeApi(): intenta detectar una URL funcional (async)
 * - buildUrl(): construye URLs seguras
 */
export { API_BASE, probeApi, buildUrl };
