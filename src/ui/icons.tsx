export function Logo() {
  // Three stacked blocks, the middle one offset: a page being assembled.
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="2" y="2" width="18" height="5" rx="1.5" fill="var(--accent)" />
      <rect x="6" y="8.5" width="14" height="5" rx="1.5" fill="var(--fg)" opacity=".85" />
      <rect x="2" y="15" width="11" height="5" rx="1.5" fill="var(--fg)" opacity=".5" />
    </svg>
  );
}
