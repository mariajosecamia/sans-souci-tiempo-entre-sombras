import type { Layers } from '../arch';
import type { GameState } from '../../systems/types';
import { paintHall } from './hall';
import { paintEntrada, paintJardin, paintInvernadero } from './exteriors';
import { paintSalon, paintBiblioteca, paintEstudio, paintCorredor, paintInfantil, paintSotano, paintReloj } from './interiors';

export type Painter = (L: Layers, s: GameState) => void;

export const PAINTERS: Record<string, Painter> = {
  entrada: paintEntrada,
  jardin: paintJardin,
  invernadero: paintInvernadero,
  hall: paintHall,
  salon: paintSalon,
  biblioteca: paintBiblioteca,
  estudio: paintEstudio,
  corredor: paintCorredor,
  infantil: paintInfantil,
  sotano: paintSotano,
  reloj: paintReloj,
};
