import { useEffect, useRef } from 'react';

export type Device = 'desktop' | 'tablet' | 'phone';
const WIDTH: Record<Device, string> = { desktop: '100%', tablet: '820px', phone: '390px' };

interface Props {
  html: string;
  device: Device;
  selected: number | null;
  onSelect(i: number): void;
  onNavigate(href: string): void;
}

/** Live page preview in an iframe; keeps scroll position across re-renders. */
export function Preview({ html, device, selected, onSelect, onNavigate }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const scroll = useRef(0);
  const lastHtml = useRef('');
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const d = e.data || {};
      if (d.pp === 'select') onSelect(d.index);
      if (d.pp === 'navigate') onNavigate(d.href);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSelect, onNavigate]);

  useEffect(() => {
    const f = ref.current;
    if (!f || html === lastHtml.current) return;
    const samePage = lastHtml.current.split('<title>')[1]?.split('</title>')[0] === html.split('<title>')[1]?.split('</title>')[0];
    try {
      scroll.current = samePage ? f.contentWindow?.scrollY ?? 0 : 0;
    } catch {
      scroll.current = 0;
    }
    lastHtml.current = html;
    f.srcdoc = html;
  }, [html]);

  const onLoad = () => {
    const w = ref.current?.contentWindow;
    if (!w) return;
    try {
      w.scrollTo(0, scroll.current);
    } catch {
      /* ignore */
    }
    if (selectedRef.current != null) w.postMessage({ pp: 'highlight', index: selectedRef.current, scroll: false }, '*');
  };

  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ pp: 'highlight', index: selected, scroll: true }, '*');
  }, [selected]);

  return (
    <div className="frame-wrap">
      <iframe ref={ref} className="frame" title="Page preview" style={{ maxWidth: WIDTH[device] }} onLoad={onLoad} />
    </div>
  );
}
