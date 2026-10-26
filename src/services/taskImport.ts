import { collection, doc, writeBatch } from 'firebase/firestore';
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
export function parseImportInput(source: string, format: 'json'|'csv'): Record<string, unknown>[] {
  if(source.length>200_000)throw Error('Arquivo muito grande. Utilize no máximo 100 demandas por importação.');
  if(format==='csv')return parseCSV(source);
  const payload: unknown=JSON.parse(source.replace(/^\uFEFF/,''));
  const items=Array.isArray(payload) ? payload : payload && typeof payload==='object' && 'tarefas' in payload ? (payload as {tarefas:unknown}).tarefas : null;
  if(!Array.isArray(items))throw Error('O JSON deve ser um array ou um objeto com o campo "tarefas".');
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
  const seen=new Set(existing.map((task)=>`${task.projectId}| ${normalize(task.title)}`));
  for(const [index,raw] of payload.slice(0,100).entries()){
    const number=index+1;
    const data=Object.fromEntries((Object.keys(aliases) as (keyof ImportRow)[]).map((k)=>[k,pick(raw,k)])) as unknown as ImportRow;
    const projectOptions=projects.filter((p)=>p.id===data.project || normalize(p.name)===normalize(data.project));
    const project=projectOptions.length===1?projectOptions[0]:undefined;
    if(!data.title || data.title.length>200){errors.push(`Linha ${number}: título obrigatório (máximo 200 caracteres).`);continue;}
    if(!project){errors.push(`Linha ${number}: projeto "${data.project}" não localizado ou ambíguo.`);continue;}
    if(project.isArchived){errors.push(`Linha ${number}: projeto arquivado não aceita demandas.`);continue;}
    const matchingUser=data.assignee ? users.filter((u)=>u.uid===data.assignee || u.email.toLowerCase()===data.assignee.toLowerCase() || normalize(u.name)===normalize(data.assignee)) : [];
    if(data.assignee && matchingUser.length!==1){errors.push(`Linha ${number}: responsável "${data.assignee}" não localizado ou ambíguo.`);continue;}
    const user=matchingUser[0];if(user && user.status!=='active'){errors.push(`Linha ${number}: responsável inativo.`);continue;}
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
    const key=`${project.id}| ${normalize(data.title)}`;
    if(seen.has(key)){errors.push(`Linha ${number}: demanda duplicada no projeto "${project.name}".`);continue;}
    seen.add(key);
    const now=new Date().toISOString();
    ready.push({id:doc(collection(db,'tasks')).id,projectId:project.id,projectName:project.name,title:data.title,
      description:data.description.slice(0,2000),expectedResult:data.expectedResult.slice(0,2000),
      acceptanceCriteria:data.acceptanceCriteria.slice(0,2000),assigneeId:user?.uid || '',assigneeName:user?.name || '',
      priority:priority as PriorityLevel,status,deadline,createdById:actorUid,createdAt:now,updatedAt:now,
      checklist:[],links:[],images:[],activity:[]});
  }
  return {rows:ready,errors};
}
export async function importTasksBatch(rows:Task[],actor:UserProfile):Promise<void> {
  if(!rows.length || rows.length>100)throw Error('Lote inválido: informe de 1 a 100 demandas.');
  if(actor.status!=='active' || actor.role!=='admin' && !actor.isSuperAdmin)
    throw Error('Somente gestores autorizados podem importar demandas.');
  const batch=writeBatch(db);
  for(const row of rows)batch.set(doc(db,'tasks',row.id),row);
  const auditRef=doc(collection(db,'audit_logs'));
  batch.set(auditRef,{id:auditRef.id,action:'Importação em massa de demandas',
    actorId:actor.uid,actorName:actor.name,actorEmail:actor.email,taskId:'',projectId:'',
    details:`Importou ${rows.length} demandas em lote com prévia validada`,timestamp:new Date().toISOString()});
  await batch.commit();
}
