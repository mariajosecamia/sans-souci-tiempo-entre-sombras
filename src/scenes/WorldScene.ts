// Escena principal: dibuja la sala en capas, mueve a Elena, resuelve interacciones y ejecuta efectos.
import Phaser from 'phaser';
import { ROOMS } from '../data/rooms';
import { ITEMS } from '../data/items';
import type { Effect, GameState, Hotspot, RoomDef, Pt, Verb } from '../systems/types';
import { applyEffect, newState } from '../systems/state';
import { PAINTED, plateKey, OVERLAY_PROPS, type Plate } from '../data/painted';
import { t, L } from '../i18n/i18n';
import { interact, combine, inspectItem, visibleHotspots, hotspotName, verbsFor, eraOf, settleEra, eraToggleAvailable } from '../systems/logic';
import { renderRoom, RenderedRoom } from '../art/render';
import { buildSheet, buildSombra, buildCrow, ANIMS, FRAME_W, FRAME_H, FOOT_Y, Sheet } from '../art/sprites';
import { ELENA_FRAMES, ELENA_FW, ELENA_FH, ELENA_FOOT, ELENA_FIG_H } from '../art/elenaFrames';
import { drawProp } from '../art/props';
import { makeCanvas } from '../art/ink';
import { UI } from '../ui/ui';
import { openPuzzle } from '../ui/puzzleUI';
import { SOLVED, MELODY } from '../puzzles/puzzles';
import { DIALOGS } from '../dialogue/dialogues';
import { audio } from '../audio/audio';
import * as Save from '../persistence/save';
import type { Era } from '../core/palette';
import { ENDINGS } from '../narrative/endings';

const VISUAL_FLAGS = ['tookCandle', 'clockOpen', 'stairDoorOpen', 'panelOpen', 'drawerOpen', 'musicboxPlayed', 'theatreSolved', 'tookDrawing', 'archivoOpen', 'tookDiary', 'gateOpen', 'rosaFree', 'estudioOpen', 'libraryOpen', 'tookOil', 'tookKerosene', 'tookMatches', 'tookQuinque', 'readVerhaegen'];
const ZOOM = 1.5;
const SPEED = 235;

export class WorldScene extends Phaser.Scene {
  s: GameState = newState();
  ui!: UI;
  opts: Save.Options = Save.loadOptions();
  room!: RoomDef;
  rendered?: RenderedRoom;
  res = 1.5;
  layerObjs: Phaser.GameObjects.GameObject[] = [];
  player!: Phaser.GameObjects.Sprite;
  npcs: Phaser.GameObjects.Sprite[] = [];
  clouds: { spr: Phaser.GameObjects.Image; speed: number }[] = [];
  props: Phaser.GameObjects.GameObject[] = [];
  temp: Phaser.GameObjects.GameObject[] = [];
  glows: Phaser.GameObjects.Image[] = [];
  particles: Phaser.GameObjects.GameObject[] = [];
  moving?: { tx: number; ty: number; resolve: () => void };
  facing: 1 | -1 = 1;
  running = false;
  titleMode = true;
  lastStep = -1;
  texKeys: string[] = [];
  sheets: Record<string, Sheet> = {};
  playStart = 0;

  constructor() { super('world'); }

  /** Elena pintada a mano (si no carga, queda la dibujada por código). */
  preload(): void {
    this.load.spritesheet('elena-p', 'art/elena.webp', { frameWidth: ELENA_FW, frameHeight: ELENA_FH });
    // objetos pintados que aparecen sobre las salas (los que se pueden tomar)
    this.load.image('obj-aceitera', 'art/obj/aceitera.webp');
    this.load.image('sombra-breath', 'art/reloj-sombras-sombra.webp');
    // personajes secundarios pintados: una fila por personaje, quieta y parpadeo
    this.load.spritesheet('npcs-p', 'art/npcs.webp', { frameWidth: ELENA_FW, frameHeight: ELENA_FH });
    this.load.image('obj-lata', 'art/obj/lata-querosen.webp');
    this.load.image('obj-farol', 'art/obj/lampara-encendida.webp');
  }

  /** ¿Se usa la hoja pintada de Elena? */
  private painted = false;
  /** Hacia dónde mira Elena: de perfil, de espaldas (hacia el fondo) o de frente. */
  private dir: 'side' | 'back' | 'front' = 'side';
  private stepFrames = new Set<number>([0, 5]);
  private reachHigh = false;
  /** Personaje con quien se está tratando (para dar y recibir objetos). */
  private talkTarget: Phaser.GameObjects.Sprite | null = null;

  private elenaAnims(): void {
    if (!this.textures.exists('elena-p')) return;
    this.painted = true;
    const F = (...names: string[]) => names.map((n) => ({ key: 'elena-p', frame: (ELENA_FRAMES as readonly string[]).indexOf(n) }));
    const mk = (key: string, frames: { key: string; frame: number }[], fps: number, loop: boolean) => {
      if (this.anims.exists(key)) this.anims.remove(key);
      this.anims.create({ key, frames, frameRate: fps, repeat: loop ? -1 : 0 });
    };
    mk('elena-walk', F('caminar-1', 'caminar-2', 'caminar-3', 'caminar-4', 'caminar-5', 'caminar-6', 'caminar-7', 'caminar-8'), 10, true);
    // quieta, con un parpadeo cada tanto
    mk('elena-idle', F(...Array(14).fill('quieta-34-1'), 'quieta-34-2'), 6, true);
    mk('elena-idle-profile', F(...Array(14).fill('quieta-perfil-1'), 'quieta-perfil-2'), 6, true);
    mk('elena-walk-back', F('espaldas-1', 'espaldas-2', 'espaldas-3', 'espaldas-4'), 7, true);
    mk('elena-idle-back', F('espaldas-quieta'), 1, true);
    mk('elena-walk-front', F('frente-1', 'frente-2', 'frente-3', 'frente-4'), 7, true);
    mk('elena-idle-front', F('frente-quieta'), 1, true);
    mk('elena-pickup', F('agacharse-1', 'agacharse-2', 'agacharse-3', 'agacharse-3', 'agacharse-4', 'quieta-34-1'), 7, false);
    mk('elena-take', F('tomar-1', 'tomar-2', 'tomar-3', 'tomar-3', 'tomar-1', 'quieta-34-1'), 7, false);
    mk('elena-use', F('tomar-1', 'tomar-2', 'tomar-3', 'tomar-3', 'tomar-2', 'quieta-34-1'), 7, false);
    mk('elena-examine', F('examinar-1', 'examinar-2', 'examinar-2', 'examinar-1'), 3, false);
    mk('elena-react', F('susto-1', 'susto-2', 'susto-2', 'susto-2', 'quieta-34-1'), 6, false);
    mk('elena-read', F('leer-1', 'leer-2'), 2, true);
    const idx = (n: string) => (ELENA_FRAMES as readonly string[]).indexOf(n);
    this.stepFrames = new Set([idx('caminar-1'), idx('caminar-5'), idx('espaldas-1'), idx('espaldas-3'), idx('frente-1'), idx('frente-3')]);
  }

  /** Personajes secundarios pintados: fila en la hoja y hacia dónde miran en el dibujo. */
  private static NPC_ROW: Record<string, [number, 1 | -1]> = { anselmo: [0, -1], rosa: [1, -1], mercedes: [2, -1], isabel: [3, 1] };

  private npcAnims(): void {
    if (!this.textures.exists('npcs-p')) return;
    for (const [k, [row]] of Object.entries(WorldScene.NPC_ROW)) {
      const a = row * 3, b = a + 1, c = a + 2;
      this.anims.create({ key: `${k}-p`, frames: [...Array(16).fill(a), b].map((f) => ({ key: 'npcs-p', frame: f })), frameRate: 6, repeat: -1, delay: Math.random() * 1500 });
      // hablando: la boca se abre y se cierra, con algún parpadeo
      this.anims.create({ key: `${k}-talk-p`, frames: [a, c, c, a, c, a, a, c, b, c].map((f) => ({ key: 'npcs-p', frame: f })), frameRate: 7, repeat: -1 });
    }
  }

  /** Crea un personaje secundario parado en (x, y) mirando hacia `face`. Usa el pintado si está. */
  private npcSprite(key: string, x: number, y: number, face?: 'left' | 'right'): Phaser.GameObjects.Sprite {
    const row = WorldScene.NPC_ROW[key];
    if (row && this.anims.exists(`${key}-p`)) {
      const want = face === 'left' ? -1 : face === 'right' ? 1 : row[1];
      const sp = this.add.sprite(x, y, 'npcs-p', row[0] * 3).setOrigin(0.5, ELENA_FOOT).setScale((this.roomScale(y) * 300 * 0.86) / ELENA_FIG_H).setFlipX(want !== row[1]);
      sp.play({ key: `${key}-p`, startFrame: Math.floor(Math.random() * 12) });
      return sp;
    }
    const sh = this.sheets[key];
    const sp = this.add.sprite(x, y, key, 0).setOrigin(0.45, FOOT_Y / FRAME_H).setScale(this.roomScale(y) / sh.res);
    sp.play(`${key}-${key === 'mercedes' ? 'sit' : 'idle'}`);
    // los dibujados por código miran a la derecha
    sp.setFlipX(face === 'left' || (!face && key !== 'isabel'));
    return sp;
  }

