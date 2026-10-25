import React, { useState } from 'react';
import { Shield, ArrowRight, CheckCircle2, Lock, Users, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FirebaseError } from 'firebase/app';

// Avoid exposing raw SDK errors to users while keeping the specific recovery action.
function describeGoogleSignInError(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : (
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  );

  switch (code) {
    case 'auth/unauthorized-domain':
      return `Este domínio (${window.location.hostname}) não está autorizado no Firebase. O administrador deve adicioná-lo em Authentication > Settings > Authorized domains, no projeto Firebase usado pelo Nodrix Gestão.`;
    case 'auth/operation-not-allowed':
      return 'O login com Google está desabilitado neste projeto Firebase. O administrador precisa habilitar o provedor Google em Authentication > Sign-in method.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login do Google. Permita pop-ups para este site e tente novamente.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'A autenticação do Google não foi concluída. Clique em Entrar com Conta Google para tentar novamente.';
    case 'auth/network-request-failed':
      return 'Não foi possível contatar o Firebase. Confira sua conexão e tente novamente.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized':
      return 'A configuração do Firebase para este aplicativo não foi aceita. Entre em contato com o administrador.';
    default:
      return code
        ? `Falha ao entrar com Google (${code}). Entre em contato com o administrador se o erro persistir.`
        : 'Não foi possível concluir o login com Google. Tente novamente ou contate o administrador.';
  }
}

export const LoginView: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setErrorMsg(describeGoogleSignInError(err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12">
      {/* Top branding */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-md">
            N
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-wider text-white">NODRIX</span>
            <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-blue-900/60 text-blue-400 border border-blue-700/50 rounded">
              GESTÃO
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Fuso Horário Oficial: <strong className="text-slate-200">America/Sao_Paulo</strong>
        </div>
      </div>

      {/* Hero / Login card */}
      <div className="max-w-md w-full mx-auto my-12 bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Central de Execução & Entregas
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plataforma interna de gestão de projetos, prioridades reais e acompanhamento técnico da equipe.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded">
            {errorMsg}
          </div>
        )}

        {/* Google Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-3 shadow-md disabled:opacity-50 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          {loading ? 'Conectando...' : 'Entrar com Conta Google'}
        </button>

        {/* 5 Principles of Nodrix Gestão */}
        <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
          <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Diretrizes Nodrix de Execução:
          </p>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span>Prioridade definida deve ser estritamente respeitada.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span>Toda demanda tem um único responsável principal.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span>Atividade executada não significa entrega validada.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span>Impedimentos exigem motivo, dependência e próxima ação.</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 text-center">
          Administrador inicial: <strong>wederleal11@gmail.com</strong>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-slate-500">
        Nodrix Gestão &copy; {new Date().getFullYear()} — Cultura de prioridades respeitadas, autonomia e resultados.
      </div>
    </div>
  );
};
