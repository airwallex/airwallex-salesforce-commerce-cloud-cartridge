/**
 * Cross-bundle priority registry for express checkout surfaces.
 *
 * Because main.js and productDetail.js are separate webpack bundles, module-
 * level state is not shared between them. The registry is stored on `window`
 * so every bundle sees the same list of active surfaces.
 */

export interface ActiveEntry {
  priority: number;
  destroy: () => void;
}

export function getActiveSurfaces(): ActiveEntry[] {
  if (!window.__awxActiveSurfaces) {
    window.__awxActiveSurfaces = [];
  }
  return window.__awxActiveSurfaces;
}

export function hasHigherPriority(priority: number): boolean {
  return getActiveSurfaces().some(entry => entry.priority > priority);
}

export function evictLowerPriority(priority: number): void {
  const surfaces = getActiveSurfaces();
  const toEvict = surfaces.filter(entry => entry.priority < priority);
  toEvict.forEach(entry => entry.destroy());
}
