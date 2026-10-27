import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectTaskImportFormat,parseImportInput,parseCSV,previewTaskImport} from './taskImport';
import type {Project,UserProfile,Task} from '../types';
const project={id:'nolasco-juridico',name:'Nolasco Jurídico',isArchived:false} as Project;
const users=[
 {uid:'bruno',name:'Bruno',email:'bruno@nodrix.com.br',status:'active'},
 {uid:'jefferson',name:'Jefferson',email:'jefferson@nodrix.com.br',status:'active'}
] as UserProfile[];
const rows=Array.from({length:16},(_,i)=>({titulo:'Demanda de teste '+i,projeto:'Nolasco',responsavel:i%2?'bruno@nodrix.com.br':'jefferson@nodrix.com.br',prioridade:'P0',status:'backlog',prazo:'2026-10-30',descricao:'Teste de importação',resultado_esperado:'Validar',criterios_aceite:'Evidência'}));
test('detect pasted JSON despite CSV selection',()=>{
 const input='  '+JSON.stringify(rows);
 assert.equal(detectTaskImportFormat(input),'json');
 assert.equal(parseImportInput(input,'csv').length,16);
});
test('all records resolve Nolasco Jurídico uniquely with preserved fields',()=>{
 const result=previewTaskImport(rows,[project],users,[],'owner');
 assert.equal(result.errors.length,0,result.errors.join(';'));
 assert.equal(result.rows.length,16);
 assert.equal(result.rows[1].assigneeId,'bruno');
 assert.equal(result.rows[1].description,'Teste de importação');
});
test('ambiguous project alias blocked',()=>{
 const second={...project,id:'nolasco-2',name:'Nolasco Comercial'};
 const result=previewTaskImport([rows[0]],[project,second],users,[],'owner');
 assert.equal(result.rows.length,0);assert.match(result.errors.join(';'),/ambíguo/);
});
test('CSV quoted cell and date preserved',()=>{
 const csv='titulo;projeto;responsavel;prazo;descricao\n"Conferir atos";Nolasco;bruno@nodrix.com.br;28/10/2026;"um; dois"';
 const result=previewTaskImport(parseCSV(csv),[project],users,[],'owner');
 assert.equal(result.errors.length,0,result.errors.join(';'));
 assert.equal(result.rows[0].deadline,'2026-10-28');
 assert.equal(result.rows[0].description,'um; dois');
});
test('task imports require an active assignee',()=>{
 const noAssignee=previewTaskImport([{...rows[0],responsavel:''}],[project],users,[],'owner');
 assert.equal(noAssignee.rows.length,0);
 assert.match(noAssignee.errors.join(';'),/responsável ativo/);
 const inactive=previewTaskImport([rows[0]],[project],[{...users[0],status:'inactive'},users[1]],[],'owner');
 assert.equal(inactive.rows.length,0);
 assert.match(inactive.errors.join(';'),/inativo/);
});
test('duplicate titles and long text are errors',()=>{
 const existing=[{projectId:project.id,title:rows[0].titulo} as Task];
 const result=previewTaskImport([rows[0],{...rows[1],descricao:'X'.repeat(2001)}],[project],users,existing,'owner');
 assert.equal(result.rows.length,0);assert.equal(result.errors.length,2);
});
