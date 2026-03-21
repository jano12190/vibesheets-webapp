import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { entriesApi, projectsApi, type TimeEntry, type Project, setTokenGetter } from '../api/client';

export function Dashboard() {
  const { signOut, getToken } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Load running entry from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('runningEntry');
    if (saved) {
      setRunningEntry(JSON.parse(saved));
    }
  }, []);

  // Save running entry to localStorage
  useEffect(() => {
    if (runningEntry) {
      localStorage.setItem('runningEntry', JSON.stringify(runningEntry));
    } else {
      localStorage.removeItem('runningEntry');
    }
  }, [runningEntry]);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!runningEntry?.start_time) return;

    const updateElapsed = () => {
      const start = new Date(runningEntry.start_time!).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  useEffect(() => {
    setTokenGetter(getToken);
    loadData();
  }, [weekStart]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [entriesRes, projectsRes] = await Promise.all([
        entriesApi.list(),
        projectsApi.list()
      ]);
      setEntries(entriesRes.entries);
      setProjects(projectsRes.projects.filter(p => p.active));

      // Check for running entry (has start_time but no end_time)
      const running = entriesRes.entries.find(e => e.start_time && !e.end_time);
      if (running) {
        setRunningEntry(running);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (projectId: string, description: string) => {
    try {
      const result = await entriesApi.clockIn(projectId, description);
      setRunningEntry(result.entry);
      setShowClockInModal(false);
      await loadData();
    } catch (err) {
      console.error('Failed to clock in:', err);
    }
  };

  const handleClockOut = async () => {
    if (!runningEntry?.start_time) return;
    try {
      await entriesApi.clockOut(runningEntry.entry_id, runningEntry.start_time, runningEntry.description);
      setRunningEntry(null);
      await loadData();
    } catch (err) {
      console.error('Failed to clock out:', err);
    }
  };

  const weekDays = getWeekDays(weekStart);
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  const getEntriesForDay = (date: string) =>
    entries.filter(e => e.date === date);

  const getDayTotal = (date: string) =>
    getEntriesForDay(date).reduce((sum, e) => sum + e.hours, 0);

  const getProjectById = (id: string) =>
    projects.find(p => p.project_id === id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Vibesheets</span>
          </div>

          {/* Timer Section */}
          <div className="flex items-center gap-4">
            {runningEntry ? (
              <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-mono text-lg font-semibold text-purple-700">{elapsedTime}</span>
                </div>
                <span className="text-sm text-purple-600">
                  {getProjectById(runningEntry.project_id)?.name || 'Unknown'}
                </span>
                <button
                  onClick={handleClockOut}
                  className="px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600"
                >
                  Clock Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClockInModal(true)}
                disabled={projects.length === 0}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Clock In
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowProjectModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Projects
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {formatWeekRange(weekStart)}
            </h2>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
            >
              Today
            </button>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-500">this week</div>
          </div>
        </div>

        {/* Week grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {weekDays.map(({ date, dayName, dayNum, isToday }) => (
                <div
                  key={date}
                  className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                    isToday ? 'bg-purple-50' : ''
                  }`}
                >
                  <div className="text-xs text-gray-500 uppercase">{dayName}</div>
                  <div className={`text-lg font-semibold ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                    {dayNum}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 min-h-[300px]">
              {weekDays.map(({ date, isToday }) => (
                <div
                  key={date}
                  className={`p-3 border-r border-gray-200 last:border-r-0 ${
                    isToday ? 'bg-purple-50/50' : ''
                  }`}
                >
                  {getEntriesForDay(date).map(entry => {
                    const project = getProjectById(entry.project_id);
                    const isRunning = entry.start_time && !entry.end_time;
                    return (
                      <div
                        key={entry.entry_id}
                        className={`mb-2 p-2 rounded-lg text-sm cursor-pointer hover:ring-2 hover:ring-purple-300 group relative ${isRunning ? 'ring-2 ring-purple-400' : ''}`}
                        style={{ backgroundColor: project?.color + '20' }}
                        onClick={() => {
                          if (isRunning) return; // Don't edit running entries
                          setSelectedEntry(entry);
                          setSelectedDate(entry.date);
                          setShowEntryModal(true);
                        }}
                      >
                        <div className="font-medium text-gray-900">{project?.name || 'Unknown'}</div>
                        <div className="text-gray-600">
                          {isRunning ? (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              Running...
                            </span>
                          ) : (
                            <>
                              {entry.hours}h
                              {entry.start_time && entry.end_time && (
                                <span className="text-gray-400 text-xs ml-1">
                                  ({formatTime(entry.start_time)} - {formatTime(entry.end_time)})
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {entry.description && (
                          <div className="text-gray-500 text-xs truncate">{entry.description}</div>
                        )}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('Delete this entry?')) {
                              await entriesApi.delete(entry.entry_id);
                              await loadData();
                            }
                          }}
                          className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      setSelectedDate(date);
                      setShowEntryModal(true);
                    }}
                    className="w-full p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg text-sm"
                  >
                    + Add
                  </button>
                  {getDayTotal(date) > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 text-right">
                      {getDayTotal(date).toFixed(1)}h
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Entry Modal */}
      {showEntryModal && (
        <EntryModal
          date={selectedDate!}
          projects={projects}
          entry={selectedEntry}
          onClose={() => {
            setShowEntryModal(false);
            setSelectedEntry(null);
          }}
          onSave={async (data) => {
            if (selectedEntry) {
              await entriesApi.update(selectedEntry.entry_id, data);
            } else {
              await entriesApi.create(data);
            }
            await loadData();
            setShowEntryModal(false);
            setSelectedEntry(null);
          }}
        />
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          projects={projects}
          onClose={() => setShowProjectModal(false)}
          onSave={async (data) => {
            await projectsApi.create(data);
            await loadData();
          }}
          onUpdate={async (id, data) => {
            await projectsApi.update(id, data);
            await loadData();
          }}
          onDelete={async (id) => {
            await projectsApi.delete(id);
            await loadData();
          }}
        />
      )}

      {/* Clock In Modal */}
      {showClockInModal && (
        <ClockInModal
          projects={projects}
          onClose={() => setShowClockInModal(false)}
          onClockIn={handleClockIn}
        />
      )}
    </div>
  );
}

// Entry Modal Component
function EntryModal({
  date,
  projects,
  entry,
  onClose,
  onSave
}: {
  date: string;
  projects: Project[];
  entry: TimeEntry | null;
  onClose: () => void;
  onSave: (data: { date: string; project_id: string; hours: number; description: string; start_time?: string; end_time?: string }) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(entry?.project_id || projects[0]?.project_id || '');
  const [hours, setHours] = useState(entry?.hours?.toString() || '');
  const [description, setDescription] = useState(entry?.description || '');
  const [startTime, setStartTime] = useState(entry?.start_time ? new Date(entry.start_time).toTimeString().slice(0, 5) : '');
  const [endTime, setEndTime] = useState(entry?.end_time ? new Date(entry.end_time).toTimeString().slice(0, 5) : '');
  const [useTimeRange, setUseTimeRange] = useState(!!(entry?.start_time && entry?.end_time));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate hours from time range
  useEffect(() => {
    if (useTimeRange && startTime && endTime) {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffHours > 0) {
        setHours(diffHours.toFixed(2));
      }
    }
  }, [useTimeRange, startTime, endTime, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data: { date: string; project_id: string; hours: number; description: string; start_time?: string; end_time?: string } = {
        date,
        project_id: projectId,
        hours: parseFloat(hours),
        description
      };
      if (useTimeRange && startTime && endTime) {
        data.start_time = new Date(`${date}T${startTime}`).toISOString();
        data.end_time = new Date(`${date}T${endTime}`).toISOString();
      }
      await onSave(data);
    } catch (err) {
      console.error('Failed to save entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{entry ? 'Edit Time Entry' : 'Add Time Entry'}</h3>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* Toggle between hours or time range */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseTimeRange(false)}
              className={`flex-1 py-2 text-sm rounded-lg border ${!useTimeRange ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-600'}`}
            >
              Enter Hours
            </button>
            <button
              type="button"
              onClick={() => setUseTimeRange(true)}
              className={`flex-1 py-2 text-sm rounded-lg border ${useTimeRange ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-600'}`}
            >
              Enter Time Range
            </button>
          </div>

          {useTimeRange ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          )}

          {useTimeRange && hours && (
            <div className="text-sm text-gray-500 text-center">
              = {parseFloat(hours).toFixed(2)} hours
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !projectId}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : entry ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Project Modal Component
function ProjectModal({
  projects,
  onClose,
  onSave,
  onUpdate,
  onDelete
}: {
  projects: Project[];
  onClose: () => void;
  onSave: (data: { name: string; client: string; hourly_rate: number; color: string }) => Promise<void>;
  onUpdate: (id: string, data: { name: string; client: string; hourly_rate: number; color: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setClient(project.client || '');
    setHourlyRate(project.hourly_rate?.toString() || '');
    setColor(project.color || '#8B5CF6');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setName('');
    setClient('');
    setHourlyRate('');
    setColor('#8B5CF6');
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = { name, client, hourly_rate: parseFloat(hourlyRate) || 0, color };
      if (editingProject) {
        await onUpdate(editingProject.project_id, data);
      } else {
        await onSave(data);
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save project:', err);
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (confirm(`Delete "${project.name}"?`)) {
      try {
        await onDelete(project.project_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete project');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {projects.map(p => (
            <div key={p.project_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{p.name}</div>
                {p.client && <div className="text-sm text-gray-500">{p.client}</div>}
              </div>
              {p.hourly_rate > 0 && (
                <div className="text-sm text-gray-500">${p.hourly_rate}/hr</div>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => startEdit(p)}
                  className="p-1 text-gray-400 hover:text-purple-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-gray-500 text-center py-4">No projects yet</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
            <input
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <input
              type="text"
              placeholder="Client (optional)"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="number"
              placeholder="Hourly rate (optional)"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingProject ? 'Update' : 'Add Project'}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-300 hover:text-purple-600"
          >
            + New Project
          </button>
        )}
      </div>
    </div>
  );
}

// Clock In Modal Component
function ClockInModal({
  projects,
  onClose,
  onClockIn
}: {
  projects: Project[];
  onClose: () => void;
  onClockIn: (projectId: string, description: string) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.project_id || '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onClockIn(projectId, description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Clock In</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !projectId}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Starting...' : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Timer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Utility functions
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekDays(weekStart: Date) {
  const today = formatDate(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const date = formatDate(d);
    return {
      date,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: date === today
    };
  });
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
}
