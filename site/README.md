
# Quiniela PRO - Frontend (fixed API_BASE)

Esto es un frontend estático de ejemplo para tu proyecto **Quiniela**.
He corregido `API_BASE` por defecto para apuntar a tu backend **sin** `/api` al final.

## Cómo usar

- Descomprime `quiniela_netlify_fix.zip` y sube su contenido a Netlify (drag & drop).
- Si tu backend expone rutas bajo `/api`, edita `config.js` y cambia `API_BASE` añadiendo `/api` al final, por ejemplo `https://quinieaganadora.onrender.com/api`.
- Si ves errores `Failed to fetch` o `502`, revisa CORS en tu backend; permite peticiones desde el dominio Netlify del sitio.

## Archivos importantes
- `index.html` - interfaz
- `styles.css` - estilos
- `config.js` - apunta `API_BASE`
- `main.js` - lógica del frontend
- `_redirects` - para Netlify (sirve index.html para rutas SPA)
