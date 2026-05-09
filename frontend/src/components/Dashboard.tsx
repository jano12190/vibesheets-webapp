import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { entriesApi, projectsApi, profileApi, type TimeEntry, type Project, type UserProfile, setTokenGetter } from '../api/client';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
      const [entriesRes, projectsRes, profileRes] = await Promise.all([
        entriesApi.list(),
        projectsApi.list(),
        profileApi.get()
      ]);
      setEntries(entriesRes.entries);
      setProjects(projectsRes.projects.filter(p => p.active));
      setUserProfile(profileRes.profile);

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

  const handleClockIn = async (projectId: string) => {
    try {
      const result = await entriesApi.clockIn(projectId);
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
      await entriesApi.clockOut(runningEntry.entry_id, runningEntry.start_time);
      setRunningEntry(null);
      await loadData();
    } catch (err) {
      console.error('Failed to clock out:', err);
    }
  };

  const weekDays = getWeekDays(weekStart);
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(addDays(weekStart, 6));
  const weekEntries = entries.filter(e => e.date >= weekStartStr && e.date <= weekEndStr);
  const totalHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);

  const getEntriesForDay = (date: string) =>
    entries.filter(e => e.date === date);

  const getDayTotal = (date: string) =>
    getEntriesForDay(date).reduce((sum, e) => sum + e.hours, 0);

  const getProjectById = (id: string) =>
    projects.find(p => p.project_id === id);

  const getHoursByProject = () => {
    const hoursByProject: { project: Project; hours: number }[] = [];
    const projectHoursMap = new Map<string, number>();

    weekEntries.forEach(entry => {
      const current = projectHoursMap.get(entry.project_id) || 0;
      projectHoursMap.set(entry.project_id, current + entry.hours);
    });

    projectHoursMap.forEach((hours, projectId) => {
      const project = getProjectById(projectId);
      if (project && hours > 0) {
        hoursByProject.push({ project, hours });
      }
    });

    return hoursByProject.sort((a, b) => b.hours - a.hours);
  };

  const hoursByProject = getHoursByProject();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center relative">
          <span className="text-xl font-semibold text-purple-600">Vibesheets</span>

          {/* Timer Section - Absolutely centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
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
              onClick={() => setShowReportsModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Reports
            </button>
            <button
              onClick={() => setShowProjectModal(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Projects
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-500">this week</div>
          </div>
        </div>

        {/* Hours by project */}
        {hoursByProject.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {hoursByProject.map(({ project, hours }) => (
              <div
                key={project.project_id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="text-sm text-gray-700">{project.name}</span>
                <span className="text-sm font-medium text-gray-900">{hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>
        )}

        {/* Week grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {weekDays.map(({ date, dayName, dayNum, isToday }) => (
                <div
                  key={date}
                  className="p-4 flex justify-center border-r border-gray-200 last:border-r-0"
                >
                  <div className={`px-3 py-1 text-center rounded-full ${
                    isToday ? 'border-2 border-purple-600' : ''
                  }`}>
                    <div className="text-xs uppercase text-gray-500">{dayName}</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {dayNum}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 min-h-[300px]">
              {weekDays.map(({ date }) => (
                <div
                  key={date}
                  className="p-3 border-r border-gray-200 last:border-r-0"
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
                            <>{entry.hours}h</>
                          )}
                        </div>
                        {!isRunning && entry.start_time && entry.end_time && (
                          <div className="text-gray-400 text-xs">
                            {formatTimeRange(entry.start_time, entry.end_time)}
                          </div>
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

      {/* Settings Modal */}
      {showSettingsModal && userProfile && (
        <SettingsModal
          profile={userProfile}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (data) => {
            await profileApi.update(data);
            await loadData();
          }}
        />
      )}

      {/* Reports Modal */}
      {showReportsModal && (
        <ReportsModal
          entries={entries}
          projects={projects}
          userProfile={userProfile}
          onClose={() => setShowReportsModal(false)}
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
  onSave: (data: { date: string; project_id: string; hours: number; start_time?: string; end_time?: string }) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(entry?.project_id || projects[0]?.project_id || '');
  const [hours, setHours] = useState(entry?.hours?.toString() || '');
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
      const data: { date: string; project_id: string; hours: number; start_time?: string; end_time?: string } = {
        date,
        project_id: projectId,
        hours: parseFloat(hours)
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
  onSave: (data: { name: string; client: string; client_address: string; hourly_rate: number; color: string }) => Promise<void>;
  onUpdate: (id: string, data: { name: string; client: string; client_address: string; hourly_rate: number; color: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setClient(project.client || '');
    setClientAddress(project.client_address || '');
    setHourlyRate(project.hourly_rate?.toString() || '');
    setColor(project.color || '#8B5CF6');
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingProject(null);
    setName('');
    setClient('');
    setClientAddress('');
    setHourlyRate('');
    setColor('#8B5CF6');
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = { name, client, client_address: clientAddress, hourly_rate: parseFloat(hourlyRate) || 0, color };
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
          {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
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
              placeholder="Client name (optional)"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <textarea
              placeholder="Client address (optional, for invoices)"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
  onClockIn: (projectId: string) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.project_id || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onClockIn(projectId);
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
function formatTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startHour = start.getHours();
  const endHour = end.getHours();
  const sameAmPm = (startHour < 12) === (endHour < 12);

  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (sameAmPm) {
    // Remove AM/PM from start time when both are same period
    const startWithoutPeriod = startTime.replace(/ AM| PM/, '');
    return `${startWithoutPeriod} – ${endTime}`;
  }
  return `${startTime} – ${endTime}`;
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function isCurrentWeek(weekStart: Date): boolean {
  const currentWeekStart = getWeekStart(new Date());
  return formatDate(weekStart) === formatDate(currentWeekStart);
}

function formatWeekRange(weekStart: Date): string {
  if (isCurrentWeek(weekStart)) {
    return 'This Week';
  }

  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
}

// Settings Modal Component
function SettingsModal({
  profile,
  onClose,
  onSave
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (data: { name: string; address: string; email: string; phone: string }) => Promise<void>;
}) {
  const [name, setName] = useState(profile.name || '');
  const [address, setAddress] = useState(profile.address || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await onSave({ name, address, email, phone });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">Your information for invoices</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">Saved!</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name / Business Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="123 Main St, City, State 12345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reports Modal Component
function ReportsModal({
  entries,
  projects,
  userProfile,
  onClose
}: {
  entries: TimeEntry[];
  projects: Project[];
  userProfile: UserProfile | null;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
    return sorted[0]?.project_id || '';
  });
  const [showInvoice, setShowInvoice] = useState(false);

  const getProjectById = (id: string) => projects.find(p => p.project_id === id);

  const filteredEntries = entries.filter(e => {
    const inDateRange = e.date >= startDate && e.date <= endDate;
    const matchesProject = !selectedProjectId || e.project_id === selectedProjectId;
    return inDateRange && matchesProject;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = filteredEntries.reduce((sum, e) => {
    const project = getProjectById(e.project_id);
    return sum + (e.hours * (project?.hourly_rate || 0));
  }, 0);

  const downloadCSV = () => {
    const headers = ['Date', 'Project', 'Client', 'Hours', 'Rate', 'Amount'];
    const rows = filteredEntries.map(e => {
      const project = getProjectById(e.project_id);
      const amount = e.hours * (project?.hourly_rate || 0);
      return [
        e.date,
        project?.name || '',
        project?.client || '',
        e.hours.toFixed(2),
        project?.hourly_rate?.toFixed(2) || '0.00',
        amount.toFixed(2)
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showInvoice && selectedProjectId) {
    const project = getProjectById(selectedProjectId);
    return (
      <InvoiceModal
        entries={filteredEntries}
        project={project!}
        userProfile={userProfile}
        startDate={startDate}
        endDate={endDate}
        onBack={() => setShowInvoice(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                <option key={p.project_id} value={p.project_id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-500">Total Hours</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</div>
            <div className="text-sm text-gray-500">Total Amount</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{filteredEntries.length}</div>
            <div className="text-sm text-gray-500">Entries</div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Date</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Project</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Hours</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No entries for this period</td>
                </tr>
              ) : (
                filteredEntries.map(e => {
                  const project = getProjectById(e.project_id);
                  const amount = e.hours * (project?.hourly_rate || 0);
                  return (
                    <tr key={e.entry_id}>
                      <td className="px-4 py-2 text-gray-900">{e.date}</td>
                      <td className="px-4 py-2 text-gray-900">{project?.name || 'Unknown'}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{e.hours.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-900">${amount.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={downloadCSV}
            disabled={filteredEntries.length === 0}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download CSV
          </button>
          <button
            onClick={() => setShowInvoice(true)}
            disabled={filteredEntries.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

// Invoice Modal Component
function InvoiceModal({
  entries,
  project,
  userProfile,
  startDate,
  endDate,
  onBack,
  onClose
}: {
  entries: TimeEntry[];
  project: Project;
  userProfile: UserProfile | null;
  startDate: string;
  endDate: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    return `INV-${date}-${time}`;
  });
  const [invoiceDate, setInvoiceDate] = useState(() => formatDate(new Date()));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDate(d);
  });
  const [notes, setNotes] = useState('');

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalAmount = totalHours * (project.hourly_rate || 0);

  const downloadPDF = () => {
    // Create printable HTML invoice
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .invoice-title { font-size: 32px; font-weight: bold; color: #7c3aed; }
          .info-section { margin-bottom: 30px; }
          .info-section h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
          .info-section p { margin: 4px 0; }
          .details { display: flex; gap: 60px; margin-bottom: 30px; }
          .detail-item { }
          .detail-label { font-size: 12px; color: #666; }
          .detail-value { font-size: 16px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; padding: 12px; background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; font-size: 18px; }
          .notes { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px; }
          .notes-title { font-weight: 600; margin-bottom: 8px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="invoice-title">INVOICE</div>
          <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: bold;">${invoiceNumber}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <div class="info-section">
            <h3>From</h3>
            <p><strong>${userProfile?.name || 'Your Name'}</strong></p>
            <p style="white-space: pre-line;">${userProfile?.address || 'Your Address'}</p>
            ${userProfile?.email ? `<p>${userProfile.email}</p>` : ''}
            ${userProfile?.phone ? `<p>${userProfile.phone}</p>` : ''}
          </div>
          <div class="info-section">
            <h3>Bill To</h3>
            <p><strong>${project.client || 'Client Name'}</strong></p>
            <p style="white-space: pre-line;">${project.client_address || ''}</p>
          </div>
        </div>

        <div class="details">
          <div class="detail-item">
            <div class="detail-label">Invoice Date</div>
            <div class="detail-value">${invoiceDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Due Date</div>
            <div class="detail-value">${dueDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Project</div>
            <div class="detail-value">${project.name}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-right">Hours</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => `
              <tr>
                <td>${e.date}</td>
                <td class="text-right">${e.hours.toFixed(2)}</td>
                <td class="text-right">$${(project.hourly_rate || 0).toFixed(2)}</td>
                <td class="text-right">$${(e.hours * (project.hourly_rate || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td></td>
              <td class="text-right">${totalHours.toFixed(2)}</td>
              <td></td>
              <td class="text-right">$${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: right; font-size: 24px; font-weight: bold;">
          Total Due: $${totalAmount.toFixed(2)}
        </div>

        ${notes ? `<div class="notes"><div class="notes-title">Notes</div><p>${notes}</p></div>` : ''}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-gray-900">Generate Invoice</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs uppercase text-gray-500 mb-1">From</div>
              <div className="font-medium">{userProfile?.name || 'Set in Settings'}</div>
              <div className="text-sm text-gray-600 whitespace-pre-line">{userProfile?.address}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-500 mb-1">Bill To</div>
              <div className="font-medium">{project.client || 'No client'}</div>
              <div className="text-sm text-gray-600 whitespace-pre-line">{project.client_address}</div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-700"><span className="text-gray-500">Project:</span> {project.name}</div>
                <div className="text-sm text-gray-700"><span className="text-gray-500">Period:</span> {startDate} to {endDate}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">{totalHours.toFixed(2)} hours @ ${(project.hourly_rate || 0).toFixed(2)}/hr</div>
                <div className="text-2xl font-bold text-gray-900">${totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment terms, thank you message, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onBack}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
