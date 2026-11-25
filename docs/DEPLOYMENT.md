# Publicación

GitHub Actions (`.github/workflows/deploy.yml`) en cada push a `main`: `npm ci` → `npm test` → `npm run build` → GitHub Pages.
URL: https://mariajosecamia.github.io/sans-souci-tiempo-entre-sombras/
Si Pages no está activado, en el repo: Settings → Pages → Source: GitHub Actions.
`vite.config.ts` usa `base: './'` para que funcione en la subcarpeta.
