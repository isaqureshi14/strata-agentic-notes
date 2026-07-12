import React, { useState, useEffect } from 'react';
import { accountApi, type UserProfile } from '../services/api';
import { Check, X, LogOut, RefreshCw, Users, ShieldAlert, Star, MessageSquare } from 'lucide-react';

interface DeveloperDashboardProps {
  currentUser: UserProfile;
  onSignOut: () => void;
  darkMode: boolean;
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
  currentUser,
  onSignOut,
  darkMode,
}) => {
  const [pendings, setPendings] = useState<UserProfile[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [pendingData, feedbackData] = await Promise.all([
        accountApi.getPendingSignups(),
        accountApi.getFeedbackList()
      ]);
      setPendings(pendingData);
      setFeedback(feedbackData);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load developer dashboard data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      await accountApi.approveSignup(userId);
      setMsg({ type: 'success', text: `Successfully approved account for "${userName}".` });
      const data = await accountApi.getPendingSignups();
      setPendings(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to approve signup.' });
      setLoading(false);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      await accountApi.rejectSignup(userId);
      setMsg({ type: 'success', text: `Rejected signup request for "${userName}".` });
      const data = await accountApi.getPendingSignups();
      setPendings(data);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to reject signup.' });
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 flex flex-col ${
      darkMode ? 'bg-[#121212] text-zinc-100 dark' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Navigation Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a] shrink-0 bg-white dark:bg-[#1c1c1c] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-rose-500">MTLB Developer Console</h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Logged in as {currentUser.name} ({currentUser.noteId})</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 px-4 py-2 border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </header>

      {/* Main Admin Console */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto space-y-8 overflow-y-auto">
        {/* Banner Alert Messages */}
        {msg && (
          <div className={`p-4 rounded-2xl text-xs font-sans shadow-sm flex items-center justify-between transition-all ${
            msg.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="font-bold text-xs hover:underline cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Pending Signups */}
          <div className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-3xl p-6 shadow-sm flex flex-col min-h-[450px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100">
                  Pending Signups ({pendings.length})
                </h2>
                <p className="text-xs text-gray-400">Approve or reject local registrations before they can access MTLB.</p>
              </div>
              <button 
                onClick={loadData}
                disabled={loading}
                className="p-2 border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {loading && pendings.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-zinc-500 text-center py-20 animate-pulse">Loading signups...</div>
              ) : pendings.length === 0 ? (
                <div className="text-sm text-gray-400 dark:text-zinc-500 text-center py-20 bg-gray-50/50 dark:bg-black/10 rounded-2xl border border-dashed border-gray-200 dark:border-[#2a2a2a]">
                  No pending registrations requiring approval.
                </div>
              ) : (
                pendings.map((user) => (
                  <div 
                    key={user.id} 
                    className="border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-4 bg-gray-50/50 dark:bg-black/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:border-gray-300 dark:hover:border-zinc-700"
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800 dark:text-zinc-200">{user.name}</div>
                      <div className="text-xs font-mono text-rose-500 mt-0.5">Note ID: {user.noteId}</div>
                      <div className="text-[10px] text-gray-400 mt-1">Requested: {new Date(user.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2.5 shrink-0">
                      <button
                        onClick={() => handleApprove(user.id, user.name)}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(user.id, user.name)}
                        disabled={loading}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2: Guest Trial Feedback */}
          <div className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-3xl p-6 shadow-sm flex flex-col min-h-[450px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-zinc-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" /> Guest Trial Feedback ({feedback.length})
                </h2>
                <p className="text-xs text-gray-400">Feedback from users completing guest sessions.</p>
              </div>
              <button 
                onClick={loadData}
                disabled={loading}
                className="p-2 border border-gray-200 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {loading && feedback.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-zinc-500 text-center py-20 animate-pulse">Loading feedback...</div>
              ) : feedback.length === 0 ? (
                <div className="text-sm text-gray-400 dark:text-zinc-500 text-center py-20 bg-gray-50/50 dark:bg-black/10 rounded-2xl border border-dashed border-gray-200 dark:border-[#2a2a2a]">
                  No trial feedback received yet.
                </div>
              ) : (
                feedback.map((fb) => (
                  <div 
                    key={fb.id} 
                    className="border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-4 bg-gray-50/50 dark:bg-black/10 flex flex-col gap-2.5 transition-all hover:border-gray-300 dark:hover:border-zinc-700"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-gray-800 dark:text-zinc-200">{fb.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">Note ID: {fb.userNoteId}</div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((starVal) => (
                          <Star 
                            key={starVal}
                            className={`w-3.5 h-3.5 ${
                              starVal <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {fb.comment && (
                      <p className="text-xs text-gray-600 dark:text-zinc-300 bg-white dark:bg-[#252525] p-3 rounded-xl border border-gray-100 dark:border-[#333]">
                        {fb.comment}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center text-[9px] text-gray-400">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold uppercase">
                        {fb.tag || 'guest_trial'}
                      </span>
                      <span>{new Date(fb.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
