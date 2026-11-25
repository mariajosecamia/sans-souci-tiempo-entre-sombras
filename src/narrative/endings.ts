// Finales: cada uno con su escenario, estado, música y texto.
import type { Era } from '../core/palette';

export interface EndingDef { title: string; room: string; era: Era; scroll: number; mood: 'calm' | 'tense' | 'void'; text: string[] }

export const ENDINGS: Record<string, EndingDef> = {
  liberar: {
    title: 'Dejar pasar el tiempo', room: 'jardin', era: 'abandono', scroll: 320, mood: 'calm',
    text: [
      'Bajé la palanca del freno. El reloj soltó un suspiro largo, como alguien que por fin se duerme.',
      'Isabel me miró, se acomodó la cinta y caminó hacia la luz gris del quinqué. No se dio vuelta. Los chicos no se dan vuelta.',
      'Esa mañana Doña Mercedes me llamó por mi nombre. Después lloró a su hija como no había podido llorarla en once años.',
      'Belle Ombre empezó a envejecer ese mismo día. Despacio, como envejecen las casas que ya no tienen miedo.',
      'Hoy el musgo le sube por las paredes y la hiedra entra por las ventanas. Pero la luz también entra.',
    ],
  },
  retrato: {
    title: 'El retrato', room: 'hall', era: '1920', scroll: 0, mood: 'tense',
    text: [
      'Le di cuerda. Una vuelta por cada día que la casa me pidiera.',
      'Isabel se quedó. Yo me quedé con ella. Anselmo sigue deteniendo los relojes; ahora lo hace por mí.',
      'En el hall, junto al de Don Aurelio, cuelga un retrato nuevo: una muchacha de trenza negra con un quinqué en la mano.',
      'Los que entran dicen que el pintor le hizo los ojos demasiado vivos.',
    ],
  },
  fractura: {
    title: 'La fractura', room: 'jardin', era: 'sombras', scroll: 320, mood: 'void',
    text: [
      'Tiré de la palanca de escape hasta que el bronce se partió.',
      'Todo lo que la casa había retenido salió de golpe: tardes, voces, una melodía de cuatro notas, la pena entera de un hombre.',
      'Las sombras bajaron la sierra como niebla. Esa noche, en Tandil, los relojes del pueblo marcaron horas distintas.',
      'No sé si hice bien. A veces, cuando enciendo una vela, la sombra de la llama tiene alas.',
    ],
  },
  placa: {
    title: 'La placa', room: 'infantil', era: '1920', scroll: 0, mood: 'calm',
    text: [
      'Levanté la cámara. La luz del quinqué cayó sobre Isabel, y por primera vez la vi entera: no un dibujo de tinta, una nena.',
      'Abrí el obturador y conté hasta diez, como me enseñó el señor Ferrán. Después bajé la palanca del freno.',
      'El reloj se detuvo. Isabel se fue. Pero se quedó en el vidrio.',
      'Revelé la placa en el puesto, con la abuela mirando. Una nena de cinta celeste, sonriendo, y detrás, borrosa, una mujer de trenza negra.',
      'Mamá. Las dos se quedaron en la placa. Ninguna en la casa.',
    ],
  },
};
