import type { Effect, GameState } from '../systems/types';
import { has, flag } from '../systems/state';

export const SPEAKERS: Record<string, { name: string; color: string }> = {
  elena: { name: 'Elena', color: '#62694c' },
  anselmo: { name: 'Anselmo', color: '#75634d' },
  mercedes: { name: 'Doña Mercedes', color: '#713f42' },
  rosa: { name: 'Rosa', color: '#a58a53' },
  isabel: { name: 'Isabel', color: '#7c8a99' },
  sombra: { name: 'La Sombra', color: '#111111' },
  narr: { name: '', color: '#49392d' },
};

export interface DialogOption {
  text: string;
  next?: string;
  when?: (s: GameState) => boolean;
  effects?: Effect[];
  onceFlag?: string; // se oculta cuando el flag existe
}
export interface DialogNode {
  lines: [string, string][];
  effects?: Effect[];
  options?: DialogOption[];
  next?: string;
}
export interface Dialog {
  start: (s: GameState) => string;
  nodes: Record<string, DialogNode>;
}

const bye: DialogOption = { text: 'Eso es todo, por ahora.' };

export const DIALOGS: Record<string, Dialog> = {
  // ------------------------------------------------------------------ ANSELMO
  anselmo_porton: {
    start: () => 'a',
    nodes: {
      a: {
        lines: [
          ['anselmo', '¿Quién anda? …Una muchacha. Con esta lluvia el camino del cerro se pone imposible, hasta para los de acá.'],
          ['elena', 'Elena Ríos. Me mandaron una carta con esta dirección.'],
          ['anselmo', '(Mira la carta y después la mira a ella. Algo se le acomoda en la cara.) Pase. La señora está en el salón.'],
          ['elena', 'Mi caballo no quiso pasar de la tranquera. En el pueblo dicen que acá "los relojes andan mal".'],
          ['anselmo', 'Los relojes andan como se les ordena.'],
          ['anselmo', 'Yo voy al invernadero a cubrir los plantines. Si necesita algo, ahí me encuentra.'],
        ],
        effects: [{ t: 'flag', k: 'gateOpen' }, { t: 'flag', k: 'metAnselmo' }, { t: 'note', id: 'anselmo' }],
      },
    },
  },
  anselmo: {
    start: (s) => (has(s, 'cinta') && !flag(s, 'anselmoTrust') ? 'cinta' : 'hub'),
    nodes: {
      hub: {
        lines: [['anselmo', flagLine()]],
        options: [
          { text: '¿Hace cuánto trabaja en la casa?', next: 'tiempo', onceFlag: 'ans_tiempo' },
          { text: '¿Por qué detiene los relojes?', next: 'relojes', onceFlag: 'ans_relojes' },
          { text: '¿Tiene querosén? Encontré un quinqué.', next: 'querosen', when: (s) => (has(s, 'quinque') || flag(s, 'anomaly1')) && !has(s, 'querosen') && !flag(s, 'quinqueLoaded') },
          { text: '¿Conoció a una tal Juana Calfún?', next: 'jeanne', onceFlag: 'ans_jeanne' },
          { text: 'Le pido la llave del archivo.', next: 'archivo_no', when: (s) => flag(s, 'sawArchive') && !flag(s, 'anselmoTrust') },
          bye,
        ],
      },
      tiempo: {
        lines: [
          ['anselmo', 'Desde que pusieron la primera piedra. Don Aurelio me trajo de Azul cuando yo tenía su edad.'],
          ['anselmo', 'He visto esta casa llena de gente. Ahora quedamos la señora, la Rosa y yo. Y usted.'],
        ],
        effects: [{ t: 'flag', k: 'ans_tiempo' }],
        next: 'hub',
      },
      relojes: {
        lines: [
          ['anselmo', 'Orden del señor. Que ningún reloj de esta casa ande de noche.'],
          ['elena', 'El señor murió en 1912.'],
          ['anselmo', 'Las órdenes no se mueren con la gente, señorita.'],
        ],
        effects: [{ t: 'flag', k: 'ans_relojes' }],
        next: 'hub',
      },
      querosen: {
        lines: [
          ['anselmo', '¿Un quinqué? En esta casa hay luz eléctrica desde el año doce.'],
          ['anselmo', '…Hay una lata de querosén junto a la puerta del invernadero. Llévesela. Y no me diga de dónde sacó ese quinqué.'],
        ],
        effects: [{ t: 'flag', k: 'askedKerosene' }],
        next: 'hub',
      },
      jeanne: {
        lines: [
          ['anselmo', '(Se queda quieto, con las tijeras abiertas.)'],
          ['anselmo', 'La Juana. Era la niñera de la nena. Venía de un puesto de la sierra y le enseñaba los nombres de los pájaros. Se fue en el diez.'],
          ['elena', 'Era mi madre.'],
          ['anselmo', 'Ya sé. Tiene los mismos ojos. Y la misma manera de mirar las cosas, como si les estuviera sacando una fotografía.'],
        ],
        effects: [{ t: 'flag', k: 'ans_jeanne' }, { t: 'note', id: 'jeanne' }],
        next: 'hub',
      },
      archivo_no: {
        lines: [
          ['anselmo', 'Esa llave no la tiene nadie más que yo. Y la Juana, una noche.'],
          ['anselmo', 'Ya vio cómo terminó eso.'],
        ],
        next: 'hub',
      },
      cinta: {
        lines: [
          ['elena', 'Anselmo. Esto estaba en la caja de música de Isabel.'],
          ['anselmo', '(Mira la cinta un largo rato. Se saca el sombrero.)'],
          ['anselmo', 'Se la até yo, la última tarde. La señora no podía, le temblaban las manos.'],
          ['anselmo', 'Su madre bajó al sótano con mi llave. Yo se la di. Sacó una pieza del aparato del señor para que la nena pudiera irse. Don Aurelio la echó al otro día.'],
          ['anselmo', 'Yo me quedé. Alguien tenía que detener los relojes. Si no, la casa come más rápido.'],
          ['anselmo', 'Tome. El archivo está en el sótano. Si va a terminar lo que empezó su madre, termínelo bien.'],
        ],
        effects: [{ t: 'flag', k: 'anselmoTrust' }, { t: 'give', item: 'llave_archivo' }, { t: 'note', id: 'anselmo_confiesa' }, { t: 'sfx', id: 'pickup' }],
      },
    },
  },

  // ------------------------------------------------------------------ MERCEDES
  mercedes: {
    start: (s) => (flag(s, 'musicboxPlayed') ? 'olvido' : flag(s, 'metMercedes') ? 'hub' : 'intro'),
    nodes: {
      intro: {
        lines: [
          ['mercedes', 'Anselmo dice que llegó una muchacha a caballo, bajo la lluvia. Siéntese, si encuentra dónde. Todo está tapado con sábanas.'],
          ['elena', 'Elena Ríos, señora. Me llegó esta carta. Sin firma.'],
          ['mercedes', '(Mira el dibujo de las velas un rato largo.) Esta letra… No. No sé de quién es. No recuerdo. Últimamente no recuerdo dónde dejo las cosas, ni los días.'],
          ['mercedes', '¿Usted sabe sacar fotografías? Ríos… conocí a una mujer de la sierra que trabajó acá. Bueno. Necesito que alguien fotografíe y ordene esta casa antes de que la cierre. Le pagaré bien.'],
          ['mercedes', 'Quiero que empiece por la biblioteca. Hay que fotografiarlo todo antes de que cierre la casa.'],
          ['mercedes', 'La llave… la dejé en algún lado. ¿En el costurero, quizás? Siempre la dejo en el costurero.'],
        ],
        effects: [{ t: 'flag', k: 'metMercedes' }, { t: 'note', id: 'mercedes' }, { t: 'note', id: 'tarea' }],
      },
      hub: {
        lines: [['mercedes', '¿Necesita algo, señorita?']],
        options: [
          { text: '¿Por qué quiere cerrar la casa?', next: 'cerrar', onceFlag: 'mer_cerrar' },
          { text: '¿Quién era la niña del retrato del estudio?', next: 'isabel', when: (s) => s.visited.includes('estudio'), onceFlag: 'mer_isabel' },
          { text: '¿Dónde está la llave de la biblioteca?', next: 'llave', when: (s) => !has(s, 'llave_biblioteca') && !flag(s, 'libraryOpen') },
          { text: 'Encontré un reloj extraño en los papeles de su marido.', next: 'reloj', when: (s) => s.docs.includes('carta_verhaegen1'), onceFlag: 'mer_reloj' },
          bye,
        ],
      },
      cerrar: {
        lines: [
          ['mercedes', 'Porque cada vez que me despierto es el mismo día. Ya sé que no lo es. Anselmo me muestra el diario.'],
          ['mercedes', 'Pero la casa huele igual, la luz entra igual… Me voy a Buenos Aires, con mi hermana. Lo he decidido. Lo decido cada mañana.'],
        ],
        effects: [{ t: 'flag', k: 'mer_cerrar' }],
        next: 'hub',
      },
      isabel: {
        lines: [
          ['mercedes', 'Mi hija. Isabel. Tenía nueve años.'],
          ['mercedes', 'A veces la oigo cantar arriba. Una cancioncita de cuatro notas. Rosa dice que también la oye. Rosa es buena chica: miente para acompañarme.'],
        ],
        effects: [{ t: 'flag', k: 'mer_isabel' }, { t: 'note', id: 'isabel' }],
        next: 'hub',
      },
      llave: {
        lines: [['mercedes', 'En el costurero, junto a la ventana. Creo. Siempre está en el costurero.']],
        next: 'hub',
      },
      reloj: {
        lines: [
          ['mercedes', 'Aurelio pasó el último año de su vida en el sótano. Decía que estaba "cuidándola".'],
          ['mercedes', 'Yo nunca bajé. No quise saber qué cuidaba.'],
        ],
        effects: [{ t: 'flag', k: 'mer_reloj' }],
        next: 'hub',
      },
      olvido: {
        lines: [
          ['mercedes', '¿Y usted quién es? ¿La nueva niñera?'],
          ['elena', 'Soy Elena, señora. La fotógrafa. Hablamos esta tarde.'],
          ['mercedes', '¿Esta tarde? (Mira el piano.) Isabel tiene clase a las cuatro. Siempre llega tarde a la clase de piano…'],
        ],
        effects: [{ t: 'note', id: 'mercedes_olvida' }],
      },
    },
  },

  // ------------------------------------------------------------------ ROSA
  rosa: {
    start: (s) => (flag(s, 'metRosa') ? 'hub' : 'intro'),
    nodes: {
      intro: {
        lines: [
          ['rosa', '¡Ay! Me asustó. Usted es la de las fotografías. Rosa, para servirle.'],
          ['elena', 'Elena. ¿Siempre limpias el hall a oscuras?'],
          ['rosa', 'La luz eléctrica se corta cuando llueve. Y cuando no llueve también. Esta casa tiene sus mañas.'],
        ],
        effects: [{ t: 'flag', k: 'metRosa' }, { t: 'note', id: 'rosa' }],
        next: 'hub',
      },
      hub: {
        lines: [['rosa', '¿Qué precisa, señorita?']],
        options: [
          { text: '¿Qué hay en el primer piso?', next: 'arriba', onceFlag: 'rosa_arriba' },
          { text: '¿Dónde consigo una vela?', next: 'vela', when: (s) => !has(s, 'vela') && !has(s, 'vela_encendida') && !flag(s, 'anomaly1') },
          { text: '¿Y fósforos?', next: 'fosforos', when: (s) => !has(s, 'fosforos') },
          { text: 'Rosa, ¿vos viste a la nena?', next: 'nena', when: (s) => flag(s, 'rosa_arriba'), onceFlag: 'rosa_nena' },
          bye,
        ],
      },
      arriba: {
        lines: [
          ['rosa', 'Los dormitorios, el cuarto de la niña Isabel y el corredor de los retratos.'],
          ['rosa', 'La puerta del rellano está trabada desde el invierno. La madera se hinchó. Anselmo dice que la va a cepillar. Hace meses que lo dice.'],
          ['rosa', 'Yo igual no subo. No de noche.'],
        ],
        effects: [{ t: 'flag', k: 'rosa_arriba' }, { t: 'note', id: 'puerta_trabada' }],
        next: 'hub',
      },
      vela: {
        lines: [['rosa', 'En el candelabro de la mesita, acá en el hall. Sirve más que la eléctrica.']],
        next: 'hub',
      },
      fosforos: {
        lines: [['rosa', 'En la repisa de la chimenea del salón. La señora fuma a escondidas, no le diga que le dije.']],
        next: 'hub',
      },
      nena: {
        lines: [
          ['rosa', '(Baja la voz.) Sí. En el corredor de arriba, desde la escalera. Vestidito blanco, una cinta celeste.'],
          ['rosa', 'No da miedo, ¿sabe? Da pena. Parece que buscara a alguien.'],
          ['rosa', 'Lo que da miedo es lo otro. Lo negro. Lo que la sigue.'],
        ],
        effects: [{ t: 'flag', k: 'rosa_nena' }, { t: 'note', id: 'la_sombra' }],
        next: 'hub',
      },
    },
  },

  rosa_libre: {
    start: () => 'a',
    nodes: {
      a: {
        lines: [
          ['rosa', '…¿Señorita? Estaba barriendo el corredor. Estaba barriendo el corredor y barriendo y barriendo…'],
          ['elena', 'Ya está, Rosa. Ya pasó. Quedate cerca de la luz.'],
          ['rosa', 'La nena está ahí, mire. Y eso… eso grande. Eso es el señor. Tiene la voz del señor.'],
        ],
        effects: [{ t: 'flag', k: 'rosaFree' }, { t: 'note', id: 'rosa_libre' }],
      },
    },
  },

  isabel: {
    start: (s) => (flag(s, 'rosaFree') ? 'b' : 'a'),
    nodes: {
      a: { lines: [['isabel', 'La Juana tenía tu cara. ¿Vos también vas a irte?']] },
      b: {
        lines: [
          ['isabel', 'Papá no me deja ir. Dice que si me voy, se termina todo.'],
          ['isabel', 'Yo estoy cansada de que sea el mismo día.'],
        ],
        effects: [{ t: 'note', id: 'isabel_cansada' }],
      },
    },
  },

  sombra: {
    start: () => 'a',
    nodes: {
      a: {
        lines: [
          ['sombra', 'No. Toques. Nada.'],
          ['sombra', 'La Juana también vino a sacarme a mi hija. Le di su lugar en el retrato a la oscuridad.'],
          ['elena', 'No es su hija lo que usted guarda, don Aurelio. Es la tarde en que se murió. La está obligando a vivirla para siempre.'],
          ['sombra', '…'],
        ],
        effects: [{ t: 'flag', k: 'talkedSombra' }],
      },
    },
  },

  // ------------------------------------------------------------------ FINAL
  final: {
    start: () => 'a',
    nodes: {
      a: {
        lines: [
          ['narr', 'El engranaje encaja con un chasquido limpio. Todo el mecanismo respira de golpe, como alguien que despierta.'],
          ['narr', 'Las agujas tiemblan entre las cuatro menos veinte y ninguna hora. Tres palancas: una de freno, una de cuerda, una de escape.'],
          ['sombra', 'Elegí, hija de Juana.'],
        ],
        options: [
          { text: 'Detener el reloj. Que el tiempo siga su curso.', effects: [{ t: 'ending', id: 'liberar' }] },
          { text: 'Darle cuerda. Quedarme yo en su lugar.', effects: [{ t: 'ending', id: 'retrato' }] },
          { text: 'Romper el mecanismo.', effects: [{ t: 'ending', id: 'fractura' }] },
          {
            text: 'Fotografiar a Isabel con la luz del quinqué, y después detener el reloj.',
            when: (s) => s.fragments.length >= 5 && has(s, 'camara'),
            effects: [{ t: 'ending', id: 'placa' }],
          },
        ],
      },
    },
  },
};

function flagLine(): string {
  return '¿Sí, señorita?';
}
