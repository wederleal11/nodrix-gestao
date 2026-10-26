import React, { useState } from 'react';
import { CheckCircle2, ClipboardCopy, Download, FileJson, FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import type { Project, Task, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { detectTaskImportFormat, importTasksBatch, parseImportInput, previewTaskImport, type ImportPreview } from '../../services/taskImport';

const example = JSON.stringify([
  {titulo:'Conferir integração API',projeto:'Nolasco',responsavel:'bruno@nodrix.com.br',prioridade:'P1',
    status:'backlog',prazo:'2026-11-06',descricao:'Verificar os eventos com divergência',
    resultado_esperado:'Relatório com os casos conciliados',criterios_aceite:'Evidências aprovadas'},
  {titulo:'Testar relatório final',projeto:'Nolasco',responsavel:'',prioridade:'P2',status:'planned',prazo:'2026-11-09'}
],null,2);
const csvExample='titulo;projeto;responsavel;prioridade;status;prazo;descricao;resultado_esperado;criterios_aceite\n'+
  '"Conferir integração API";"Nolasco";"bruno@nodrix.com.br";"P1";"backlog";"2026-11-06";"Verificar os eventos";"Relatório";"Evidências aprovadas"';
function downloadCsv(){
  const objectUrl=URL.createObjectURL(new Blob(['\uFEFF'+csvExample],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=objectUrl;a.download='modelo-importacao-demandas.csv';a.click();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
}
export const TaskBulkImportModal: React.FC<{
  projects:Project[];users:UserProfile[];tasks:Task[];onClose:()=>void;
}> = ({projects,users,tasks,onClose}) => {
  const {profile,isAdmin}=useAuth();
  const [format,setFormat]=useState<'csv'|'json'>('csv');
  const [source,setSource]=useState('');
  const [preview,setPreview]=useState<ImportPreview|null>(null);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [completed,setCompleted]=useState<number|null>(null);
  const setInput = (value: string, fallback?: 'json'|'csv') => {
    setSource(value);
    setFormat(value.trim() ? detectTaskImportFormat(value) : fallback || 'csv');
    setPreview(null);
    setError('');
    setCompleted(null);
  };
  const load = async (file:File) => {
    setError('');setPreview(null);
    if(file.size>200_000){setError('Arquivo acima de 200 KB. Divida em lotes de até 100 tarefas.');return;}
    try{const value=await file.text();setInput(value,file.name.toLowerCase().endsWith('.json')?'json':'csv');}
    catch{setError('Não foi possível ler o arquivo.');}
  };
  const check=()=>{
    if(!profile||!isAdmin){setError('Somente administradores podem importar.');return;}
    setError('');setPreview(null);setCompleted(null);
    try{
      const parsed=parseImportInput(source,detectTaskImportFormat(source));
      setFormat(detectTaskImportFormat(source));
      setPreview(previewTaskImport(parsed,projects,users,tasks,profile.uid));
    }catch(e){setError(e instanceof Error ? e.message:'Dados inválidos.');}
  };
  const confirm=async()=>{
    if(!preview||preview.errors.length||!preview.rows.length||!profile||!isAdmin||saving)return;
    setSaving(true);setError('');
    try{
      await importTasksBatch(preview.rows,profile);
      setCompleted(preview.rows.length);setPreview(null);
    }catch(e){
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar a importação. Confira a conexão e valide novamente.');
      setPreview(null);
    }finally{setSaving(false);}
  };
  return <div role="dialog" aria-modal="true" aria-label="Importar demandas em massa"
    className="fixed inset-0 z-[80] bg-black/65 flex items-center justify-center p-3">
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[96dvh] flex flex-col overflow-hidden">
      <header className="bg-[#0e213e] text-white px-5 py-4 flex items-center justify-between">
        <div><h2 className="font-bold text-base">Importar demandas em massa</h2>
          <p className="text-[11px] text-slate-300 mt-1">Prévia obrigatória • Até 100 demandas • Gravação atômica no Firestore</p></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar importação"><X className="w-5 h-5" /></button>
      </header>
      <div className="p-5 space-y-3 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={()=>{if(!source.trim())setFormat('csv');else setFormat(detectTaskImportFormat(source));}}
              className={`px-3 py-2 rounded-md font-bold flex items-center gap-1.5 ${format==='csv'?'bg-blue-700 text-white':'bg-slate-100 text-slate-600'}`}>
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            <button onClick={()=>{if(!source.trim())setFormat('json');else setFormat(detectTaskImportFormat(source));}}
              className={`px-3 py-2 rounded-md font-bold flex items-center gap-1.5 ${format==='json'?'bg-blue-700 text-white':'bg-slate-100 text-slate-600'}`}>
              <FileJson className="w-4 h-4" /> JSON
            </button>
          </div>
          <div className="flex items-center gap-2">
            {format==='csv' ? <button type="button" onClick={downloadCsv} className="text-blue-700 font-bold flex items-center gap-1">
              <Download className="w-4 h-4" /> Baixar modelo CSV</button> :
              <button type="button" onClick={()=>{void navigator.clipboard.writeText(example).catch(()=>setInput(example,'json'));}}
                className="text-blue-700 font-bold flex items-center gap-1"><ClipboardCopy className="w-4 h-4" /> Copiar exemplo JSON</button>}
          </div>
        </div>
        <label className="flex items-center justify-center gap-2 border border-dashed border-blue-300 rounded-lg p-3 bg-blue-50 text-blue-800 font-bold cursor-pointer">
          <UploadCloud className="w-4 h-4" /> Escolher arquivo .csv ou .json
          <input className="sr-only" type="file" accept=".csv,.json,text/csv,application/json"
            onChange={(e)=>{const f=e.currentTarget.files?.[0];if(f)void load(f);e.currentTarget.value='';}} />
        </label>
        <label htmlFor="task-import-source" className="font-semibold text-slate-700 block">Ou cole o conteúdo {format.toUpperCase()}:</label>
        <textarea id="task-import-source" rows={6} spellCheck={false} value={source}
          onChange={(e)=>setInput(e.target.value,format)}
          placeholder={format==='json'?example:csvExample}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 font-mono text-[11px] text-slate-900 focus:outline-none focus:border-blue-500" />
        {source.trim() && <div role="status" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800">
          Formato detectado automaticamente: {format.toUpperCase()}. O importador identifica JSON mesmo quando CSV está selecionado.
        </div>}
        {error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-700 font-medium">{error}</p>}
        {completed!==null && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> {completed} demandas importadas com sucesso. O Kanban será atualizado automaticamente.</p>}
        {preview && <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <strong className="block text-slate-800">Prévia: {preview.rows.length} válidas · {preview.errors.length} erros</strong>
          {preview.errors.length > 0 && <div className="max-h-40 overflow-y-auto rounded-md bg-rose-50 p-2 space-y-1" role="alert">
            {preview.errors.map((e,i)=><p key={i} className="text-rose-700">• {e}</p>)}
          </div>
          {preview.errors.length===0 && preview.rows.slice(0,4).map((row)=>(
            <p key={row.id} className="flex gap-2 justify-between border-b border-slate-100 pb-1 text-slate-700">
              <span className="truncate font-semibold">{row.title}</span><span className="shrink-0 text-slate-500">{row.projectName} • {row.priority}</span>
            </p>))}
          {preview.errors.length===0 && preview.rows.length>4 && <p className="text-slate-500">E mais {preview.rows.length-4} demandas validadas.</p>}
        </div>}
        {format==='json' && !source && <div className="text-[11px] text-slate-600">Campos do exemplo: titulo, projeto, responsavel (e-mail ou nome), prioridade, status, prazo, descricao, resultado_esperado e criterios_aceite. Campos opcionais podem ficar vazios.</div>}
      </div>
      <footer className="border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-md border border-slate-300 px-4 py-2 text-xs text-slate-700">Fechar</button>
        <button type="button" onClick={check} disabled={!source.trim()||saving} className="rounded-md border border-blue-300 text-blue-700 px-4 py-2 text-xs font-bold disabled:opacity-40">Validar prévia</button>
        <button type="button" onClick={()=>void confirm()} disabled={!preview||!!preview.errors.length||!preview.rows.length||saving}
          className="rounded-md bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
          {saving?'Importando...':`Importar ${preview?.rows.length||0} demandas`}</button>
      </footer>
    </div>
  </div>;
};
