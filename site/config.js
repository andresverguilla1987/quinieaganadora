// config.js
// Parche inteligente para apuntar al backend (soporta backend en / y en /api)
// EDITA: si quieres forzar una base concreta, modifica KNOWN_BASE abajo.
// Ej: const KNOWN_BASE = "https://quinieaganadora.onrender.com";
const KNOWN_BASE = "https://quinieaganadora.onrender.com"; // <- tu backend (sin /api)

// Timeout helper para fetch
function fetchWithTimeout(url, opts = {}, ms = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(url, opts)
      .then((r) => {
        clearTimeout(timer);
        resolve(r);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Probar un endpoint (GET). Devuelve true si status 200-399.
async function probe(url) {
  try {
    const res = await fetchWithTimeout(url, { method: "GET", mode: "cors" }, 2500);
    return res.ok || (res.status >= 200 && res.status < 400);
  } catch (e) {
    return false;
  }
}

/*
  Strategy:
  - Partimos de KNOWN_BASE.
  - Probamos en orden:
      1) ${base}/matches
      2) ${base}/leagues
      3) ${base}/api/matches
      4) ${base}/api/leagues
  - Escogemos la "base eficiente" y exportamos helpers para construir URLs.
  - Si nada responde, usamos KNOWN_BASE como fallback y la app mostrará errores de "Failed to fetch".
*/
let _chosenBase = KNOWN_BASE; // valor final que usarán las funciones
let _probed = false;         // cache del resultado de probe

async function ensureProbed() {
  if (_probed) return _chosenBase;
  _probed = true;

  const base = KNOWN_BASE.replace(/\/+$/, ""); // quitar slash final

  const tests = [
    { url: `${base}/matches`, suffix: "" },
    { url: `${base}/leagues`, suffix: "" },
    { url: `${base}/api/matches`, suffix: "/api" },
    { url: `${base}/api/leagues`, suffix: "/api" },
  ];

  for (const t of tests) {
    // intentamos GET; algunos endpoints devuelven JSON o 404; probe devuelve true solo si ok
    const ok = await probe(t.url);
    if (ok) {
      // si el endpoint tiene /api en la URL, setear base sin /api porque usaremos `apiPrefix`
      if (t.suffix === "/api") {
        // t.url === base + '/api/xxx' -> guardamos base sin /api y apiPrefix='/api'
        _chosenBase = base; // base sin /api
        _apiPrefix = "/api";
      } else {
        _chosenBase = base;
        _apiPrefix = "";
      }
      return _chosenBase;
    }
  }

  // Si llegamos aquí, no probó. Dejamos base como KNOWN_BASE y apiPrefix vacío.
  _chosenBase = base;
  _apiPrefix = "";
  return _chosenBase;
}

// apiPrefix: "" o "/api". Lo inicializamos con null y lo establecerá ensureProbed
let _apiPrefix = null;

// Función pública para obtener la base (asegura probe)
async function getApiConfig() {
  await ensureProbed();
  return { base: _chosenBase, apiPrefix: _apiPrefix || "" };
}

// Helper para construir rutas completas (ej: getApiUrl("/matches"))
async function getApiUrl(path = "") {
  await ensureProbed();
  const prefix = _apiPrefix || "";
  // normaliza path
  const p = path.replace(/^\/+/, "");
  return `${_chosenBase}${prefix}/${p}`;
}

// Síncrono (no probado): construye URL asumiendo apiPrefix determinado
function buildUrlAssuming(path = "", assumeApi = "") {
  const base = KNOWN_BASE.replace(/\/+$/, "");
  const prefix = assumeApi === "/api" ? "/api" : "";
  const p = path.replace(/^\/+/, "");
  return `${base}${prefix}/${p}`;
}

/* Exports:
   - getApiConfig() => { base, apiPrefix }  (async)
   - getApiUrl(path) => string (async)
   - buildUrlAssuming(path, assumeApi) => string (sync, for debugging)
   - KNOWN_BASE (const)
*/
export {
  KNOWN_BASE,
  getApiConfig,
  getApiUrl,
  buildUrlAssuming,
};
