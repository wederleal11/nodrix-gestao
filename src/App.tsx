import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LoginView } from './components/views/LoginView';
import { DashboardView } from './components/views/DashboardView';
import { ProjectsView } from './components/views/ProjectsView';
import { TasksView } from './components/views/TasksView';
import { WeeklyPlannerView } from './components/views/WeeklyPlannerView';
import { TeamView } from './components/views/TeamView';
import { FeedbacksView } from './components/views/FeedbacksView';
import { ReportsView } from './components/views/ReportsView';
import { AuditView } from './components/views/AuditView';
import { UsersManagementView } from './components/views/UsersManagementView';
import { SettingsView } from './components/views/SettingsView';
import { Lock } from 'lucide-react';

import { TaskModal } from './components/modals/TaskModal';
import { TaskDetailModal } from './components/modals/TaskDetailModal';
import { ProjectModal } from './components/modals/ProjectModal';
import { ProjectDetailModal } from './components/modals/ProjectDetailModal';
import { DailyCheckinModal } from './components/modals/DailyCheckinModal';
import { FeedbackModal } from './components/modals/FeedbackModal';
import { EventModal } from './components/modals/EventModal';
import { MemberModal } from './components/modals/MemberModal';

import {
  subscribeProjects,
  subscribeTasks,
  subscribeWeeklyEvents,
  subscribePriorityRequests,
} from './services/db';
import type {
  Project,
  Task,
  WeeklyEvent,
  PriorityRequest,
  Feedback,
  UserProfile,
  DailyCheckin,
} from './types';

