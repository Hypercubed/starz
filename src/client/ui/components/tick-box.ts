import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tick-box')
export class TickBoxElement extends LitElement {
  @property({ type: Number })
  private tick: number = 0;

  createRenderRoot() {
    return this;
  }

  render() {
    const d = ~~(this.tick / 2);
    const p = this.tick % 2 === 1 ? '.' : '';
    return html`${d}${p}`;
  }
}
