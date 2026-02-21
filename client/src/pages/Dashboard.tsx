import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyInterviews, getUsers, createInterview, deleteInterview, getAnalytics } from '../services/api';
import { Interview, User, Analytics } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [form, setForm] = useState({
    candidateId: '',
    interviewerId: '',
    techStack: '',
    scheduledAt: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [intRes, analyticsRes] = await Promise.all([getMyInterviews(), getAnalytics()]);
      setInterviews(intRes.data);
      setAnalytics(analyticsRes.data);

      if (user?.role === 'interviewer') {
        const [candRes, intrvRes] = await Promise.all([
          getUsers('candidate'),
          getUsers('interviewer'),
        ]);
        setCandidates(candRes.data);
        setInterviewers(intrvRes.data);
      }
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInterview({
        ...form,
        techStack: form.techStack.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setForm({ candidateId: '', interviewerId: '', techStack: '', scheduledAt: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create interview');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this interview?')) return;
    try {
      await deleteInterview(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ongoing': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Interviews', value: analytics.total, color: 'text-primary-600' },
            { label: 'Completed', value: analytics.completed, color: 'text-green-600' },
            { label: 'In Progress', value: analytics.ongoing, color: 'text-yellow-600' },
            { label: 'Avg Score', value: analytics.avgScore ? `${analytics.avgScore}/10` : 'N/A', color: 'text-purple-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              <div className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Interviews</h1>
        {user?.role === 'interviewer' && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm"
          >
            {showCreate ? 'Cancel' : '+ New Interview'}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Interview</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Candidate</label>
              <select
                value={form.candidateId}
                onChange={(e) => setForm({ ...form, candidateId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select candidate</option>
                {candidates.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interviewer</label>
              <select
                value={form.interviewerId}
                onChange={(e) => setForm({ ...form, interviewerId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select interviewer</option>
                {interviewers.map((i) => (
                  <option key={i._id || i.id} value={i._id || i.id}>{i.name} ({i.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tech Stack</label>
              <input
                value={form.techStack}
                onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                placeholder="React, Node.js, MongoDB"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">
                Create Interview
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interviews List */}
      {interviews.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-500 text-lg">No interviews yet</div>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {user?.role === 'interviewer' ? 'Create one to get started' : 'Wait for an interviewer to schedule one'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <div key={interview._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(interview.status)}`}>
                      {interview.status}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(interview.scheduledAt).toLocaleString()}
                    </span>
                    {interview.score && (
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        Score: {interview.score}/10
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <div>
                      <span className="font-medium">Candidate:</span> {interview.candidateId?.name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Interviewer:</span> {interview.interviewerId?.name || 'N/A'}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {interview.techStack.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">{t}</span>
                      ))}
                    </div>
                  </div>
                  {interview.feedback?.strengths && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                      <div className="text-green-600 dark:text-green-400"><strong>Strengths:</strong> {interview.feedback.strengths}</div>
                      <div className="text-orange-600 dark:text-orange-400 mt-1"><strong>Improvements:</strong> {interview.feedback.improvements}</div>
                      <div className="text-gray-600 dark:text-gray-300 mt-1"><strong>Recommendation:</strong> {interview.feedback.recommendation}</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    to={`/interview/${interview._id}`}
                    className="px-3 py-1.5 text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 font-medium"
                  >
                    {interview.status === 'completed' ? 'View' : 'Join'}
                  </Link>
                  {user?.role === 'interviewer' && interview.status !== 'completed' && (
                    <Link
                      to={`/feedback/${interview._id}`}
                      className="px-3 py-1.5 text-sm bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 font-medium"
                    >
                      Feedback
                    </Link>
                  )}
                  {user?.role === 'interviewer' && (
                    <button
                      onClick={() => handleDelete(interview._id)}
                      className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
