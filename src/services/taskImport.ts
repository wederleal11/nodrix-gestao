import { collection, doc, getDocsFromServer, getDocFromServer, query, runTransaction, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PriorityLevel, Project, Task, TaskStatus, UserProfile } from '../types';

export interface ImportRow { title: string; project: string; assignee: string; priority: string; status: string; deadline: string; description: string; expectedResult: string; acceptanceCriteria: string; }
export interface ImportPreview { rows: Task[]; errors: string[]; }

const aliases: Record<keyof ImportRow, string[]> = {
  title: ['titulo','title','demanda','tarefa'],
  project: ['projeto','project','projectid'],
  assignee: ['responsavel','assignee','email','colaborador'],
  priority: ['prioridade','priority'],
  status: ['status','situacao','etapa'],
  deadline: ['prazo','data','deadline','dataentrega'],
  description: ['descricao','description'],
  expectedResult: ['resultadoesperado','resultado','expectedresult','entrega'],
  acceptanceCriteria: ['criteriosdeaceite','criterios','acceptancecriteria'],
};
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'').trim();
const normalizeWords = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const duplicateKey = (projectId: string, title: string) => `${projectId}|${normalize(title)}`;

export function detectTaskImportFormat(source: string): 'json' | 'csv' {
  // BOM and whitespace are common in copied text / exported files.
  return /^[\s\uFEFF]*[\[{]/.test(source) ? 'json' : 'csv';
}

function resolveImportProject(value: string, projects: Project[]): { project?: Project; issue?: string } {
  const input = value.trim();
  if (!input) return { issue: 'informe o projeto.' };
  const exact = projects.filter((p) => p.id === input || normalize(p.name) === normalize(input));
  if (exact.length === 1) return { project: exact[0] };
  if (exact.length > 1) return { issue: `projeto "${value}" corresponde a múltiplos cadastros.` };
  // An official full project name such as "Nolasco Jurídico" can be uniquely
  // resolved from the short commercial name "Nolasco" without changing the file.
  const name = normalizeWords(input);
  const aliases = name.length >= 3 ? projects.filter((p) => normalizeWords(p.name).startsWith(name + ' ')) : [];
  if (aliases.length === 1) return { project: aliases[0] };
  if (aliases.length > 1) return {
    issue: `projeto "${value}" ambíguo (${aliases.slice(0,4).map((p) => p.name).join(', ')}). Utilize o nome completo ou o ID.`,
  };
  return { issue: `projeto "${value}" não encontrado. Confira o nome cadastrado em Projetos.` };
}

const readText = (v: unknown) => typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
function pick(obj: Record<string, unknown>, key: keyof ImportRow): string {
  for (const [name, val] of Object.entries(obj)) if (aliases[key].includes(normalize(name))) return readText(val);
  return '';
}

/** Standard CSV with escaped double quotes, CRLF, multiline cells, and comma/semicolon/tab delimiters. */
export function parseCSV(source: string): Record<string, string>[] {
  const input = source.replace(/^\uFEFF/,'');
  const header = input.split(/\r?\n/,1)[0] || '';
  const delims = [',',';','\t'];
  const counts = delims.map((c) => {
    let n=0,inQuote=false;
    for(const ch of header){ if(ch==='"')inQuote=!inQuote;else if(ch===c&&!inQuote)n++; }
    return n;
  });
  const separator = delims[counts.indexOf(Math.max(...counts))];
  const rows: string[][] = []; let row:string[] = [],field='', quoted=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"'){if(quoted && input[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(!quoted && ch===separator){row.push(field);field='';}
    else if(!quoted && (ch==='\n'||ch==='\r')){
      if(ch==='\r' && input[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.some((v)=>v.trim()))rows.push(row);
      row=[];
    }else field+=ch;
  }
  if(quoted)throw Error('CSV inválido: aspas abertas não foram fechadas.');
  row.push(field);if(row.some((v)=>v.trim()))rows.push(row);
  if(rows.length<2)throw Error('CSV sem linhas de dados. Inclua um cabeçalho e ao menos uma demanda.');
  const names=rows[0].map((n)=>n.trim().replace(/^\uFEFF/,''));
  if(!names.some((n)=>aliases.title.includes(normalize(n))))throw Error('Cabeçalho obrigatório ausente: titulo.');
  if(!names.some((n)=>aliases.project.includes(normalize(n))))throw Error('Cabeçalho obrigatório ausente: projeto.');
  return rows.slice(1).map((values)=>Object.fromEntries(names.map((name,i)=>[name,values[i] || ''])));
}
export function parseImportInput(source: string, _format?: 'json'|'csv'): Record<string, unknown>[] {
  if(source.length>200_000)throw Error('Arquivo muito grande. Utilize no máximo 100 demandas por importação.');
  // Always trust the actual pasted/file content over a stale CSV/JSON toggle.
  const format = detectTaskImportFormat(source);
  if(format==='csv')return parseCSV(source);
  let payload: unknown;
  try { payload = JSON.parse(source.replace(/^\uFEFF/,'')); }
  catch (error) {
    throw Error(`JSON inválido. Confira aspas, vírgulas e colchetes. ${error instanceof Error ? error.message : ''}`);
  }
  const items=Array.isArray(payload) ? payload : payload && typeof payload==='object' && 'tarefas' in payload ? (payload as {tarefas:unknown}).tarefas : null;
  if(!Array.isArray(items))throw Error('O JSON deve ser um array de tarefas ou um objeto com "tarefas": [...].');
  if(!items.every((item)=>item && typeof item==='object' && !Array.isArray(item)))throw Error('Cada tarefa precisa ser um objeto JSON.');
  return items as Record<string,unknown>[];
}

export function previewTaskImport(
  payload: Record<string, unknown>[], projects: Project[], users: UserProfile[],
  existing: Task[], actorUid: string,
): ImportPreview {
  const errors:string[]=[];const ready:Task[]=[];
  if(!payload.length)errors.push('Nenhuma tarefa encontrada.');
  if(payload.length>100)errors.push('Limite de 100 demandas por importação.');
  const seen=new Set(existing.map((task)=>duplicateKey(task.projectId,task.title)));
  for(const [index,raw] of payload.slice(0,100).entries()){
    const number=index+1;
    const data=Object.fromEntries((Object.keys(aliases) as (keyof ImportRow)[]).map((k)=>[k,pick(raw,k)])) as unknown as ImportRow;
    const resolved = resolveImportProject(data.project, projects);
    const project = resolved.project;
    if(!data.title || data.title.length>200){errors.push(`Linha ${number}: título obrigatório (máximo 200 caracteres).`);continue;}
    if(!project){errors.push(`Linha ${number}: ${resolved.issue}`);continue;}
    if(project.isArchived){errors.push(`Linha ${number}: projeto arquivado não aceita demandas.`);continue;}
    const matchingUser=data.assignee ? users.filter((u)=>u.uid===data.assignee || u.email.toLowerCase()===data.assignee.toLowerCase() || normalize(u.name)===normalize(data.assignee)) : [];
    const activeUsers=matchingUser.filter((u)=>u.status==='active');
    // Historical seeded IDs sometimes duplicate the same Google identity.
    // Resolve duplicates only if their e-mail is identical; keep exact UID when given.
    const exactId=activeUsers.find((u)=>u.uid===data.assignee);
    const sameEmail=activeUsers.length>0 && activeUsers.every((u)=>u.email.toLowerCase()===activeUsers[0].email.toLowerCase());
    const user=exactId || (activeUsers.length===1 || sameEmail ? activeUsers[0] : undefined);
    if(data.assignee && !user){
      errors.push(`Linha ${number}: responsável "${data.assignee}" ${matchingUser.length && !activeUsers.length ? 'está inativo' : activeUsers.length>1 ? 'é ambíguo' : 'não foi encontrado'}. Confira em Equipe.`);
      continue;
    }
    const priority=(data.priority || 'P2').toUpperCase();
    if(!['P0','P1','P2','P3'].includes(priority)){errors.push(`Linha ${number}: prioridade deve ser P0, P1, P2 ou P3.`);continue;}
    const statusMap:Record<string, TaskStatus>={backlog:'backlog',planejada:'planned',planejado:'planned',planned:'planned',emandamento:'in_progress',inprogress:'in_progress'};
    const status=statusMap[normalize(data.status || 'backlog')];
    if(!status){errors.push(`Linha ${number}: status permitido: backlog, planned ou in_progress.`);continue;}
    if(status==='in_progress' && (!user || !data.expectedResult)){errors.push(`Linha ${number}: "Em andamento" exige responsável e resultado esperado.`);continue;}
    let deadline='';
    if(data.deadline){
      if(/^\d{4}-\d{2}-\d{2}$/.test(data.deadline))deadline=data.deadline;
      else if(/^\d{2}\/\d{2}\/\d{4}$/.test(data.deadline)){
        const [day,month,year]=data.deadline.split('/');
        deadline=`${year}-${month}-${day}`;
      }else{errors.push(`Linha ${number}: prazo inválido (use AAAA-MM-DD ou DD/MM/AAAA).`);continue;}
      const date=new Date(deadline+'T12:00:00Z');
      if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==deadline){errors.push(`Linha ${number}: prazo não é uma data real.`);continue;}
    }
    for(const [field, val] of [['descricao',data.description],['resultado_esperado',data.expectedResult],['criterios_aceite',data.acceptanceCriteria]] as const){
      if(val.length>2000){errors.push(`Linha ${number}: ${field} excede 2.000 caracteres; o texto não será cortado.`);}
    }
    if([data.description,data.expectedResult,data.acceptanceCriteria].some((v)=>v.length>2000))continue;
    const key=duplicateKey(project.id,data.title);
    if(seen.has(key)){errors.push(`Linha ${number}: demanda duplicada no projeto "${project.name}".`);continue;}
    seen.add(key);
    const now=new Date().toISOString();
    ready.push({id:doc(collection(db,'tasks')).id,projectId:project.id,projectName:project.name,title:data.title,
      description:data.description,expectedResult:data.expectedResult,
      acceptanceCriteria:data.acceptanceCriteria,assigneeId:user?.uid || '',assigneeName:user?.name || '',
      priority:priority as PriorityLevel,status,deadline,createdById:actorUid,createdAt:now,updatedAt:now,
      checklist:[],links:[],images:[],activity:[]});
  }
  return {rows:ready,errors};
}
async function importTaskDocumentId(projectId: string, title: string): Promise<string> {
  const bytes = new TextEncoder().encode(duplicateKey(projectId, title));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return 'import_' + Array.from(new Uint8Array(digest)).map((n)=>n.toString(16).padStart(2,'0')).join('').slice(0,40);
}

export async function importTasksBatch(rows:Task[],actor:UserProfile):Promise<void> {
  if(!rows.length || rows.length>100)throw Error('Lote inválido: informe de 1 a 100 demandas.');
  if(actor.status!=='active' || actor.role!=='admin' && !actor.isSuperAdmin)
    throw Error('Somente gestores autorizados podem importar demandas.');

  // Re-read authoritative server data immediately before the write. This catches
  // tasks added while the preview was open, including legacy random document IDs.
  const projectIds = [...new Set(rows.map((row)=>row.projectId))];
  const [projectSnapshots, taskSnapshots] = await Promise.all([
    Promise.all(projectIds.map((projectId)=>getDocFromServer(doc(db,'projects',projectId)))),
    Promise.all(projectIds.map((projectId)=>getDocsFromServer(query(collection(db,'tasks'),where('projectId','==',projectId))))),
  ]);
  const liveProjects=new Set(projectSnapshots.filter((snap)=>snap.exists() && !snap.data()?.isArchived).map((snap)=>snap.id));
  for(const row of rows)if(!liveProjects.has(row.projectId))throw Error(`Projeto ${row.projectName} não está mais ativo. Atualize a prévia.`);
  const liveKeys=new Set(taskSnapshots.flatMap((snap)=>snap.docs).map((snap)=>duplicateKey(snap.data().projectId,snap.data().title)));
  const duplicates=rows.filter((row)=>liveKeys.has(duplicateKey(row.projectId,row.title)));
  if(duplicates.length)throw Error(`Importação cancelada: ${duplicates.length} demanda(s) já existem no banco. Primeira: "${duplicates[0].title}". Atualize a prévia, sem duplicar.`);

  // Stable document IDs + transactional existence checks protect retries and
  // concurrent imports from creating the same title twice.
  const prepared=await Promise.all(rows.map(async (row)=>({...row,id:await importTaskDocumentId(row.projectId,row.title)})));
  const keys=prepared.map((row)=>row.id);
  if(new Set(keys).size!==keys.length)throw Error('O lote contém demandas repetidas.');
  const auditRef=doc(collection(db,'audit_logs'));
  await runTransaction(db,async (tx)=>{
    const targets=prepared.map((row)=>doc(db,'tasks',row.id));
    const existing=await Promise.all(targets.map((ref)=>tx.get(ref)));
    const already=existing.findIndex((snap)=>snap.exists());
    if(already!==-1)throw Error(`Importação cancelada: "${prepared[already].title}" já foi importada. Nenhuma demanda foi recriada.`);
    prepared.forEach((row,index)=>tx.set(targets[index],row));
    tx.set(auditRef,{
      id:auditRef.id,action:'Importação em massa de demandas',
      actorId:actor.uid,actorName:actor.name,actorEmail:actor.email,taskId:'',projectId:'',
      details:`Importou ${rows.length} demandas em lote com prévia validada`,timestamp:new Date().toISOString(),
    });
  });
}
