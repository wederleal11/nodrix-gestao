import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveTaskLinks, initialProjectMainLink, normalizeProjectLinkUrl } from './projectLinks';
import type { Project, Task } from '../types';

const project = { id: 'nolasco', name: 'Nolasco Jurídico' } as Project;
const task = { id: 't1', projectId: 'nolasco', links: [
  { title: 'Painel Nolasco', url: 'https://nolasco.nodrix.com.br' },
  { title: 'Evidência da tarefa', url: 'https://exemplo.com/relatorio' },
] } as Task;
test('existing project panel can be promoted without modifying task documents', () => {
  assert.deepEqual(initialProjectMainLink(project, [task]), {
    link: { title: 'Painel Nolasco', url: 'https://nolasco.nodrix.com.br' },
    legacyTitle: 'Painel Nolasco',
  });
  assert.equal(initialProjectMainLink(project, [{ ...task, projectId: 'other' }]).link, null);
});
test('project update overrides old panel link while preserving task-specific references', () => {
  const updated = { ...project, primaryLink: { title: 'Acesso Nolasco', url: 'https://novo.nolasco.com.br' }, primaryLinkLegacyTitle: 'Painel Nolasco' };
  assert.deepEqual(effectiveTaskLinks(task, updated), [
    { title: 'Acesso Nolasco', url: 'https://novo.nolasco.com.br' },
    { title: 'Evidência da tarefa', url: 'https://exemplo.com/relatorio' },
  ]);
  assert.equal(task.links?.[0].url, 'https://nolasco.nodrix.com.br');
});
test('without project link, task references remain unchanged', () => {
  assert.deepEqual(effectiveTaskLinks(task, project), task.links);
});
test('ambiguous legacy panel links are not silently promoted', () => {
  const different = { ...task, id: 't2', links: [{ title: 'Painel Novo', url: 'https://outro.com' }] };
  assert.equal(initialProjectMainLink(project, [task, different]).link, null);
});
test('project URLs normalize safe domains and reject unsupported schemes', () => {
  assert.equal(normalizeProjectLinkUrl(' nolasco.nodrix.com.br '), 'https://nolasco.nodrix.com.br/');
  assert.equal(normalizeProjectLinkUrl('https://nolasco.nodrix.com.br/a'), 'https://nolasco.nodrix.com.br/a');
  assert.throws(() => normalizeProjectLinkUrl('javascript:alert(1)'), /URL válida/);
  assert.throws(() => normalizeProjectLinkUrl('ftp://example.com'), /URL válida/);
});
