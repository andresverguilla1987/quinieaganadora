// js/config.js
// Parche para detectar la URL correcta del backend (con/sin /api).
// Reemplaza la URL base preferida en PREF_BASE si quieres forzar una.
// El script probará varias variantes y dejará la que responda primero.

const PREF_BASE = "https://quinieaganadora.onrender.com"; // <--- Cambia aquí si quieres forzar otra URL
const TIMEOUT_MS = 2500; // ms para cada prueba (ajusta si tu backend tarda más en responder)

// Variantes que probamos (ordenadas por prioridad)
const VARIANTS = [
  "",             // https://quinieaganadora.onrender.com
  "/api",         // https://quinieaganadora.onrender.com/api
  "/v1",          // por si tu API usa /v1
  "/api/v1"       // por si usa /api/v1
];

// Endpoints que consideramos "sanity checks"
const CHECK_PATHS = [
  "/health",
  "/leagues",
  "/matches"
];

// utilidad: fetch con timeout y sin romper consola si falla
async function fetchWithTimeout(url, opts = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    return null;
  }
}

// prueba una variante (base + variant) checando los check_paths
async function testVariant(base, variant) {
  const root = `${base.replace(/\/+$/, "")}${variant}`;
  for (const p of CHECK_PATHS) {
    const url = `${root}${p.startsWith("/") ? "" : "/"}${p}`;
    // hacemos un GET y aceptamos 200..399 como OK, también 204
    const res = await fetchWithTimeout(url, { method: "GET", mode: "cors" });
    if (res && res.ok) {
      return { ok: true, base: root };
    }
    // si obtenemos 404 seguimos probando otros paths/variants
    // si res es null (timeout / CORS / network) también seguimos
  }
  return { ok: false };
}

// función principal: detecta y seta window.API_BASE
async function detectApiBase() {
  // 1) si PREF_BASE ya funciona con alguna variante, úsala (prueba variantes)
  for (const v of VARIANTS) {
    const candidate = `${PREF_BASE.replace(/\/+$/, "")}${v}`;
    const r = await testVariant(PREF_BASE, v);
    if (r.ok) {
      window.API_BASE = r.base;
      return window.API_BASE;
    }
  }

  // 2) si PREF_BASE falló, probamos las variantes sobre https://<hostname> (same origin)
  const origin = window.location.origin;
  for (const v of VARIANTS) {
    const r = await testVariant(origin, v);
    if (r.ok) {
      window.API_BASE = r.base;
      return window.API_BASE;
    }
  }

  // 3) fallback: dejar PREF_BASE (aunque no responda) para que el diagnóstico lo muestre
  window.API_BASE = PREF_BASE;
  return window.API_BASE;
}

// Export/preparar: iniciamos la detección inmediatamente y dejamos una promesa utilizable.
const apiReady = detectApiBase(); // promesa que resuelve la base detectada

// También exportamos helpers para que el resto de la app los use
export { apiReady, fetchWithTimeout };

// Nota: la app principal puede hacer:
// import { apiReady } from './js/config.js';
// await apiReady; // esperar detección
// fetch(window.API_BASE + '/matches') ...
//
// Si prefieres forzar manualmente la URL, cambia PREF_BASE arriba y sube el archivo.

