import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskTextPreview, type TaskTextSection } from './TaskTextDetails';

test('every shortened demand text exposes a visible Ver mais button', () => {
  for (const section of ['description', 'expectedResult', 'acceptanceCriteria'] as TaskTextSection[]) {
    const html = renderToStaticMarkup(createElement(TaskTextPreview, {
      section,
      value: 'Uma primeira linha importante.\n'.repeat(15),
      onExpand: () => {},
    }));
    assert.match(html, / Ver mais<\/button>/);
    assert.match(html, /aria-label="Ver texto completo:/);
    assert.match(html, /line-clamp-/);
    assert.match(html, /Uma primeira linha importante/);
  }
});

test('long acceptance criteria are not dropped from preview data', () => {
  const text = Array.from({length: 30}, (_, i) => `Critério de aceite ${i + 1}`).join('\n');
  const html = renderToStaticMarkup(createElement(TaskTextPreview, {
    section: 'acceptanceCriteria',
    value: text,
    onExpand: () => {},
  }));
  assert.match(html, /Critério de aceite 30/);
  assert.match(html, /Ver mais/);
});
