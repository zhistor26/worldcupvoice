/**
 * LazyCat Drive path helpers for netdisk MP4 import (second-dev phase).
 * @see docs/lazycat-second-dev/ARCHITECTURE.md §4.2
 */

const LAZYCAT_HOME_PREFIX = '/_lzc/files/home';

export function normalizeLazyCatPath(path: string): string {
  let normalized = String(path ?? '').trim().replace(/\.$/, '');
  normalized = normalized.replace(/^\/_lzc\/files\/home(?=\/|$)/, '');
  if (normalized && !normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.replace(/\/+$/, '');
  }
  return normalized;
}

export function buildLazyCatFileUrl(path: string): string {
  const normalized = normalizeLazyCatPath(path);
  if (!normalized || normalized === '/') {
    throw new Error('Invalid LazyCat file path');
  }
  return `${LAZYCAT_HOME_PREFIX}${normalized}`;
}

export function isVideoPath(path: string): boolean {
  const lower = normalizeLazyCatPath(path).toLowerCase();
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
}

export function requiresAccessPassword(): boolean {
  if (process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED === 'true') {
    return false;
  }
  const flag = process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD;
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return true;
}
