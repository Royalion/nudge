import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, ThumbsUp, ThumbsDown, AlertTriangle, RefreshCcw, LogOut,
  ArrowLeft, BarChart3, Users, Activity, MessageSquare, UserPlus,
  Clock, Zap, CheckCircle2, XCircle, ChevronRight, Mail,
  ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Button, cn } from '../components/shared';
import { Link } from 'react-router';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc`;

type Tab = 'overview' | 'feedback' | 'errors' | 'users' | 'health';

const PER_PAGE = 20;

export function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [feedbackPagination, setFeedbackPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [errorsPagination, setErrorsPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [users, setUsers] = useState<any[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, hasMore: false });
  const [health, setHealth] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    'X-Admin-Secret': secret,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/stats`, { headers: headers() });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error === 'FORBIDDEN' ? 'Invalid admin secret' : data.message || 'Auth failed');
      }
      setAuthed(true);
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (t: Tab, pageOverride?: number) => {
    setDataLoading(true);
    try {
      if (t === 'overview') {
        const res = await fetch(`${SERVER_URL}/api/admin/stats`, { headers: headers() });
        setStats(await res.json());
      } else if (t === 'feedback') {
        const p = pageOverride ?? feedbackPagination.page;
        const res = await fetch(`${SERVER_URL}/api/admin/feedback?page=${p}&perPage=${PER_PAGE}`, { headers: headers() });
        const data = await res.json();
        setFeedback(data.feedback || []);
        setFeedbackPagination({ page: data.page || p, total: data.total || 0, totalPages: data.totalPages || 1 });
      } else if (t === 'errors') {
        const p = pageOverride ?? errorsPagination.page;
        const res = await fetch(`${SERVER_URL}/api/admin/error-logs?page=${p}&perPage=${PER_PAGE}`, { headers: headers() });
        const data = await res.json();
        setErrorLogs(data.logs || []);
        setErrorsPagination({ page: data.page || p, total: data.total || 0, totalPages: data.totalPages || 1 });
      } else if (t === 'users') {
        const p = pageOverride ?? usersPagination.page;
        const res = await fetch(`${SERVER_URL}/api/admin/users?page=${p}&perPage=${PER_PAGE}`, { headers: headers() });
        const data = await res.json();
        setUsers(data.users || []);
        setUsersPagination({ page: data.page || p, hasMore: data.hasMore || false });
      } else if (t === 'health') {
        const res = await fetch(`${SERVER_URL}/api/admin/health`, { headers: headers() });
        setHealth(await res.json());
      }
    } catch (err: any) {
      console.error('Admin load error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const goToPage = (t: Tab, page: number) => {
    loadData(t, page);
  };

  useEffect(() => {
    if (authed) loadData(tab);
  }, [tab, authed]);

  // ── Login screen ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7FAFA] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stride-600 to-stride-900 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-stride-900">Admin Access</h1>
            <p className="text-sm text-stride-500">Enter the admin secret to continue</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-stride-100 shadow-sm p-6 space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl font-medium">{error}</div>
            )}
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Admin secret"
              className="w-full h-12 px-4 bg-stride-50/60 border border-stride-200/50 rounded-xl text-sm placeholder:text-stride-400 focus:outline-none focus:ring-2 focus:ring-stride-500/30"
              autoFocus
            />
            <Button type="submit" className="w-full h-12" disabled={!secret.trim() || loading}>
              {loading ? 'Verifying...' : 'Access Dashboard'}
            </Button>
          </form>

          <div className="text-center">
            <Link to="/" className="text-sm font-semibold text-stride-500 hover:text-stride-800 transition-colors">
              <ArrowLeft className="w-4 h-4 inline mr-1" />Back to app
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Dashboard ──
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'feedback', label: 'Feedback', icon: <ThumbsUp className="w-4 h-4" /> },
    { key: 'errors', label: 'Errors', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'health', label: 'Health', icon: <Activity className="w-4 h-4" /> },
  ];

  const StatCard = ({ label, value, icon, color, sub }: { label: string; value: any; icon: React.ReactNode; color: string; sub?: string }) => (
    <div className={cn("rounded-2xl p-5 border", color)}>
      <div className="flex items-center justify-between mb-3">
        <span className="opacity-60">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="text-xs font-semibold mt-1 opacity-70">{label}</p>
      {sub && <p className="text-[10px] opacity-50 mt-0.5">{sub}</p>}
    </div>
  );

  const PaginationBar = ({ page, totalPages, total, onPrev, onNext, onFirst, onLast, label }: {
    page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void; onFirst: () => void; onLast: () => void; label: string;
  }) => {
    if (totalPages <= 1) return null;
    const start = (page - 1) * PER_PAGE + 1;
    const end = Math.min(page * PER_PAGE, total);
    return (
      <div className="flex items-center justify-between bg-white rounded-xl border border-stride-100 px-4 py-3">
        <p className="text-xs text-stride-400 font-medium">
          Showing <span className="font-bold text-stride-700">{start}–{end}</span> of <span className="font-bold text-stride-700">{total}</span> {label}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={onFirst} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-stride-50 disabled:opacity-30 disabled:pointer-events-none text-stride-500 transition-colors">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button onClick={onPrev} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-stride-50 disabled:opacity-30 disabled:pointer-events-none text-stride-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-stride-700 px-2">{page} / {totalPages}</span>
          <button onClick={onNext} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-stride-50 disabled:opacity-30 disabled:pointer-events-none text-stride-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onLast} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-stride-50 disabled:opacity-30 disabled:pointer-events-none text-stride-500 transition-colors">
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7FAFA] font-['Manrope',system-ui,sans-serif]">
      {/* Header */}
      <div className="bg-white border-b border-stride-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stride-600 to-stride-900 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-stride-900">Nudge Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(tab)}
              className="p-2 rounded-lg hover:bg-stride-50 text-stride-500 transition-colors"
            >
              <RefreshCcw className={cn("w-4 h-4", dataLoading && "animate-spin")} />
            </button>
            <button
              onClick={() => { setAuthed(false); setSecret(''); }}
              className="p-2 rounded-lg hover:bg-stride-50 text-stride-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-stride-100 overflow-x-auto hide-scrollbar">
        <div className="max-w-5xl mx-auto flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                tab === t.key
                  ? "border-stride-600 text-stride-800"
                  : "border-transparent text-stride-400 hover:text-stride-600"
              )}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && stats && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              {/* Top-level KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Users" value={stats.totalUsers || 0} icon={<Users className="w-5 h-5" />} color="bg-blue-50 text-blue-700 border-blue-100" />
                <StatCard label="DAU (Today)" value={stats.dau?.[0]?.count || 0} icon={<Activity className="w-5 h-5" />} color="bg-emerald-50 text-emerald-700 border-emerald-100" />
                <StatCard label="Chat Requests" value={stats.today?.chatRequests || 0} icon={<MessageSquare className="w-5 h-5" />} color="bg-purple-50 text-purple-700 border-purple-100" sub="Today" />
                <StatCard label="Signups" value={stats.today?.signups || 0} icon={<UserPlus className="w-5 h-5" />} color="bg-amber-50 text-amber-700 border-amber-100" sub="Today" />
              </div>

              {/* Second row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Thumbs Up" value={stats.thumbsUp || 0} icon={<ThumbsUp className="w-5 h-5" />} color="bg-emerald-50 text-emerald-700 border-emerald-100" />
                <StatCard label="Thumbs Down" value={stats.thumbsDown || 0} icon={<ThumbsDown className="w-5 h-5" />} color="bg-red-50 text-red-700 border-red-100" />
                <StatCard label="Error Logs" value={stats.totalErrors || 0} icon={<AlertTriangle className="w-5 h-5" />} color="bg-orange-50 text-orange-700 border-orange-100" />
                <StatCard label="Avg Latency" value={stats.today?.avgLatencyMs ? `${Math.round(stats.today.avgLatencyMs)}ms` : '—'} icon={<Clock className="w-5 h-5" />} color="bg-slate-50 text-slate-700 border-slate-100" sub="Chat API" />
              </div>

              {/* DAU sparkline (last 7 days) */}
              {stats.dau && (
                <div className="bg-white rounded-2xl border border-stride-100 p-5">
                  <h3 className="text-sm font-bold text-stride-800 mb-4">Daily Active Users (Last 7 Days)</h3>
                  <div className="flex items-end gap-2 h-24">
                    {[...stats.dau].reverse().map((d: any, i: number) => {
                      const max = Math.max(...stats.dau.map((x: any) => x.count), 1);
                      const pct = (d.count / max) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-stride-600">{d.count}</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(pct, 4)}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className="w-full bg-gradient-to-t from-stride-500 to-stride-400 rounded-t-md"
                          />
                          <span className="text-[9px] text-stride-400 font-medium">
                            {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Today's activity */}
              <div className="bg-white rounded-2xl border border-stride-100 p-5">
                <h3 className="text-sm font-bold text-stride-800 mb-3">Today's Activity</h3>
                <div className="space-y-2">
                  {[
                    { label: 'State Loads (Sessions)', value: stats.today?.stateLoads || 0, icon: <Zap className="w-4 h-4" /> },
                    { label: 'Rate Limited Requests', value: stats.today?.rateLimited || 0, icon: <AlertTriangle className="w-4 h-4" /> },
                    { label: 'Total Feedback', value: stats.totalFeedback || 0, icon: <MessageSquare className="w-4 h-4" /> },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-stride-50 last:border-0">
                      <div className="flex items-center gap-3 text-stride-600">
                        {item.icon}
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-stride-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stride-800">
                  Page {usersPagination.page} &middot; {users.length} users shown
                </h3>
              </div>
              {users.length === 0 && !dataLoading && (
                <div className="text-center py-16 text-stride-400 text-sm font-medium">No users found</div>
              )}
              <div className="bg-white rounded-2xl border border-stride-100 overflow-hidden">
                {users.map((u, i) => (
                  <div key={u.id} className={cn("flex items-center gap-4 px-4 py-3.5", i < users.length - 1 && "border-b border-stride-50")}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stride-400 to-stride-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stride-900 truncate">{u.name || 'Unnamed'}</p>
                      <p className="text-[11px] text-stride-400 truncate flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />{u.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        u.provider === 'google' ? "bg-blue-50 text-blue-600" : "bg-stride-50 text-stride-600"
                      )}>
                        {u.provider}
                      </span>
                      <p className="text-[10px] text-stride-400 mt-1">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Users pagination (prev/next since no total count) */}
              {(usersPagination.page > 1 || usersPagination.hasMore) && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-stride-100 px-4 py-3">
                  <p className="text-xs text-stride-400 font-medium">
                    Page <span className="font-bold text-stride-700">{usersPagination.page}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage('users', usersPagination.page - 1)}
                      disabled={usersPagination.page === 1}
                      className="p-1.5 rounded-lg hover:bg-stride-50 disabled:opacity-30 disabled:pointer-events-none text-stride-500 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-stride-700 px-2">Page {usersPagination.page}</span>
                    <button
                      onClick={() => goToPage('users', usersPagination.page + 1)}
                      disabled={!usersPagination.hasMore}
                      className="p-1.5 rounded-lg hover:bg-stride-50 disabled:opacity-30 disabled:pointer-events-none text-stride-500 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── FEEDBACK ── */}
          {tab === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {feedback.length === 0 && !dataLoading && (
                <div className="text-center py-16 text-stride-400 text-sm font-medium">No feedback yet</div>
              )}
              {feedback.map((f, i) => (
                <div key={i} className="bg-white rounded-xl border border-stride-100 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {f.feedback === 'up' ? (
                        <ThumbsUp className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        f.feedback === 'up' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      )}>
                        {f.feedback === 'up' ? 'Positive' : 'Negative'}
                      </span>
                    </div>
                    <span className="text-[11px] text-stride-400 font-medium">
                      {f.timestamp ? new Date(f.timestamp).toLocaleString() : ''}
                    </span>
                  </div>
                  {f.messageContent && (
                    <p className="text-sm text-stride-700 bg-stride-50 rounded-lg p-3 leading-relaxed line-clamp-4">
                      {f.messageContent}
                    </p>
                  )}
                  <p className="text-[11px] text-stride-400">Session: {f.sessionId || 'unknown'}</p>
                </div>
              ))}
              {feedbackPagination.totalPages > 1 && (
                <PaginationBar
                  page={feedbackPagination.page}
                  totalPages={feedbackPagination.totalPages}
                  total={feedbackPagination.total}
                  onPrev={() => goToPage('feedback', feedbackPagination.page - 1)}
                  onNext={() => goToPage('feedback', feedbackPagination.page + 1)}
                  onFirst={() => goToPage('feedback', 1)}
                  onLast={() => goToPage('feedback', feedbackPagination.totalPages)}
                  label="feedback"
                />
              )}
            </motion.div>
          )}

          {/* ── ERRORS ── */}
          {tab === 'errors' && (
            <motion.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {errorLogs.length === 0 && !dataLoading && (
                <div className="text-center py-16 text-stride-400 text-sm font-medium">No error logs yet</div>
              )}
              {errorLogs.map((l, i) => (
                <div key={i} className="bg-white rounded-xl border border-red-100 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-red-700">Error</span>
                    </div>
                    <span className="text-[11px] text-stride-400 font-medium">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString() : ''}
                    </span>
                  </div>
                  <pre className="text-xs text-red-800 bg-red-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {l.error}
                  </pre>
                  {l.context && (
                    <p className="text-[11px] text-stride-500">Context: {l.context}</p>
                  )}
                </div>
              ))}
              {errorsPagination.totalPages > 1 && (
                <PaginationBar
                  page={errorsPagination.page}
                  totalPages={errorsPagination.totalPages}
                  total={errorsPagination.total}
                  onPrev={() => goToPage('errors', errorsPagination.page - 1)}
                  onNext={() => goToPage('errors', errorsPagination.page + 1)}
                  onFirst={() => goToPage('errors', 1)}
                  onLast={() => goToPage('errors', errorsPagination.totalPages)}
                  label="error logs"
                />
              )}
            </motion.div>
          )}

          {/* ── HEALTH ── */}
          {tab === 'health' && (
            <motion.div key="health" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {health ? (
                <>
                  <div className="bg-white rounded-2xl border border-stride-100 p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        health.status === 'ok' ? "bg-emerald-50" : "bg-red-50"
                      )}>
                        {health.status === 'ok' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stride-900">System Status</h3>
                        <p className="text-[11px] text-stride-400">
                          {health.checks?.timestamp ? new Date(health.checks.timestamp).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          label: 'KV Store (Database)',
                          status: health.checks?.kvStore?.status,
                          detail: health.checks?.kvStore?.latencyMs ? `${health.checks.kvStore.latencyMs}ms` : health.checks?.kvStore?.error,
                        },
                        {
                          label: 'OpenAI API Key',
                          status: health.checks?.openaiKey?.status === 'configured' ? 'ok' : 'error',
                          detail: health.checks?.openaiKey?.status,
                        },
                        {
                          label: 'Admin Secret',
                          status: health.checks?.adminSecret?.status === 'configured' ? 'ok' : 'error',
                          detail: health.checks?.adminSecret?.status,
                        },
                      ].map(check => (
                        <div key={check.label} className="flex items-center justify-between py-2.5 border-b border-stride-50 last:border-0">
                          <div className="flex items-center gap-3">
                            {check.status === 'ok' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium text-stride-700">{check.label}</span>
                          </div>
                          <span className={cn(
                            "text-xs font-semibold",
                            check.status === 'ok' ? "text-emerald-600" : "text-red-600"
                          )}>
                            {check.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stride-100 p-5">
                    <h3 className="text-sm font-bold text-stride-800 mb-3">Runtime Info</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5">
                        <span className="text-stride-500">Active Rate Limit Entries</span>
                        <span className="font-semibold text-stride-800">{health.checks?.rateLimitEntries || 0}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-stride-500">Server Time</span>
                        <span className="font-semibold text-stride-800">
                          {health.checks?.timestamp ? new Date(health.checks.timestamp).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-stride-400 text-sm font-medium">
                  {dataLoading ? 'Loading health data...' : 'Failed to load health data'}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}