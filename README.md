Quiniela PRO - Netlify patch (js/config.js)
------------------------------------------

Contenido del ZIP:
- js/config.js    -> archivo de parche para detectar API base y exponer window.API_BASE
- README.md       -> este archivo

Instrucciones rápidas para parchear en Netlify:
1) Descarga este ZIP y descomprímelo.
2) Si tu build actual tiene una carpeta 'js' en la raíz (por ejemplo build/js/config.js o public/js/config.js),
   reemplaza el archivo existente por este js/config.js.
   - Si tu frontend carga config con <script src="/js/config.js" type="module"></script>, entonces funcionará tal cual.
   - Si tu frontend espera un archivo global (no-module) avísame; te doy una versión sin 'export'.
3) Sube el contenido parcheado a Netlify (sube ZIP o haz push al repo conectado a Netlify).
   - Si usas deploy manual, asegúrate de que el path sea exactamente /js/config.js en la raíz del sitio.
4) Abre la app en el navegador, abre la consola (F12) y busca logs:
   - [config] variant OK: ...  (si detectó la API)
   - [config] variant failed: ... (si no detectó ninguna)
   - window.API_BASE y window.API_DETECTED en consola para comprobar.
5) Si tu backend responde lento, incrementa TIMEOUT_MS en la parte superior de js/config.js.

Si necesitas:
- Versión global (no-module) -> responde 'global'
- Forzar otra PREF_BASE -> responde 'pref: https://mi-backend.example.com'
- ZIP que incluya un index.html de prueba para validar -> responde 'zip+index'
- Que suba el ZIP a un repositorio o lo edite dentro del build (puedo crear un ZIP con la estructura exacta que indiques).

Hecho por el asistente para ayudarte a parchear Netlify rápidamente.
