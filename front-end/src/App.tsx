import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/AppHeader/AppHeader';
import { SummaryBar } from './components/SummaryBar/SummaryBar';
import { StatusSection } from './components/StatusSection/StatusSection';
import { TaskModal } from './components/TaskModal/TaskModal';
import { ConfirmDelete } from './components/ConfirmDelete/ConfirmDelete';
import { AuthModal } from './components/AuthModal/AuthModal';
import { useTasks } from './hooks/useTasks';
import { logout } from './services/api';
import { STATUSES } from './constants';
import type { Task, TaskStatus } from './types/task';

type Layout = 'grid' | 'list';
const DEFAULT_COLUMNS = 3;

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
  const { tasks, tagColorMap, loading, error, addTask, editTask, removeTask, assignTagColor } =
    useTasks(onLogout); // onLogout doubles as onUnauthorized handler

  const [search, setSearch] = useState('');
  const [activeStatuses, setActiveStatuses] = useState<TaskStatus[]>(
    STATUSES.map((s) => s.value),
  );
  const [layout, setLayout] = useState<Layout>('grid');
  const [columns] = useState(DEFAULT_COLUMNS);
  const [modalTask, setModalTask] = useState<Partial<Task> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

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

  function openCreate(defaultStatus: string = 'todo') {
    setModalTask({ status: defaultStatus as TaskStatus, tags: [] });
  }

  function openEdit(task: Task) {
    setModalTask(task);
  }

  async function handleSave(data: Omit<Task, 'id' | 'createdAt'>) {
    if (modalTask?.id) {
      await editTask(modalTask.id, data);
    } else {
      await addTask(data);
    }
    setModalTask(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await removeTask(deleteTarget.id);
    setDeleteTarget(null);
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      )
    : tasks;

  const byStatus = Object.fromEntries(
    STATUSES.map((s) => [s.value, filtered.filter((t) => t.status === s.value)]),
  ) as Record<TaskStatus, Task[]>;

  const noResults = q.length > 0 && filtered.length === 0;

  if (loading) {
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--eui-page-background)' }}>
      <AppHeader
        tasks={tasks}
        search={search}
        onSearch={setSearch}
        activeStatuses={activeStatuses}
        onToggleStatus={toggleStatus}
        layout={layout}
        onToggleLayout={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
        onCreateTask={() => openCreate()}
        onLogout={onLogout}
      />

      <main
        style={{
          maxWidth: layout === 'grid' ? 1400 : 740,
          margin: '0 auto',
          padding: '28px 24px 60px',
          transition: 'max-width 0.2s ease',
        }}
      >
        <SummaryBar tasks={tasks} />

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {STATUSES.filter((s) => activeStatuses.includes(s.value)).map((s) => (
              <StatusSection
                key={s.value}
                status={s}
                tasks={byStatus[s.value] ?? []}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAdd={openCreate}
                layout={layout}
                columns={columns}
                tagColorMap={tagColorMap}
              />
            ))}
          </div>
        )}
      </main>

      {modalTask !== null && (
        <TaskModal
          task={modalTask}
          onSave={handleSave}
          onClose={() => setModalTask(null)}
          tagColorMap={tagColorMap}
          onColorAssign={assignTagColor}
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
