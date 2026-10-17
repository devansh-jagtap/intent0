/**
 * The layer's own CSS, injected once. Prefixed with i0- so it can't clash with the
 * site's styles, and it doesn't depend on the site using Tailwind.
 * Sites can recolour it by setting --i0-accent.
 */
export const INTENT0_CSS = `
.i0-layer{--i0-accent:#1e3a8a;--i0-border:#cbd5e1;--i0-muted:#64748b;font:inherit;color:#0f172a;background:#fffbeb;border-bottom:2px solid #f59e0b;text-align:left}
.i0-layer *{box-sizing:border-box}
.i0-wrap{max-width:72rem;margin:0 auto;padding:12px 16px;display:grid;gap:8px}
.i0-row{display:flex;gap:8px}
.i0-intent{flex:1;min-width:0;height:40px;border:1px solid var(--i0-border);border-radius:8px;padding:0 12px;font:inherit;font-size:14px;background:#fff;color:inherit}
.i0-chips{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px}
.i0-chip{border:1px solid var(--i0-border);background:#fff;border-radius:999px;padding:4px 12px;cursor:pointer;font:inherit;color:inherit}
.i0-chip:hover{background:#f1f5f9}
.i0-muted{color:var(--i0-muted)}
.i0-badge{margin-left:auto;color:#94a3b8}
.i0-panelwrap{max-width:48rem;margin:0 auto;padding:0 16px 24px}
.i0-panel{background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:20px;display:grid;gap:16px}
.i0-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.i0-eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--i0-muted);margin:0}
.i0-link{background:none;border:0;padding:0;font:inherit;font-size:12px;color:var(--i0-muted);cursor:pointer;text-decoration:underline;justify-self:start}
.i0-alert{font-size:14px;border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;border-radius:6px;padding:8px 12px;margin:0}
.i0-confirm{display:flex;gap:8px;align-items:center;font-size:14px;border:1px solid #fcd34d;background:#fffbeb;border-radius:6px;padding:8px 12px}
.i0-thinking{font-size:14px;color:var(--i0-muted);margin:0;animation:i0-pulse 1.2s ease-in-out infinite}
@keyframes i0-pulse{50%{opacity:.5}}
.i0-form,.i0-page,.i0-group{display:grid;gap:16px}
.i0-group{border:0;padding:0;margin:0}
.i0-legend{font-size:14px;font-weight:600;margin-bottom:8px}
.i0-field{display:grid;gap:4px}
.i0-label{font-size:14px;font-weight:500}
.i0-req{color:#dc2626}
.i0-help{font-size:12px;color:var(--i0-muted);margin:0}
.i0-error{font-size:12px;color:#b91c1c;margin:0}
.i0-input,.i0-select{width:100%;min-height:36px;border:1px solid var(--i0-border);border-radius:8px;padding:6px 10px;font:inherit;font-size:14px;background:#fff;color:inherit}
.i0-button{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 16px;border:0;border-radius:8px;background:var(--i0-accent);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.i0-button:disabled{opacity:.6;cursor:default}
.i0-h2{font-size:18px;font-weight:600;margin:0}
.i0-h3{font-size:16px;font-weight:600;margin:0}
.i0-text{font-size:14px;margin:0;color:#334155}
.i0-notice{font-size:14px;margin:0;border:1px solid #fcd34d;background:#fffbeb;border-radius:6px;padding:8px 12px}
.i0-steps{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0;font-size:12px}
.i0-step{border-radius:999px;padding:4px 10px;background:#f1f5f9;color:var(--i0-muted)}
.i0-step[data-state=current]{background:var(--i0-accent);color:#fff}
.i0-step[data-state=done]{background:#dcfce7;color:#166534}
.i0-done{display:grid;gap:12px;font-size:14px}
.i0-ok{font-weight:600;color:#166534;margin:0}
.i0-mono{font-family:ui-monospace,Menlo,Consolas,monospace}
.i0-also{border-left:4px solid #f59e0b;background:#fffbeb;padding:8px 12px;margin:0}
.i0-check{display:flex;gap:8px;align-items:center;font-size:14px}
`;
