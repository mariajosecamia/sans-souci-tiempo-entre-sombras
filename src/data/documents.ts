// Documentos legibles. Todos originales.
export interface DocDef {
  id: string;
  title: string;
  kind: 'carta' | 'diario' | 'nota' | 'plano' | 'dibujo' | 'recorte';
  date?: string;
  body: string; // párrafos separados por línea en blanco
}

export const DOCS: Record<string, DocDef> = {
  carta_anonima: {
    id: 'carta_anonima', title: 'Carta sin remitente', kind: 'carta', date: 'matasellos borroneado',
    body: `(Un dibujo a pluma: tres velas encendidas. La llama del medio se estira hasta formar un cuervo con las alas abiertas.)

Belle Ombre.
Camino a la sierra, pasando la tranquera de piedra.

La casa necesita a alguien que sepa mirar.

(Ninguna firma. El papel huele a cera y a humedad, como si hubiera estado guardado muchos años antes de que alguien lo mandara.)`,
  },
  nota_jeanne: {
    id: 'nota_jeanne', title: 'Nota de Juana Calfún', kind: 'nota', date: 'Puesto La Aguada, sierra del Tigre, agosto de 1919',
    body: `Elena, mi vida:

Si alguna vez volvés a Belle Ombre, no le des cuerda al reloj.

No me preguntes cuál. Vas a saberlo.

J.`,
  },
  carta_mercedes: {
    id: 'carta_mercedes', title: 'Carta de contratación', kind: 'carta', date: 'Tandil, 2 de abril de 1920',
    body: `Señorita Ríos:

Por recomendación del señor Ferrán, del estudio fotográfico de la calle Pinto, me dirijo a usted. Necesito que alguien de oficio fotografíe y ordene el archivo y la biblioteca de esta casa antes de que la cierre.

Le ofrezco alojamiento, comida y una paga justa. Anselmo la esperará en el portón el 12 de mayo.

No traiga relojes. Aquí no hacen falta.

Mercedes L. de Valcárcel`,
  },
  diario_aurelio: {
    id: 'diario_aurelio', title: 'Diario de Aurelio Valcárcel (tomo III)', kind: 'diario', date: '1909',
    body: `14 de junio. Isabel ya no conoce a nadie. El médico dice que es cuestión de horas. Mercedes no suelta su mano. Yo miro el reloj del hall como si pudiera discutir con él.

—

15 de junio. Se fue. A las cuatro menos veinte de la tarde. Detuve el reloj con mis propias manos y nadie en esta casa lo volverá a poner en marcha.

—

2 de agosto. Escribí a Verhaegen, a Lieja. Dicen que construyó para un conde un mecanismo que "guarda las horas". No quiero guardar horas. Quiero guardar a mi hija.

—

20 de octubre. Las cajas llegaron. Verhaegen insiste en armarlo él mismo, bajo la casa. Dice que el reloj del hall será la llave y que nadie debe tocarlo salvo yo.

—

Diciembre. La Juana dice que la casa ha cambiado. Que oye a Isabel cantar. Yo también la oigo. Es eso lo que pagué.`,
  },
  carta_verhaegen1: {
    id: 'carta_verhaegen1', title: 'Carta de L. Verhaegen (1)', kind: 'carta', date: 'Lieja, 3 de septiembre de 1909',
    body: `Monsieur Valcárcel:

He leído su carta tres veces. Lo que usted pide no es un reloj. Un reloj mide el tiempo; usted quiere que el tiempo se quede.

Puedo construirlo. Un mecanismo así no detiene las horas: las retiene, como un dique retiene el agua. La casa entera será el depósito.

Pero debo advertirle, como advertí al conde: lo que se retiene, se alimenta. Y no siempre de lo que uno quisiera darle.

Su servidor,
L. Verhaegen`,
  },
  carta_verhaegen2: {
    id: 'carta_verhaegen2', title: 'Carta de L. Verhaegen (2)', kind: 'carta', date: 'Lieja, 11 de marzo de 1910',
    body: `Monsieur:

Usted me escribe que su esposa olvida los días. Que la niñera se fue llorando. Que las sombras de las velas no siguen a las velas.

No hay error en el mecanismo. Es exactamente lo que construimos. Tres caminos hay, y se los repito por última vez:

Detenerlo, y dejar que todo lo retenido siga su curso.
Darle cuerda, y que alguien ocupe el lugar que usted no quiere vaciar.
Romperlo, y que lo retenido salga sin dirección.

Para cualquiera de los tres necesitará la pieza que alguien le quitó.

L. V.`,
  },
  plano_casa: {
    id: 'plano_casa', title: 'Plano de Belle Ombre (anotado)', kind: 'plano', date: '1909',
    body: `Plano de la planta baja, a lápiz. Sobre el salón alguien dibujó una flecha hacia abajo, a través de la chimenea, hasta un recuadro sin nombre bajo la casa.

Al margen, con la letra apurada de Aurelio: "sala de máquinas — la entrada canta".

Más abajo, otra mano, más fina: "la de Isabel".`,
  },
  dibujo_isabel: {
    id: 'dibujo_isabel', title: 'Dibujo de Isabel', kind: 'dibujo', date: 'sin fecha',
    body: `Crayón sobre papel de envolver. Una pared, una vela y tres sombras, una debajo de la otra:

arriba, una LUNA;
en el medio, un PÁJARO NEGRO con las alas abiertas;
abajo, una LLAVE.

Debajo, en letra de niña: "lo que papá esconde. no decirle a nadie. solo a la Juana".`,
  },
  melodia: {
    id: 'melodia', title: 'La melodía de la caja', kind: 'nota', date: '1920',
    body: `Anoté las cuatro notas que tocó la caja de música, mirando los dientes del peine:

MI — DO — RE — SOL

Isabel la tarareaba. Aurelio escribió que "la entrada canta".`,
  },
  cartas_jeanne: {
    id: 'cartas_jeanne', title: 'Cartas de Juana (nunca enviadas)', kind: 'carta', date: 'Belle Ombre, 1909–1910',
    body: `Elenita, mi vida —

Tenés trece años y estás en el puesto con la abuela, lejos de esta casa. Mejor así. Algún día vas a leer esto, o no.

El señor construyó algo bajo la casa para que Isabel no se fuera. Y no se fue. Está en todas partes y en ninguna, y la señora olvida un día por cada día que la nena se queda.

Esta noche bajé con la llave de Anselmo y saqué una rueda del mecanismo. El reloj no se detuvo del todo: se quedó a medio respirar. Mañana nos echan, lo sé.

Escondo la rueda aquí, donde el señor no busca nunca: entre papeles viejos. Si alguien la encuentra, que elija mejor que nosotros.

Y si sos vos: sé que vas a elegir bien.

Tu mamá, Juana`,
  },
  frag_fuente: {
    id: 'frag_fuente', title: 'Fragmento: la fuente', kind: 'recorte', date: 'verano de 1908',
    body: `Una niña de vestido blanco tira monedas a la fuente. Cada moneda, un deseo. "Que no pase el tiempo", dice. "Que no pase el tiempo, que no pase." El agua se las traga sin ruido.`,
  },
  frag_invernadero: {
    id: 'frag_invernadero', title: 'Fragmento: el invernadero', kind: 'recorte', date: 'otoño de 1906',
    body: `Una mujer joven, de trenza negra, señala pájaros por el vidrio: "chimango, benteveo, carancho". La niña repite y se ríe de cómo suena "carancho". La mujer es mi madre. Tiene la edad que yo tengo ahora.`,
  },
  frag_biblioteca: {
    id: 'frag_biblioteca', title: 'Fragmento: la biblioteca', kind: 'recorte', date: 'invierno de 1908',
    body: `Un hombre lee en voz alta junto a la chimenea. La niña, envuelta en una manta, lo corrige cuando se saltea una línea. Él finge que fue a propósito. Los dos saben que no.`,
  },
  frag_corredor: {
    id: 'frag_corredor', title: 'Fragmento: el retrato', kind: 'recorte', date: 'marzo de 1910',
    body: `Alguien, de noche, raspa con un cortaplumas una figura del retrato familiar. No a la niña: a la niñera que está de pie atrás. Raspa hasta que no queda nada de su cara. Es Aurelio. Llora mientras lo hace.`,
  },
  frag_sotano: {
    id: 'frag_sotano', title: 'Fragmento: las cajas', kind: 'recorte', date: 'octubre de 1909',
    body: `Un hombre flaco, de bigote gris, baja cajas selladas con lacre. Habla poco. Antes de cerrar la última, mira hacia arriba, hacia la casa, y se persigna.`,
  },
};
