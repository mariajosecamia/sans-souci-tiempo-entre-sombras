// Idioma del juego: español (original) o inglés. Los textos viven en español en los datos;
// t() los traduce en el momento de mostrarlos.
import { EN } from './en';

export type Lang = 'es' | 'en';
const KEY = 'belle-ombre:lang';

function initial(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'es' || v === 'en') return v;
  } catch { /* sin almacenamiento */ }
  try { return typeof navigator !== 'undefined' && /^es/i.test(navigator.language) ? 'es' : (typeof navigator !== 'undefined' ? 'en' : 'es'); } catch { return 'es'; }
}

let lang: Lang = initial();

export const getLang = (): Lang => lang;
export function setLang(l: Lang): void {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* */ }
  try { document.documentElement.lang = l; } catch { /* */ }
}

/** Traduce un texto de los datos (si no hay traducción, devuelve el original). */
export function t(s: string): string {
  return lang === 'en' ? EN[s] ?? s : s;
}

/** Texto de interfaz escrito en los dos idiomas en el lugar. */
export function L(es: string, en: string): string {
  return lang === 'en' ? en : es;
}
