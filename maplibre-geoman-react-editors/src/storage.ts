import type { Project } from './core/types';

/** Each vertical persists its whole project (layers + features) under its own
 *  namespaced key. This is the entire "backend". */
const key = (verticalId: string) => `geoman-verticals:${verticalId}`;

export function loadProject(verticalId: string): Project | null {
  try {
    const raw = localStorage.getItem(key(verticalId));
    return raw ? (JSON.parse(raw) as Project) : null;
  } catch {
    return null;
  }
}

export function saveProject(verticalId: string, project: Project): void {
  try {
    localStorage.setItem(key(verticalId), JSON.stringify(project));
  } catch {
    /* quota / private mode — ignore for a demo */
  }
}

export function clearProject(verticalId: string): void {
  try {
    localStorage.removeItem(key(verticalId));
  } catch {
    /* ignore */
  }
}
