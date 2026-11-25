// Diario de investigación: notas, personajes, objetivos, pistas en 3 niveles y capítulos.
import type { GameState } from '../systems/types';
import { has, flag } from '../systems/state';

export interface Note { title: string; text: string; cat: 'persona' | 'fenomeno' | 'nota' | 'lugar' }

export const NOTES: Record<string, Note> = {
  llegada: { cat: 'nota', title: 'La carta', text: 'Una carta sin remitente: tres velas, un cuervo y una dirección. Y la nota de mamá: "no le des cuerda al reloj". Vine por las dos.' },
  anselmo: { cat: 'persona', title: 'Anselmo Quiroga', text: 'Mayordomo y jardinero. Detiene todos los relojes cada noche "por orden del señor". Me miró como si me conociera.' },
  mercedes: { cat: 'persona', title: 'Doña Mercedes', text: 'La dueña de casa. Viuda. Olvida los días. Quiere cerrar la casa y no puede irse.' },
  tarea: { cat: 'nota', title: 'El trabajo', text: 'Fotografiar y ordenar la casa, empezando por la biblioteca. La llave estaría "en el costurero".' },
  rosa: { cat: 'persona', title: 'Rosa Benítez', text: 'La mucama. Diecisiete años, de Tandil. No sube al primer piso de noche.' },
  puerta_trabada: { cat: 'lugar', title: 'La puerta del rellano', text: 'Hinchada de humedad, trabada. Nadie sube desde el invierno.' },
  la_sombra: { cat: 'fenomeno', title: 'Lo negro', text: 'Rosa ve a una nena de blanco en el corredor alto. Y algo negro que la sigue.' },
  anomalia1: { cat: 'fenomeno', title: 'La primera fractura', text: 'La llama de la vela dibujó un cuervo en la pared y se apagó. La biblioteca apareció en ruinas, mojada, cubierta de musgo: la casa dentro de muchos años.' },
  quinque: { cat: 'fenomeno', title: 'El quinqué', text: 'Lo traje del otro tiempo. Si consigo querosén y lo enciendo, quizás pueda ver la casa abandonada cuando quiera.' },
  fractura: { cat: 'fenomeno', title: 'Las fracturas', text: 'Con el quinqué encendido puedo pasar del 1920 al abandono en los lugares donde la casa está "quebrada". Lo que tomo en un tiempo, me lo llevo al otro.' },
  hora: { cat: 'nota', title: 'Las cuatro menos veinte', text: 'Isabel murió el 15 de junio de 1909 a las cuatro menos veinte. Aurelio detuvo el reloj del hall a esa hora.' },
  verhaegen: { cat: 'persona', title: 'Lucien Verhaegen', text: 'Relojero de Lieja. Construyó para Aurelio un mecanismo que "retiene" las horas. "Lo que se retiene, se alimenta."' },
  plano: { cat: 'lugar', title: 'El plano', text: 'Una flecha desde la chimenea del salón hacia una sala bajo la casa. "La entrada canta."' },
  isabel: { cat: 'persona', title: 'Isabel Valcárcel', text: 'La hija. 1900–1909. Una cinta celeste en el pelo. Canta una canción de cuatro notas.' },
  dibujo: { cat: 'nota', title: 'El dibujo de Isabel', text: 'Luna arriba, cuervo en el medio, llave abajo. "Lo que papá esconde."' },
  simbolos: { cat: 'nota', title: 'Las sombras del teatrito', text: 'Luna, cuervo, llave. En ese orden. Como los discos del cajón del estudio.' },
  rosa_desaparece: { cat: 'fenomeno', title: 'Rosa', text: 'Cuando sonó la caja de música, Rosa gritó abajo. No está en ningún lado.' },
  mercedes_olvida: { cat: 'fenomeno', title: 'La señora olvida', text: 'Doña Mercedes ya no me reconoce. Cree que es 1909 y que Isabel llega tarde a la clase de piano.' },
  jeanne: { cat: 'persona', title: 'Mamá', text: 'Juana Calfún fue niñera de Isabel. Le enseñaba los pájaros de la sierra. Se fue de la casa en 1910.' },
  anselmo_confiesa: { cat: 'persona', title: 'Lo que hizo mamá', text: 'Anselmo le dio su llave. Mamá sacó una pieza del aparato del señor "para que la nena pudiera irse". La echaron al otro día.' },
  engranaje: { cat: 'nota', title: 'La pieza', text: 'Mamá escondió el engranaje en el archivo. Con él, el reloj puede detenerse, recibir cuerda o romperse.' },
  sala_reloj: { cat: 'lugar', title: 'La sala del reloj', text: 'Detrás del reflejo hay un lugar hecho de papel y tinta. El Reloj de Sombras. Rosa, Isabel y la Sombra.' },
  rosa_libre: { cat: 'persona', title: 'Rosa, libre', text: 'La luz del quinqué deshizo la tinta. Rosa dice que la Sombra tiene la voz del señor.' },
  isabel_cansada: { cat: 'persona', title: 'Isabel', text: '"Estoy cansada de que sea el mismo día."' },
};

