// js/config.js
// Parche para detectar la URL correcta del backend (con/sin /api).
// Reemplaza PREF_BASE si quieres forzar una URL.
// El script probará varias variantes y dejará la que responda primero.

const PREF_BASE = "https://quinieaganadora.onrender.com"; // <--- Cambia aquí si quieres forzar otra URL
const TIMEOUT_MS = 2500; // ms para cada petición (ajusta si tu backend tarda más en responder)

// Variantes que probamos (ordenadas por prioridad)
const VARIANTS = [
  "",       // https://quinieaganadora.onrender.com
  "/api",   // https://quinieaganadora.onrender.com/api
  "/v1",    // https://quinieaganadora.onrender.com/v1
  "/api/v1" // https://quinieaganadora.onrender.com/api/v1
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

// helper: normaliza base + variant (evita // dobles)
function buildRoot(base, variant) {
  const cleanBase = String(base).replace(/\/+$/, ""); // quita slash final
  const cleanVariant = String(variant || "").replace(/^\/+/, ""); // quita slash inicial
  return cleanVariant ? `${cleanBase}/${cleanVariant}` : cleanBase;
}

// prueba una variante (base + variant) checando los check_paths en paralelo
async function testVariant(base, variant) {
  const root = buildRoot(base, variant);

  // Construir URLs completas para cada check path
  const urls = CHECK_PATHS.map(p => {
    const cleanP = String(p);
    return cleanP.startsWith("/") ? `${root}${cleanP}` : `${root}/${cleanP}`;
  });

  // lanzar todas las peticiones en paralelo y aceptar la primera que responda ok
  const promises = urls.map(u =>
    (async () => {
      const res = await fetchWithTimeout(u, { method: "GET", mode: "cors" }, TIMEOUT_MS);
      if (res && res.ok) return { ok: true, url: u, status: res.status };
      return { ok: false, url: u, status: res ? res.status : null };
    })()
  );

  // Esperamos a que todas terminen (no usamos Promise.any para compatibilidad)
  const settled = await Promise.all(promises);

  // Si alguna fue ok, devolvemos root
  const anyOk = settled.find(s => s.ok);
  if (anyOk) {
    console.info(`[config] variant OK: ${variant} -> ${root} (checked ${anyOk.url} status:${anyOk.status})`);
    return { ok: true, base: root };
  }

  // Ninguna OK
  console.info(`[config] variant failed: ${variant} -> ${root} (checked ${urls.length} paths)`);
  return { ok: false };
}

// función principal: detecta y seta window.API_BASE
async function detectApiBase() {
  try {
    // 1) probar PREF_BASE (si está definido)
    if (PREF_BASE) {
      for (const v of VARIANTS) {
        const r = await testVariant(PREF_BASE, v);
        if (r.ok) {
          window.API_BASE = r.base;
          window.API_DETECTED = true;
          return window.API_BASE;
        }
      }
    }

    // 2) probar origin (mismo host) con variantes
    const origin = window.location.origin;
    for (const v of VARIANTS) {
      const r = await testVariant(origin, v);
      if (r.ok) {
        window.API_BASE = r.base;
        window.API_DETECTED = true;
        return window.API_BASE;
      }
    }

    // 3) fallback: dejar PREF_BASE (aunque no responda) y marcar no-detectado
    window.API_BASE = PREF_BASE || origin;
    window.API_DETECTED = false;
    console.warn("[config] No backend detected. Falling back to:", window.API_BASE);
    return window.API_BASE;
  } catch (err) {
    // En caso inesperado - fallback seguro
    window.API_BASE = PREF_BASE || window.location.origin;
    window.API_DETECTED = false;
    console.error("[config] detectApiBase error:", err);
    return window.API_BASE;
  }
}

// Export/preparar: iniciamos la detección inmediatamente y dejamos una promesa utilizable.
const apiReady = (async () => {
  const base = await detectApiBase();
  // exponemos también una función helper para que testees manualmente si la necesitas
  window.getApiBase = () => window.API_BASE;
  return base;
})();

// Export públicos
export { apiReady, fetchWithTimeout, buildRoot };

// Nota de uso (ejemplo):
// import { apiReady } from './js/config.js';
// await apiReady; // esperar detección
// fetch(window.API_BASE + '/matches') ...
