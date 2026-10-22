/**
 * intent0's mark: a zero drawn as a tangerine speech bubble, on a pine rounded square. Say what you need;
 * the zero is the page you didn't have to click through. `invert` is for dark backgrounds.
 */
export function Mark({ size = 28, invert = false }: { size?: number; invert?: boolean }) {
  const [tile, ink] = invert ? ["#ffffff", "#173f35"] : ["#173f35", "#f7941d"];
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="9" fill={tile} />
      <circle cx="16.5" cy="15" r="7" fill="none" stroke={ink} strokeWidth="3.2" />
      <path d="M10.6 18.6 L8.4 24.6 L14.4 21.6 Z" fill={ink} />
    </svg>
  );
}

export function Logo({ size = 28, invert = false }: { size?: number; invert?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-extrabold tracking-[-0.04em]" style={{ fontSize: size * 0.76 }}>
      <Mark size={size} invert={invert} />
      intent0
    </span>
  );
}

/** GitHub's mark, for links to the repository. */
export function GithubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
