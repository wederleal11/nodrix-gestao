import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import type { UserProfile, UserRole, UserStatus } from '../../types';
import { formatProjectWriteError, upsertUserProfile } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { maskPhone, maskCpfCnpj } from '../../utils/masks';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMember?: UserProfile | null;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  initialMember,
}) => {
  const { profile, isAdmin } = useAuth();
  const [name, setName] = useState(initialMember?.name || '');
  const [phone, setPhone] = useState(initialMember?.phone || '');
  const [email, setEmail] = useState(initialMember?.email || '');
  const [document, setDocument] = useState(initialMember?.document || '');
  const [role, setRole] = useState<UserRole>(initialMember?.role || 'collaborator');
  const [title, setTitle] = useState(initialMember?.title || 'Desenvolvedor');
  const [availability, setAvailability] = useState(initialMember?.availability || '40h semanais');
  const [status, setStatus] = useState<UserStatus>(initialMember?.status || 'active');
  const [notes, setNotes] = useState(initialMember?.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialMember?.name || '');
    setPhone(initialMember?.phone || '');
    setEmail(initialMember?.email || '');
    setDocument(initialMember?.document || '');
    setRole(initialMember?.role || 'collaborator');
    setTitle(initialMember?.title || 'Desenvolvedor');
    setAvailability(initialMember?.availability || '40h semanais');
    setStatus(initialMember?.status || 'active');
    setNotes(initialMember?.notes || '');
    setShowNotes(false);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, initialMember]);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhone(e.target.value));
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocument(maskCpfCnpj(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('O nome do colaborador é obrigatório.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('O e-mail é obrigatório.');
      return;
    }

    if (!isAdmin || !profile) {
      setErrorMessage('Somente gestores autorizados podem cadastrar e editar usuários.');
      return;
    }
    const memberId = initialMember?.uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const memberData: UserProfile = {
      ...(initialMember || {}),
      uid: memberId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      title: title.trim(),
      availability: availability.trim(),
      phone: phone.trim(),
      document: document.trim(),
      notes: notes.trim(),
      status,
      createdAt: initialMember?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await upsertUserProfile(memberData);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatProjectWriteError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              {initialMember ? 'Editar colaborador' : 'Novo colaborador'}
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Cadastro de equipe e governança de acessos. Campos com <span className="text-red-400">*</span> são obrigatórios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium text-xs">
              {errorMessage}
            </div>
          )}

          {/* Row 1: Nome, Telefone, E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Nome de exibição <span className="text-red-500 font-semibold">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bruno Santos"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                E-mail <span className="text-red-500 font-semibold">*</span>
              </label>
              <input
                type="email"
                value={email}
                disabled={Boolean(initialMember)}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@nodrix.com.br"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                required
              />
            </div>
          </div>

          {/* Row 2: CPF/CNPJ & Função */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                value={document}
                onChange={handleDocumentChange}
                placeholder="000.000.000-00"
                maxLength={18}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Função / Cargo
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Desenvolvedor Fullstack"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          {/* Row 3: Nível de acesso & Disponibilidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Perfil de acesso <span className="text-red-500 font-semibold">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer font-medium"
              >
                <option value="collaborator">Colaborador Full (Acesso Geral — Sem Feedbacks)</option>
                <option value="admin">Administrador / Gestor (Acesso Total Irrestrito)</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Disponibilidade acordada
              </label>
              <input
                type="text"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="Ex: 40h semanais"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          {/* Collapsible: Observações internas (Print 2 style) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1.5 text-xs text-slate-600 font-medium hover:text-slate-900 cursor-pointer transition-colors"
            >
              {showNotes ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span>Observações internas</span>
            </button>

            {showNotes && (
              <div className="mt-3 space-y-3 pt-1 animate-in fade-in duration-100">
                <div>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações administrativas, regime de contratação ou acordos internos..."
                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                  />
                </div>
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Status do cadastro
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg text-slate-800 text-xs bg-white focus:outline-none focus:border-[#004e9a]"
                  >
                    <option value="active">Ativo (Acesso Liberado)</option>
                    <option value="pending">Pendente de Autorização</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* RELACIONA MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Salvando...' : initialMember ? 'Atualizar colaborador' : 'Cadastrar colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
