import React, { useState, useEffect } from 'react';
import { 
  User, Lock, Mail, Calendar, Key, AlertTriangle, CheckCircle, X, List 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { accountApi, type UserProfile, type AuditLogItem } from '../services/api';

interface AccountModalsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

export const AccountModals: React.FC<AccountModalsProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [ppAccepted, setPpAccepted] = useState(false);
  
  // Settings Form State
  const [newName, setNewName] = useState('');
  const [newNoteId, setNewNoteId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Status state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'password' | 'logs'>('profile');

  // Load user data into edit states when modal opens/user changes
  useEffect(() => {
    if (currentUser) {
      setNewName(currentUser.name);
      setNewNoteId(currentUser.noteId);
      loadLogs();
    } else {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [currentUser, isOpen]);

  const loadLogs = async () => {
    try {
      const logs = await accountApi.getAuditLog();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    }
  };

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await accountApi.login({ email, password });
      onAuthSuccess(res.data);
      setSuccessMsg('Logged in successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Client-side age check warning
    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    if (currentYear - birthYear < 13) {
      setErrorMsg('COPPA Restriction: Registration is not permitted for individuals under 13.');
      setLoading(false);
      return;
    }

    try {
      await accountApi.register({
        name,
        email,
        dateOfBirth: dob,
        password,
        tosAccepted,
        ppAccepted
      });
      setSuccessMsg('Your sign-up request has been sent to the developer for approval.');
      setName('');
      setEmail('');
      setDob('');
      setPassword('');
      setTosAccepted(false);
      setPpAccepted(false);
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('login');
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await accountApi.forgotPassword(email);
      setSuccessMsg('Your password reset request has been sent to the developer.');
      setEmail('');
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('login');
      }, 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await accountApi.updateProfile({
        name: newName !== currentUser?.name ? newName : undefined,
        noteId: newNoteId !== currentUser?.noteId ? newNoteId : undefined,
      });
      onAuthSuccess(updated);
      setSuccessMsg('Profile updated successfully.');
      loadLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await accountApi.changePassword({ currentPassword, newPassword });
      setSuccessMsg('Password changed successfully. Logging out of all sessions...');
      setTimeout(() => {
        onLogout();
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center p-4 text-charcoal select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-creamCard dark:bg-charcoalDarkCard border border-charcoal/15 dark:border-white/10 rounded-[32px] shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col md:flex-row h-[550px]"
      >
        {/* Left Side: Dynamic Info Banner */}
        <div className="md:w-1/3 bg-gradient-to-br from-warmAmber to-warmAmberHover p-8 text-white flex flex-col justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-serif font-bold tracking-tight mb-2">
              {currentUser ? 'Your Profile' : 'Aura Space'}
            </h2>
            <p className="text-xs text-white/80 leading-relaxed">
              {currentUser 
                ? 'Manage your personal security settings, export your data portability files, or view user activity history logs.' 
                : 'Secure your notes workspace and synchronize your ideas safely with end-to-end PII encryption at rest.'}
            </p>
          </div>
        </div>

        {/* Right Side: Tab Contents */}
        <div className="flex-1 p-8 flex flex-col overflow-y-auto relative text-charcoal dark:text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all text-charcoalMuted dark:text-gray-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Error and Success Alert Banners */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-start gap-2.5"
              >
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!currentUser ? (
            /* =================================================================
             * GUEST MODE: AUTHENTICATION
             * ================================================================= */
            <div className="flex-1 flex flex-col">
              {/* Tab Selector */}
              <div className="flex border-b border-charcoal/10 dark:border-white/5 mb-6 shrink-0">
                <button
                  onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
                  className={`pb-3 px-4 text-xs font-sans font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'login' 
                      ? 'border-warmAmber text-warmAmber' 
                      : 'border-transparent text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
                  className={`pb-3 px-4 text-xs font-sans font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'register' 
                      ? 'border-warmAmber text-warmAmber' 
                      : 'border-transparent text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoalMuted dark:text-gray-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@domain.com"
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Password</label>
                        <button
                          type="button"
                          onClick={() => { setActiveTab('forgot'); setErrorMsg(null); setSuccessMsg(null); }}
                          className="text-[10px] font-sans font-bold text-warmAmber hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoalMuted dark:text-gray-400" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-charcoal hover:bg-charcoal/90 text-white dark:bg-white dark:text-neutral-900 hover:dark:bg-white/90 py-3 rounded-xl text-xs font-sans font-bold transition-all shadow-md mt-6 cursor-pointer"
                  >
                    {loading ? 'Signing In...' : 'Access Account'}
                  </button>
                </form>
              )}

              {activeTab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5 flex-1 flex flex-col justify-between overflow-y-auto pr-1">
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Legal Name</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full px-3.5 py-2 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Date of Birth</label>
                        <input
                          type="date"
                          required
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@domain.com"
                        className="w-full px-3.5 py-2 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Password (Min 12 Chars)</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Must contain upper, lower, numbers, symbols"
                        className="w-full px-3.5 py-2 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                      />
                    </div>

                    <div className="space-y-2 mt-2 pt-1 border-t border-charcoal/10 dark:border-white/5">
                      <label className="flex items-start gap-2.5 text-[10px] text-charcoalMuted dark:text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={tosAccepted}
                          onChange={(e) => setTosAccepted(e.target.checked)}
                          className="mt-0.5 accent-warmAmber cursor-pointer"
                        />
                        <span>I accept the Aura Space Terms of Service and user code conditions</span>
                      </label>
                      <label className="flex items-start gap-2.5 text-[10px] text-charcoalMuted dark:text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={ppAccepted}
                          onChange={(e) => setPpAccepted(e.target.checked)}
                          className="mt-0.5 accent-warmAmber cursor-pointer"
                        />
                        <span>I consent to personal data collection under the Privacy Policy</span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-charcoal hover:bg-charcoal/90 text-white dark:bg-white dark:text-neutral-900 hover:dark:bg-white/90 py-2.5 rounded-xl text-xs font-sans font-bold transition-all shadow-md mt-4 cursor-pointer"
                  >
                    {loading ? 'Creating...' : 'Register Workspace'}
                  </button>
                </form>
              )}

              {activeTab === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-sans font-bold text-charcoal dark:text-white mb-2">Reset Password</h3>
                    <p className="text-[11px] text-charcoalMuted dark:text-gray-400 leading-relaxed">
                      Enter your email address below and we'll submit a reset request to the developer.
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoalMuted dark:text-gray-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@domain.com"
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-charcoal hover:bg-charcoal/90 text-white dark:bg-white dark:text-neutral-900 hover:dark:bg-white/90 py-3 rounded-xl text-xs font-sans font-bold transition-all shadow-md cursor-pointer"
                    >
                      {loading ? 'Sending Request...' : 'Send Request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
                      className="w-full border border-charcoal/15 dark:border-white/10 text-charcoal dark:text-white py-2 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* =================================================================
             * AUTHENTICATED MODE: PROFILE & SECURITY SETTINGS
             * ================================================================= */
            <div className="flex-1 flex flex-col">
              {/* Settings Nav Tabs */}
              <div className="flex border-b border-charcoal/10 dark:border-white/5 mb-5 shrink-0 overflow-x-auto">
                <button
                  onClick={() => { setActiveSettingsTab('profile'); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`pb-2.5 px-3.5 text-xs font-sans font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeSettingsTab === 'profile' ? 'border-warmAmber text-warmAmber' : 'border-transparent text-charcoalMuted dark:text-gray-400'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Details
                </button>
                <button
                  onClick={() => { setActiveSettingsTab('password'); setErrorMsg(null); setSuccessMsg(null); }}
                  className={`pb-2.5 px-3.5 text-xs font-sans font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeSettingsTab === 'password' ? 'border-warmAmber text-warmAmber' : 'border-transparent text-charcoalMuted dark:text-gray-400'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> Security
                </button>
                <button
                  onClick={() => { setActiveSettingsTab('logs'); setErrorMsg(null); setSuccessMsg(null); loadLogs(); }}
                  className={`pb-2.5 px-3.5 text-xs font-sans font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeSettingsTab === 'logs' ? 'border-warmAmber text-warmAmber' : 'border-transparent text-charcoalMuted dark:text-gray-400'
                  }`}
                >
                  <List className="w-3.5 h-3.5" /> Audit Log
                </button>
              </div>

              {activeSettingsTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Name</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Note ID</label>
                      <input
                        type="text"
                        required
                        value={newNoteId}
                        onChange={(e) => setNewNoteId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                      />
                    </div>
                    <div className="text-[10px] text-charcoalMuted dark:text-gray-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Member Since:{' '}
                      {new Date(currentUser.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || (newName === currentUser.name && newNoteId === currentUser.noteId)}
                    className="w-full bg-charcoal hover:bg-charcoal/90 text-white dark:bg-white dark:text-neutral-900 hover:dark:bg-white/90 py-3 rounded-xl text-xs font-sans font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Update Profile'}
                  </button>
                </form>
              )}

              {activeSettingsTab === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400">New Password (Min 12 Chars)</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ensure complexity rules are met"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-transparent text-sm focus:border-warmAmber focus:ring-0 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-charcoal hover:bg-charcoal/90 text-white dark:bg-white dark:text-neutral-900 hover:dark:bg-white/90 py-3 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer"
                  >
                    {loading ? 'Changing Password...' : 'Update Password & Logout Other Devices'}
                  </button>
                </form>
              )}

              {activeSettingsTab === 'logs' && (
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-[10px] font-sans font-bold uppercase text-charcoalMuted dark:text-gray-400 mb-2 shrink-0">Account Activity Log</h4>
                  <div className="flex-1 overflow-y-auto space-y-2 border border-charcoal/15 dark:border-white/5 rounded-xl p-3 bg-charcoal/[0.02] dark:bg-white/[0.01]">
                    {auditLogs.length === 0 ? (
                      <p className="text-xs text-charcoalMuted dark:text-gray-500 text-center py-6">No historical logs found.</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="text-[10px] border-b border-charcoal/5 dark:border-white/5 pb-1.5 last:border-b-0 last:pb-0 flex justify-between items-start gap-4">
                          <div>
                            <span className="font-bold text-charcoal dark:text-white mr-1.5">{log.eventType}</span>
                            {log.metadata?.fields_changed && (
                              <span className="text-[9px] text-charcoalMuted dark:text-gray-500">
                                ({log.metadata.fields_changed.join(', ')})
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-charcoalMuted dark:text-gray-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
