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
  const { firebaseUser, profile, activeProfile, loading, allUsers, isAdmin } = useAuth();

  // Navigation view
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedTeamUserId, setSelectedTeamUserId] = useState<string>('');

  // Firestore live state
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<WeeklyEvent[]>([]);
  const [priorityRequests, setPriorityRequests] = useState<PriorityRequest[]>([]);

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

  // Live subscriptions when authenticated
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubProjects = subscribeProjects((data) => setProjects(data));
    const unsubTasks = subscribeTasks((data) => {
      setTasks(data);
      setInspectingTask((prev) => (prev ? data.find((t) => t.id === prev.id) || null : null));
    });
    const unsubEvents = subscribeWeeklyEvents((data) => setEvents(data));
    const unsubRequests = subscribePriorityRequests((data) => setPriorityRequests(data));

    return () => {
      unsubProjects();
      unsubTasks();
      unsubEvents();
      unsubRequests();
    };
  }, [firebaseUser]);

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

  // User pending approval
  if (profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-white">Aguardando Autorização</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seu cadastro com o e-mail <strong>{profile.email}</strong> foi registrado e está aguardando aprovação pelo gestor do Nodrix Gestão.
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
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        projects={projects}
        users={allUsers}
        initialTask={editingTask}
        defaultProjectId={defaultTaskProjectId}
      />

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

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        users={allUsers}
        initialProject={editingProject}
      />

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
        userTasks={tasks.filter((t) => t.assigneeId === activeProfile?.uid)}
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

      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        initialMember={editingMember}
      />
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
