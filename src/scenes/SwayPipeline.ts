// Viento: desplaza levemente los píxeles de la capa de vegetación (hojas, hiedra, pasto, flores).
import Phaser from 'phaser';

const frag = `
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
varying vec2 outTexCoord;
void main() {
  vec2 uv = outTexCoord;
  float gust = 0.6 + 0.4 * sin(uTime * 0.35);
  float w = sin(uTime * 1.15 + uv.y * 42.0 + uv.x * 9.0) * 0.6 + sin(uTime * 2.1 + uv.x * 23.0 + uv.y * 7.0) * 0.4;
  uv.x += w * 0.0013 * gust;
  uv.y += cos(uTime * 1.6 + uv.x * 31.0) * 0.0005 * gust;
  gl_FragColor = texture2D(uMainSampler, uv);
}`;

export class SwayPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: 'Sway', fragShader: frag });
  }
  onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
  }
}
