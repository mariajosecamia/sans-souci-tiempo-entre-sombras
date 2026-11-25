// Resolución de interacciones: traduce (hotspot, verbo, objeto) en una lista de efectos.
// No sabe nada de Phaser: lo usan la escena y los tests de recorrido.
import type { Action, Effect, GameState, Hotspot, RoomDef, Verb } from './types';
import { ROOMS } from '../data/rooms';
import { ITEMS } from '../data/items';
import type { Era } from '../core/palette';

const say = (text: string): Effect => ({ t: 'say', text, who: 'elena' });

export function run(a: Action | undefined, s: GameState): Effect[] {
  if (!a) return [];
  return typeof a === 'function' ? a(s) : a;
}

export function eraOf(room: RoomDef, s: GameState): Era {
  if (room.forceEra) return room.forceEra;
  if (room.fracture && room.fracture(s)) return s.era;
  // la biblioteca puede estar en abandono durante la primera anomalía aunque no haya quinqué
  if (room.id === 'biblioteca' && s.era === 'abandono' && s.flags.anomaly1 && !s.flags.tookQuinque) return 'abandono';
  return '1920';
}

export function hotspotVisible(h: Hotspot, room: RoomDef, s: GameState): boolean {
  if (h.when && !h.when(s)) return false;
  if (h.eras && !h.eras.includes(eraOf(room, s))) return false;
  return true;
}

export function visibleHotspots(roomId: string, s: GameState): Hotspot[] {
  const room = ROOMS[roomId];
  return room.hotspots.filter((h) => hotspotVisible(h, room, s));
}

export function hotspotName(h: Hotspot, s: GameState): string {
  return typeof h.name === 'function' ? h.name(s) : h.name;
}

export function verbsFor(h: Hotspot): Verb[] {
  const v: Verb[] = [];
  if (h.look) v.push('look');
  if (h.talk) v.push('talk');
  if (h.take) v.push('take');
  if (h.use) v.push('use');
  return v;
}

/** Interacción con un punto caliente. */
export function interact(h: Hotspot, verb: Verb | 'exit', s: GameState, item?: string): Effect[] {
  if (item) {
    const ui = h.useItem?.[item];
    if (ui) return run(ui, s);
    if (h.exit && !h.exit.when?.(s) && h.exit.locked && item.startsWith('llave')) return run(h.exit.locked, s);
    if (item === 'camara') return [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'shutter' }, { t: 'flash', color: '#ffffff' }, say(photoLine(h, s))];
    return [say(genericNo(item, s))];
  }
  if (verb === 'exit' && h.exit) {
    const ok = !h.exit.when || h.exit.when(s);
    if (!ok) return run(h.exit.locked, s);
    return [{ t: 'goto', room: h.exit.to, at: h.exit.at }];
  }
  const map: Record<Verb, Action | undefined> = { look: h.look, use: h.use, take: h.take, talk: h.talk };
  const a = map[verb as Verb];
  if (a) return run(a, s);
  if (verb === 'take') return [say(s.flags._rngNo ? 'No me lo puedo llevar.' : 'Eso se queda donde está.')];
  if (verb === 'talk') return [say('No contesta. Por suerte.')];
  if (verb === 'use') return h.exit ? interact(h, 'exit', s) : [say('No se me ocurre qué hacer con eso.')];
  return [say('Nada en especial.')];
}

/** Combinaciones de objetos del inventario. */
export function combine(a: string, b: string, s: GameState): Effect[] {
  const key = [a, b].sort().join('+');
  switch (key) {
    case 'fosforos+vela':
      return [{ t: 'sfx', id: 'match' }, { t: 'take', item: 'vela' }, { t: 'give', item: 'vela_encendida' }, say('La llama prende al segundo fósforo.')];
    case 'querosen+quinque':
      return [{ t: 'sfx', id: 'pour' }, { t: 'take', item: 'quinque' }, { t: 'take', item: 'querosen' }, { t: 'give', item: 'quinque_cargado' }, say('El querosén entra en el depósito con un gorgoteo. Alcanza justo.')];
    case 'fosforos+quinque_cargado':
      return [{ t: 'sfx', id: 'match' }, { t: 'take', item: 'quinque_cargado' }, { t: 'give', item: 'quinque_encendido' }, { t: 'flag', k: 'quinqueLit' },
        say('La mecha prende. La luz no es amarilla: es gris verdosa, como la luz debajo del agua. Y las paredes… tiemblan.'), { t: 'note', id: 'fractura' }];
    case 'fosforos+quinque':
      return [say('Está seco. Primero necesita querosén.')];
    case 'cinta+dibujo_isabel':
      return [say('La cinta y el dibujo. Las dos cosas huelen a lavanda.')];
    default:
      return [say('No, eso no va con eso.')];
  }
}

/** Mirar / usar un objeto del inventario sobre sí mismo. */
export const ITEM_DOCS: Record<string, string> = {
  nota_jeanne: 'nota_jeanne', carta_anonima: 'carta_anonima', diario_aurelio: 'diario_aurelio', dibujo_isabel: 'dibujo_isabel',
};

export function inspectItem(id: string): Effect[] {
  if (ITEM_DOCS[id]) return [{ t: 'anim', anim: 'read' }, { t: 'doc', id: ITEM_DOCS[id] }];
  return [say(ITEMS[id]?.desc ?? '…')];
}

function genericNo(item: string, s: GameState): string {
  const lines = ['No creo que sirva ahí.', 'No tiene sentido.', 'Eso no va ahí.', 'Mejor no.'];
  return lines[(item.length + s.inventory.length) % lines.length];
}

function photoLine(h: Hotspot, s: GameState): string {
  const n = (s.flags.photos as number) || 0;
  s.flags.photos = n + 1;
  const lines = [
    'Click. El obturador suena demasiado fuerte en esta casa.',
    'Una placa más. Habrá que ver qué sale cuando la revele.',
    'Encuadro, contengo la respiración, disparo. Siempre me pareció un pequeño robo.',
    'Click. Por un segundo, en el visor, hubo alguien más.',
  ];
  return lines[n % lines.length];
}

/** Al entrar a una sala: las salas sin fractura vuelven a 1920. */
export function settleEra(room: RoomDef, s: GameState): void {
  if (room.fracture?.(s) || room.forceEra) return;
  if (room.id === 'biblioteca' && s.era === 'abandono' && !s.flags.tookQuinque) return;
  s.era = '1920';
}

/** ¿Puede Elena cambiar de tiempo en esta sala? */
export function eraToggleAvailable(room: RoomDef, s: GameState): boolean {
  return !!room.fracture?.(s) && s.inventory.includes('quinque_encendido');
}
