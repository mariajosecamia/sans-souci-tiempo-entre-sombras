// Salas del palacio: geometría jugable, puntos calientes y lógica de interacción.
// El arte de cada sala está en src/art/rooms/*.ts y usa las mismas coordenadas.
import type { Effect, GameState, RoomDef, Hotspot } from '../systems/types';
import { has, flag } from '../systems/state';

const say = (text: string, who = 'elena'): Effect => ({ t: 'say', text, who });
const narr = (text: string): Effect => ({ t: 'say', text, who: 'narr' });
const byEra = (s: GameState, a: string, b: string, c?: string) =>
  s.era === 'abandono' ? b : s.era === 'sombras' ? (c ?? b) : a;

const quinqueLit = (s: GameState) => flag(s, 'quinqueLit');

function fragment(id: string, rect: [number, number, number, number], era: '1920' | 'abandono', doc: string, extra?: (s: GameState) => boolean): Hotspot {
  return {
    id: 'frag_' + id, name: 'Destello de tinta', rect, eras: [era], prop: 'fragmento',
    walk: [rect[0] + rect[2] / 2, 640],
    when: (s) => !s.fragments.includes(id) && (extra ? extra(s) : true),
    look: [say('Una mancha de tinta que flota en el aire, como una gota que se niega a caer.')],
    use: [{ t: 'anim', anim: 'examine' }, { t: 'sfx', id: 'memory' }, { t: 'fragment', id }, { t: 'doc', id: doc }, { t: 'flash', color: '#111111' }],
    take: [{ t: 'anim', anim: 'examine' }, { t: 'sfx', id: 'memory' }, { t: 'fragment', id }, { t: 'doc', id: doc }, { t: 'flash', color: '#111111' }],
  };
}

