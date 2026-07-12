import React from 'react';
import { Lock, Trash2, Folder, Archive, TrendingUp, DollarSign, User, Calendar, Info, LogOut } from 'lucide-react';

interface SidebarProps {
  selectedSubFilter: 'none' | 'archive' | 'locked' | 'deleted' | 'tracker' | 'expense' | 'details' | 'briefings' | 'about' | 'developers';
  onSelectCategory: (id: string) => void;
  onSelectSubFilter: (filter: 'none' | 'archive' | 'locked' | 'deleted' | 'tracker' | 'expense' | 'details' | 'briefings' | 'about' | 'developers') => void;
  isDevLogged?: boolean;
  onDevLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedSubFilter,
  onSelectCategory,
  onSelectSubFilter,
  isDevLogged = false,
  onDevLogout,
}) => {
  return (
    <aside className="w-full md:w-[300px] h-full flex flex-col bg-creamCard dark:bg-charcoalDarkCard rounded-none border-t-0 border-b-0 border-l-0 border-r border-charcoal/20 dark:border-white/5 p-6 select-none shrink-0 transition-all duration-200 overflow-hidden relative">
      
      {/* Sidebar Header */}
      <div className="mb-6 shrink-0 border-b border-charcoal/10 dark:border-white/5 pb-4">
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => onSelectSubFilter('details')}
            className="flex items-center gap-2.5 text-left hover:opacity-85 transition-all cursor-pointer group min-w-0"
            title="View Profile Details"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-serif font-bold text-sm shadow-md group-hover:scale-105 transition-transform shrink-0">
              S
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-serif font-bold text-charcoal dark:text-white leading-tight truncate">
                strata notes
              </h1>
              <p className="text-[10px] font-sans text-charcoalMuted dark:text-gray-400">
                Workspace Profile
              </p>
            </div>
          </button>
          
          <button
            onClick={() => onSelectSubFilter('details')}
            className={`p-2 rounded-xl border border-charcoal/15 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0 ${
              selectedSubFilter === 'details' ? 'bg-charcoal text-white dark:bg-white/15 dark:text-white' : 'text-charcoalMuted dark:text-gray-400'
            }`}
            title="Edit Profile Details"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        <button
          onClick={() => {
            onSelectSubFilter('none');
            onSelectCategory('all');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'none'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <Folder className="w-4 h-4 text-blue-500" /> Active Notes
        </button>

        {/* Basic Details menu item removed as it is now in the header beside the name */}

        <button
          onClick={() => {
            onSelectSubFilter('briefings');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center justify-between cursor-pointer ${
            selectedSubFilter === 'briefings'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-emerald-500" /> Meetings
          </div>
          {!isDevLogged && <Lock className="w-3 h-3 text-charcoalMuted/50 dark:text-gray-500" />}
        </button>

        <button
          onClick={() => {
            onSelectSubFilter('tracker');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'tracker'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-orange-500" /> Progress Trackers
        </button>

        <button
          onClick={() => {
            onSelectSubFilter('expense');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'expense'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <DollarSign className="w-4 h-4 text-purple-500" /> Finance Trackers
        </button>

        <button
          onClick={() => {
            onSelectSubFilter('locked');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'locked'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-500" /> Locked Notes
        </button>

        <button
          onClick={() => {
            onSelectSubFilter('archive');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'archive'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <Archive className="w-4 h-4 text-purple-500" /> Archived Notes
        </button>

        <button
          onClick={() => {
            onSelectSubFilter('deleted');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'deleted'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-500" /> Trash Bin (Deleted)
        </button>

        <button
          onClick={() => {
            onSelectSubFilter('about');
          }}
          className={`w-full text-left px-4 py-3 text-xs font-sans font-semibold transition-all flex items-center gap-3 cursor-pointer ${
            selectedSubFilter === 'about'
              ? 'bg-charcoal text-white dark:bg-white/10 dark:text-white'
              : 'text-charcoalMuted hover:bg-charcoal/5 dark:hover:bg-white/5 dark:text-gray-400'
          }`}
        >
          <Info className="w-4 h-4 text-amber-500" /> About strata
        </button>

        {/* Developers menu item removed as it is now integrated into the About page */}
      </div>

      {/* Dev Mode Status & Action / Guest Mode Info */}
      <div className="mt-auto pt-4 border-t border-charcoal/10 dark:border-white/5 shrink-0">
        {isDevLogged ? (
          <div className="space-y-2">
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Developer Mode</span>
            </div>
            {onDevLogout && (
              <button
                onClick={onDevLogout}
                className="w-full px-4 py-2 border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-1.5 justify-center"
              >
                <LogOut className="w-3.5 h-3.5" /> Dev Logout
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-bold uppercase tracking-wider flex flex-col gap-1 items-center justify-center text-center">
            <span>🧪 Sample Sandbox</span>
            <span className="text-[8px] font-medium lowercase text-gray-500 dark:text-zinc-400 leading-normal">
              Notes & sheets are temporary and cleared when closing the tab.
            </span>
          </div>
        )}
      </div>

    </aside>
  );
};
