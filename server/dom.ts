// WordPress packages expect a browser. Give the server a DOM before the engine loads.
// jsdom, not happy-dom: WordPress's attribute parser (hpq) relies on
// `hasOwnProperty(element.attributes, name)`, which happy-dom doesn't support.
import { JSDOM } from 'jsdom';

if (typeof (globalThis as any).document === 'undefined') {
  const { window } = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  const g = globalThis as any;
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in g) continue;
    try {
      g[key] = (window as any)[key];
    } catch {
      /* read-only */
    }
  }
  g.window = window;
  g.document = window.document;
  g.navigator ??= window.navigator;
}
