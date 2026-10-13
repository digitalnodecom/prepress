/**
 * Image placeholders. The AI can't produce photos, so every image slot gets a
 * labelled, on-palette SVG. Exported sites keep them as data URIs; swapping in
 * real media (upload / stock / generation → media library) is a roadmap item.
 */
import type { Design } from '../types';

function esc(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function placeholderImage(label: string, design: Design, w = 1200, h = 800): string {
  const p = design.palette;
  const variant = hash(label) % 3;
  const [c1, c2] = variant === 0 ? [p.primary, p.accent] : variant === 1 ? [p.secondary, p.primary] : [p.muted, p.accent];
  const shapes =
    variant === 0
      ? `<circle cx="${w * 0.78}" cy="${h * 0.28}" r="${h * 0.22}" fill="${p.base}" opacity=".18"/><circle cx="${w * 0.2}" cy="${h * 0.85}" r="${h * 0.35}" fill="${p.contrast}" opacity=".12"/>`
      : variant === 1
        ? `<rect x="${w * 0.55}" y="${h * 0.1}" width="${w * 0.35}" height="${h * 0.6}" rx="${h * 0.04}" fill="${p.base}" opacity=".22"/><rect x="${w * 0.1}" y="${h * 0.45}" width="${w * 0.4}" height="${h * 0.42}" rx="${h * 0.04}" fill="${p.contrast}" opacity=".1"/>`
        : `<path d="M0 ${h * 0.75} Q ${w * 0.3} ${h * 0.45} ${w * 0.55} ${h * 0.7} T ${w} ${h * 0.55} V ${h} H 0 Z" fill="${p.primary}" opacity=".25"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${h * 0.12}" fill="${p.accent}" opacity=".55"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${shapes}<text x="${w / 2}" y="${h - 36}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="${p.base}" opacity=".85">${esc(label.slice(0, 60))}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function isPlaceholder(url: unknown) {
  return typeof url === 'string' && url.startsWith('data:image/svg+xml');
}
