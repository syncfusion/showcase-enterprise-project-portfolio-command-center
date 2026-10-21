// Resolves the router basename: the publish prefix when the page is served under it, else '/'
// (factory/standards/publishing-base-path.md).
export const PUBLIC_BASE_PATH = '/enterprise-project-portfolio-command-center/react';

export function resolveBasename(pathname: string = window.location.pathname): string {
  return pathname === PUBLIC_BASE_PATH || pathname.startsWith(`${PUBLIC_BASE_PATH}/`) ? PUBLIC_BASE_PATH : '/';
}

/** URL of a file under public/, so it loads both behind the prefix and from the host's own root. */
export function assetUrl(path: string): string {
  const base = resolveBasename();
  return `${base === '/' ? '' : base}/${path.replace(/^\//, '')}`;
}