export const ROOMS: Record<string, RoomDef> = {
  // =========================================================== ENTRADA
  entrada: {
    id: 'entrada', name: 'El portón', width: 1583, outdoor: true, ambience: 'rain-out',
    // Coordenadas sobre la ilustración pintada (public/art/entrada-*.webp, 1583×720).
    floor: [[30, 625], [1550, 600], [1570, 712], [15, 712]],
    scale: [600, 0.95, 712, 0.95],
    spawn: [620, 670],
    onEnter: (s) => (flag(s, 'introDone') ? [] : [
      { t: 'flag', k: 'introDone' },
      say('Tandil, 12 de mayo de 1920. El zaino no quiso pasar de la tranquera: lo dejé atado allá abajo, con las orejas paradas.'),
      say('Belle Ombre. "Bella sombra." Con esta lluvia, desde acá, es sólo sombra.'),
      say('Traigo dos papeles en el bolso: la nota de mamá y una carta sin remitente, con tres velas, un cuervo y esta dirección.'),
    ]),
    hotspots: [
      {
        id: 'porton', name: 'Portón de hierro', rect: [800, 140, 540, 440], walk: [1070, 640],
        look: (s) => [say(flag(s, 'gateOpen') ? 'Abierto. Del otro lado, el jardín se hunde en la niebla.' : 'Hierro forjado, con un monograma: una V entrelazada con una S. Cerrado con cadena.')],
        exit: {
          to: 'jardin', at: [80, 670], when: (s) => flag(s, 'gateOpen'),
          locked: [say('Cerrado con cadena. Tiene que haber una manera de avisar que llegué.')],
        },
      },
      {
        id: 'campana', name: 'Campana', rect: [1365, 195, 100, 240], walk: [1330, 640], prop: 'campana',
        look: [say('Una campana de bronce verdeada, con un cordón de cuero.')],
        use: (s) => flag(s, 'gateOpen') ? [say('Ya me abrieron. No hace falta despertar a nadie más.')] : [
          { t: 'anim', anim: 'use' }, { t: 'sfx', id: 'bell' }, { t: 'wait', ms: 900 },
          narr('Pasos sobre la grava, del otro lado. Una linterna que se acerca entre la lluvia.'),
          { t: 'sfx', id: 'gate' }, { t: 'event', id: 'anselmo_gate' },
          { t: 'dialog', id: 'anselmo_porton' },
        ],
      },
      {
        id: 'farol', name: 'Farol', rect: [455, 80, 105, 510], walk: [580, 660],
        look: [say('Un farol a gas, apagado. La lluvia lo hace sonar como un tambor muy chico.')],
      },
      {
        id: 'sierras', name: 'Las sierras', rect: [0, 200, 450, 180],
        look: [say('Las sierras de Tandil, bajas y antiguas, como lomos de animales dormidos bajo la llovizna.')],
      },
      {
        id: 'cartel', name: 'Cartel', rect: [940, 40, 260, 70],
        look: [say('"BELLE OMBRE", en letras de hierro. "Bella sombra". Alguien tenía sentido del humor. O sabía algo.')],
      },
      {
        id: 'valija', name: 'Mis alforjas', rect: [225, 505, 215, 125], walk: [470, 670], eras: ['1920'],
        look: [say('Las alforjas con el estuche de las placas. Pesan como si llevaran la sierra entera adentro.')],
        take: [say('Anselmo prometió subirla después. Me llevo lo importante: la cámara, la nota de mamá.')],
      },
    ],
  },

  // =========================================================== JARDÍN / FACHADA
  // Coordenadas sobre la ilustración pintada (public/art/jardin-*.webp, 1765×720).
  jardin: {
    id: 'jardin', name: 'Jardín y fachada', width: 1765, outdoor: true, ambience: 'rain-out',
    floor: [[20, 608], [1420, 608], [1440, 658], [1745, 668], [1750, 712], [15, 712]],
    scale: [608, 0.48, 712, 0.48],
    spawn: [80, 670],
    fracture: quinqueLit,
    hotspots: [
      {
        id: 'puerta_principal', name: 'Puerta principal', rect: [985, 385, 115, 140], walk: [1042, 618],
        look: (s) => [say(byEra(s, 'Roble con herrajes de bronce, bajo un arco de piedra. Encima, un vitral con un reloj de sol.', 'La puerta cuelga de una sola bisagra. El arco está comido por la hiedra.', 'El arco es un borrón de tinta. La puerta está dibujada, nada más, pero se abre igual.'))],
        exit: { to: 'hall', at: [130, 670] },
      },
      {
        id: 'fuente', name: 'Fuente', rect: [70, 330, 275, 270], walk: [240, 645],
        look: (s) => [say(byEra(s, 'Una fuente de tres tazas. El agua cae con un ruido de reloj de arena.', 'La fuente está seca, llena de hojas negras y una costra de musgo. En el fondo, monedas verdes de óxido.', 'La fuente gotea tinta. Cada gota tarda demasiado en caer.'))],
      },
      fragment('fuente', [185, 420, 50, 50], 'abandono', 'frag_fuente'),
      {
        id: 'escalinata', name: 'Escalinata', rect: [505, 500, 255, 110], walk: [630, 645],
        look: (s) => [say(byEra(s, 'Una escalinata de piedra con dos bochas en los pilares. Lleva a una puerta lateral, cerrada.', 'Los escalones están partidos y el musgo los volvió blandos como pan.'))],
      },
      {
        id: 'carretilla', name: 'Carretilla', rect: [1430, 500, 295, 150], walk: [1400, 665],
        look: (s) => [say(byEra(s, 'La carretilla de Anselmo: tierra, una pala, trapos.', 'La rueda se pudrió. Crecen helechos donde estaba la tierra.'))],
      },
      {
        id: 'aceitera', name: 'Aceitera', rect: [1525, 545, 40, 40], walk: [1480, 668], prop: 'aceitera', eras: ['1920'],
        when: (s) => !flag(s, 'tookOil'),
        look: [say('Una aceitera de pico largo sobre los trapos de la carretilla.')],
        take: [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'aceitera' }, { t: 'flag', k: 'tookOil' }, { t: 'sfx', id: 'pickup' }, say('Anselmo no la va a extrañar. Espero.')],
      },
      {
        id: 'hiedra', name: 'Hiedra', rect: [880, 215, 260, 120],
        look: (s) => [say(byEra(s, 'La hiedra cubre la galería del primer piso como un chal. Alguien la poda con mucho cuidado.', 'La hiedra ganó. Cuelga sobre el arco de la entrada como una cortina.'))],
      },
      {
        id: 'pergola', name: 'Pérgola', rect: [1215, 170, 295, 140],
        look: (s) => [say(byEra(s, 'Una pérgola sobre la terraza del ala derecha.', 'Quedan los tirantes de la pérgola, como las costillas de un animal grande.'))],
      },
      {
        id: 'chimenea', name: 'Chimenea alta', rect: [1165, 10, 70, 180],
        look: (s) => [say(byEra(s, 'La chimenea más alta de la casa. No sale humo de ninguna otra, pero de esta sí. Siempre.', 'La chimenea alta sigue entera. Es lo único que el tiempo no se animó a tocar.', 'Hay un cuervo sobre la chimenea. No se mueve. Me mira.'))],
      },
      {
        id: 'ventanas', name: 'Ventanas de la fachada', rect: [500, 370, 450, 110],
        look: (s) => [say(byEra(s, 'Todas las ventanas de abajo tienen luz. Hay alguien en cada cuarto, o alguien quiere que parezca.', 'Las persianas están cerradas o caídas. Detrás de una, una cortina se mueve sin viento.'))],
      },
      {
        id: 'sierras', name: 'Las sierras', rect: [130, 170, 350, 130],
        look: [say('Detrás de los árboles, las sierras de Tandil, bajas y antiguas, como lomos de animales dormidos.')],
      },
      {
        id: 'salida_porton', name: 'Camino al portón', rect: [0, 560, 45, 160],
        exit: { to: 'entrada', at: [1070, 650] },
      },
      {
        id: 'salida_invernadero', name: 'Sendero al invernadero', rect: [1720, 560, 45, 160],
        exit: { to: 'invernadero', at: [190, 640] },
      },
    ],
  },

  // =========================================================== INVERNADERO
  invernadero: {
    id: 'invernadero', name: 'Invernadero', width: 1280, ambience: 'greenhouse',
    floor: [[60, 560], [1220, 560], [1250, 708], [30, 708]],
    scale: [560, 0.86, 708, 0.86],
    spawn: [190, 640],
    fracture: quinqueLit,
    hotspots: [
      {
        id: 'anselmo', name: 'Anselmo', rect: [330, 330, 120, 290], walk: [520, 650], face: 'left', npc: 'anselmo', eras: ['1920'],
        when: (s) => flag(s, 'gateOpen'),
        look: [say('Anselmo tapa los plantines con diarios viejos. Trabaja como si alguien lo estuviera cronometrando.')],
        talk: [{ t: 'dialog', id: 'anselmo' }],
        useItem: {
          cinta: [{ t: 'dialog', id: 'anselmo' }],
        },
      },
      {
        id: 'mesa', name: 'Mesa de trasplante', rect: [560, 430, 330, 130], walk: [720, 640],
        look: (s) => [say(byEra(s, 'Macetas, tijeras, etiquetas con nombres en latín y, debajo, otros nombres en lápiz, de otra letra: "cola de zorro", "pasto de la sierra".', 'La mesa se partió. Un helecho creció a través de las macetas rotas.'))],
      },
      {
        id: 'plantas', name: 'Plantas', rect: [920, 170, 330, 330],
        look: (s) => [say(byEra(s, 'Helechos, camelias, un limonero que no da limones.', 'Las plantas ganaron. El techo de vidrio está cubierto de hiedra y la luz entra verde.'))],
      },
      fragment('invernadero', [1010, 300, 60, 60], 'abandono', 'frag_invernadero'),
      {
        id: 'querosen', name: 'Lata de querosén', rect: [1040, 560, 70, 80], walk: [1000, 660], prop: 'lata', eras: ['1920'],
        when: (s) => !flag(s, 'tookKerosene'),
        look: [say('Una lata de querosén "Ancla", junto a la puerta.')],
        take: (s) => (flag(s, 'askedKerosene') || flag(s, 'anomaly1'))
          ? [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'querosen' }, { t: 'flag', k: 'tookKerosene' }, { t: 'sfx', id: 'pickup' }, say('Queda un resto. Alcanza.')]
          : [say('No tengo para qué cargar con eso. Todavía.')],
      },
      {
        id: 'salida', name: 'Volver al jardín', rect: [0, 400, 80, 300],
        exit: { to: 'jardin', at: [1690, 690] },
      },
    ],
  },

  // =========================================================== HALL
  hall: {
    id: 'hall', name: 'Hall principal', width: 1764, ambience: 'house',
    // Coordenadas sobre la ilustración pintada (public/art/hall-*.webp, 1764×720).
    floor: [[170, 565], [1210, 565], [1600, 615], [1745, 640], [1750, 712], [15, 712], [60, 640]],
    scale: [565, 0.74, 712, 0.74],
    spawn: [130, 670],
    fracture: quinqueLit,
    onEnter: (s) => (flag(s, 'hallSeen') ? [] : [
      { t: 'flag', k: 'hallSeen' },
      say('Huele a cera, a lluvia y a algo dulce, como flores olvidadas en un florero.'),
    ]),
    hotspots: [
      {
        id: 'puerta_calle', name: 'Puerta al jardín', rect: [20, 175, 145, 445], walk: [130, 670],
        exit: { to: 'jardin', at: [1042, 628] },
      },
      {
        id: 'chimenea_hall', name: 'Chimenea', rect: [345, 300, 225, 290], walk: [470, 620],
        look: (s) => [say(byEra(s, 'Una chimenea de piedra con un escudo: un reloj de arena con alas. Está apagada, pero la piedra todavía está tibia.', 'La campana de la chimenea se rajó. Adentro hay un nido y ceniza húmeda.', 'Por la boca de la chimenea no entra aire: sale tinta, despacio, como humo al revés.'))],
      },
      {
        id: 'ventanal_hall', name: 'Ventanal', rect: [190, 20, 145, 470],
        look: (s) => [say(byEra(s, 'Vidrios emplomados. La luz de la tarde entra en diagonal y pinta el parquet.', 'Faltan la mitad de los vidrios. Entra la hiedra, y con ella el frío.'))],
      },
      {
        id: 'galeria', name: 'Galería', rect: [665, 180, 440, 75],
        look: [say('La galería del primer piso da toda la vuelta al hall. Desde arriba, alguien podría mirar sin ser visto.')],
      },
      {
        id: 'puerta_salon', name: 'Salón', rect: [790, 300, 200, 225], walk: [890, 585],
        exit: { to: 'salon', at: [1480, 660] },
      },
      {
        id: 'retrato_aurelio', name: 'Retrato de Don Aurelio', rect: [405, 50, 115, 205], walk: [470, 620],
        look: (s) => [say(byEra(s,
          'Don Aurelio Valcárcel, de levita, con la mano sobre un reloj de bolsillo. El pintor le hizo los ojos un poco demasiado vivos.',
          'El retrato sigue ahí, cubierto de moho. Sólo la mano sobre el reloj quedó limpia, como si alguien la siguiera tocando.',
          'El marco está vacío. La tela es una mancha de tinta con forma de ave.'))],
      },
      {
        id: 'candelabro', name: 'Candelabro', rect: [1120, 385, 75, 95], walk: [1150, 600],
        look: (s) => [say(flag(s, 'tookCandle') ? 'Quedan los cabos de las otras velas, consumidos hasta el bronce.' : 'Un candelabro de tres brazos. Sólo una vela está entera.')],
        take: (s) => flag(s, 'tookCandle') ? [say('No quedan velas enteras.')] :
          [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'vela' }, { t: 'flag', k: 'tookCandle' }, { t: 'sfx', id: 'pickup' }],
        eras: ['1920'],
      },
      {
        id: 'escalera', name: 'Escalera principal', rect: [1240, 100, 300, 490], walk: [1450, 625],
        look: (s) => [say(byEra(s,
          'Una escalera de roble con alfombra bordó que sube a la galería. Arriba, la puerta del rellano.',
          'Los peldaños están cubiertos de hojas y escombro. Arriba, la puerta del rellano ya no está: se cayó hacia adentro.'))],
        exit: {
          to: 'corredor', at: [180, 640],
          when: (s) => s.era === 'abandono' || flag(s, 'stairDoorOpen'),
          locked: [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'door_stuck' }, say('Subo hasta el rellano. La puerta está hinchada de humedad y no cede ni un milímetro.'), { t: 'note', id: 'puerta_trabada' }],
        },
      },
      {
        id: 'reloj_pie', name: 'Reloj de pie', rect: [645, 300, 80, 225], walk: [690, 590],
        look: (s) => [say(flag(s, 'clockOpen')
          ? 'La caja del reloj quedó abierta. Las agujas siguen en las cuatro menos veinte.'
          : byEra(s, 'Un reloj de pie inglés, detenido a las doce en punto. Anselmo lo para cada noche… pero este parece no haber andado en años.',
            'El reloj sigue en pie, negro de humedad. Las agujas marcan las cuatro menos veinte.'))],
        use: (s) => {
          if (flag(s, 'clockOpen')) return [say('Ya está abierto.')];
          if (s.era !== '1920') return [say('La caja está pegada por el óxido. En este tiempo no se va a abrir.')];
          if (!flag(s, 'clockOiled')) return [{ t: 'anim', anim: 'use' }, say('Intento mover las agujas. Están trabadas, duras como clavos.')];
          return [{ t: 'puzzle', id: 'clock' }];
        },
        useItem: {
          aceitera: (s) => flag(s, 'clockOiled') ? [say('Ya lo aceité.')] :
            [{ t: 'anim', anim: 'use' }, { t: 'flag', k: 'clockOiled' }, { t: 'sfx', id: 'oil' }, say('Unas gotas en el eje de las agujas. Ahora se mueven, con un quejido.')],
        },
      },
      {
        id: 'rosa', name: 'Rosa', rect: [590, 455, 80, 205], walk: [745, 665], face: 'left', npc: 'rosa', eras: ['1920'],
        when: (s) => !flag(s, 'rosaGone'),
        look: [say('Una muchacha con delantal y un plumero, que limpia el mismo marco una y otra vez.')],
        talk: [{ t: 'dialog', id: 'rosa' }],
      },
      {
        id: 'puerta_estudio', name: 'Estudio', rect: [1030, 325, 85, 190], walk: [1070, 580],
        look: (s) => [say(flag(s, 'estudioOpen') ? 'El estudio de Don Aurelio.' : 'Una puerta con una placa de bronce: ESTUDIO. Con llave.')],
        useItem: {
          llave_estudio: [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'unlock' }, { t: 'take', item: 'llave_estudio' }, { t: 'flag', k: 'estudioOpen' }, say('La llave gira con un ruido seco, como un hueso.')],
        },
        exit: {
          to: 'estudio', at: [200, 695], when: (s) => flag(s, 'estudioOpen'),
          locked: (s) => has(s, 'llave_estudio')
            ? [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'unlock' }, { t: 'take', item: 'llave_estudio' }, { t: 'flag', k: 'estudioOpen' }, say('La llave gira con un ruido seco, como un hueso.'), { t: 'goto', room: 'estudio', at: [180, 640] }]
            : [{ t: 'sfx', id: 'door_stuck' }, say('Cerrada con llave.')],
        },
      },
      {
        id: 'puerta_biblioteca', name: 'Biblioteca', rect: [1580, 175, 180, 470], walk: [1650, 665],
        look: (s) => [say(flag(s, 'libraryOpen') ? 'La biblioteca.' : 'Doble puerta de nogal, con llave. Por la rendija sale olor a papel.')],
        useItem: {
          llave_biblioteca: [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'unlock' }, { t: 'take', item: 'llave_biblioteca' }, { t: 'flag', k: 'libraryOpen' }, say('Abierta.')],
        },
        exit: {
          to: 'biblioteca', at: [200, 640], when: (s) => flag(s, 'libraryOpen'),
          locked: (s) => has(s, 'llave_biblioteca')
            ? [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'unlock' }, { t: 'take', item: 'llave_biblioteca' }, { t: 'flag', k: 'libraryOpen' }, say('Abierta.'), { t: 'goto', room: 'biblioteca', at: [200, 640] }]
            : [{ t: 'sfx', id: 'door_stuck' }, say('Cerrada. La señora tendrá la llave.')],
        },
      },
    ],
  },

  // =========================================================== SALÓN
  salon: {
    id: 'salon', name: 'Salón', width: 1582, ambience: 'house', forceEra: '1920',
    // Coordenadas sobre la ilustración pintada (public/art/salon-1920.webp, 1582×720).
    floor: [[340, 600], [1450, 585], [1570, 600], [1575, 712], [300, 712], [330, 660]],
    scale: [585, 0.86, 712, 0.86],
    spawn: [1480, 660],
    hotspots: [
      {
        id: 'mercedes', name: 'Doña Mercedes', rect: [120, 380, 190, 270], walk: [420, 680], face: 'left', npc: 'mercedes',
        look: [say('Una mujer pequeña, de luto antiguo, sentada muy derecha. Tiene el pelo blanco y las manos ocupadas en nada.')],
        talk: [{ t: 'dialog', id: 'mercedes' }],
      },
      {
        id: 'costurero', name: 'Costurero', rect: [340, 540, 125, 115], walk: [480, 680], 
        look: [say('Un costurero de marquetería, con carreteles de hilo bordó.')],
        use: (s) => {
          if (!flag(s, 'metMercedes')) return [say('No voy a revolver las cosas de la señora sin presentarme primero.')];
          if (has(s, 'llave_biblioteca') || flag(s, 'libraryOpen')) return [say('Hilos, agujas, un dedal de plata. Nada más.')];
          return [{ t: 'anim', anim: 'pickup' }, { t: 'sfx', id: 'pickup' }, { t: 'give', item: 'llave_biblioteca' }, say('Entre los carreteles, una llave de bronce atada con hilo bordó. Donde siempre.')];
        },
      },
      {
        id: 'chimenea', name: 'Chimenea', rect: [400, 255, 430, 295], walk: [620, 650],
        look: (s) => [say(flag(s, 'panelOpen') ? 'El fondo de la chimenea se corrió. Detrás, una escalera de piedra baja hacia el sótano.' : 'Una chimenea de mármol negro. El fuego está bajo. El fondo de hierro tiene un relieve de engranajes.')],
        exit: { to: 'sotano', at: [260, 640], when: (s) => flag(s, 'panelOpen'), locked: [say('Es una chimenea. No pienso meterme.')] },
      },
      {
        id: 'fosforos', name: 'Fósforos', rect: [765, 232, 42, 30], walk: [760, 650], 
        when: (s) => !flag(s, 'tookMatches'),
        look: [say('Una caja de fósforos sobre la repisa, junto a un cenicero escondido detrás de un jarrón.')],
        take: [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'fosforos' }, { t: 'flag', k: 'tookMatches' }, { t: 'sfx', id: 'pickup' }],
      },
      {
        id: 'piano', name: 'Piano', rect: [900, 220, 310, 360], walk: [1060, 660],
        look: [say('Un Pleyel de media cola. Sobre el atril, un método de piano para niños con las esquinas dobladas.')],
        use: (s) => flag(s, 'panelOpen') ? [say('Ya me dijo lo que tenía que decirme.')] :
          s.docs.includes('melodia') ? [{ t: 'puzzle', id: 'piano' }]
            : [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'piano_chord' }, say('Toco un acorde. Está afinado, perfectamente afinado. En una casa donde nadie toca.')],
      },
      {
        id: 'ventanal', name: 'Ventanal', rect: [1210, 60, 235, 345],
        look: [say('La lluvia corre por el vidrio. Afuera, la fuente y la niebla.')],
      },
      {
        id: 'salida', name: 'Volver al hall', rect: [1460, 150, 122, 420], walk: [1480, 660],
        exit: { to: 'hall', at: [890, 590] },
      },
    ],
  },

  // =========================================================== BIBLIOTECA
  biblioteca: {
    id: 'biblioteca', name: 'Biblioteca', width: 1600, ambience: 'house',
    floor: [[60, 550], [1540, 550], [1570, 708], [30, 708]],
    scale: [550, 0.86, 708, 0.86],
    spawn: [200, 640],
    fracture: (s) => quinqueLit(s),
    hotspots: [
      {
        id: 'estanterias', name: 'Estanterías', rect: [100, 110, 480, 360], walk: [340, 620],
        look: (s) => [say(byEra(s,
          'Miles de libros: botánica, relojería, astronomía, novelas francesas. Abajo a la izquierda hay un tramo tapiado con madera nueva.',
          'El tramo de la izquierda se derrumbó. Detrás de la madera tapiada había un nicho.'))],
      },
      {
        id: 'nicho', name: 'Nicho', rect: [150, 320, 160, 150], walk: [240, 620], eras: ['abandono'], prop: 'nicho',
        look: (s) => [say(has(s, 'diario_aurelio') ? 'El nicho está vacío ahora.' : 'Entre las tablas rotas, un libro de tapas de cuero.')],
        take: (s) => has(s, 'diario_aurelio') || flag(s, 'tookDiary') ? [say('Ya no hay nada.')] :
          [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'diario_aurelio' }, { t: 'flag', k: 'tookDiary' }, { t: 'sfx', id: 'pickup' },
            { t: 'anim', anim: 'read' }, { t: 'doc', id: 'diario_aurelio' }, { t: 'note', id: 'hora' }],
      },
      {
        id: 'ventanal', name: 'Ventanal', rect: [660, 100, 280, 350],
        look: (s) => [say(byEra(s, 'El ventanal da al parque. La lluvia afloja.', 'Sin vidrios. La lluvia entra y forma un charco sobre la alfombra podrida. Huele a tierra.', 'Del otro lado no hay parque. Hay papel en blanco.'))],
      },
      {
        id: 'globo', name: 'Globo terráqueo', rect: [260, 440, 140, 150], walk: [420, 640],
        look: (s) => [say(byEra(s, 'Un globo terráqueo alemán. Alguien marcó Lieja con un alfiler.', 'El globo está partido al medio. Adentro anidaron pájaros.'))],
      },
      {
        id: 'sillon', name: 'Sillón', rect: [500, 460, 160, 120], walk: [580, 640],
        look: (s) => [say(byEra(s, 'Un sillón de cuero gastado justo donde el respaldo toca la mano. Al lado, una manta de niño doblada.', 'El sillón es un esqueleto de resortes.'))],
      },
      fragment('biblioteca', [560, 420, 50, 50], '1920', 'frag_biblioteca', (s) => flag(s, 'anomaly1')),
      {
        id: 'escritorio', name: 'Escritorio', rect: [1060, 420, 320, 140], walk: [1220, 640],
        look: (s) => [say(byEra(s, 'Un escritorio de nogal. Ideal para trabajar, si hubiera luz.', 'El escritorio se hundió de un lado. La madera está blanda como pan mojado.'))],
      },
      {
        id: 'candelabro_mesa', name: 'Candelabro del escritorio', rect: [1140, 330, 70, 90], walk: [1180, 640], prop: 'candelabro_mesa', eras: ['1920'],
        look: [say('Un candelabro de bronce, sin vela. Hay restos de cera de muchas noches.')],
        use: (s) => flag(s, 'anomaly1') ? [say('No pienso volver a hacer eso.')] : [say('Le falta una vela.')],
        useItem: {
          vela: [say('Primero tendría que encenderla.')],
          vela_encendida: (s) => flag(s, 'anomaly1') ? [say('No pienso volver a hacer eso.')] : [
            { t: 'anim', anim: 'use' }, { t: 'take', item: 'vela_encendida' }, { t: 'event', id: 'library_anomaly' },
            { t: 'flag', k: 'anomaly1' }, { t: 'era', era: 'abandono' }, { t: 'give', item: 'vela' },
            say('…'), say('Esto no es la biblioteca. O sí, pero dentro de muchos años. Llueve adentro.'),
            { t: 'note', id: 'anomalia1' },
          ],
        },
      },
      {
        id: 'quinque', name: 'Quinqué', rect: [1240, 360, 60, 80], walk: [1240, 640], prop: 'quinque', eras: ['abandono'],
        when: (s) => !flag(s, 'tookQuinque'),
        look: [say('Sobre el escritorio podrido hay un quinqué de bronce, limpio, como si alguien lo hubiera dejado para mí.')],
        take: [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'quinque' }, { t: 'flag', k: 'tookQuinque' }, { t: 'sfx', id: 'pickup' },
          { t: 'event', id: 'era_return' }, { t: 'era', era: '1920' },
          say('Al tocarlo, la luz vuelve. La biblioteca está entera, seca, ordenada. Pero el quinqué sigue en mi mano.'),
          say('Está seco. Si le consigo querosén…'), { t: 'note', id: 'quinque' }],
      },
      {
        id: 'salida', name: 'Volver al hall', rect: [0, 240, 90, 320],
        exit: {
          to: 'hall', at: [1650, 665],
          when: (s) => s.era === '1920' || flag(s, 'tookQuinque'),
          locked: [say('Donde estaba la puerta hay oscuridad. Antes de irme, quiero ver qué es eso que brilla sobre el escritorio.')],
        },
      },
    ],
  },

  // =========================================================== ESTUDIO
  estudio: {
    id: 'estudio', name: 'Estudio de Don Aurelio', width: 1279, ambience: 'house', forceEra: '1920',
    // Coordenadas sobre la ilustración pintada (public/art/estudio-1920.webp, 1279×720).
    floor: [[100, 650], [1180, 650], [1250, 712], [90, 712]],
    scale: [650, 1.0, 712, 1.0],
    spawn: [200, 695],
    hotspots: [
      {
        id: 'escritorio', name: 'Escritorio', rect: [290, 440, 660, 240], walk: [700, 700],
        look: [say('El escritorio de Aurelio: lupas, pinzas de relojero, un tintero seco. Un cajón central con tres discos de bronce.')],
      },
      {
        id: 'cajon', name: 'Cajón de los discos', rect: [560, 490, 130, 45], walk: [630, 700], 
        look: (s) => [say(flag(s, 'drawerOpen') ? 'El cajón quedó abierto. Vacío.' : 'Tres discos con símbolos grabados: soles, lunas, pájaros, llaves, ojos, estrellas. Una cerradura de combinación.')],
        use: (s) => flag(s, 'drawerOpen') ? [say('Vacío.')] : [{ t: 'puzzle', id: 'symbols' }],
      },
      {
        id: 'cartas', name: 'Cartas', rect: [800, 420, 100, 48], walk: [860, 700], 
        look: [say('Un atado de cartas con sellos belgas.')],
        take: (s) => flag(s, 'readVerhaegen') ? [{ t: 'doc', id: 'carta_verhaegen1' }] :
          [{ t: 'anim', anim: 'read' }, { t: 'flag', k: 'readVerhaegen' }, { t: 'doc', id: 'carta_verhaegen2' }, { t: 'doc', id: 'carta_verhaegen1' }, { t: 'note', id: 'verhaegen' }],
        use: (s) => flag(s, 'readVerhaegen') ? [{ t: 'doc', id: 'carta_verhaegen1' }] :
          [{ t: 'anim', anim: 'read' }, { t: 'flag', k: 'readVerhaegen' }, { t: 'doc', id: 'carta_verhaegen2' }, { t: 'doc', id: 'carta_verhaegen1' }, { t: 'note', id: 'verhaegen' }],
      },
      {
        id: 'plano', name: 'Plano enmarcado', rect: [205, 65, 200, 290], walk: [300, 700],
        look: [{ t: 'anim', anim: 'read' }, { t: 'doc', id: 'plano_casa' }, { t: 'note', id: 'plano' }],
      },
      {
        id: 'retrato_isabel', name: 'Retrato de una niña', rect: [900, 120, 125, 185], walk: [960, 700],
        look: [say('Una niña de nueve o diez años, con una cinta celeste en el pelo. Debajo, una plaquita: ISABEL, 1900–1909.'), { t: 'note', id: 'isabel' }],
      },
      {
        id: 'ventana', name: 'Ventana', rect: [1110, 10, 170, 390],
        look: [say('Da al invernadero. Veo a Anselmo moviéndose entre los vidrios empañados.')],
      },
      {
        id: 'salida', name: 'Volver al hall', rect: [0, 30, 170, 670], walk: [170, 700],
        exit: { to: 'hall', at: [1070, 590] },
      },
    ],
  },

  // =========================================================== CORREDOR SUPERIOR
  corredor: {
    id: 'corredor', name: 'Corredor de los retratos', width: 1920, ambience: 'house',
    floor: [[60, 550], [1860, 550], [1900, 708], [20, 708]],
    scale: [550, 0.86, 708, 0.86],
    spawn: [180, 640],
    fracture: quinqueLit,
    onEnter: (s) => (flag(s, 'stairDoorOpen') ? [] : [
      { t: 'flag', k: 'stairDoorOpen' },
      say('Subí por una escalera que todavía no se derrumbó… y que ya está derrumbada. Me duele la cabeza de sólo pensarlo.'),
      say('Desde este lado, en cualquier tiempo, la puerta del rellano va a ceder con un empujón. Bien.'),
    ]),
    hotspots: [
      {
        id: 'escalera', name: 'Bajar al hall', rect: [0, 240, 90, 320],
        exit: { to: 'hall', at: [1450, 630] },
      },
      {
        id: 'retrato1', name: 'Retrato', rect: [250, 150, 160, 210], walk: [330, 620],
        look: (s) => [say(byEra(s, 'Un caballero de bigote, con un pie sobre una piedra: alguien que compró estas sierras.', 'La tela se despegó del marco y cuelga como una lengua.'))],
      },
      {
        id: 'puerta_dormitorio', name: 'Dormitorio principal', rect: [540, 260, 110, 250], walk: [595, 600],
        look: [say('El dormitorio de Doña Mercedes.')],
        use: [{ t: 'sfx', id: 'door_stuck' }, say('Cerrado. No me corresponde.')],
      },
      {
        id: 'retrato_familiar', name: 'Retrato de familia', rect: [860, 130, 300, 250], walk: [1010, 620],
        look: (s) => [say(byEra(s,
          'Aurelio, Mercedes, Isabel en el centro y, detrás, una mujer joven cuya cara fue raspada hasta la tela.',
          'Moho por todas partes, menos en la cara raspada: ahí la tela está limpia, como recién hecha.'))],
      },
      fragment('corredor', [1100, 230, 50, 50], 'abandono', 'frag_corredor'),
      {
        id: 'puerta_infantil', name: 'Cuarto de Isabel', rect: [1290, 260, 110, 250], walk: [1345, 600],
        exit: { to: 'infantil', at: [190, 640] },
      },
      {
        id: 'ventana', name: 'Ventana', rect: [1520, 110, 180, 330],
        look: (s) => [say(byEra(s, 'Desde acá se ve el invernadero, iluminado como una linterna.', 'El invernadero es una mancha verde, comido por la hiedra.'))],
      },
    ],
  },

  // =========================================================== CUARTO INFANTIL
  infantil: {
    id: 'infantil', name: 'Cuarto de Isabel', width: 1280, ambience: 'house',
    floor: [[60, 550], [1220, 550], [1250, 708], [30, 708]],
    scale: [550, 0.86, 708, 0.86],
    spawn: [190, 640],
    fracture: quinqueLit,
    hotspots: [
      {
        id: 'cama', name: 'Cama', rect: [110, 380, 320, 200], walk: [300, 640],
        look: (s) => [say(byEra(s, 'Una cama chica, tendida con un cuidado de museo. Nadie durmió acá en once años.', 'El colchón es un nido. La cabecera de bronce se puso verde.'))],
      },
      {
        id: 'teatro', name: 'Teatro de sombras', rect: [560, 320, 240, 210], walk: [680, 640], prop: 'teatro',
        look: (s) => [say(flag(s, 'theatreSolved')
          ? 'Las figuritas quedaron en su lugar: luna, cuervo, llave.'
          : byEra(s, 'Un teatrito de sombras con pantalla de papel aceitado. Hay cinco figuras de cartón negro: un sol, una luna, un cuervo, una llave y una casa.', 'Aplastado por una rama. Las figuras se deshicieron.'))],
        use: (s) => {
          if (s.era !== '1920') return [say('Está roto en este tiempo.')];
          if (flag(s, 'theatreSolved')) return [say('Ya me mostró lo que tenía que mostrar.')];
          if (!has(s, 'vela_encendida')) return [say('Para que funcione necesita una luz detrás de la pantalla.')];
          return [{ t: 'puzzle', id: 'theatre' }];
        },
        useItem: {
          vela_encendida: (s) => s.era !== '1920' ? [say('Está roto en este tiempo.')] : flag(s, 'theatreSolved') ? [say('Ya me mostró lo que tenía que mostrar.')] : [{ t: 'puzzle', id: 'theatre' }],
          vela: [say('Una vela apagada no proyecta sombras.')],
        },
      },
      {
        id: 'comoda', name: 'Cómoda', rect: [880, 420, 200, 150], walk: [980, 640],
        look: (s) => [say(byEra(s, 'Una cómoda blanca con flores pintadas. Encima, una caja de música.', 'La cómoda está hinchada. Los cajones no cierran.'))],
      },
      {
        id: 'caja_musica', name: 'Caja de música', rect: [935, 380, 90, 50], walk: [980, 640], prop: 'caja_musica', eras: ['1920'],
        look: (s) => [say(flag(s, 'musicboxPlayed') ? 'La tapa quedó abierta. La bailarina mira hacia la puerta.' : 'Una caja de música de nácar. Le falta la llave de cuerda.')],
        use: (s) => flag(s, 'musicboxPlayed') ? [say('No tengo valor de volver a darle cuerda.')] : [say('Sin la llave de cuerda no suena.')],
        useItem: {
          llave_caja: [
            { t: 'anim', anim: 'use' }, { t: 'take', item: 'llave_caja' }, { t: 'flag', k: 'musicboxPlayed' },
            { t: 'event', id: 'musicbox' },
            { t: 'doc', id: 'melodia' }, { t: 'give', item: 'cinta' },
            say('Cuatro notas. Y en el doble fondo, una cinta celeste.'),
            { t: 'wait', ms: 600 }, { t: 'sfx', id: 'scream' }, { t: 'shake' },
            narr('Un grito, abajo. La voz de Rosa. Y después nada.'),
            { t: 'flag', k: 'rosaGone' }, { t: 'note', id: 'rosa_desaparece' },
          ],
        },
      },
      {
        id: 'papel_tapiz', name: 'Papel tapiz', rect: [1090, 140, 150, 240], walk: [1120, 620],
        look: (s) => [say(byEra(s, 'Papel tapiz con golondrinas. Impecable, salvo una esquina que alguien volvió a pegar con engrudo.', flag(s, 'tookDrawing') ? 'Detrás del papel despegado, el revoque desnudo.' : 'El papel se despegó con la humedad. Detrás asoma algo: un papel doblado, escondido entre el revoque y el tapiz.'))],
        take: (s) => s.era !== 'abandono' ? [say('No voy a arrancar el papel del cuarto de una niña muerta. En este tiempo, no.')] :
          flag(s, 'tookDrawing') ? [say('No queda nada.')] :
            [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'dibujo_isabel' }, { t: 'flag', k: 'tookDrawing' }, { t: 'sfx', id: 'paper' }, { t: 'doc', id: 'dibujo_isabel' }, { t: 'note', id: 'dibujo' }],
        use: (s) => s.era !== 'abandono' ? [say('No voy a arrancar el papel del cuarto de una niña muerta. En este tiempo, no.')] :
          flag(s, 'tookDrawing') ? [say('No queda nada.')] :
            [{ t: 'anim', anim: 'pickup' }, { t: 'give', item: 'dibujo_isabel' }, { t: 'flag', k: 'tookDrawing' }, { t: 'sfx', id: 'paper' }, { t: 'doc', id: 'dibujo_isabel' }, { t: 'note', id: 'dibujo' }],
      },
      {
        id: 'ventana', name: 'Ventana', rect: [330, 90, 200, 240],
        look: (s) => [say(byEra(s, 'Una rama de tilo roza el vidrio con la lluvia, como alguien que pide entrar.', 'La rama entró. Atravesó el vidrio y creció dentro del cuarto.'))],
      },
      {
        id: 'salida', name: 'Volver al corredor', rect: [0, 240, 80, 320],
        exit: { to: 'corredor', at: [1345, 620] },
      },
    ],
  },

  // =========================================================== SÓTANO
  sotano: {
    id: 'sotano', name: 'Sótano', width: 1600, ambience: 'basement',
    floor: [[60, 560], [1540, 560], [1570, 708], [30, 708]],
    scale: [560, 0.86, 708, 0.86],
    spawn: [260, 640],
    fracture: quinqueLit,
    onEnter: (s) => (flag(s, 'sotanoSeen') ? [] : [
      { t: 'flag', k: 'sotanoSeen' },
      say('Bóvedas de ladrillo, más viejas que la casa. Acá abajo la lluvia no se oye. Se oye otra cosa: un tic-tac lento, como un corazón dormido.'),
    ]),
    hotspots: [
      {
        id: 'escalera', name: 'Subir al salón', rect: [40, 200, 200, 330], walk: [200, 630],
        exit: { to: 'salon', at: [620, 655] },
      },
      {
        id: 'caldera', name: 'Caldera', rect: [370, 230, 240, 300], walk: [490, 640],
        look: (s) => [say(byEra(s, 'Una caldera de hierro, fría. De ella salen caños que no van hacia arriba sino hacia la pared del fondo.', 'La caldera se partió. Los caños siguen hacia la pared, cubiertos de óxido.'))],
      },
      {
        id: 'cajas', name: 'Cajas selladas', rect: [680, 420, 200, 130], walk: [780, 640],
        look: (s) => [say(byEra(s, 'Cajas de madera con sellos de lacre: "L. VERHAEGEN — LIÈGE — FRAGILE".', 'Las cajas se pudrieron. Entre las astillas hay resortes y ruedas dentadas oxidadas.'))],
      },
      fragment('sotano', [760, 380, 50, 50], '1920', 'frag_sotano'),
      {
        id: 'archivo', name: 'Armario del archivo', rect: [990, 210, 210, 320], walk: [1090, 630], prop: 'archivo',
        look: (s) => [say(flag(s, 'archivoOpen') ? 'El archivo, abierto. Cajas de cartas, facturas, recibos de Lieja.' : byEra(s, 'Un armario de hierro con cajones rotulados por año. Cerrado con un candado.', 'El armario está oxidado y abierto; adentro, el papel se volvió pasta.'))],
        use: (s) => {
          if (s.era !== '1920') return [say('Acá ya no queda nada legible.')];
          if (flag(s, 'archivoOpen')) return [say('Ya encontré lo que mamá dejó.')];
          if (has(s, 'llave_archivo')) return openArchive();
          return [{ t: 'flag', k: 'sawArchive' }, { t: 'sfx', id: 'door_stuck' }, say('Candado. Seguro que Anselmo tiene la llave.')];
        },
        useItem: {
          llave_archivo: (s) => s.era !== '1920' ? [say('En este tiempo el armario está podrido.')] : openArchive(),
        },
      },
      {
        id: 'agua', name: 'Agua estancada', rect: [1240, 540, 320, 110], walk: [1290, 640], eras: ['abandono'], prop: 'reflejo',
        look: [say('El sótano está inundado hasta los tobillos. En el agua quieta se refleja una puerta que no está en la pared.')],
        use: (s) => has(s, 'engranaje') || flag(s, 'enteredVoid')
          ? [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'whoosh' }, { t: 'goto', room: 'reloj', at: [260, 640], era: 'sombras' }]
          : [say('Meto la mano en el reflejo. Está helado y sólo es agua. Todavía no sé qué hay del otro lado, ni qué llevar.')],
      },
      {
        id: 'pared_fondo', name: 'Pared del fondo', rect: [1250, 150, 300, 380], walk: [1350, 630],
        look: (s) => [say(byEra(s, 'Una pared de ladrillo donde terminan los caños. Pego la oreja: el tic-tac viene de ahí.', 'En la pared no hay nada. La puerta sólo está en el reflejo.', 'Una puerta de tinta.'))],
      },
    ],
  },

  // =========================================================== SALA DEL RELOJ (anomalía)
  reloj: {
    id: 'reloj', name: 'La sala del reloj', width: 1600, ambience: 'void', forceEra: 'sombras',
    floor: [[60, 560], [1540, 560], [1570, 708], [30, 708]],
    scale: [560, 0.86, 708, 0.86],
    spawn: [260, 640],
    onEnter: (s) => (flag(s, 'enteredVoid') ? [] : [
      { t: 'flag', k: 'enteredVoid' }, { t: 'event', id: 'void_intro' },
      say('Papel. Todo es papel y tinta, como si la casa fuera un dibujo de sí misma.'),
      say('Ahí está Rosa. Y una niña de vestido blanco. Y detrás del reloj… algo que respira.'),
      { t: 'note', id: 'sala_reloj' },
    ]),
    hotspots: [
      {
        id: 'rosa_atrapada', name: 'Rosa', rect: [300, 360, 110, 260], walk: [470, 650], face: 'left', npc: 'rosa_ink',
        when: (s) => !flag(s, 'rosaFree'),
        look: [say('Rosa barre un piso que no existe, una y otra vez. La tinta le sube por las piernas como hiedra.')],
        talk: [say('¡Rosa! ¡Rosa!'), narr('Rosa no levanta la vista. Barre.')],
        useItem: {
          quinque_encendido: [{ t: 'anim', anim: 'use' }, { t: 'sfx', id: 'light' }, { t: 'event', id: 'free_rosa' }, { t: 'dialog', id: 'rosa_libre' }],
          vela_encendida: [say('La llama de la vela se encoge, asustada. Necesito una luz que sea de otro tiempo.')],
        },
      },
      {
        id: 'rosa_libre', name: 'Rosa', rect: [300, 360, 110, 260], walk: [470, 650], face: 'left', npc: 'rosa',
        when: (s) => flag(s, 'rosaFree'),
        look: [say('Rosa, temblando, pero entera.')],
        talk: [{ t: 'say', who: 'rosa', text: 'No me suelte la luz, señorita. No me la suelte.' }],
      },
      {
        id: 'reloj_grande', name: 'El Reloj de Sombras', rect: [620, 60, 360, 480], walk: [800, 620],
        look: [say('Un reloj del tamaño de una capilla. En lugar de números tiene fotografías, mal veladas, de una misma tarde. En el centro falta una rueda.')],
        use: (s) => has(s, 'engranaje') ? [say('Falta una pieza. La tengo yo.')] : [say('No tengo nada que hacer con él.')],
        useItem: {
          engranaje: (s) => !flag(s, 'rosaFree')
            ? [say('No puedo tocar el mecanismo con Rosa atrapada ahí. Primero ella.')]
            : !flag(s, 'talkedSombra')
              ? [{ t: 'event', id: 'sombra_rises' }, { t: 'dialog', id: 'sombra' }]
              : [{ t: 'anim', anim: 'use' }, { t: 'take', item: 'engranaje' }, { t: 'sfx', id: 'gear' }, { t: 'shake' }, { t: 'dialog', id: 'final' }],
        },
      },
      {
        id: 'sombra', name: 'La Sombra', rect: [980, 80, 200, 300], npc: 'sombra', walk: [1000, 620],
        look: [say('Detrás del reloj, una forma de tinta con alas de levita. Imita mis gestos con un instante de retraso.')],
        talk: [{ t: 'dialog', id: 'sombra' }],
      },
      {
        id: 'isabel', name: 'Isabel', rect: [1190, 380, 90, 220], walk: [1110, 650], face: 'right', npc: 'isabel',
        look: [say('Una niña de vestido blanco, con una cinta celeste. Es un dibujo hecho con muy poca tinta: casi papel.')],
        talk: [{ t: 'dialog', id: 'isabel' }],
        useItem: {
          cinta: [say('Le muestro la cinta.'), { t: 'say', who: 'isabel', text: 'Anselmo me la ató mal. Siempre me la ataba mal.' }],
          camara: [say('Todavía no. Primero tengo que decidir qué hago con el reloj.')],
        },
      },
    ],
  },
};

function openArchive(): Effect[] {
  return [
    { t: 'anim', anim: 'use' }, { t: 'sfx', id: 'unlock' }, { t: 'take', item: 'llave_archivo' }, { t: 'flag', k: 'archivoOpen' },
    say('El candado cede. En el cajón de 1909, debajo de facturas de Lieja, un paquete atado con un pañuelo.'),
    { t: 'anim', anim: 'read' }, { t: 'doc', id: 'cartas_jeanne' }, { t: 'give', item: 'engranaje' }, { t: 'note', id: 'engranaje' },
    say('Mamá.'),
  ];
}

export const START_ROOM = 'entrada';
