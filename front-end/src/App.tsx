import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader/AppHeader';
import { StatusSection } from './components/StatusSection/StatusSection';
import { TaskModal } from './components/TaskModal/TaskModal';
import { ConfirmDelete } from './components/ConfirmDelete/ConfirmDelete';
import { AuthModal } from './components/AuthModal/AuthModal';
import { useTasks } from './hooks/useTasks';
import { useReview } from './hooks/useReview';
import { TrelloImport } from './components/TrelloImport/TrelloImport';
import { WeeklyLog } from './components/WeeklyLog/WeeklyLog';
import { WeeklyReview } from './components/WeeklyReview/WeeklyReview';
import { logout } from './services/api';
import { STATUSES } from './constants';
import { onBoard, upcomingWeeks } from './utils/helpers';
import { StatusPrompt, type PromptStatus } from './components/StatusPrompt/StatusPrompt';
import type { Task, TaskDraft, TaskStatus } from './types/task';

// ── Auth gate ─────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem('auth_token'),
  );

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <AuthModal onSuccess={() => setIsLoggedIn(true)} />;
  }

  return <TaskApp onLogout={handleLogout} />;
};

// ── Main app (rendered only when authenticated) ───────────────────────────────

const TaskApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { tasks, tagColorMap, week, loading, error, addTask, editTask, moveTask, toggleImportant, removeTask, assignTagColor, refresh } =
    useTasks(onLogout); // onLogout doubles as onUnauthorized handler
  const { review, loading: reviewLoading, complete } = useReview(onLogout);
  const [reviewLater, setReviewLater] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<'board' | 'log'>('board');

  const [search, setSearch] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>(
    STATUSES.map((s) => s.value),
  );
  const [modalTask, setModalTask] = useState<Partial<Task> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [prompt, setPrompt] = useState<{ task: Task; status: PromptStatus } | null>(null);

  // Fallback: if useTasks sets an error and the token is gone, redirect to auth
  useEffect(() => {
    if (error && !localStorage.getItem('auth_token')) {
      onLogout();
    }
  }, [error, onLogout]);

  function toggleStatus(value: TaskStatus) {
    setActiveStatuses((prev) =>
      prev.includes(value)
        ? prev.length > 1
          ? prev.filter((s) => s !== value)
          : prev
        : [...prev, value],
    );
  }

  function openCreate(defaultStatus: string = 'idea') {
    setModalTask({ status: defaultStatus as TaskStatus, tags: [] });
  }

  function openEdit(task: Task) {
    setModalTask(task);
  }

  async function handleSave(data: TaskDraft) {
    if (modalTask?.id) {
      await editTask(modalTask.id, data);
    } else {
      await addTask(data);
    }
    setModalTask(null);
  }

  function handleDropTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    // Waiting on and Paused need extra data: ask before moving the card
    if (task && task.status !== status && (status === 'blocked' || status === 'paused')) {
      setPrompt({ task, status });
      return;
    }
    moveTask(taskId, status).catch(console.error); // moveTask already reverts on failure
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeTask(deleteTarget.id);
    setDeleteTarget(null);
  }

  // The Done column only shows cards completed this week; older ones live in the log
  const boardTasks = week ? tasks.filter((t) => onBoard(t, week.startsAt)) : tasks;

  const weeks = upcomingWeeks(week?.weekStart ?? new Date().toISOString().slice(0, 10));

  const q = search.trim().toLowerCase();
  const filtered = q
    ? boardTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      )
    : boardTasks;

  // Important tasks float to the top of their column (sort is stable, so the
  // original order is preserved within each group)
  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [
      s.value,
      filtered
        .filter((t) => t.status === s.value)
        .sort((a, b) => Number(b.important) - Number(a.important)),
    ]),
  ) as Record<TaskStatus, Task[]>;

  const visibleStatuses = STATUSES.filter((s) => !s.drawer && activeStatuses.includes(s.value));
  const drawerStatus = STATUSES.find((s) => s.drawer && activeStatuses.includes(s.value));
  const noResults = q.length > 0 && filtered.length === 0;

  if (loading || reviewLoading) {
    return (
      <div style={centeredStyle}>
        <Spinner />
        <p style={subtleText}>Loading tasks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centeredStyle}>
        <p style={{ ...subtleText, color: 'var(--eui-text-danger)' }}>{error}</p>
      </div>
    );
  }

  if (review?.needsReview && !reviewLater) {
    return (
      <WeeklyReview
        cards={review.cards}
        weekStart={review.weekStart}
        weeks={weeks}
        onComplete={async (decisions, note) => {
          await complete(decisions, note);
          await refresh();
        }}
        onLater={() => setReviewLater(true)}
      />
    );
  }

  if (view === 'log') {
    return <WeeklyLog onBack={() => setView('board')} onUnauthorized={onLogout} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eui-page-background)' }}>
      <AppHeader
        tasks={boardTasks}
        search={search}
        onSearch={setSearch}
        activeStatuses={activeStatuses}
        onToggleStatus={toggleStatus}
        onCreateTask={() => openCreate()}
        onImport={() => setImportOpen(true)}
        onLog={() => setView('log')}
        onLogout={onLogout}
      />

      <main
        style={{
          maxWidth: 1600,
          margin: '0 auto',
          padding: '28px 24px 60px',
        }}
      >
        {review?.needsReview && (
          <div role="status" style={bannerStyle}>
            <span>
              Weekly review pending: {review.cards.length} card{review.cards.length === 1 ? '' : 's'} need a decision.
            </span>
            <button onClick={() => setReviewLater(false)} style={bannerButtonStyle}>
              Start review
            </button>
          </div>
        )}

        {noResults ? (
          <div style={{ textAlign: 'center', padding: '52px 0' }}>
            <p
              style={{
                margin: '0 0 4px',
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--eui-title-color)',
                fontFamily: 'var(--eui-font-family)',
              }}
            >
              No results for "{search}"
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--eui-text-subdued)',
                fontFamily: 'var(--eui-font-family)',
              }}
            >
              Try a different search term or tag.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 16,
              overflowX: 'auto',
              padding: '4px 4px 16px',
              margin: '0 -4px',
            }}
          >
            {visibleStatuses.map((s) => (
              <StatusSection
                key={s.value}
                status={s}
                tasks={byStatus[s.value] ?? []}
                onEdit={openEdit}
                onAdd={openCreate}
                onDropTask={handleDropTask}
                onToggleImportant={(id) => { toggleImportant(id).catch(console.error); }}
                tagColorMap={tagColorMap}
              />
            ))}
          </div>
        )}

        {drawerStatus && !noResults && (
          <div style={{ marginTop: 16, maxWidth: 360 }}>
            <StatusSection
              key={drawerStatus.value}
              status={drawerStatus}
              tasks={byStatus[drawerStatus.value] ?? []}
              onEdit={openEdit}
              onAdd={openCreate}
              onDropTask={handleDropTask}
              onToggleImportant={(id) => { toggleImportant(id).catch(console.error); }}
              tagColorMap={tagColorMap}
              defaultCollapsed
            />
          </div>
        )}
      </main>

      {modalTask !== null && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onClose={() => setModalTask(null)}
          onDelete={modalTask.id ? () => { setDeleteTarget(modalTask as Task); setModalTask(null); } : undefined}
          tagColorMap={tagColorMap}
          onColorAssign={assignTagColor}
          weeks={weeks}
        />
      )}
      {prompt !== null && (
        <StatusPrompt
          task={prompt.task}
          status={prompt.status}
          weeks={weeks}
          onConfirm={(extra) => {
            moveTask(prompt.task.id, prompt.status, extra).catch(console.error);
            setPrompt(null);
          }}
          onClose={() => setPrompt(null)}
        />
      )}
      {importOpen && (
        <TrelloImport
          onClose={() => setImportOpen(false)}
          onImported={() => window.location.reload()}
        />
      )}
      {deleteTarget !== null && (
        <ConfirmDelete
          task={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
  padding: '10px 16px',
  borderRadius: 6,
  background: 'var(--eui-bg-base-warning)',
  color: 'var(--eui-text-warning)',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 14,
};

const bannerButtonStyle: React.CSSProperties = {
  height: 32,
  padding: '0 12px',
  borderRadius: 6,
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const centeredStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--eui-page-background)',
  gap: 12,
};

const subtleText: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: 'var(--eui-text-subdued)',
  fontFamily: 'var(--eui-font-family)',
};

const Spinner = () => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 32 32"
    fill="none"
    style={{ animation: 'spin 0.8s linear infinite' }}
  >
    <circle cx="16" cy="16" r="12" stroke="var(--eui-border-color)" strokeWidth="3" />
    <path
      d="M16 4a12 12 0 0 1 12 12"
      stroke="var(--eui-color-primary)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);