const MainApp: React.FC = () => {
  const { firebaseUser, profile, activeProfile, loading, authError, signOut, allUsers, isAdmin } = useAuth();

  // Navigation view
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedTeamUserId, setSelectedTeamUserId] = useState<string>('');

  // Firestore live state
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<WeeklyEvent[]>([]);
  const [priorityRequests, setPriorityRequests] = useState<PriorityRequest[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultTaskProjectId, setDefaultTaskProjectId] = useState<string>('');

  const [inspectingTask, setInspectingTask] = useState<Task | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [inspectingProject, setInspectingProject] = useState<Project | null>(null);

  const [isDailyCheckinOpen, setIsDailyCheckinOpen] = useState(false);
  const [existingDailyCheckin, setExistingDailyCheckin] = useState<DailyCheckin | null>(null);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalDate, setEventModalDate] = useState<string>('');

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  // Never start protected Firestore listeners until the profile has been validated.
  useEffect(() => {
    if (!firebaseUser || !profile || profile.status !== 'active') {
      setDataError(null);
      return;
    }

    setDataError(null);
    const onSubscriptionError = (error: { code?: string; message: string }) => {
      setDataError(`Falha ao sincronizar informações do Firestore (${error.code || 'erro desconhecido'}). Confira as permissões do banco e tente novamente.`);
    };

    const unsubProjects = subscribeProjects((data) => {
      setProjects(data);
      // Keep the open detail modal in sync after status and other project changes.
      setInspectingProject((prev) => (prev ? data.find((p) => p.id === prev.id) || null : null));
    }, onSubscriptionError);
    const unsubTasks = subscribeTasks((data) => {
      setTasks(data);
      setInspectingTask((prev) => (prev ? data.find((t) => t.id === prev.id) || null : null));
    }, onSubscriptionError);
    const unsubEvents = subscribeWeeklyEvents((data) => setEvents(data), onSubscriptionError);
    const unsubRequests = subscribePriorityRequests((data) => setPriorityRequests(data), onSubscriptionError);

    return () => {
      unsubProjects();
      unsubTasks();
      unsubEvents();
      unsubRequests();
    };
  }, [firebaseUser, profile?.uid, profile?.status]);

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1b33] flex flex-col items-center justify-center space-y-3 text-white">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
          Carregando Nodrix Gestão...
        </span>
      </div>
    );
  }

  // Not logged in -> Show corporate login view
  if (!firebaseUser) {
    return <LoginView />;
  }

  // An authenticated Firebase session is not enough: require a loaded Firestore profile.
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-amber-800/70 bg-slate-900 p-6 space-y-4 text-center">
          <h2 className="text-lg font-bold text-white">Não foi possível concluir o acesso</h2>
          <p className="text-sm text-slate-300">
            {authError || 'Seu login Google foi confirmado, mas seu cadastro ainda não está disponível.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Tentar novamente
            </button>
            <button type="button" onClick={() => void signOut()} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800">
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pending and inactive profiles cannot access operational screens.
  if (profile.status !== 'active') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-white">{profile.status === 'inactive' ? 'Acesso desativado' : 'Aguardando autorização'}</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {profile.status === 'inactive'
              ? <>O acesso da conta <strong>{profile.email}</strong> está desativado. Solicite reativação ao gestor.</>
              : <>O cadastro <strong>{profile.email}</strong> está aguardando aprovação pelo gestor do Nodrix Gestão.</>}
          </p>
        </div>
      </div>
    );
  }

  // Modal Handlers
  const handleOpenAddTask = (projectId?: string) => {
    setEditingTask(null);
    setDefaultTaskProjectId(projectId || '');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenAddProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project) => {
    setEditingProject(proj);
    setIsProjectModalOpen(true);
  };

  const handleNavigateToUser = (userId: string) => {
    setSelectedTeamUserId(userId);
    setCurrentView('team');
  };

  const handleOpenEventModal = (dateStr?: string) => {
    setEventModalDate(dateStr || '');
    setIsEventModalOpen(true);
  };

  const handleOpenAddFeedback = () => {
    setEditingFeedback(null);
    setIsFeedbackModalOpen(true);
  };

  const handleOpenEditFeedback = (fb: Feedback) => {
    setEditingFeedback(fb);
    setIsFeedbackModalOpen(true);
  };

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: UserProfile) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      {/* Nodrix Top Bar Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        users={allUsers}
      />

      {/* Main Content Area */}
      <main className="max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-7 flex-1">
        {(authError || dataError) && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <span>{dataError || authError}</span>
            <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-amber-400 px-3 py-1.5 font-semibold hover:bg-amber-100">Tentar novamente</button>
          </div>
        )}
        {currentView === 'dashboard' && (
          <DashboardView
            projects={projects}
            tasks={tasks}
            users={allUsers}
            priorityRequests={priorityRequests}
            onOpenTask={(t) => setInspectingTask(t)}
            onOpenProject={(p) => setInspectingProject(p)}
            onNavigateToUser={handleNavigateToUser}
            onNavigateToView={(v) => setCurrentView(v)}
            onAddTask={() => handleOpenAddTask()}
          />
        )}

        {currentView === 'projects' && (
          <ProjectsView
            projects={projects}
            tasks={tasks}
            users={allUsers}
            onOpenProject={(p) => setInspectingProject(p)}
            onAddProject={handleOpenAddProject}
            onAddTask={(projId) => handleOpenAddTask(projId)}
          />
        )}

        {currentView === 'tasks' && (
          <TasksView
            tasks={tasks}
            projects={projects}
            users={allUsers}
            onOpenTask={(t) => setInspectingTask(t)}
            onAddTask={() => handleOpenAddTask()}
          />
        )}

        {currentView === 'planner' && (
          <WeeklyPlannerView
            tasks={tasks}
            events={events}
            projects={projects}
            users={allUsers}
            onOpenTask={(t) => setInspectingTask(t)}
            onAddTask={() => handleOpenAddTask()}
            onAddEvent={handleOpenEventModal}
          />
        )}

        {currentView === 'team' && (
          <TeamView
            users={allUsers}
            tasks={tasks}
            selectedUserId={selectedTeamUserId}
            onOpenTask={(t) => setInspectingTask(t)}
            onOpenDailyCheckin={(checkin) => {
              setExistingDailyCheckin(checkin || null);
              setIsDailyCheckinOpen(true);
            }}
            onAddMember={handleOpenAddMember}
            onEditMember={handleOpenEditMember}
          />
        )}
 
        {currentView === 'settings' && (
          <SettingsView
            users={allUsers}
            projects={projects}
            onAddUser={handleOpenAddMember}
            onEditUser={handleOpenEditMember}
            onAddProject={handleOpenAddProject}
            onEditProject={handleOpenEditProject}
          />
        )}

        {currentView === 'users' && (
          <SettingsView
            users={allUsers}
            projects={projects}
            onAddUser={handleOpenAddMember}
            onEditUser={handleOpenEditMember}
            onAddProject={handleOpenAddProject}
            onEditProject={handleOpenEditProject}
          />
        )}

        {currentView === 'feedbacks' && (
          isAdmin ? (
            <FeedbacksView
              users={allUsers}
              onAddFeedback={handleOpenAddFeedback}
              onEditFeedback={handleOpenEditFeedback}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12 space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Acesso Restrito ao Módulo de Feedbacks</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                De acordo com a política de governança do perfil <strong>Colaborador Full</strong>, o módulo de feedbacks enviados e respondidos é estritamente confidencial e de acesso exclusivo da gestão.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
              >
                Voltar para Visão Geral
              </button>
            </div>
          )
        )}

        {currentView === 'reports' && (
          <ReportsView
            tasks={tasks}
            projects={projects}
            users={allUsers}
          />
        )}

        {currentView === 'audit' && (
          <SettingsView
            users={allUsers}
            projects={projects}
            onAddUser={handleOpenAddMember}
            onEditUser={handleOpenEditMember}
            onAddProject={handleOpenAddProject}
            onEditProject={handleOpenEditProject}
          />
        )}
      </main>

      {/* MODALS */}
      {isTaskModalOpen && (
        <TaskModal
          key={editingTask?.id || `new-task-${defaultTaskProjectId}`}
          isOpen
          onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
          projects={projects}
          users={allUsers}
          initialTask={editingTask}
          defaultProjectId={defaultTaskProjectId}
        />
      )}

      <TaskDetailModal
        task={inspectingTask}
        onClose={() => setInspectingTask(null)}
        onEdit={(t) => {
          setInspectingTask(null);
          handleOpenEditTask(t);
        }}
        projects={projects}
        users={allUsers}
      />

      {isProjectModalOpen && (
        <ProjectModal
          key={editingProject?.id || 'new-project'}
          isOpen
          onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }}
          users={allUsers}
          initialProject={editingProject}
        />
      )}

      <ProjectDetailModal
        project={inspectingProject}
        tasks={tasks}
        users={allUsers}
        onClose={() => setInspectingProject(null)}
        onEdit={(p) => {
          setInspectingProject(null);
          handleOpenEditProject(p);
        }}
        onOpenTask={(t) => {
          setInspectingProject(null);
          setInspectingTask(t);
        }}
        onAddTask={(projId) => {
          setInspectingProject(null);
          handleOpenAddTask(projId);
        }}
      />

      <DailyCheckinModal
        isOpen={isDailyCheckinOpen}
        onClose={() => setIsDailyCheckinOpen(false)}
        userTasks={tasks.filter((t) => t.assigneeId === profile?.uid)}
        existingCheckin={existingDailyCheckin}
      />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        users={allUsers}
        initialFeedback={editingFeedback}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        projects={projects}
        users={allUsers}
        initialDate={eventModalDate}
      />

      {isMemberModalOpen && (
        <MemberModal
          key={editingMember?.uid || 'new-user'}
          isOpen
          onClose={() => { setIsMemberModalOpen(false); setEditingMember(null); }}
          initialMember={editingMember}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
