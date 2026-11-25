// Escena principal: dibuja la sala en capas, mueve a Elena, resuelve interacciones y ejecuta efectos.
import Phaser from 'phaser';
import { ROOMS } from '../data/rooms';
import { ITEMS } from '../data/items';
import type { Effect, GameState, Hotspot, RoomDef, Pt, Verb } from '../systems/types';
import { applyEffect, newState } from '../systems/state';
import { PAINTED, plateKey, OVERLAY_PROPS, type Plate } from '../data/painted';
import { interact, combine, inspectItem, visibleHotspots, hotspotName, verbsFor, eraOf, settleEra, eraToggleAvailable } from '../systems/logic';
import { renderRoom, RenderedRoom } from '../art/render';
import { buildSheet, buildSombra, buildCrow, ANIMS, FRAME_W, FRAME_H, FOOT_Y, Sheet } from '../art/sprites';
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
  clouds: { spr: Phaser.GameObjects.TileSprite; speed: number }[] = [];
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

  create(): void {
    this.res = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)) * (Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.7 : 1);
    this.ui = new UI();
    (window as any).__game = this;
    this.buildTextures();
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
      if (this.ui.selected) { const item = this.ui.selected; this.ui.select(null); await this.approach(h); this.chain(interact(h, 'use', this.s, item)); return; }
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
    if (verb === 'look' && !h.exit) { this.face(h.rect[0] + h.rect[2] / 2); return; }
    const [x, y] = h.walk ?? [h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3]];
    await this.walkTo(x, y);
    if (h.face) this.facing = h.face === 'left' ? -1 : 1;
    else this.face(h.rect[0] + h.rect[2] / 2);
    this.player.setFlipX(this.facing < 0);
  }

  private face(x: number): void {
    if (Math.abs(x - this.player.x) > 8) this.facing = x < this.player.x ? -1 : 1;
    this.player.setFlipX(this.facing < 0);
  }

  // ------------------------------------------------------------------ movimiento
  walkTo(x: number, y: number): Promise<void> {
    const [tx, ty] = clampToPoly(this.room.floor, [x, y]);
    this.moving?.resolve();
    return new Promise((resolve) => {
      if (Math.hypot(tx - this.player.x, ty - this.player.y) < 4) { resolve(); return; }
      this.moving = { tx, ty, resolve };
      this.facing = tx < this.player.x ? -1 : 1;
      this.player.setFlipX(this.facing < 0);
      this.player.play('elena-walk', true);
    });
  }

  update(_t: number, dt: number): void {
    for (const c of this.clouds) c.spr.tilePositionX += (c.speed * dt) / 1000;
    if (!this.player || this.titleMode) return;
    if (this.moving) {
      const { tx, ty } = this.moving;
      const dx = tx - this.player.x, dy = ty - this.player.y;
      const d = Math.hypot(dx, dy);
      const step = (SPEED * this.roomScale() * dt) / 1000;
      if (d <= step) {
        this.player.setPosition(tx, ty);
        const r = this.moving.resolve;
        this.moving = undefined;
        this.player.play('elena-idle', true);
        r();
      } else {
        // en diagonal hacia el fondo se camina un poco más lento: la animación se ajusta para no patinar
        this.player.x += (dx / d) * step;
        this.player.y += (dy / d) * step;
        this.player.anims.timeScale = Math.max(0.6, Math.abs(dx / d)) * 1 + Math.abs(dy / d) * 0.6;
        const f = Number(this.player.frame.name);
        if ((f === 0 || f === 5) && f !== this.lastStep) { audio.step(this.surface()); this.lastStep = f; }
        if (f !== 0 && f !== 5) this.lastStep = -1;
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
      this.player.setPosition(px, py).setDepth(py).setVisible(true);
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

  private clearRoom(): void {
    for (const o of [...this.layerObjs, ...this.npcs, ...this.props, ...this.glows, ...this.particles]) o.destroy();
    this.clouds = [];
    this.layerObjs = []; this.npcs = []; this.props = []; this.glows = []; this.particles = [];
    for (const k of this.texKeys) this.textures.remove(k);
    this.texKeys = [];
  }

  /** Carga (una sola vez) las ilustraciones pintadas de una sala. */
  private ensurePlates(id: string): Promise<void> {
    const plates = PAINTED[id];
    if (!plates) return Promise.resolve();
    const missing = (Object.entries(plates) as [Era, { src: string }][]).filter(([era]) => !this.textures.exists(plateKey(id, era)));
    if (!missing.length) return Promise.resolve();
    return new Promise((res) => {
      for (const [era, pl] of missing as [Era, Plate][]) {
        this.load.image(plateKey(id, era), pl.src);
        const base = pl.src.replace(/\.webp$/, '');
        if (pl.sky) { this.load.image(plateKey(id, era) + '-fg', base + '-fg.webp'); this.load.image(plateKey(id, era) + '-clouds', base + '-clouds.webp'); }
        if (pl.veg) this.load.image(plateKey(id, era) + '-veg', base + '-veg.webp');
      }
      this.load.once('complete', () => res());
      this.load.once('loaderror', () => res());
      this.load.start();
    });
  }

  /** Escala del personaje en esta sala (las salas pintadas tienen su propia escala). */
  private roomScale(): number { return (this.room?.scale?.[1] ?? 0.86) / 0.86; }

  drawRoom(): void {
    this.clearRoom();
    const era = eraOf(this.room, this.s);
    const plate = PAINTED[this.room.id]?.[era];
    if (plate && this.textures.exists(plateKey(this.room.id, era))) {
      // ilustración pintada: cubre la sala; encima van sólo los efectos que unifican (aire, polvo, papel)
      const img = this.add.image(plate.dx ?? 0, plate.dy ?? 0, plateKey(this.room.id, era)).setOrigin(0).setDepth(-20);
      const src = img.texture.getSourceImage() as HTMLImageElement;
      const sc = Math.max(this.room.width / src.width, 720 / src.height);
      img.setScale(sc);
      const pk = plateKey(this.room.id, era);
      if (plate.sky && this.textures.exists(pk + '-clouds') && this.textures.exists(pk + '-fg')) {
        // nubes que pasan detrás de la casa y los árboles
        const ch = (this.textures.get(pk + '-clouds').getSourceImage() as HTMLImageElement).height;
        for (const [speed, alpha, dy, flip] of [[6, 0.55, 0, false], [11, 0.35, 18, true]] as [number, number, number, boolean][]) {
          const clouds = this.add.tileSprite(0, dy, this.room.width, ch, pk + '-clouds').setOrigin(0).setDepth(-19.5).setAlpha(alpha).setFlipX(flip);
          if (!this.opts.reduceMotion) this.clouds.push({ spr: clouds, speed });
          this.layerObjs.push(clouds);
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
      if (h.prop && (!painted || OVERLAY_PROPS.has(h.prop))) {
        const [x, y, w, hh] = h.rect;
        const cv = drawProp(h.prop, era, w, hh, this.res);
        if (cv) {
          const k = `prop-${h.id}-${Date.now()}`;
          this.textures.addCanvas(k, cv); this.texKeys.push(k);
          const img = this.add.image(x, y, k).setOrigin(0).setScale(1 / this.res).setDepth(h.depth ?? (y + hh) - 400);
          if (h.prop === 'fragmento' && !this.opts.reduceMotion) this.tweens.add({ targets: img, alpha: { from: 0.55, to: 1 }, y: y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.props.push(img);
        }
      }
      if (h.npc) {
        const [x, y, w, hh] = h.rect;
        const key = h.npc === 'rosa_ink' ? 'rosa' : h.npc;
        if (key === 'sombra') {
          const sp = this.add.sprite(x + w / 2, y + hh, 'sombra', 0).setOrigin(0.5, 1).setScale(0.9 / this.sheets.sombra.res).setDepth(y + hh - 300).setAlpha(0.92);
          sp.play('sombra-idle');
          this.npcs.push(sp);
          continue;
        }
        const anim = key === 'mercedes' ? 'sit' : 'idle';
        const sh = this.sheets[key];
        const sp = this.add.sprite(x + w / 2, y + hh, key, 0).setOrigin(0.45, FOOT_Y / FRAME_H).setScale(this.roomScale() / sh.res).setDepth(y + hh);
        sp.play(`${key}-${anim}`);
        sp.setFlipX(h.face === 'left' ? false : h.face === 'right');
        if (h.face === 'left') sp.setFlipX(false);
        if (h.npc === 'anselmo' || h.npc === 'rosa' || h.npc === 'mercedes') sp.setFlipX(h.face !== 'left' ? true : false);
        if (h.npc === 'rosa_ink') { sp.setTint(0x333333); this.tweens.add({ targets: sp, x: sp.x + 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
        if (h.npc === 'isabel') { sp.setAlpha(0.72); this.tweens.add({ targets: sp, alpha: 0.45, duration: 2000, yoyo: true, repeat: -1 }); }
        if (era === 'sombras' && h.npc !== 'isabel') sp.setTint(0x9a9690);
        this.npcs.push(sp);
      }
    }
    if (!this.player) {
      this.player = this.add.sprite(0, 0, 'elena', 0).setOrigin(0.45, FOOT_Y / FRAME_H).setScale(1 / this.sheets.elena.res);
      this.player.play('elena-idle');
    }
    this.player.setScale(this.roomScale() / this.sheets.elena.res);
    this.player.setVisible(!this.titleMode);
    this.player.clearTint();
    if (era === 'sombras') this.player.setTint(0xcfc8bc);
    // en las salas pintadas, los personajes toman la luz de la ilustración
    const plateTint = PAINTED[this.room.id]?.[era]?.tint;
    if (plateTint) { this.player.setTint(plateTint); for (const n of this.npcs) n.setTint(plateTint); }
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
      for (let i = 0; i < Math.ceil(W / 900) + 1; i++) {
        const hz = this.add.image(i * 900 - 100, 720, 'haze').setOrigin(0, 1).setScale(1.1, 1).setDepth(9150).setAlpha(this.room.outdoor ? 0.5 : 0.38)
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
      case 'say': await ui.say(e.who ?? 'elena', e.text, this.opts); break;
      case 'dialog': await this.runDialog(e.id); break;
      case 'give': applyEffect(this.s, e); ui.renderInventory(this.s); ui.toast(`Guardé en el estuche: ${ITEMS[e.item]?.name ?? e.item}`); break;
      case 'take': applyEffect(this.s, e); ui.renderInventory(this.s); break;
      case 'flag': applyEffect(this.s, e); break;
      case 'doc': applyEffect(this.s, e); await ui.showDoc(e.id); break;
      case 'note': { const had = this.s.notes.includes(e.id); applyEffect(this.s, e); if (!had) ui.toast('Diario actualizado'); break; }
      case 'fragment': applyEffect(this.s, e); ui.toast(`Recuerdo recuperado (${this.s.fragments.length} de 5)`); break;
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
      for (const [who, text] of node.lines) await this.ui.say(who, text, this.opts);
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
    const key = `elena-${a === 'examine' ? 'examine' : a}`;
    if (!this.anims.exists(key)) return Promise.resolve();
    return new Promise((r) => {
      this.player.play(key);
      if (a === 'read') { this.time.delayedCall(700, () => { this.player.play('elena-idle'); r(); }); return; }
      this.player.once('animationcomplete', () => { this.player.play('elena-idle'); r(); });
    });
  }

  delay(ms: number): Promise<void> { return new Promise((r) => this.time.delayedCall(ms, r)); }

  // ------------------------------------------------------------------ eventos guionados
  private async runEvent(id: string): Promise<void> {
    switch (id) {
      case 'anselmo_gate': {
        const sp = this.add.sprite(1050, 600, 'anselmo', 0).setOrigin(0.45, FOOT_Y / FRAME_H).setScale(1 / this.sheets.anselmo.res).setDepth(560).setAlpha(0).setFlipX(true);
        sp.play('anselmo-idle');
        this.temp.push(sp);
        const lamp = this.add.image(1020, 470, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9150).setScale(0.8).setAlpha(0);
        this.temp.push(lamp);
        this.tweens.add({ targets: [sp, lamp], alpha: 1, duration: 1200 });
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
        const sp = this.add.sprite(1150, 640, 'isabel', 0).setOrigin(0.45, FOOT_Y / FRAME_H).setScale(1 / this.sheets.isabel.res).setDepth(640).setAlpha(0).setFlipX(true);
        sp.play('isabel-idle');
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
        const g = this.add.image(355, 520, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(9150).setScale(0.3).setTint(0xd8f0c0);
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
    if (c === 'save') { Save.save(this.s, 'manual'); this.ui.toast('Partida guardada'); }
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
    this.drawRoom();
    this.player.setVisible(false);
    this.cameras.main.setScroll(E.scroll, 0);
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
