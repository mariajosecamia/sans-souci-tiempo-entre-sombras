// Movimiento de elementos pintados: viento en la vegetación, cortinas, calor de las llamas.
import Phaser from 'phaser';

const make = (body: string) => `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  float t = uTime;
  ${body}
  gl_FragColor = texture2D(uMainSampler, uv);
}`;

const WIND = make(`
  float gust = 0.6 + 0.4 * sin(t * 0.35);
  float w = sin(t * 1.15 + uv.y * 42.0 + uv.x * 9.0) * 0.6 + sin(t * 2.1 + uv.x * 23.0 + uv.y * 7.0) * 0.4;
  uv.x += w * 0.0013 * gust;
  uv.y += cos(t * 1.6 + uv.x * 31.0) * 0.0005 * gust;`);

const CURTAIN = make(`
  float w = sin(t * 0.8 + uv.y * 7.0) * 0.7 + sin(t * 1.7 + uv.y * 15.0) * 0.3;
  uv.x += w * 0.0016 * (0.5 + 0.5 * sin(t * 0.25));`);

const HEAT = make(`
  uv.x += sin(t * 7.0 + uv.y * 90.0) * 0.0011 + sin(t * 11.0 + uv.y * 140.0) * 0.0006;
  uv.y += sin(t * 5.0 + uv.x * 60.0) * 0.0007;`);

class Base extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  onPreRender(): void { this.set1f('uTime', this.game.loop.time / 1000); }
}
export class SwayPipeline extends Base { constructor(game: Phaser.Game) { super({ game, name: 'Sway', fragShader: WIND }); } }
export class CurtainPipeline extends Base { constructor(game: Phaser.Game) { super({ game, name: 'Curtain', fragShader: CURTAIN }); } }
export class HeatPipeline extends Base { constructor(game: Phaser.Game) { super({ game, name: 'Heat', fragShader: HEAT }); } }
