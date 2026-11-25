// Íconos SVG dibujados "a pluma" para verbos, símbolos y botones.
const s = (inner: string, vb = '0 0 64 64') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const ICONS: Record<string, string> = {
  look: s('<path d="M6 32c8-12 18-18 26-18s18 6 26 18c-8 12-18 18-26 18S14 44 6 32z"/><circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="2" fill="currentColor"/>'),
  use: s('<path d="M22 54V28c0-3 5-3 5 0v-12c0-3 5-3 5 0v10-12c0-3 5-3 5 0v14-8c0-3 5-3 5 0v18c0 10-6 16-14 16h-2c-6 0-9-4-12-8l-7-10c-2-3 2-6 5-3l5 5"/>'),
  take: s('<path d="M14 26h36l-4 28H18z"/><path d="M24 26c0-10 16-10 16 0"/>'),
  talk: s('<path d="M10 14h44v26H30l-12 10v-10h-8z"/><path d="M20 24h24M20 31h16"/>'),
  journal: s('<path d="M14 8h34v48H14z"/><path d="M20 8v48M26 18h16M26 26h16M26 34h10"/>'),
  hint: s('<path d="M24 40c-6-4-8-9-8-14 0-9 7-16 16-16s16 7 16 16c0 5-2 10-8 14v6H24z"/><path d="M26 52h12M28 58h8"/>'),
  menu: s('<path d="M12 18h40M12 32h40M12 46h40"/>'),
  save: s('<path d="M12 10h34l8 8v36H12z"/><path d="M20 10v14h22V10M20 54V38h24v16"/>'),
  sol: s('<circle cx="32" cy="32" r="10"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M13 51l6-6M45 19l6-6"/>'),
  luna: s('<path d="M40 10a22 22 0 1 0 14 34A18 18 0 0 1 40 10z" fill="currentColor" fill-opacity=".15"/>'),
  cuervo: s('<path d="M6 30l14-6 8 4 4-6 6-2 4 4-4 2 14-6 12 8-16 2-6 10-10 4-6-4-8-6z" fill="currentColor" fill-opacity=".85"/>'),
  llave: s('<circle cx="18" cy="32" r="9"/><path d="M27 32h30M48 32v8M54 32v6"/>'),
  ojo: s('<path d="M6 32c8-12 18-18 26-18s18 6 26 18c-8 12-18 18-26 18S14 44 6 32z"/><circle cx="32" cy="32" r="7" fill="currentColor"/>'),
  estrella: s('<path d="M32 6l7 18h19l-15 11 6 19-17-12-17 12 6-19L6 24h19z"/>'),
  casa: s('<path d="M10 30L32 10l22 20M16 26v28h32V26M28 54V40h8v14"/>'),
  up: s('<path d="M20 40l12-14 12 14"/>'),
  down: s('<path d="M20 26l12 14 12-14"/>'),
};