  /** Escala de Elena en esta sala, para que mida lo mismo que la dibujada por código. */
  private playerScale(): number {
    return this.painted ? (this.roomScale() * 300 * 0.86) / ELENA_FIG_H : this.roomScale() / this.sheets.elena.res;
  }

  private idleKey(): string {
    return this.dir === 'back' ? 'elena-idle-back' : this.dir === 'front' ? 'elena-idle-front' : 'elena-idle';
  }

  create(): void {
    this.res = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)) * (Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.7 : 1);
    this.ui = new UI();
    (window as any).__game = this;
    this.buildTextures();
    this.elenaAnims();
    this.npcAnims();
    this.cameras.main.setZoom(ZOOM);
    this.cameras.main.setBackgroundColor('#0e0c0a');
    this.input.mouse?.disableContextMenu();
    this.wireUI();
    this.wireInput();
    this.applyOptions();
    this.toTitle();
  }

  // ------------------------------------------------------------------ texturas
  private buildTextures(): void {
    const cr = Math.min(1.25, this.res);
    const mk = (key: string, sh: Sheet, fw: number, fh: number) => {
      this.sheets[key] = sh;
      const tex = this.textures.addCanvas(key, sh.canvas)!;
      const total = Object.values(sh.frames).reduce((a, f) => a + f.length, 0);
      for (let i = 0; i < total; i++) tex.add(i, 0, (i % sh.cols) * Math.ceil(fw * sh.res), Math.floor(i / sh.cols) * Math.ceil(fh * sh.res), Math.ceil(fw * sh.res), Math.ceil(fh * sh.res));
      for (const [a, fr] of Object.entries(sh.frames)) {
        const def = ANIMS[a];
        this.anims.create({ key: `${key}-${a}`, frames: fr.map((f) => ({ key, frame: f })), frameRate: def ? def.fps : 5, repeat: def && def.loop ? -1 : 0, yoyo: a === 'idle' && key === 'sombra' });
      }
    };
    mk('elena', buildSheet('elena', ['walk', 'idle', 'pickup', 'use', 'examine', 'react', 'read'], cr), FRAME_W, FRAME_H);
    mk('anselmo', buildSheet('anselmo', ['idle'], cr), FRAME_W, FRAME_H);
    mk('mercedes', buildSheet('mercedes', ['sit'], cr), FRAME_W, FRAME_H);
    mk('rosa', buildSheet('rosa', ['idle'], cr), FRAME_W, FRAME_H);
    mk('isabel', buildSheet('isabel', ['idle'], cr), FRAME_W, FRAME_H);
    mk('sombra', buildSombra(cr), 320, 420);
    this.textures.addCanvas('crow', buildCrow(2));
    // brillo radial para luces
    const [g, gc] = makeCanvas(256, 256);
    const rg = gc.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(255,240,200,1)'); rg.addColorStop(0.35, 'rgba(255,210,140,.45)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
    gc.fillStyle = rg; gc.fillRect(0, 0, 256, 256);
    this.textures.addCanvas('glow', g);
    const [d, dc] = makeCanvas(8, 8);
    const dg = dc.createRadialGradient(4, 4, 0, 4, 4, 4);
    dg.addColorStop(0, 'rgba(255,250,235,1)'); dg.addColorStop(1, 'rgba(255,250,235,0)');
    dc.fillStyle = dg; dc.fillRect(0, 0, 8, 8);
    this.textures.addCanvas('mote', d);
    // sombra de contacto bajo los pies: una mancha blanda, como una aguada, que asienta a los personajes en el piso
    const [fs, fc] = makeCanvas(128, 32);
    fc.save(); fc.scale(1, 0.25);
    const fg = fc.createRadialGradient(64, 64, 0, 64, 64, 64);
    fg.addColorStop(0, 'rgba(28,18,10,0.85)'); fg.addColorStop(0.55, 'rgba(28,18,10,0.4)'); fg.addColorStop(1, 'rgba(28,18,10,0)');
    fc.fillStyle = fg; fc.fillRect(0, 0, 128, 128); fc.restore();
    this.textures.addCanvas('footshadow', fs);
    const [r, rc] = makeCanvas(2, 24);
    rc.fillStyle = 'rgba(230,228,215,.55)'; rc.fillRect(0, 0, 1, 24);
    this.textures.addCanvas('raindrop', r);
    const [ik, ic] = makeCanvas(10, 10);
    ic.fillStyle = '#111'; ic.beginPath(); ic.arc(5, 5, 4, 0, Math.PI * 2); ic.fill();
    this.textures.addCanvas('inkmote', ik);
    // velo de papel + viñeta (fijo en pantalla)
    const [pv, pc] = makeCanvas(1280, 720);
    pc.fillStyle = '#fff'; pc.fillRect(0, 0, 1280, 720);
    // grano de papel de acuarela (cold press): motas claras y oscuras
    for (let i = 0; i < 60000; i++) { pc.globalAlpha = Math.random() * 0.07; pc.fillStyle = Math.random() < 0.55 ? '#6b5a48' : '#d8c8a9'; pc.fillRect(Math.random() * 1280, Math.random() * 720, 1 + Math.random() * 1.5, 1 + Math.random()); }
    // fibras
    pc.strokeStyle = '#7a6550'; pc.lineWidth = 0.7;
    for (let i = 0; i < 900; i++) {
      pc.globalAlpha = 0.04 + Math.random() * 0.05;
      const x = Math.random() * 1280, y = Math.random() * 720, a = Math.random() * Math.PI * 2, l = 6 + Math.random() * 18;
      pc.beginPath(); pc.moveTo(x, y); pc.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); pc.stroke();
    }
    // manchas suaves de pigmento irregular (el papel absorbe distinto)
    for (let i = 0; i < 40; i++) { const x = Math.random() * 1280, y = Math.random() * 720, r0 = 60 + Math.random() * 200; const g = pc.createRadialGradient(x, y, 0, x, y, r0); g.addColorStop(0, 'rgba(120,100,80,0.05)'); g.addColorStop(1, 'rgba(120,100,80,0)'); pc.globalAlpha = 1; pc.fillStyle = g; pc.fillRect(x - r0, y - r0, r0 * 2, r0 * 2); }
    pc.globalAlpha = 1;
    const vg = pc.createRadialGradient(640, 360, 260, 640, 360, 800);
    vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(60,45,35,.75)');
    pc.fillStyle = vg; pc.fillRect(0, 0, 1280, 720);
    // niebla baja para el abandono y el exterior
    const [hz, hc] = makeCanvas(1024, 200);
    for (let i = 0; i < 90; i++) { const x = Math.random() * 1024, y = 80 + Math.random() * 100, r0 = 40 + Math.random() * 110; const g = hc.createRadialGradient(x, y, 0, x, y, r0); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)'); hc.fillStyle = g; hc.fillRect(x - r0, y - r0, r0 * 2, r0 * 2); }
    // bordes suaves: sin cortes rectos arriba ni a los costados (las tiras se superponen sin que se note)
    hc.globalCompositeOperation = 'destination-in';
    const fv = hc.createLinearGradient(0, 0, 0, 200); fv.addColorStop(0, 'rgba(0,0,0,0)'); fv.addColorStop(0.5, 'rgba(0,0,0,1)'); fv.addColorStop(1, 'rgba(0,0,0,1)');
    hc.fillStyle = fv; hc.fillRect(0, 0, 1024, 200);
    const fh = hc.createLinearGradient(0, 0, 1024, 0); fh.addColorStop(0, 'rgba(0,0,0,0)'); fh.addColorStop(0.2, 'rgba(0,0,0,1)'); fh.addColorStop(0.8, 'rgba(0,0,0,1)'); fh.addColorStop(1, 'rgba(0,0,0,0)');
    hc.fillStyle = fh; hc.fillRect(0, 0, 1024, 200);
    hc.globalCompositeOperation = 'source-over';
    this.textures.addCanvas('haze', hz);
    this.textures.addCanvas('vignette', pv);
  }

  // ------------------------------------------------------------------ UI y entrada
  private wireUI(): void {
    const ui = this.ui;
    ui.onCombine = (a, b) => this.chain(combine(a, b, this.s));
    ui.onInspect = (id) => this.chain(inspectItem(id));
    ui.onEra = () => this.toggleEra();
    ui.onJournal = () => { if (!this.running) this.modal(() => ui.journal(this.s)); };
    ui.onHint = () => { if (!this.running) this.modal(() => ui.hints(this.s, () => { this.s.hintsUsed++; })); };
    ui.onMenu = () => this.pauseMenu();
    window.addEventListener('keydown', (e) => {
      if (this.titleMode || this.running) return;
      if (document.querySelector('.modal')) return;
      if (e.key === 'Escape') this.pauseMenu();
      if (e.key === 'j' || e.key === 'J') ui.onJournal?.();
      if (e.key === 'h' || e.key === 'H') ui.onHint?.();
      if ((e.key === 't' || e.key === 'T') && this.eraAvailable()) this.toggleEra();
      if (e.key === 'i' || e.key === 'I') ui.inv.classList.toggle('open');
    });
    window.addEventListener('blur', () => { /* el audio sigue: es ambiente */ });
  }

  private async modal(fn: () => Promise<void>): Promise<void> {
    this.running = true; this.ui.busy = true;
    await fn();
    this.running = false; this.ui.busy = false;
  }

  private wireInput(): void {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.titleMode || this.running) { this.ui.showLabel(null); return; }
      const h = this.hotspotAt(p.worldX, p.worldY);
      const r = this.ui.root.getBoundingClientRect();
      if (h) {
        this.ui.showLabel(hotspotName(h, this.s), p.x * r.width / 1920, p.y * r.height / 1080);
        this.game.canvas.style.cursor = h.exit && !h.look ? 'e-resize' : 'pointer';
      } else { this.ui.showLabel(null); this.game.canvas.style.cursor = 'default'; }
    });
    this.input.on('pointerdown', async (p: Phaser.Input.Pointer) => {
      audio.init();
      if (this.titleMode || this.running) return;
      if (document.querySelector('.modal') || document.querySelector('#verbs.show')) return;
      const h = this.hotspotAt(p.worldX, p.worldY);
      const right = p.rightButtonDown();
      if (!h) {
        if (this.ui.selected) { this.ui.select(null); return; }
        this.walkTo(p.worldX, p.worldY);
        return;
      }
      if (this.ui.selected) { const item = this.ui.selected; this.ui.select(null); await this.approach(h, 'use'); this.chain(interact(h, 'use', this.s, item)); return; }
      if (right) { this.chain(interact(h, 'look', this.s)); return; }
      const verbs = verbsFor(h);
      if (h.exit && (verbs.length === 0 || verbs.every((v) => v === 'look'))) {
        if (verbs.length === 0) { await this.approach(h); this.chain(interact(h, 'exit', this.s)); return; }
        verbs.push('use');
      }
      if (verbs.length === 1) { await this.approach(h, verbs[0]); this.chain(interact(h, verbs[0], this.s)); return; }
      const r = this.ui.root.getBoundingClientRect();
      this.ui.showLabel(null);
      const v = await this.ui.chooseVerb(verbs, p.x * r.width / 1920, p.y * r.height / 1080);
      if (!v) return;
      await this.approach(h, v);
      this.chain(interact(h, v === 'use' && h.exit && !h.use ? 'exit' : v, this.s));
    });
  }

  private hotspotAt(x: number, y: number): Hotspot | null {
    const hs = visibleHotspots(this.room.id, this.s).filter((h) => {
      const [hx, hy, hw, hh] = h.rect;
      return x >= hx && x <= hx + hw && y >= hy && y <= hy + hh;
    });
    hs.sort((a, b) => a.rect[2] * a.rect[3] - b.rect[2] * b.rect[3]);
    return hs[0] ?? null;
  }

  private async approach(h: Hotspot, verb?: Verb): Promise<void> {
    this.talkTarget = h.npc ? this.npcs.find((n) => n.getData('hid') === h.id) ?? null : null;
    if (verb === 'look' && !h.exit) {
      this.face(h.rect[0] + h.rect[2] / 2);
      // mirar algo: se detiene a observarlo (sin frenar el texto)
      if (this.painted && !h.npc && this.anims.exists('elena-examine')) {
        this.player.play('elena-examine');
        this.player.once('animationcomplete', (an: Phaser.Animations.Animation) => { if (an.key === 'elena-examine' && !this.moving) this.player.play('elena-idle'); });
      }
      return;
    }
    const [x, y] = this.reachPoint(h, verb) ?? h.walk ?? [h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3]];
    await this.walkTo(x, y);
    // ¿la mano tiene que subir (estirarse) o bajar (agacharse)? según la altura del objeto respecto de sus pies
    this.reachHigh = this.player.y - (h.rect[1] + h.rect[3] * 0.55) > this.elenaH() * 0.4;
    // quien recibe a Elena se vuelve hacia ella (salvo quien está sentada)
    const tgt = this.talkTarget, row = tgt && WorldScene.NPC_ROW[tgt.getData('who')];
    if (tgt && row && !h.npcAt && tgt.texture.key === 'npcs-p') tgt.setFlipX((this.player.x < tgt.x ? -1 : 1) !== row[1]);
    if (h.face) this.facing = h.face === 'left' ? -1 : 1;
    else this.face(h.rect[0] + h.rect[2] / 2);
    this.player.setFlipX(this.facing < 0);
    // frente a un objeto o una persona se pone de perfil; ante una puerta queda de espaldas
    if (!h.exit && this.dir !== 'side') { this.dir = 'side'; this.player.play('elena-idle', true); }
  }

  /**
   * Para tomar o usar algo chico, Elena se para al lado del objeto (no a metros): si está en el piso,
   * con los pies a la altura de su base; si está sobre un mueble, frente al mueble, a la distancia de un brazo.
   */
  private reachPoint(h: Hotspot, verb?: Verb): Pt | null {
    if (h.exit || h.npc || !this.painted) return null;
    if (verb !== 'take' && verb !== 'use') return null;
    const [rx, ry, rw, rh] = h.rect;
    if (rw > 220 || rh > 260) return null;
    const cx = rx + rw / 2, base = ry + rh;
    const onFloor = inPoly([cx, base + 4], this.room.floor);
    const fy = onFloor ? base + 4 : (h.walk?.[1] ?? base + 30);
    const arm = this.elenaH(fy) * 0.2 + rw * 0.35;
    const side = this.player.x <= cx ? -1 : 1;
    let pt = clampToPoly(this.room.floor, [cx + side * arm, fy]);
    // si de ese lado no hay piso (pared, mueble), probar del otro
    if (Math.abs(pt[0] - (cx + side * arm)) > 30) pt = clampToPoly(this.room.floor, [cx - side * arm, fy]);
    return pt;
  }

  private face(x: number): void {
    if (Math.abs(x - this.player.x) > 8) this.facing = x < this.player.x ? -1 : 1;
    this.player.setFlipX(this.facing < 0);
    if (this.dir !== 'side' && !this.moving) { this.dir = 'side'; this.player.play('elena-idle', true); }
  }

  // ------------------------------------------------------------------ movimiento
  walkTo(x: number, y: number): Promise<void> {
    const [tx, ty] = clampToPoly(this.room.floor, [x, y]);
    this.moving?.resolve();
    return new Promise((resolve) => {
      if (Math.hypot(tx - this.player.x, ty - this.player.y) < 4) { resolve(); return; }
      this.moving = { tx, ty, resolve };
      const dx = tx - this.player.x, dy = ty - this.player.y;
      if (Math.abs(dx) > 4) this.facing = dx < 0 ? -1 : 1;
      this.player.setFlipX(this.facing < 0);
      // si va sobre todo hacia el fondo o hacia adelante, camina de espaldas o de frente
      this.dir = this.painted && Math.abs(dy) > Math.abs(dx) * 1.3 && Math.abs(dy) > 18 ? (dy < 0 ? 'back' : 'front') : 'side';
      this.player.play(this.dir === 'back' ? 'elena-walk-back' : this.dir === 'front' ? 'elena-walk-front' : 'elena-walk', true);
    });
  }

  update(_t: number, dt: number): void {
    // nubes sueltas que cruzan el cielo; al salir por un lado vuelven a entrar por el otro
    for (const c of this.clouds) {
      c.spr.x -= (c.speed * dt) / 1000;
      if (c.spr.x < -c.spr.displayWidth / 2) c.spr.x = this.room.width + c.spr.displayWidth / 2;
    }
    this.updateShadows();
    if (!this.player || this.titleMode) return;
    if (this.moving) {
      const { tx, ty } = this.moving;
      const dx = tx - this.player.x, dy = ty - this.player.y;
      const d = Math.hypot(dx, dy);
      const step = (SPEED * this.roomScale() * dt) / 1000;
      if (d <= step) {
        this.player.setPosition(tx, ty).setScale(this.playerScale());
        const r = this.moving.resolve;
        this.moving = undefined;
        this.player.play(this.idleKey(), true);
        r();
      } else {
        // en diagonal hacia el fondo se camina un poco más lento: la animación se ajusta para no patinar
        this.player.x += (dx / d) * step;
        this.player.y += (dy / d) * step;
        this.player.setScale(this.playerScale());
        this.player.anims.timeScale = Math.max(0.6, Math.abs(dx / d)) * 1 + Math.abs(dy / d) * 0.6;
        const f = Number(this.player.frame.name);
        if (this.stepFrames.has(f) && f !== this.lastStep) { audio.step(this.surface()); this.lastStep = f; }
        if (!this.stepFrames.has(f)) this.lastStep = -1;
      }
      this.player.setDepth(this.player.y);
    }
    this.s.playTime += dt / 1000;
  }

  private surface(): 'wood' | 'stone' | 'gravel' | 'water' {
    const r = this.room.id, era = eraOf(this.room, this.s);
    if (r === 'sotano' && era === 'abandono') return 'water';
    if (r === 'entrada' || r === 'jardin') return 'gravel';
    if (r === 'sotano' || r === 'invernadero' || r === 'reloj') return 'stone';
    return 'wood';
  }

  // ------------------------------------------------------------------ salas
  async loadRoom(id: string, at?: Pt, fade = true): Promise<void> {
    if (fade) await this.fadeOut(350);
    this.room = ROOMS[id];
    this.s.room = id;
    if (!this.s.visited.includes(id)) this.s.visited.push(id);
    settleEra(this.room, this.s);
    await this.ensurePlates(id);
    this.drawRoom();
    const pos = at ?? this.s.pos ?? this.room.spawn;
    const [px, py] = clampToPoly(this.room.floor, pos);
    if (!this.titleMode) {
      this.player.setPosition(px, py).setDepth(py).setVisible(true).setScale(this.playerScale());
      this.player.play('elena-idle');
    }
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.room.width, 720);
    if (!this.titleMode) cam.startFollow(this.player, true, 0.08, 0.08, 0, 60);
    this.ui.setRoom(this.room.name, this.s);
    this.refreshEraButton();
    audio.ambience(this.room.ambience === 'house' && this.s.era === 'abandono' ? 'rain-in' : this.room.ambience);
    if (fade) await this.fadeIn(450);
  }

  /** Cambia con cada sala dibujada: los efectos con temporizador propio se cortan solos. */
  private fxGen = 0;

  private clearRoom(): void {
    this.fxGen++;
    for (const o of [...this.layerObjs, ...this.npcs, ...this.props, ...this.glows, ...this.particles]) o.destroy();
    this.clouds = [];
    this.layerObjs = []; this.npcs = []; this.props = []; this.glows = []; this.particles = [];
    for (const k of this.texKeys) this.textures.remove(k);
    this.texKeys = [];
  }

  /** Carga (una sola vez) las ilustraciones pintadas de una sala. */
  private async ensurePlates(id: string): Promise<void> {
    // si la red falla un momento, reintenta: nunca se muestra el respaldo dibujado por código en lugar de la pintura
    for (let i = 0; i < 4; i++) {
      await this.loadPlates(id);
      const plates = PAINTED[id];
      if (!plates || Object.keys(plates).every((era) => this.textures.exists(plateKey(id, era as Era)))) return;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }

  private loadPlates(id: string): Promise<void> {
    const plates = PAINTED[id];
    if (!plates) return Promise.resolve();
    const missing = (Object.entries(plates) as [Era, { src: string }][]).filter(([era]) => !this.textures.exists(plateKey(id, era)));
    if (!missing.length) return Promise.resolve();
    return new Promise((res) => {
      for (const [era, pl] of missing as [Era, Plate][]) {
        this.load.image(plateKey(id, era), pl.src);
        const base = pl.src.replace(/\.webp$/, '');
        if (pl.sky) { this.load.image(plateKey(id, era) + '-fg', base + '-fg.webp'); this.load.spritesheet(plateKey(id, era) + '-clouds', base + '-clouds.webp', { frameWidth: 640, frameHeight: 240 }); }
        if (pl.veg) this.load.image(plateKey(id, era) + '-veg', base + '-veg.webp');
        if (pl.alt) {
          const k = plateKey(id, era) + '-alt', b = pl.alt.src.replace(/\.webp$/, '');
          this.load.image(k, pl.alt.src);
          if (pl.sky) { this.load.image(k + '-fg', b + '-fg.webp'); this.load.spritesheet(k + '-clouds', b + '-clouds.webp', { frameWidth: 640, frameHeight: 240 }); }
          if (pl.veg) this.load.image(k + '-veg', b + '-veg.webp');
        }
        for (const [hid, ip] of Object.entries(pl.inPaint ?? {})) if (ip.patch) this.load.image(plateKey(id, era) + '-patch-' + hid, ip.patch);
      }
      this.load.once('complete', () => res());
      this.load.start();
    });
  }

  /** Escala del personaje en esta sala (las salas pintadas tienen su propia escala). */
  /** Escala del personaje a la altura y del piso: más chico al fondo, más grande adelante (perspectiva de la lámina). */
  private roomScale(y?: number): number {
    const sc = this.room?.scale;
    if (!sc) return 1;
    const yy = y ?? this.player?.y ?? sc[2];
    const k = sc[2] === sc[0] ? 1 : Phaser.Math.Clamp((yy - sc[0]) / (sc[2] - sc[0]), 0, 1.15);
    return (sc[1] + (sc[3] - sc[1]) * k) / 0.86;
  }

  /** Alto de Elena parada, en píxeles del mundo, a la altura y del piso. */
  private elenaH(y?: number): number { return this.roomScale(y) * 300 * 0.86; }

  /** Lo que se mueve sobre una pintura: llamas, faroles, fuego, lluvia en los vidrios, cortinas, hojas. */
  private plateFx(plate: Plate, pk: string, sc: number): void {
    const still = this.opts.reduceMotion, gl = this.game.renderer.type === Phaser.WEBGL;
    const ox = plate.dx ?? 0, oy = plate.dy ?? 0;
    const crop = (x: number, y: number, w: number, h: number, pipe: string, depth: number) => {
      if (still || !gl) return;
      const im = this.add.image(ox, oy, pk).setOrigin(0).setScale(sc).setDepth(depth);
      im.setCrop((x - ox) / sc, (y - oy) / sc, w / sc, h / sc);
      im.setPostPipeline(pipe);
      this.layerObjs.push(im);
    };
    for (const f of plate.fx ?? []) {
      if (f.k === 'candle') {
        const g = this.add.image(f.x, f.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9100).setScale(0.22).setAlpha(0.5).setTint(0xffc070);
        if (!still) this.tweens.add({ targets: g, alpha: { from: 0.32, to: 0.62 }, scale: { from: 0.2, to: 0.25 }, duration: 80 + Math.random() * 140, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.glows.push(g);
      } else if (f.k === 'lamp') {
        const g = this.add.image(f.x, f.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9100).setScale(f.r / 128).setAlpha(0.28).setTint(0xffd090);
        if (!still) this.tweens.add({ targets: g, alpha: { from: 0.2, to: 0.34 }, duration: 1800 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.glows.push(g);
      } else if (f.k === 'fire') {
        crop(f.x, f.y, f.w, f.h, 'Heat', -17);
        const g = this.add.image(f.x + f.w / 2, f.y + f.h * 0.7, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9100).setScale(f.w / 70).setAlpha(0.4).setTint(0xff9a40);
        if (!still) this.tweens.add({ targets: g, alpha: { from: 0.28, to: 0.55 }, scale: { from: f.w / 75, to: f.w / 62 }, duration: 120 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.glows.push(g);
        // chispas
        if (!still) {
          const sparks = this.add.particles(0, 0, 'mote', {
            x: { min: f.x + f.w * 0.25, max: f.x + f.w * 0.75 }, y: f.y + f.h * 0.75, lifespan: 1400, speedY: { min: -70, max: -30 }, speedX: { min: -12, max: 12 },
            scale: { start: 0.35, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: 0xffb050, frequency: 260, blendMode: 'ADD',
          }).setDepth(9150);
          this.particles.push(sparks);
        }
      } else if (f.k === 'window') {
        if (!still) {
          const shape = this.make.graphics({}, false).fillRect(f.x, f.y, f.w, f.h);
          const rain = this.add.particles(0, 0, 'raindrop', {
            x: { min: f.x, max: f.x + f.w }, y: f.y - 10, lifespan: (f.h / 420) * 1000, speedY: { min: 360, max: 480 }, speedX: -20,
            alpha: { min: 0.12, max: 0.3 }, scale: { min: 0.5, max: 0.8 }, quantity: 1, frequency: Math.max(12, 9000 / f.w),
          }).setDepth(-16);
          rain.setMask(shape.createGeometryMask());
          this.particles.push(rain);
        }
      } else if (f.k === 'curtain') {
        crop(f.x, f.y, f.w, f.h, 'Curtain', -17);
      } else if (f.k === 'plants') {
        crop(f.x, f.y, f.w, f.h, 'Sway', -17);
      } else if (f.k === 'fountain' && !still) {
        // agua que rebalsa de cada plato y cae al de abajo, y ondas que se abren en la pileta
        const full = f.flow === 'full';
        f.tiers.forEach(([x0, x1, y], i) => {
          const below = i + 1 < f.tiers.length ? f.tiers[i + 1][2] : f.pool[2];
          const fall = below - y;
          const ms = Math.sqrt((2 * fall) / 900) * 1000;
          const em = this.add.particles(0, 0, 'raindrop', {
            x: { min: x0, max: x1 }, y, lifespan: ms, speedY: { min: 10, max: 40 }, gravityY: 900, speedX: { min: -8, max: 8 },
            alpha: { start: full ? 0.55 : 0.4, end: full ? 0.25 : 0.1 }, scale: { min: 0.35, max: 0.6 }, tint: 0xf4efe2,
            quantity: 1, frequency: full ? 22 - i * 4 : 900 + Math.random() * 700,
          }).setDepth(-16);
          this.particles.push(em);
        });
        const [px0, px1, py, ph] = f.pool;
        const gen = this.fxGen;
        const ripple = () => {
          if (gen !== this.fxGen) return;
          const rx = px0 + Math.random() * (px1 - px0), ry = py + (Math.random() - 0.5) * ph;
          const r = this.add.ellipse(rx, ry, 10, 3).setStrokeStyle(1.2, 0xf4efe2, 0.5).setDepth(-16.5);
          this.tweens.add({ targets: r, scaleX: 4, scaleY: 4, alpha: 0, duration: 1400, ease: 'Sine.out', onComplete: () => r.destroy() });
          this.time.delayedCall(full ? 120 + Math.random() * 200 : 1500 + Math.random() * 1500, ripple);
        };
        ripple();
      }
    }
  }

  drawRoom(): void {
    this.clearRoom();
    const era = eraOf(this.room, this.s);
    const plate = PAINTED[this.room.id]?.[era];
    if (plate && this.textures.exists(plateKey(this.room.id, era))) {
      // ilustración pintada: cubre la sala; encima van sólo los efectos que unifican (aire, polvo, papel)
      // variante de la lámina según el estado (por ejemplo, el portón abierto)
      const pk0 = plateKey(this.room.id, era);
      const pk = plate.alt && this.s.flags[plate.alt.flag] && this.textures.exists(pk0 + '-alt') ? pk0 + '-alt' : pk0;
      const img = this.add.image(plate.dx ?? 0, plate.dy ?? 0, pk).setOrigin(0).setDepth(-20);
      const src = img.texture.getSourceImage() as HTMLImageElement;
      const sc = Math.max(this.room.width / src.width, 720 / src.height);
      img.setScale(sc);
      if (plate.sky && this.textures.exists(pk + '-clouds') && this.textures.exists(pk + '-fg')) {
        // nubes sueltas que pasan detrás de la casa y los árboles: tres alturas, las de más arriba (más lejos) más lentas y chicas
        const W = this.room.width;
        const n = Math.ceil(W / 260);
        for (let i = 0; i < n; i++) {
          const far = i % 3; // 0 = lejos (arriba), 2 = cerca (más abajo)
          const y = 30 + far * 55 + Math.random() * 40;
          const scl = 0.7 + far * 0.3 + Math.random() * 0.25;
          const cl = this.add.image((i / n) * W + Math.random() * 180, y, pk + '-clouds', Math.floor(Math.random() * 6))
            .setDepth(-19.6 + far * 0.03).setScale(scl, scl * (0.85 + Math.random() * 0.3)).setAlpha(0.85 + far * 0.05).setFlipX(Math.random() < 0.5);
          if (!this.opts.reduceMotion) this.clouds.push({ spr: cl, speed: 12 + far * 12 + Math.random() * 6 });
          this.layerObjs.push(cl);
        }
        const fg = this.add.image(plate.dx ?? 0, plate.dy ?? 0, pk + '-fg').setOrigin(0).setScale(sc).setDepth(-19);
        this.layerObjs.push(fg);
      }
      if (plate.veg && this.textures.exists(pk + '-veg') && !this.opts.reduceMotion && this.game.renderer.type === Phaser.WEBGL) {
        const veg = this.add.image(plate.dx ?? 0, plate.dy ?? 0, pk + '-veg').setOrigin(0).setScale(sc).setDepth(-18);
        veg.setPostPipeline('Sway');
        this.layerObjs.push(veg);
      }
      const vig = this.add.image(320, 180, 'vignette').setOrigin(0).setScrollFactor(0).setDisplaySize(1280, 720).setDepth(9800).setBlendMode(Phaser.BlendModes.MULTIPLY);
      this.layerObjs.push(img, vig);
      // la Sombra pintada detrás del reloj respira: la tinta se hincha y se contrae, apenas
      if (this.room.id === 'reloj' && era === 'sombras' && this.textures.exists('sombra-breath') && !this.opts.reduceMotion) {
        const sb = this.add.image(1110 + 195, 40 + 580, 'sombra-breath').setOrigin(0.5, 1).setDepth(-19.4);
        this.tweens.add({ targets: sb, scaleY: 1.035, scaleX: 1.015, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.tweens.add({ targets: sb, x: sb.x + 6, angle: 0.8, duration: 4300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.layerObjs.push(sb);
      }
      // objetos pintados que ya se tomaron: se tapan con un retazo de la misma pintura
      const vis = new Set(visibleHotspots(this.room.id, this.s).map((h) => h.id));
      for (const [hid, ip] of Object.entries(plate.inPaint ?? {})) {
        if (!ip.patch || vis.has(hid) || !this.textures.exists(pk0 + '-patch-' + hid)) continue;
        this.layerObjs.push(this.add.image(ip.x * sc, ip.y * sc, pk0 + '-patch-' + hid).setOrigin(0).setScale(sc).setDepth(-17));
      }
      this.plateFx(plate, pk, sc);
      if (plate.ambient) {
        const shade = this.add.rectangle(0, 0, this.room.width, 720, era === 'abandono' ? 0x7f8a80 : 0x7a6a5a, plate.ambient).setOrigin(0).setDepth(9000).setBlendMode(Phaser.BlendModes.MULTIPLY);
        this.layerObjs.push(shade);
      }
      this.spawnActors(era);
      this.spawnAtmosphere(era);
      return;
    }
    const R = renderRoom(this.room.id, era, this.s, this.room.width, 720, this.res);
    this.rendered = R;
    const key = `room-${Date.now()}`;
    const add = (name: string, cv: HTMLCanvasElement) => { const k = key + name; this.textures.addCanvas(k, cv); this.texKeys.push(k); return k; };
    const inv = 1 / this.res;
    const far = this.add.image(0, 0, add('far', R.far)).setOrigin(0).setScale(inv).setScrollFactor(0.85, 1).setDepth(-30);
    const back = this.add.image(0, 0, add('back', R.back)).setOrigin(0).setScale(inv).setDepth(-20);
    const dark = this.add.image(0, 0, add('dark', R.dark)).setOrigin(0).setScale(2).setDepth(9000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const front = this.add.image(0, 0, add('front', R.front)).setOrigin(0).setScale(inv).setDepth(9500);
    // primerísimo plano: se mueve más rápido que la sala (profundidad)
    const near = this.add.image(-0.125 * this.room.width, 0, add('near', R.near)).setOrigin(0).setScale(inv).setScrollFactor(1.25, 1).setDepth(9550);
    this.layerObjs.push(near);
    if (R.beams) {
      const beams = this.add.image(0, 0, add('beams', R.beams)).setOrigin(0).setScale(2).setDepth(9050).setBlendMode(Phaser.BlendModes.SCREEN);
      if (!this.opts.reduceMotion) this.tweens.add({ targets: beams, alpha: { from: 0.75, to: 1 }, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.layerObjs.push(beams);
    }
    const vig = this.add.image(320, 180, 'vignette').setOrigin(0).setScrollFactor(0).setDisplaySize(1280, 720).setDepth(9800).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.layerObjs.push(far, back, dark, front, vig);
    // luces cálidas que titilan
    for (const l of R.lights) {
      if (l.kind === 'window') continue;
      const g = this.add.image(l.x, l.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9100).setAlpha(0.35 * l.intensity).setScale(l.r / 128 * 0.7);
      if (l.flicker && !this.opts.reduceMotion) this.tweens.add({ targets: g, alpha: { from: 0.25 * l.intensity, to: 0.42 * l.intensity }, duration: 90 + Math.random() * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.glows.push(g);
    }
    this.spawnActors(era);
    this.spawnAtmosphere(era);
  }

  private spawnActors(era: Era): void {
    for (const h of visibleHotspots(this.room.id, this.s)) {
      const painted = !!PAINTED[this.room.id]?.[era] && this.textures.exists(plateKey(this.room.id, era));
      const inPaint = !!PAINTED[this.room.id]?.[era]?.inPaint?.[h.id];
      if (h.prop && (!painted || (OVERLAY_PROPS.has(h.prop) && !inPaint))) {
        const [x, y, w, hh] = h.rect;
        const objKey = ({ aceitera: 'obj-aceitera', lata: 'obj-lata' } as Record<string, string>)[h.prop];
        if (objKey && this.textures.exists(objKey)) {
          // objeto pintado a mano, apoyado en el piso del rectángulo
          const foot = objKey === 'obj-aceitera' ? 218 / 256 : 244 / 256;
          const k = Math.min(w / 256, hh / (256 * foot)) * 1.05;
          const img = this.add.image(x + w / 2, y + hh, objKey).setOrigin(0.5, foot).setScale(k).setDepth(h.depth ?? (y + hh) - 400);
          const pt = PAINTED[this.room.id]?.[era]?.tint;
          if (pt) img.setTint(pt);
          this.props.push(img);
          continue;
        }
        const cv = drawProp(h.prop, era, w, hh, this.res);
        if (cv) {
          const k = `prop-${h.id}-${Date.now()}`;
          this.textures.addCanvas(k, cv); this.texKeys.push(k);
          const img = this.add.image(x, y, k).setOrigin(0).setScale(1 / this.res).setDepth(h.depth ?? (y + hh) - 400);
          if (h.prop === 'fragmento' && !this.opts.reduceMotion) this.tweens.add({ targets: img, alpha: { from: 0.55, to: 1 }, y: y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.props.push(img);
        }
      }
      if (h.npc && !inPaint) {
        const [x, y, w, hh] = h.rect;
        const key = h.npc === 'rosa_ink' ? 'rosa' : h.npc;
        if (key === 'sombra') {
          const sp = this.add.sprite(x + w / 2, y + hh, 'sombra', 0).setOrigin(0.5, 1).setScale(0.9 / this.sheets.sombra.res).setDepth(y + hh - 300).setAlpha(0.92);
          sp.play('sombra-idle');
          // la Sombra respira hondo y ondula, como tinta en agua
          if (!this.opts.reduceMotion) {
            this.tweens.add({ targets: sp, scaleY: sp.scaleY * 1.04, scaleX: sp.scaleX * 0.98, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            this.tweens.add({ targets: sp, angle: { from: -1.5, to: 1.5 }, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          }
          this.npcs.push(sp);
          continue;
        }
        // h.face es hacia dónde mira Elena al hablarle: el personaje mira al revés
        const npcFace = h.face === 'left' ? 'right' : h.face === 'right' ? 'left' : undefined;
        const at = this.painted ? h.npcAt : undefined;
        const sp = this.npcSprite(key, at?.[0] ?? x + w / 2, at?.[1] ?? y + hh, npcFace).setDepth(y + hh);
        if (at) sp.setScale(sp.scaleX * at[2], sp.scaleY * at[2]);
        // Rosa atrapada: barre sin parar, con un vaivén corto (no se desliza por el piso)
        if (h.npc === 'rosa_ink') this.tweens.add({ targets: sp, angle: { from: -2.5, to: 2.5 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        if (h.npc === 'isabel') { sp.setAlpha(0.8); this.tweens.add({ targets: sp, alpha: 0.6, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
        sp.setData('ink', era === 'sombras' ? (h.npc === 'rosa_ink' ? 'dark' : h.npc === 'isabel' ? 'pale' : 'ink') : null);
        sp.setData('who', key).setData('hid', h.id);
        if (h.npc !== 'rosa_ink') this.breathe(sp);
        if (!at && h.npc !== 'isabel') this.footShadow(sp);
        this.npcs.push(sp);
      }
    }
    if (!this.player) {
      this.player = this.painted
        ? this.add.sprite(0, 0, 'elena-p', 0).setOrigin(0.5, ELENA_FOOT)
        : this.add.sprite(0, 0, 'elena', 0).setOrigin(0.45, FOOT_Y / FRAME_H);
      this.player.play('elena-idle');
      this.footShadow(this.player);
    }
    this.player.setScale(this.playerScale());
    this.player.setVisible(!this.titleMode);
    this.player.clearTint();
    if (era === 'sombras') this.player.setTint(0xcfc8bc);
    // en las salas pintadas, los personajes toman la luz de la ilustración
    const plateTint = PAINTED[this.room.id]?.[era]?.tint;
    if (plateTint) { this.player.setTint(plateTint); for (const n of this.npcs) n.setTint(plateTint); }
    // en el tiempo de las sombras todo es papel y tinta: también los personajes (Elena conserva un resto de color)
    // en el abandono la luz es gris y húmeda: los personajes pierden un poco de color para no verse recortados
    this.inkify(this.player, era === 'sombras' ? 'elena' : era === 'abandono' ? 'dim' : null);
    for (const n of this.npcs) if (n.texture.key !== 'sombra') this.inkify(n, n.getData('ink') ?? (era === 'abandono' ? 'dim' : null));
  }

  /** Sombras de contacto: siguen a cada personaje y se van con él. */
  private shadows = new Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Image>();
  private footShadow(sp: Phaser.GameObjects.Sprite, base = 0.42): void {
    if (this.shadows.has(sp)) return;
    const sh = this.add.image(sp.x, sp.y, 'footshadow').setOrigin(0.5, 0.5).setBlendMode(Phaser.BlendModes.MULTIPLY);
    sh.setData('base', base);
    this.shadows.set(sp, sh);
  }
  private updateShadows(): void {
    for (const [sp, sh] of this.shadows) {
      if (!sp.active) { sh.destroy(); this.shadows.delete(sp); continue; }
      const H = sp.displayHeight * 0.92;
      const outdoor = !!this.room?.outdoor;
      sh.setPosition(sp.x, sp.y - H * 0.006).setDisplaySize(H * 0.42, H * 0.075).setDepth(sp.depth - 1)
        .setVisible(sp.visible).setAlpha(sp.alpha * (sh.getData('base') as number) * (outdoor ? 0.8 : 1));
    }
  }

  /** Respira: el pecho sube y baja apenas, y cada tanto cambia el peso de pierna. */
  private breathe(sp: Phaser.GameObjects.Sprite): void {
    if (this.opts.reduceMotion) return;
    const sy = sp.scaleY;
    this.tweens.add({ targets: sp, scaleY: sy * 1.012, duration: 1700 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 800 });
    this.tweens.add({ targets: sp, angle: { from: -0.5, to: 0.6 }, duration: 3800 + Math.random() * 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: Math.random() * 2000 });
  }

  /** Mientras un personaje dice su línea mueve la boca y acompaña con el cuerpo; al terminar vuelve al reposo. */
  private talking(who: string, on: boolean): void {
    if (who === 'elena') return;
    const sp = this.npcs.find((n) => n.getData('who') === who && n.texture.key === 'npcs-p');
    if (!sp) return;
    if (on) { this.nod(who); if (this.anims.exists(`${who}-talk-p`)) sp.play(`${who}-talk-p`); }
    else if (this.anims.exists(`${who}-p`)) sp.play(`${who}-p`);
  }

  /** Quien habla acompaña con el cuerpo: un leve gesto de cabeza y hombros mientras dice su línea. */
  private nod(who: string): void {
    if (this.opts.reduceMotion) return;
    const sp = this.npcs.find((n) => n.getData('who') === who);
    if (!sp || sp.getData('nodding')) return;
    sp.setData('nodding', true);
    const y0 = sp.y;
    this.tweens.add({ targets: sp, y: y0 - sp.displayHeight * 0.006, duration: 220, yoyo: true, repeat: 1, ease: 'Sine.inOut', onComplete: () => { sp.y = y0; sp.setData('nodding', false); } });
  }

  /** Dar o recibir un objeto: Elena estira la mano y el objeto pasa de una mano a la otra. */
  private async handover(item: string, toElena: boolean): Promise<void> {
    const npc = this.talkTarget;
    if (!npc || !npc.active || Math.abs(npc.x - this.player.x) > 700) return;
    this.face(npc.x);
    const key = 'held-' + item;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, this.ui.icon(item, 96));
    const H = this.elenaH();
    const hand: Pt = [this.player.x + this.facing * H * 0.17, this.player.y - H * 0.5];
    const other: Pt = [npc.x - this.facing * npc.displayHeight * 0.12, npc.y - npc.displayHeight * 0.5];
    const [from, to] = toElena ? [other, hand] : [hand, other];
    const img = this.add.image(from[0], from[1], key).setDepth(Math.max(this.player.depth, npc.depth) + 1).setScale((H * 0.13) / 96).setAlpha(0);
    const tint = PAINTED[this.room.id]?.[this.s.era]?.tint; if (tint) img.setTint(tint);
    this.player.play(this.anims.exists('elena-use') ? 'elena-use' : 'elena-idle');
    audio.sfx('give');
    this.player.once('animationcomplete', () => this.player.play('elena-idle'));
    await new Promise<void>((r) => {
      this.tweens.add({ targets: img, alpha: 1, duration: 150 });
      this.tweens.add({ targets: img, x: to[0], duration: 650, ease: 'Sine.inOut' });
      this.tweens.add({ targets: img, y: Math.min(from[1], to[1]) - H * 0.06, duration: 325, yoyo: true, ease: 'Sine.out', onComplete: () => {
        this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 0.6, duration: 180, onComplete: () => { img.destroy(); r(); } });
      } });
    });
  }

  /** Pasa un personaje a tinta sepia sobre papel (sólo WebGL). */
  private inkify(sp: Phaser.GameObjects.Sprite, kind: 'elena' | 'ink' | 'dark' | 'pale' | 'dim' | null): void {
    if (!sp.preFX) {
      if (kind === 'dim') return;
      if (kind === 'dark') sp.setTint(0x4a453e);
      else if (kind) sp.setTint(0xa8a298);
      return;
    }
    sp.preFX.clear();
    if (!kind) return;
    const cm = sp.preFX.addColorMatrix();
    if (kind === 'dim') { cm.saturate(-0.38); return; }
    if (kind === 'elena') { cm.saturate(-0.7); cm.sepia(true); cm.contrast(0.08, true); return; }
    cm.grayscale(1); cm.sepia(true); cm.contrast(0.18, true);
    if (kind === 'dark') { cm.brightness(0.45, true); cm.contrast(0.35, true); }
    if (kind === 'pale') { cm.brightness(1.12, true); cm.contrast(-0.25, true); }
  }

  private spawnAtmosphere(era: Era): void {
    if (this.opts.reduceMotion) return;
    const W = this.room.width;
    if (this.room.outdoor && era !== 'sombras') {
      const rain = this.add.particles(0, -20, 'raindrop', {
        x: { min: 0, max: W }, y: -30, lifespan: 1400, speedY: { min: 620, max: 760 }, speedX: -80, quantity: 3, frequency: 16,
        alpha: { min: 0.25, max: 0.6 }, rotate: 6,
      }).setDepth(9600);
      this.particles.push(rain);
    }
    // niebla baja que deriva
    if (era === 'abandono' || this.room.outdoor || this.room.id === 'sotano') {
      for (let i = 0; i < Math.ceil(W / 700) + 1; i++) {
        const hz = this.add.image(i * 700 - 250, 720, 'haze').setOrigin(0, 1).setScale(1.1, 1).setDepth(520).setAlpha(this.room.outdoor ? 0.42 : 0.34)
          .setTint(era === 'abandono' ? 0xc8d0b8 : 0xe8e0d0);
        this.tweens.add({ targets: hz, x: hz.x + 140, duration: 16000 + i * 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.particles.push(hz as any);
      }
    }
    // polvo suspendido en la luz
    const motes = this.add.particles(0, 0, era === 'sombras' ? 'inkmote' : 'mote', {
      x: { min: 0, max: W }, y: { min: 80, max: 620 }, lifespan: 9000, speedX: { min: -6, max: 6 }, speedY: { min: -4, max: era === 'sombras' ? 10 : 3 },
      scale: { min: 0.3, max: era === 'sombras' ? 1.2 : 0.8 }, alpha: { start: 0, end: 0, ease: (t: number) => Math.sin(t * Math.PI) * (era === 'sombras' ? 0.7 : 0.55) } as any,
      quantity: 1, frequency: era === 'abandono' ? 120 : 220, blendMode: era === 'sombras' ? 'NORMAL' : 'ADD',
    }).setDepth(9200);
    this.particles.push(motes);
  }

  // ------------------------------------------------------------------ época
  eraAvailable(): boolean {
    return !!this.room && eraToggleAvailable(this.room, this.s) && !this.titleMode;
  }

  refreshEraButton(): void {
    this.ui.setEraButton(this.eraAvailable(), this.s.era);
  }

  async toggleEra(): Promise<void> {
    if (this.running || !this.eraAvailable()) return;
    const to: Era = this.s.era === '1920' ? 'abandono' : '1920';
    await this.chain([{ t: 'anim', anim: 'use' }, { t: 'era', era: to }]);
  }

  private async eraTransition(to: Era): Promise<void> {
    audio.sfx('era');
    const cam = this.cameras.main;
    const col = to === 'sombras' ? [17, 17, 17] : to === 'abandono' ? [48, 56, 45] : [216, 200, 169];
    await new Promise<void>((r) => { cam.fadeOut(this.opts.reduceMotion ? 120 : 500, col[0], col[1], col[2]); cam.once('camerafadeoutcomplete', () => r()); });
    this.s.era = to;
    this.drawRoom();
    audio.ambience(this.room.ambience === 'house' && to === 'abandono' ? 'rain-in' : this.room.ambience);
    this.refreshEraButton();
    await new Promise<void>((r) => { cam.fadeIn(this.opts.reduceMotion ? 120 : 700, col[0], col[1], col[2]); cam.once('camerafadeincomplete', () => r()); });
  }

  private fadeOut(ms: number): Promise<void> {
    return new Promise((r) => { this.cameras.main.fadeOut(ms, 14, 12, 10); this.cameras.main.once('camerafadeoutcomplete', () => r()); });
  }
  private fadeIn(ms: number): Promise<void> {
    return new Promise((r) => { this.cameras.main.fadeIn(ms, 14, 12, 10); this.cameras.main.once('camerafadeincomplete', () => r()); });
  }

  // ------------------------------------------------------------------ efectos
  async chain(effects: Effect[]): Promise<void> {
    if (this.running) return;
    this.running = true; this.ui.busy = true;
    const sig = this.visualSig();
    try {
      await this.runEffects(effects);
    } finally {
      this.talkTarget = null;
      for (const t of this.temp) t.destroy();
      this.temp = [];
      this.running = false; this.ui.busy = false;
    }
    if (this.titleMode) return;
    if (this.visualSig() !== sig) this.drawRoom();
    this.ui.renderInventory(this.s);
    this.ui.setRoom(this.room.name, this.s);
    this.refreshEraButton();
    Save.save(this.s, 'auto');
  }

  private visualSig(): string {
    return VISUAL_FLAGS.map((f) => (this.s.flags[f] ? 1 : 0)).join('') + this.s.fragments.length + this.s.era;
  }

  private async runEffects(effects: Effect[]): Promise<void> {
    for (const e of effects) {
      if (this.titleMode) return;
      await this.runEffect(e);
    }
  }

  private async runEffect(e: Effect): Promise<void> {
    const ui = this.ui;
    switch (e.t) {
      case 'say': { const w = e.who ?? 'elena'; this.talking(w, true); await ui.say(w, e.text, this.opts); this.talking(w, false); break; }
      case 'dialog': await this.runDialog(e.id); break;
      case 'give': await this.handover(e.item, true); applyEffect(this.s, e); ui.renderInventory(this.s); ui.toast(`${L('Guardé en el estuche', 'Put in my satchel')}: ${t(ITEMS[e.item]?.name ?? e.item)}`); break;
      case 'take': await this.handover(e.item, false); applyEffect(this.s, e); ui.renderInventory(this.s); break;
      case 'flag': applyEffect(this.s, e); break;
      case 'doc': applyEffect(this.s, e); await ui.showDoc(e.id); break;
      case 'note': { const had = this.s.notes.includes(e.id); applyEffect(this.s, e); if (!had) ui.toast(L('Diario actualizado', 'Journal updated')); break; }
      case 'fragment': applyEffect(this.s, e); ui.toast(L(`Recuerdo recuperado (${this.s.fragments.length} de 5)`, `Memory recovered (${this.s.fragments.length} of 5)`)); break;
      case 'goto': {
        this.cameras.main.stopFollow();
        if (e.era) this.s.era = e.era;
        await this.loadRoom(e.room, e.at);
        Save.save(this.s, 'auto');
        const enter = this.room.onEnter?.(this.s) ?? [];
        if (enter.length) await this.runEffects(enter);
        break;
      }
      case 'era': await this.eraTransition(e.era); break;
      case 'sfx': audio.sfx(e.id); break;
      case 'anim': await this.playAnim(e.anim); break;
      case 'puzzle': {
        const ok = await openPuzzle(ui, e.id);
        if (ok) await this.runEffects(SOLVED[e.id]);
        break;
      }
      case 'event': await this.runEvent(e.id); break;
      case 'wait': await this.delay(e.ms); break;
      case 'ending': applyEffect(this.s, e); break;
      case 'shake': if (!this.opts.reduceMotion) this.cameras.main.shake(400, 0.006); break;
      case 'flash': { const c = Phaser.Display.Color.HexStringToColor(e.color ?? '#ffffff'); this.cameras.main.flash(this.opts.reduceMotion ? 80 : 300, c.red, c.green, c.blue); break; }
    }
    if (e.t === 'ending' || (this.s.ending && e.t === 'dialog')) {
      if (this.s.ending) await this.showEnding(this.s.ending);
    }
  }

  private async runDialog(id: string): Promise<void> {
    const d = DIALOGS[id];
    if (!d) return;
    let nodeId: string | undefined = d.start(this.s);
    let guard = 0;
    while (nodeId && guard++ < 60) {
      const node: typeof d.nodes[string] = d.nodes[nodeId];
      if (!node) break;
      for (const [who, text] of node.lines) { this.talking(who, true); await this.ui.say(who, text, this.opts); this.talking(who, false); }
      if (node.effects) await this.runEffects(node.effects);
      if (node.options) {
        const opts = node.options.filter((o) => (!o.when || o.when(this.s)) && (!o.onceFlag || !this.s.flags[o.onceFlag]));
        if (!opts.length) break;
        const lastWho = node.lines[node.lines.length - 1]?.[0] ?? 'elena';
        const i = await this.ui.choose(lastWho, node.lines[node.lines.length - 1]?.[1] ?? '', opts.map((o) => o.text));
        const o = opts[i];
        if (o.effects) await this.runEffects(o.effects);
        if (this.s.ending) return;
        nodeId = o.next;
      } else nodeId = node.next;
    }
  }

  private playAnim(a: string): Promise<void> {
    // tomar algo alto: estira la mano; algo bajo: se agacha
    const key = `elena-${this.painted && a === 'pickup' && this.reachHigh ? 'take' : a}`;
    this.dir = 'side';
    if (!this.anims.exists(key)) return Promise.resolve();
    return new Promise((r) => {
      this.player.play(key);
      if (a === 'read') { this.time.delayedCall(1400, () => { this.player.play('elena-idle'); r(); }); return; }
      this.player.once('animationcomplete', () => { this.player.play('elena-idle'); r(); });
    });
  }

  delay(ms: number): Promise<void> { return new Promise((r) => this.time.delayedCall(ms, r)); }

  // ------------------------------------------------------------------ eventos guionados
  private async runEvent(id: string): Promise<void> {
    switch (id) {
      case 'anselmo_gate': {
        // Anselmo mira hacia Elena y el farol cuelga de su mano, con un vaivén leve
        const toRight = this.player.x > 1050;
        const sp = this.npcSprite('anselmo', 1050, 600, toRight ? 'right' : 'left').setDepth(560).setAlpha(0); this.breathe(sp);
        this.temp.push(sp); this.footShadow(sp);
        const H = this.elenaH(600), k = sp.scaleY * 0.75, dir = toRight ? 1 : -1;
        const hx = 1050 + dir * 71 * k, hy = 600 - 272 * k;
        const farol = this.add.image(hx, hy, 'obj-farol').setOrigin(0.5, 14 / 256).setScale((0.2 * H) / 232).setDepth(561).setAlpha(0);
        this.temp.push(farol);
        this.tweens.add({ targets: farol, angle: { from: -4, to: 4 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        const lamp = this.add.image(hx, hy + 0.11 * H, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9150).setScale(0.45).setAlpha(0);
        this.temp.push(lamp);
        this.tweens.add({ targets: [sp, farol, lamp], alpha: 1, duration: 1200 });
        await this.delay(1300);
        break;
      }
      case 'library_anomaly': {
        const x = 1175, y = 330;
        const g = this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9150).setScale(0.2).setAlpha(0.9);
        this.temp.push(g);
        this.tweens.add({ targets: g, scale: 1.6, duration: 900 });
        await this.delay(900);
        const crow = this.add.image(1180, 170, 'crow').setDepth(-10).setAlpha(0).setScale(0.3);
        this.temp.push(crow);
        audio.sfx('crow');
        this.tweens.add({ targets: crow, alpha: 0.85, scale: 1.3, duration: 1600, ease: 'Sine.out' });
        this.tweens.add({ targets: g, alpha: { from: 0.9, to: 0.3 }, duration: 80, yoyo: true, repeat: 10 });
        await this.delay(1800);
        await this.ui.say('elena', 'La sombra de la llama no es una llama. Tiene alas.', this.opts);
        this.tweens.add({ targets: g, alpha: 0, duration: 300 });
        this.tweens.add({ targets: crow, alpha: 0, duration: 600 });
        this.cameras.main.flash(400, 17, 17, 17);
        await this.delay(500);
        break;
      }
      case 'era_return': this.cameras.main.flash(500, 216, 200, 169); await this.delay(300); break;
      case 'musicbox': {
        audio.playMelody(MELODY, 0.6);
        await this.delay(600);
        const sp = this.npcSprite('isabel', 1150, 640, 'left').setDepth(640).setAlpha(0); this.breathe(sp);
        this.temp.push(sp);
        this.tweens.add({ targets: sp, alpha: 0.7, duration: 900, yoyo: true, hold: 1200 });
        await this.delay(1500);
        audio.playMelody(MELODY, 0.6);
        await this.delay(1800);
        break;
      }
      case 'theatre_shadow': {
        const crow = this.add.image(680, 220, 'crow').setDepth(-10).setAlpha(0).setScale(0.8);
        this.temp.push(crow);
        this.tweens.add({ targets: crow, alpha: 0.8, duration: 700, yoyo: true, hold: 900 });
        await this.delay(1200);
        break;
      }
      case 'void_intro': this.cameras.main.flash(900, 243, 239, 230); audio.sfx('crow'); await this.delay(700); break;
      case 'free_rosa': {
        const g = this.add.image(460, 500, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9150).setScale(0.3).setTint(0xd8f0c0);
        this.temp.push(g);
        this.tweens.add({ targets: g, scale: 3, alpha: 0, duration: 1400 });
        this.cameras.main.flash(600, 230, 240, 210);
        this.s.flags.rosaFree = true;
        await this.delay(700);
        this.drawRoom();
        await this.delay(400);
        break;
      }
      case 'sombra_rises': {
        this.cameras.main.shake(700, 0.008);
        audio.sfx('crow');
        const sp = this.npcs.find((n) => n.texture.key === 'sombra');
        if (sp) this.tweens.add({ targets: sp, scale: sp.scale * 1.25, duration: 900, yoyo: true });
        else {
          // la Sombra está pintada en la lámina: se oscurece y se hincha detrás del reloj
          const d = this.add.image(1300, 330, 'glow').setBlendMode(Phaser.BlendModes.MULTIPLY).setTint(0x2a2622).setDepth(9160).setScale(1.2).setAlpha(0);
          this.temp.push(d);
          this.tweens.add({ targets: d, alpha: 0.9, scale: 2.6, duration: 900, yoyo: true });
        }
        await this.delay(900);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ menú, inicio, finales
  async toTitle(): Promise<void> {
    this.titleMode = true;
    this.ui.hud(false);
    this.ui.select(null);
    this.s = newState();
    this.s.era = '1920';
    this.cameras.main.stopFollow();
    await this.loadRoom('jardin', [720, 680], false);
    this.cameras.main.setScroll(320, 0);
    this.tweens.add({ targets: this.cameras.main, scrollX: 420, duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.cameras.main.fadeIn(1200);
    const choice = await this.ui.title(!!Save.latest());
    audio.init();
    audio.startMusic('calm');
    if (choice === 'new') return this.startGame(newState());
    if (choice === 'continue') return this.startGame(Save.latest() ?? newState());
    if (choice === 'options') await this.ui.options(this.opts, (o) => this.setOptions(o));
    if (choice === 'howto') await this.ui.howto();
    if (choice === 'credits') await this.ui.credits();
    this.tweens.killTweensOf(this.cameras.main);
    return this.toTitle();
  }

  async startGame(s: GameState): Promise<void> {
    this.tweens.killTweensOf(this.cameras.main);
    this.s = s;
    this.titleMode = false;
    await this.fadeOut(600);
    this.ui.hud(true);
    this.ui.renderInventory(this.s);
    await this.loadRoom(this.s.room, this.s.pos, false);
    await this.fadeIn(900);
    const enter = this.room.onEnter?.(this.s) ?? [];
    if (enter.length) await this.chain(enter);
    else Save.save(this.s, 'auto');
  }

  private async pauseMenu(): Promise<void> {
    if (this.running || this.titleMode) return;
    this.running = true; this.ui.busy = true;
    this.s.pos = [this.player.x, this.player.y];
    const c = await this.ui.pause();
    if (c === 'save') { Save.save(this.s, 'manual'); this.ui.toast(L('Partida guardada', 'Game saved')); }
    if (c === 'options') await this.ui.options(this.opts, (o) => this.setOptions(o));
    if (c === 'howto') await this.ui.howto();
    this.running = false; this.ui.busy = false;
    if (c === 'title') { Save.save(this.s, 'auto'); this.toTitle(); }
  }

  setOptions(o: Save.Options): void { this.opts = o; Save.saveOptions(o); this.applyOptions(); }
  private applyOptions(): void {
    audio.setVolumes({ master: this.opts.master, music: this.opts.music, amb: this.opts.amb, sfx: this.opts.sfx });
    document.body.classList.toggle('big', this.opts.subtitlesBig);
  }

  private async showEnding(id: string): Promise<void> {
    const E = ENDINGS[id];
    if (!E) return;
    Save.save(this.s, 'auto');
    this.ui.hud(false);
    await this.fadeOut(1500);
    this.cameras.main.stopFollow();
    this.s.era = E.era;
    this.room = ROOMS[E.room];
    // la lámina pintada de la sala del final (si no se había cargado todavía)
    await this.ensurePlates(E.room);
    this.drawRoom();
    this.player.setVisible(false);
    this.cameras.main.setBounds(0, 0, this.room.width, 720);
    this.cameras.main.setScroll(Math.min(E.scroll, Math.max(0, this.room.width - 1280)), 0);
    audio.ambience(this.room.ambience);
    audio.startMusic(E.mood);
    await this.fadeIn(2000);
    await this.ui.ending(E.title, E.text);
    this.s.ending = undefined;
    Save.clearAll();
    this.toTitle();
  }
}

// ------------------------------------------------------------------ geometría
function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function clampToPoly(poly: Pt[], p: Pt): Pt {
  if (inPoly(p, poly)) return p;
  let best: Pt = poly[0], bd = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const q: Pt = [a[0] + dx * t, a[1] + dy * t];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < bd) { bd = d; best = q; }
  }
  // un poco hacia adentro
  const cx = poly.reduce((a, q) => a + q[0], 0) / poly.length, cy = poly.reduce((a, q) => a + q[1], 0) / poly.length;
  return [best[0] + Math.sign(cx - best[0]) * 2, best[1] + Math.sign(cy - best[1]) * 2];
}
