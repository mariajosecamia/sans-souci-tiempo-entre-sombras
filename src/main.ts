import Phaser from 'phaser';
import { WorldScene } from './scenes/WorldScene';
import { SwayPipeline, CurtainPipeline, HeatPipeline } from './scenes/SwayPipeline';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1920,
  height: 1080,
  backgroundColor: '#0e0c0a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 2 },
  scene: [WorldScene],
  pipeline: { Sway: SwayPipeline, Curtain: CurtainPipeline, Heat: HeatPipeline } as any,
});

(window as any).__phaser = game;