export interface Objective {
  id: string;
  title: string;
  active: (s: GameState) => boolean;
  done: (s: GameState) => boolean;
  hints: [string, string, string];
}

export const OBJECTIVES: Objective[] = [
  { id: 'entrar', title: 'Entrar a Belle Ombre', active: () => true, done: (s) => flag(s, 'gateOpen'),
    hints: ['Alguien tiene que saber que llegaste.', 'En el pilar derecho del portón hay algo para avisar.', 'Usá la campana junto al portón.'] },
  { id: 'mercedes', title: 'Presentarme ante la dueña de casa', active: (s) => flag(s, 'gateOpen'), done: (s) => flag(s, 'metMercedes'),
    hints: ['Anselmo dijo que la señora está en el salón.', 'Entrá a la casa por la puerta principal y buscá el salón, a la izquierda del hall.', 'En el salón, hablá con Doña Mercedes.'] },
  { id: 'llave_bib', title: 'Conseguir la llave de la biblioteca', active: (s) => flag(s, 'metMercedes'), done: (s) => has(s, 'llave_biblioteca') || flag(s, 'libraryOpen'),
    hints: ['La señora siempre la deja en el mismo lugar.', 'Dijo "en el costurero". Está en el salón.', 'Usá el costurero del salón.'] },
  { id: 'luz', title: 'Iluminar la biblioteca', active: (s) => flag(s, 'libraryOpen') || has(s, 'llave_biblioteca'), done: (s) => flag(s, 'anomaly1'),
    hints: ['La biblioteca está a oscuras. Hace falta una vela y algo para encenderla.', 'Hay una vela en el candelabro del hall y fósforos en la repisa de la chimenea del salón.', 'Combiná la vela con los fósforos y usá la vela encendida en el candelabro del escritorio de la biblioteca.'] },
  { id: 'quinque', title: 'Hacer funcionar el quinqué', active: (s) => flag(s, 'tookQuinque'), done: (s) => flag(s, 'quinqueLit'),
    hints: ['Un quinqué necesita combustible y fuego.', 'Anselmo, en el invernadero, sabe dónde hay querosén.', 'Tomá la lata de querosén del invernadero, combinala con el quinqué y después combiná el quinqué con los fósforos.'] },
  { id: 'nicho', title: 'Buscar lo que la biblioteca esconde en el otro tiempo', active: (s) => flag(s, 'quinqueLit'), done: (s) => flag(s, 'tookDiary'),
    hints: ['En 1920 hay un tramo de estantería tapiado.', 'Con el quinqué encendido, mirá la biblioteca abandonada.', 'En la biblioteca, pasá al abandono con el quinqué y tomá el libro del nicho, a la izquierda.'] },
  { id: 'reloj', title: 'Abrir el reloj del hall', active: (s) => flag(s, 'tookDiary'), done: (s) => flag(s, 'clockOpen'),
    hints: ['El diario dice a qué hora se detuvo todo. Pero las agujas están trabadas.', 'En el jardín, al pie de la escalinata, hay una aceitera. La hora es las cuatro menos veinte.', 'Usá la aceitera en el reloj del hall y poné las agujas en las 3:40.'] },
  { id: 'estudio', title: 'Entrar al estudio de Don Aurelio', active: (s) => flag(s, 'clockOpen'), done: (s) => flag(s, 'estudioOpen'),
    hints: ['La llave estaba dentro del reloj.', 'La puerta del estudio está en el hall, junto al reloj.', 'Usá la llave del estudio en la puerta con la placa de bronce.'] },
  { id: 'arriba', title: 'Subir al primer piso', active: (s) => flag(s, 'quinqueLit'), done: (s) => s.visited.includes('corredor'),
    hints: ['La puerta del rellano está trabada… en 1920.', 'En el abandono, esa puerta ya se cayó.', 'En el hall, pasá al abandono con el quinqué y subí la escalera.'] },
  { id: 'teatro', title: 'Entender el teatro de sombras de Isabel', active: (s) => s.visited.includes('infantil'), done: (s) => flag(s, 'theatreSolved'),
    hints: ['Isabel dejó instrucciones escondidas. Y el teatrito necesita luz.', 'En el abandono, el papel tapiz del cuarto se despegó: hay algo detrás. Volvé a 1920 con una vela encendida.', 'Tomá el dibujo detrás del papel tapiz (abandono), encendé la vela y usala en el teatro: luna arriba, cuervo al medio, llave abajo.'] },
  { id: 'cajon', title: 'Abrir el cajón de los discos', active: (s) => flag(s, 'estudioOpen') && flag(s, 'theatreSolved'), done: (s) => flag(s, 'drawerOpen'),
    hints: ['Las sombras del teatrito mostraron tres símbolos.', 'El cajón está en el escritorio del estudio.', 'Poné los discos en luna, cuervo, llave.'] },
  { id: 'caja', title: 'Hacer sonar la caja de música', active: (s) => flag(s, 'drawerOpen'), done: (s) => flag(s, 'musicboxPlayed'),
    hints: ['La llavecita dorada tiene forma de mariposa.', 'La caja de música está sobre la cómoda del cuarto de Isabel.', 'Usá la llave de la caja de música en la caja, en 1920.'] },
  { id: 'piano', title: 'Seguir la melodía', active: (s) => flag(s, 'musicboxPlayed'), done: (s) => flag(s, 'panelOpen'),
    hints: ['"La entrada canta", decía el plano.', 'Hay un piano en el salón, junto a la chimenea marcada en el plano.', 'Tocá en el piano del salón: MI, DO, RE, SOL.'] },
  { id: 'anselmo', title: 'Conseguir la llave del archivo', active: (s) => flag(s, 'sawArchive') || flag(s, 'panelOpen'), done: (s) => flag(s, 'anselmoTrust'),
    hints: ['Anselmo no confía en cualquiera.', 'Mostrale algo que haya sido de Isabel.', 'Hablá con Anselmo en el invernadero teniendo la cinta azul.'] },
  { id: 'archivo', title: 'Abrir el archivo del sótano', active: (s) => flag(s, 'anselmoTrust'), done: (s) => flag(s, 'archivoOpen'),
    hints: ['El archivo es un armario de hierro en el sótano.', 'Tiene que ser en 1920: en el abandono el papel ya no existe.', 'Usá la llave del archivo en el armario del sótano.'] },
  { id: 'rosa', title: 'Encontrar a Rosa', active: (s) => flag(s, 'rosaGone'), done: (s) => flag(s, 'enteredVoid'),
    hints: ['En el sótano hay una pared detrás de la cual suena un tic-tac.', 'En el abandono, el sótano está inundado y el agua refleja una puerta.', 'Con el engranaje en el bolso, usá el reflejo del agua en el sótano abandonado.'] },
  { id: 'liberar', title: 'Liberar a Rosa', active: (s) => flag(s, 'enteredVoid'), done: (s) => flag(s, 'rosaFree'),
    hints: ['La tinta le teme a la luz.', 'No cualquier luz: una de otro tiempo.', 'Usá el quinqué encendido sobre Rosa.'] },
  { id: 'final', title: 'Decidir qué hacer con el reloj', active: (s) => flag(s, 'rosaFree'), done: (s) => !!s.ending,
    hints: ['Falta una pieza en el centro del reloj.', 'Antes, quizás haya que escuchar a lo que vive detrás.', 'Usá el engranaje en el Reloj de Sombras (y si la Sombra habla, escuchala).'] },
];

export function currentObjectives(s: GameState): Objective[] {
  return OBJECTIVES.filter((o) => o.active(s) && !o.done(s));
}

export const CHAPTERS = ['La carta', 'La casa que recuerda', 'Lo que esconden las sombras', 'La habitación imposible', 'Antes del amanecer'];

export function chapterOf(s: GameState): number {
  if (flag(s, 'enteredVoid')) return 4;
  if (flag(s, 'musicboxPlayed')) return 3;
  if (s.visited.includes('corredor')) return 2;
  if (flag(s, 'anomaly1')) return 1;
  return 0;
}

export const PLACES: Record<string, string> = {
  entrada: 'El portón', jardin: 'Jardín y fachada', invernadero: 'Invernadero', hall: 'Hall principal', salon: 'Salón',
  biblioteca: 'Biblioteca', estudio: 'Estudio', corredor: 'Corredor de los retratos', infantil: 'Cuarto de Isabel',
  sotano: 'Sótano', reloj: 'La sala del reloj',
};

export const LEMA = 'Hay casas que guardan recuerdos. Otras se niegan a dejar que el tiempo avance.';
