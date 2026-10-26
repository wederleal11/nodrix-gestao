import type { Project, Task, TaskLink } from '../types';

/** The project's main link belongs to the project, not to individual tasks. */
export function normalizeProjectLinkUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  const candidate = /^(https?:\/\/)/i.test(value) ? value : /^([a-z][a-z\d+.-]*:)/i.test(value)
    ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || /\s/.test(candidate)) {
      throw new Error('invalid');
    }
    return parsed.href;
  } catch {
    throw new Error('Informe uma URL válida do link do projeto, como https://painel.exemplo.com.br.');
  }
}

export function isSafeWebLink(link: TaskLink): boolean {
  try {
    const url = new URL(link.url);
    return Boolean(link.title.trim() && url.hostname && ['http:', 'https:'].includes(url.protocol));
  } catch {
    return false;
  }
}

/** A legacy reference labelled 'Painel ...' may be promoted when it is unambiguous. */
export function initialProjectMainLink(project: Project | null | undefined, tasks: Task[]): {
  link: TaskLink | null;
  legacyTitle: string;
} {
  if (!project) return { link: null, legacyTitle: '' };
  if (project.primaryLink) return {
    link: project.primaryLink,
    legacyTitle: project.primaryLinkLegacyTitle || '',
  };
  const candidates = tasks
    .filter((task) => task.projectId === project.id)
    .flatMap((task) => task.links || [])
    .filter((link) => /^painel\b/i.test(link.title.trim()) && isSafeWebLink(link));
  const distinct = candidates.filter((link, index) => candidates.findIndex((other) =>
    other.title.trim().toLowerCase() === link.title.trim().toLowerCase() &&
    other.url.trim() === link.url.trim()) === index);
  return distinct.length === 1
    ? { link: distinct[0], legacyTitle: distinct[0].title }
    : { link: null, legacyTitle: '' };
}

/** Resolution occurs at render time, so editing the project updates all open task views. */
export function effectiveTaskLinks(task: Task, project?: Project): TaskLink[] {
  const primary = project?.primaryLink;
  const legacyTitle = (project?.primaryLinkLegacyTitle || '').trim().toLowerCase();
  const taskLinks = (task.links || []).filter((link) => {
    if (!isSafeWebLink(link)) return false;
    if (!primary || !isSafeWebLink(primary)) return true;
    if (legacyTitle && link.title.trim().toLowerCase() === legacyTitle) return false;
    return !(
      link.title.trim().toLowerCase() === primary.title.trim().toLowerCase() ||
      link.url.trim() === primary.url.trim()
    );
  });
  return primary && isSafeWebLink(primary) ? [primary, ...taskLinks] : taskLinks;
}
