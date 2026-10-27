import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { MAX_TASK_IMAGE_BYTES, validateTaskImage } from './taskImages';

function fakeFile(name: string, type: string, size = 100): File {
  return { name, type, size } as File;
}

test('PDF, Word e Excel são permitidos com tipo e extensão coerentes', () => {
  for (const [name, type] of [
    ['proposta.pdf', 'application/pdf'],
    ['contrato.doc', 'application/msword'],
    ['contrato.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['planilha.xls', 'application/vnd.ms-excel'],
    ['planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['captura.png', 'image/png'],
    ['foto.jpeg', 'image/jpeg'],
  ]) {
    assert.equal(validateTaskImage(fakeFile(name, type)), null, name);
  }
});

test('rejeita arquivos disfarçados e tipos não permitidos', () => {
  assert.match(validateTaskImage(fakeFile('script.exe', 'application/pdf')) || '', /Formato não permitido/);
  assert.match(validateTaskImage(fakeFile('relatorio.pdf', 'application/x-msdownload')) || '', /Formato não permitido/);
  assert.match(validateTaskImage(fakeFile('arquivo.pdf', '')) || '', /Formato não permitido/);
});

test('limites de tamanho se aplicam a todos os anexos', () => {
  assert.match(validateTaskImage(fakeFile('vazio.pdf', 'application/pdf', 0)) || '', /vazio/);
  assert.equal(validateTaskImage(fakeFile('ok.pdf', 'application/pdf', MAX_TASK_IMAGE_BYTES)), null);
  assert.match(validateTaskImage(fakeFile('grande.pdf', 'application/pdf', MAX_TASK_IMAGE_BYTES + 1)) || '', /6 MB/);
});
