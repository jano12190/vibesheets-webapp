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
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
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
                    return (
                      <div
                        key={entry.entry_id}
                        className="mb-2 p-2 rounded-lg text-sm"
                        style={{ backgroundColor: project?.color + '20' }}
                      >
                        <div className="font-medium text-gray-900">{project?.name || 'Unknown'}</div>
                        <div className="text-gray-600">{entry.hours}h</div>
                        {entry.description && (
                          <div className="text-gray-500 text-xs truncate">{entry.description}</div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
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
          onClose={() => setShowEntryModal(false)}
          onSave={async (data) => {
            await entriesApi.create(data);
            await loadData();
            setShowEntryModal(false);
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
        />
      )}
    </div>
  );
}

// Entry Modal Component
function EntryModal({
  date,
  projects,
  onClose,
  onSave
}: {
  date: string;
  projects: Project[];
  onClose: () => void;
  onSave: (data: { date: string; project_id: string; hours: number; description: string }) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.project_id || '');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ date, project_id: projectId, hours: parseFloat(hours), description });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Time Entry</h3>
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
              {loading ? 'Saving...' : 'Save'}
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
  onSave
}: {
  projects: Project[];
  onClose: () => void;
  onSave: (data: { name: string; client: string; hourly_rate: number; color: string }) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [loading, setLoading] = useState(false);

  const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({ name, client, hourly_rate: parseFloat(hourlyRate) || 0, color });
      setName('');
      setClient('');
      setHourlyRate('');
      setShowForm(false);
    } finally {
      setLoading(false);
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
            <div key={p.project_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{p.name}</div>
                {p.client && <div className="text-sm text-gray-500">{p.client}</div>}
              </div>
              {p.hourly_rate > 0 && (
                <div className="text-sm text-gray-500">${p.hourly_rate}/hr</div>
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-gray-500 text-center py-4">No projects yet</p>
          )}
        </div>

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
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Add Project'}
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

// Utility functions
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
