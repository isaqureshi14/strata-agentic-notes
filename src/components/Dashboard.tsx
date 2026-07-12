import React, { useState } from 'react';
import { 
  Menu, Search, Pin, Lock, Unlock, Eye, EyeOff, CheckSquare, Image as ImageIcon, Plus, MoreVertical, X, Sun, Moon,
  Archive, Trash2, ArrowUpDown, Check, FileText, Table, RotateCcw, MessageSquare, CheckCircle, Code
} from 'lucide-react';
import { type Note, type Category, type SortOption } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  notes: Note[];
  selectedCategoryId: string;
  selectedSubFilter: 'none' | 'archive' | 'locked' | 'deleted' | 'tracker' | 'expense' | 'details' | 'briefings' | 'about' | 'developers';
  categories: Category[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectCategory: (id: string) => void;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onCreateNoteWithType: (type: 'note' | 'document' | 'sheet' | 'tracker' | 'expense') => void;
  onPinNote: (id: string, e: React.MouseEvent) => void;
  onArchiveNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchArchive: (ids: string[], archiveState: boolean) => void;
  onBatchPin: (ids: string[], pinState: boolean) => void;
  onBatchLock: (ids: string[]) => void;
  onBatchRestore: (ids: string[]) => void;
  onUpdateNoteCategory: (noteId: string, categoryId: string | undefined) => void;
  onCreateCategory: (name: string) => void;
  onToggleSidebar: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleLock: (id: string) => void;
  onToggleHideNote: (id: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onReorderNotes: (draggedId: string, targetId: string) => void;
  onOpenDeveloperPortal?: () => void;
  isDevLogged?: boolean;
}

// Framer Motion Animation Variants
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as const
    }
  }
};

export const Dashboard: React.FC<DashboardProps> = ({
  notes,
  selectedCategoryId,
  selectedSubFilter,
  categories,
  searchQuery,
  onSearchChange,
  onSelectCategory,
  onSelectNote,
  onCreateNote,
  onCreateNoteWithType,
  onPinNote,
  onArchiveNote,
  onDeleteNote,
  onRestoreNote,
  onBatchDelete,
  onBatchArchive,
  onBatchPin,
  onBatchLock,
  onBatchRestore,
  onUpdateNoteCategory,
  onCreateCategory,
  onToggleSidebar,
  darkMode,
  onToggleDarkMode,
  onToggleLock,
  onToggleHideNote,
  sortBy,
  onSortChange,
  onReorderNotes,
  onOpenDeveloperPortal,
  isDevLogged = false,
}) => {
  const [activeMenuNoteId, setActiveMenuNoteId] = useState<string | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [fabExpanded, setFabExpanded] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  // Feedback Form State
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    
    const existing = localStorage.getItem('antigravity_web_feedback');
    const list = existing ? JSON.parse(existing) : [];
    list.push({
      id: 'fb-' + Date.now(),
      text: feedbackText,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('antigravity_web_feedback', JSON.stringify(list));
    setFeedbackText('');
    setFeedbackSaved(true);
    setTimeout(() => setFeedbackSaved(false), 2000);
  };



  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnter = (targetId: string) => {
    if (draggedId === null || draggedId === targetId) return;
    onReorderNotes(draggedId, targetId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSortDropdownOpen(false);
        setActiveMenuNoteId(null);
      }
    };
    const handleGlobalClick = () => {
      setIsSortDropdownOpen(false);
      setActiveMenuNoteId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // Helper icons for categories
  const getCategoryName = () => {
    if (selectedSubFilter !== 'none') {
      switch (selectedSubFilter) {
        case 'archive': return 'Archived notes';
        case 'locked': return 'Locked notes';
        case 'deleted': return 'Trash bin';
        default: return 'All notes';
      }
    }
    if (selectedCategoryId === 'all') {
      return 'All notes';
    }
    const cat = categories.find(c => c.id === selectedCategoryId);
    return cat ? `${cat.name} notes` : 'All notes';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSnippet = (text: string, maxLen = 120) => {
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean || 'Empty note';
  };

  const getSheetPreview = (note: Note): string => {
    try {
      const parsed = JSON.parse(note.content);
      const cells = parsed.data || {};
      const cellValues = Object.entries(cells)
        .map(([, info]: any) => info?.value)
        .filter((val): val is string => !!val && val.trim() !== '');
      if (cellValues.length === 0) return 'Empty Spreadsheet Grid';
      return `Grid: ${cellValues.slice(0, 6).join(', ')}${cellValues.length > 6 ? '…' : ''}`;
    } catch {
      return 'Spreadsheet Grid';
    }
  };

  const getTrackerPreview = (note: Note): string => {
    try {
      const parsed = JSON.parse(note.content);
      const subjects = parsed.subjects || [];
      if (subjects.length === 0) return 'No metrics configured';
      const items = subjects.map((s: any) => `${s.name}: ${s.marks[s.marks.length - 1] ?? 'N/A'}`);
      return `Latest: ${items.slice(0, 3).join(', ')}${items.length > 3 ? '…' : ''}`;
    } catch {
      return 'Progress Tracker';
    }
  };

  const getExpensePreview = (note: Note): string => {
    try {
      const parsed = JSON.parse(note.content);
      const txs = parsed.transactions || [];
      if (txs.length === 0) return 'No transactions logged';
      
      const totalExp = txs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      const totalInc = txs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      return `Total Expenses: ₹${totalExp.toFixed(2)} | Total Income: ₹${totalInc.toFixed(2)} (${txs.length} transactions)`;
    } catch {
      return 'Expense Tracker';
    }
  };

  // Determines card display variant for visual differentiation
  const getCardVariant = (note: Note): 'checklist' | 'media' | 'standard' => {
    if (!note.locked && (note.image || note.drawing)) return 'media';
    if (note.checklist && note.checklist.length > 0) return 'checklist';
    return 'standard';
  };

  // Determines dynamic grid width to center few notes beautifully without left bias
  const pinnedNotesCount = notes.filter(n => n.pinned).length;
  const otherNotesCount = notes.filter(n => !n.pinned).length;
  const maxActiveCount = Math.max(pinnedNotesCount, otherNotesCount);
  const getGridMaxWidthClass = (count: number) => {
    if (count <= 0) return 'max-w-6xl';
    if (count === 1) return 'max-w-md';
    if (count === 2) return 'max-w-3xl';
    if (count === 3) return 'max-w-5xl';
    return 'max-w-6xl';
  };
  const maxWidthClass = getGridMaxWidthClass(maxActiveCount);

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-warmBg overflow-hidden relative select-none">
      
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-[120px] animate-blob-1" />
        <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-amber-100/30 dark:bg-amber-950/15 rounded-full blur-[140px] animate-blob-2" />
        <div className="absolute -bottom-20 left-1/4 w-[500px] h-[500px] bg-blue-200/20 dark:bg-blue-950/10 rounded-full blur-[120px] animate-blob-3" />
      </div>

      {/* Title & Count Header (Centered Samsung Notes Style) */}
      <div className="pt-12 pb-6 flex flex-col items-center justify-center shrink-0 relative z-10">
        <h2 className="text-4xl font-sans font-normal text-charcoal tracking-tight">
          {getCategoryName()}
        </h2>
        <span className="text-xs font-sans text-charcoalMuted mt-1.5">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
        {sortBy === 'custom' && notes.length > 1 && (
          <span className="text-[10px] font-sans text-warmAmber mt-1 animate-pulse">
            Drag and drop notes to reorder them
          </span>
        )}
        {!isDevLogged && (
          <button
            onClick={() => document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-3 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/15 rounded-full text-[10px] font-sans font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-500/20 dark:border-emerald-400/20 active:scale-95 shadow-sm"
            title="Scroll to Feedback / Suggestions Section"
          >
            <MessageSquare className="w-3.5 h-3.5" /> What do you think?
          </button>
        )}
      </div>

      {/* Toolbar row */}
      <div className="border-b border-charcoalLight dark:border-white/5 shrink-0 bg-white/60 dark:bg-warmBg/60 backdrop-blur-md relative z-20">
        <div className="max-w-6xl mx-auto w-full px-6 py-2.5 flex items-center gap-3">
          {/* Hamburger menu toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 shrink-0 text-charcoal dark:text-white hover:bg-creamCardHover dark:hover:bg-white/5 transition-all cursor-pointer rounded-lg"
            title="Open Drawer Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

        {/* Persistent Search Bar */}
        <div className="flex-1 flex items-center gap-2 bg-warmBg dark:bg-white/5 border border-charcoalLight dark:border-white/8 px-3.5 py-2 rounded-xl">
          <Search className="w-4 h-4 text-charcoalMuted dark:text-gray-500 shrink-0" />
          <input
            id="dashboard-search-input"
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs font-sans bg-transparent border-none outline-none focus:ring-0 text-charcoal dark:text-white placeholder:text-charcoalMuted dark:placeholder:text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-charcoalMuted hover:text-charcoal dark:hover:text-white cursor-pointer transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 shrink-0 text-charcoal dark:text-white hover:bg-creamCardHover dark:hover:bg-white/5 transition-all cursor-pointer rounded-lg"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Developer Portal button */}
        {onOpenDeveloperPortal && (
          <button
            onClick={onOpenDeveloperPortal}
            className="p-2 shrink-0 text-charcoal dark:text-white hover:bg-creamCardHover dark:hover:bg-white/5 transition-all cursor-pointer rounded-lg flex items-center gap-1.5"
            title="Developer Portal"
          >
            <Code className="w-4 h-4" />
            <span className="hidden sm:inline text-[10px] font-sans font-bold uppercase tracking-wider">
              {isDevLogged ? 'Console' : 'Dev Portal'}
            </span>
          </button>
        )}


        {/* Sort selector dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSortDropdownOpen(!isSortDropdownOpen);
            }}
            className="p-2 text-charcoal dark:text-white hover:bg-creamCardHover dark:hover:bg-white/5 transition-all cursor-pointer rounded-lg flex items-center gap-1.5"
            title="Sort Notes"
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
          
          {isSortDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1.5 w-48 bg-creamCard dark:bg-charcoalDarkCard border border-charcoal/25 dark:border-white/10 rounded-2xl shadow-xl z-30 py-2 text-xs font-sans text-charcoal dark:text-white select-none"
            >
              <div className="px-4 py-1 text-[9px] font-bold text-charcoalMuted/60 dark:text-gray-500 uppercase tracking-wider">
                Sort By
              </div>
                {[
                  { value: 'updated-desc', label: 'Date Updated (Newest)' },
                  { value: 'updated-asc', label: 'Date Updated (Oldest)' },
                  { value: 'title-asc', label: 'Alphabetical (A-Z)' },
                  { value: 'title-desc', label: 'Alphabetical (Z-A)' },
                  { value: 'custom', label: 'Custom (Drag & Drop)' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSortChange(opt.value as SortOption);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between ${
                      sortBy === opt.value ? 'font-bold text-warmAmber' : ''
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.value && <Check className="w-3.5 h-3.5 text-warmAmber" />}
                  </button>
                ))}
              </div>
          )}
        </div>

        {/* Multi-Select Edit Mode Toggle */}
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            setSelectedNoteIds(new Set());
          }}
          className={`px-3 py-1.5 rounded-lg border transition-all text-xs font-sans font-semibold cursor-pointer shrink-0 ${
            isEditMode 
              ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' 
              : 'border-charcoal/25 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
          }`}
          title="Select multiple notes"
        >
          {isEditMode ? 'Cancel' : 'Edit'}
        </button>
        </div>
      </div>

      {/* Category Selection Filter Strip */}
      {selectedSubFilter === 'none' && (
        <div className="border-b border-charcoalLight dark:border-white/5 shrink-0 bg-creamCard/60 dark:bg-charcoalDarkCard/60 backdrop-blur-md relative z-10">
          <div className="max-w-6xl mx-auto w-full px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-sans font-semibold border transition-all cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-charcoal text-white border-charcoal dark:bg-transparent dark:text-white dark:border-white'
                : 'bg-white border-charcoalLight text-charcoalMuted hover:text-charcoal dark:bg-transparent dark:border-white/10 dark:text-charcoalMuted'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-sans font-semibold border transition-all cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-charcoal text-white border-charcoal dark:bg-transparent dark:text-white dark:border-white'
                  : 'bg-white border-charcoalLight text-charcoalMuted hover:text-charcoal dark:bg-transparent dark:border-white/10 dark:text-charcoalMuted'
              }`}
            >
              {cat.name}
            </button>
          ))}
          
          <button
            onClick={() => {
              const name = window.prompt("Enter new category name:");
              if (name && name.trim()) {
                onCreateCategory(name.trim());
              }
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold border border-charcoal/25 text-charcoal hover:bg-charcoal/5 dark:border-white/20 dark:text-white dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Create New Category"
          >
            <Plus className="w-3.5 h-3.5" /> Category
          </button>
          </div>
        </div>
      )}

      {/* Grid of Note Cards — Google Keep-style Masonry Layout */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 flex flex-col items-center">
        <div className={`w-full ${maxWidthClass} px-4 pt-4 pb-20 mx-auto`}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <span className="text-sm font-sans text-charcoalMuted">No notes found.</span>
            <button
              onClick={onCreateNote}
              className="px-5 py-2.5 bg-charcoal text-white hover:bg-charcoal/90 dark:bg-transparent dark:border dark:border-white/20 dark:text-white hover:dark:bg-white/5 text-xs font-sans font-bold transition-all cursor-pointer shadow-md"
            >
              + Create a Note
            </button>
          </div>
        ) : (() => {
          const pinnedNotes = notes.filter(n => n.pinned);
          const otherNotes = notes.filter(n => !n.pinned);

          const getGridColumnCountClass = (count: number) => {
            if (count <= 1) return 'columns-1';
            if (count === 2) return 'columns-1 sm:columns-2';
            if (count === 3) return 'columns-1 sm:columns-2 md:columns-3';
            return 'columns-2 md:columns-3 lg:columns-4';
          };

          const renderCard = (note: Note) => {
            const variant = getCardVariant(note);
            const hasMedia = variant === 'media';
            const isChecklist = variant === 'checklist';
            const visibleChecklist = (note.checklist || []).slice(0, 5);
            const extraChecklistCount = (note.checklist?.length || 0) - visibleChecklist.length;

            return (
              <motion.div
                key={note.id}
                layout
                variants={cardVariants}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
                whileHover={sortBy === 'custom' || isEditMode ? {} : { y: -3, transition: { duration: 0.2 } }}
                onClick={() => {
                  if (isEditMode) toggleSelectNote(note.id);
                  else onSelectNote(note);
                }}
                onMouseMove={handleMouseMove}
                draggable={sortBy === 'custom' && !isEditMode}
                onDragStart={(e: any) => handleDragStart(e, note.id)}
                onDragEnter={() => handleDragEnter(note.id)}
                onDragEnd={() => handleDragEnd()}
                className={`break-inside-avoid block w-full mb-4 cursor-pointer relative group
                  rounded-2xl border transition-all duration-200
                  bg-creamCard dark:bg-[#1C1C1E]
                  hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
                  ${sortBy === 'custom' && !isEditMode ? 'active:cursor-grabbing' : ''}
                  ${draggedId === note.id ? 'opacity-20 scale-95 border-dashed border-charcoal/40' : ''}
                  ${
                    activeMenuNoteId === note.id ? 'z-30' : 'overflow-hidden'
                  }
                  ${
                    isEditMode && selectedNoteIds.has(note.id)
                      ? 'border-warmAmber ring-2 ring-warmAmber/30'
                      : 'border-charcoal/10 dark:border-white/8 hover:border-charcoal/25 dark:hover:border-white/20'
                  }
                `}
              >
                {/* Spotlight glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 spotlight-glow rounded-2xl" />

                {/* Full-width media thumbnail at card top */}
                {hasMedia && (
                  <div className="w-full h-36 overflow-hidden bg-charcoal/5 dark:bg-white/5 rounded-t-2xl">
                    <img
                      src={note.drawing || note.image}
                      alt="Preview"
                      className="w-full h-full object-cover opacity-95 transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="relative z-10 p-4 flex flex-col gap-2.5">

                  {/* Top meta row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isEditMode && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          selectedNoteIds.has(note.id)
                            ? 'bg-warmAmber border-warmAmber'
                            : 'border-charcoal/25 dark:border-white/20 bg-white dark:bg-[#2A2A2C]'
                        }`}>
                          {selectedNoteIds.has(note.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          note.categoryId ? 'bg-warmAmber' : 'bg-charcoal/15 dark:bg-white/10'
                        }`}
                        title={note.categoryId
                          ? `Category: ${categories.find(c => c.id === note.categoryId)?.name || note.categoryId}`
                          : 'Uncategorized'
                        }
                      />
                      {note.pinned && (
                        <Pin className="w-3 h-3 text-warmAmber fill-warmAmber" />
                      )}
                      {note.type === 'note' && (
                        <span className="text-[8px] font-sans font-bold text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Note</span>
                      )}
                      {note.type === 'document' && (
                        <span className="text-[8px] font-sans font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Doc</span>
                      )}
                      {note.type === 'sheet' && (
                        <span className="text-[8px] font-sans font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Sheet</span>
                      )}
                      {note.type === 'tracker' && (
                        <span className="text-[8px] font-sans font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Tracker</span>
                      )}
                      {note.type === 'expense' && (
                        <span className="text-[8px] font-sans font-bold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Expense</span>
                      )}
                    </div>

                    <div className="relative">
                      {!isEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuNoteId(activeMenuNoteId === note.id ? null : note.id);
                          }}
                          className="p-1 text-charcoalMuted hover:text-charcoal dark:hover:text-white transition-all cursor-pointer rounded-full hover:bg-charcoal/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100"
                          title="Note Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {activeMenuNoteId === note.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-44 bg-creamCard dark:bg-charcoalDarkCard border border-charcoal/25 dark:border-white/10 rounded-2xl shadow-xl z-30 py-2 animate-fadeIn text-xs font-sans text-charcoal dark:text-white select-none"
                        >
                          {note.deleted ? (
                            <>
                              <button
                                onClick={() => { onRestoreNote(note.id); setActiveMenuNoteId(null); }}
                                className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer text-charcoal dark:text-white"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restore Note
                              </button>

                              <button
                                onClick={() => {
                                  onDeleteNote(note.id);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-500 transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                Delete Permanently
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  onPinNote(note.id, e);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer text-charcoal dark:text-white"
                              >
                                <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-charcoal' : ''}`} />
                                {note.pinned ? 'Unpin Note' : 'Pin Note'}
                              </button>

                              <button
                                onClick={() => {
                                  onArchiveNote(note.id);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer text-charcoal dark:text-white"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                {note.archived ? 'Unarchive Note' : 'Archive Note'}
                              </button>

                              <button
                                onClick={() => {
                                  onDeleteNote(note.id);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-500 transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                Delete Note
                              </button>

                              <button
                                onClick={() => {
                                  onToggleLock(note.id);
                                  setActiveMenuNoteId(null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer text-charcoal dark:text-white"
                              >
                                {note.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                {note.locked ? 'Unlock Note' : 'Lock Note'}
                              </button>

                              {note.locked && (
                                <button
                                  onClick={() => {
                                    onToggleHideNote(note.id);
                                    setActiveMenuNoteId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer text-charcoal dark:text-white"
                                >
                                  {note.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  {note.hidden ? 'Show in Active Notes' : 'Hide from Active Notes'}
                                </button>
                              )}
                            </>
                          )}

                          {!note.deleted && (
                            <>
                              <div className="h-[1px] bg-charcoal/10 dark:bg-white/10 my-1" />

                              <div className="px-4 py-1 text-[9px] font-bold text-charcoalMuted/60 dark:text-gray-500 uppercase tracking-wider">
                                Move to Category
                              </div>

                              <button
                                onClick={() => {
                                  onUpdateNoteCategory(note.id, undefined);
                                  setActiveMenuNoteId(null);
                                }}
                                className={`w-full text-left px-4 py-1.5 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer pl-6 ${!note.categoryId ? 'font-bold text-warmAmber' : ''}`}
                              >
                                • Uncategorized
                              </button>

                              {categories.map((cat) => (
                                <button
                                  key={cat.id}
                                  onClick={() => {
                                    onUpdateNoteCategory(note.id, cat.id);
                                    setActiveMenuNoteId(null);
                                  }}
                                  className={`w-full text-left px-4 py-1.5 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer pl-6 ${note.categoryId === cat.id ? 'font-bold text-warmAmber' : ''}`}
                                >
                                  • {cat.name}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Title */}
                  <div className="flex items-center gap-1.5">
                    {note.locked && <Lock className="w-3.5 h-3.5 text-charcoalMuted dark:text-gray-400 shrink-0" />}
                    <h4 className="font-sans font-bold text-sm text-charcoal dark:text-white leading-snug line-clamp-2">
                      {note.title || 'Untitled Note'}
                    </h4>
                  </div>

                  {/* Content: checklist / text / sheet */}
                  {note.locked ? (
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-500 italic">
                      This note is passcode locked.
                    </p>
                  ) : isChecklist ? (
                    <div className="flex flex-col gap-1.5">
                      {visibleChecklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            item.completed
                              ? 'bg-warmAmber/80 border-warmAmber'
                              : 'border-charcoal/25 dark:border-white/20'
                          }`}>
                            {item.completed && (
                              <svg className="w-2 h-2 text-white" viewBox="0 0 10 10" fill="none">
                                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-sans leading-tight ${
                            item.completed
                              ? 'line-through text-charcoalMuted dark:text-gray-500'
                              : 'text-charcoal dark:text-white/85'
                          }`}>
                            {item.text || 'Untitled item'}
                          </span>
                        </div>
                      ))}
                      {extraChecklistCount > 0 && (
                        <span className="text-[10px] font-sans text-charcoalMuted dark:text-gray-500 pl-5">
                          +{extraChecklistCount} more item{extraChecklistCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ) : note.type === 'sheet' ? (
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-400 leading-relaxed line-clamp-3">
                      {getSheetPreview(note)}
                    </p>
                  ) : note.type === 'tracker' ? (
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-400 leading-relaxed line-clamp-3">
                      {getTrackerPreview(note)}
                    </p>
                  ) : note.type === 'expense' ? (
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-400 leading-relaxed line-clamp-3">
                      {getExpensePreview(note)}
                    </p>
                  ) : (
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-400 leading-relaxed line-clamp-4">
                      {getSnippet(note.content, 160)}
                    </p>
                  )}

                  {/* Card footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-charcoal/8 dark:border-white/8 text-[10px] font-sans text-charcoalMuted dark:text-gray-500">
                    <span>{formatDate(note.updatedAt)}</span>
                    <div className="flex items-center gap-1.5">
                      {note.checklist && note.checklist.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <CheckSquare className="w-3 h-3" />
                          {note.checklist.filter(i => i.completed).length}/{note.checklist.length}
                        </span>
                      )}
                      {note.image && <ImageIcon className="w-3 h-3" />}
                      {note.drawing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-charcoalMuted dark:bg-gray-500" />}
                    </div>
                  </div>

                </div>{/* end p-4 */}
              </motion.div>
            );
          };

          return (
            <motion.div variants={gridVariants} initial="hidden" animate="visible" className="w-full">
              <AnimatePresence mode="popLayout">

                {/* ── Pinned section ── */}
                {pinnedNotes.length > 0 && (
                  <>
                    <motion.p
                      key="pinned-label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-sans font-bold uppercase tracking-widest text-charcoalMuted dark:text-gray-500 mb-3 px-1 flex items-center gap-1.5"
                    >
                      <Pin className="w-3 h-3" /> Pinned
                    </motion.p>
                    <div className={`masonry-grid ${getGridColumnCountClass(pinnedNotes.length)} mb-6`}>
                      {pinnedNotes.map(renderCard)}
                    </div>
                  </>
                )}

                {/* ── Others section ── */}
                {otherNotes.length > 0 && (
                  <>
                    {pinnedNotes.length > 0 && (
                      <motion.p
                        key="others-label"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] font-sans font-bold uppercase tracking-widest text-charcoalMuted dark:text-gray-500 mb-3 px-1"
                      >
                        Others
                      </motion.p>
                    )}
                    <div className={`masonry-grid ${getGridColumnCountClass(otherNotes.length)}`}>
                      {otherNotes.map(renderCard)}
                    </div>
                  </>
                )}

              </AnimatePresence>
            </motion.div>
          );
        })()
        }

        {/* Home Page Feedback Section / Feedback Archive in Developer Mode */}
        {isDevLogged ? (
          <div id="feedback-section" className="mt-16 mb-8 max-w-2xl mx-auto p-6 bg-[#FCFBF7] dark:bg-[#1E1E1E] border border-charcoal/10 dark:border-white/5 rounded-3xl shadow-sm space-y-4 text-left">
            <div className="flex items-center justify-between text-charcoal dark:text-white pb-2 border-b border-charcoal/10 dark:border-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-bold font-serif">Guest Feedback Archive</h4>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('antigravity_web_feedback');
                  window.location.reload();
                }}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-sans font-bold transition-all cursor-pointer"
              >
                Clear All Archive
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {(() => {
                const saved = localStorage.getItem('antigravity_web_feedback');
                let feedbacks: any[] = [];
                if (saved) {
                  try { feedbacks = JSON.parse(saved); } catch {}
                }
                if (feedbacks.length === 0) {
                  return (
                    <div className="text-center py-8 text-charcoalMuted dark:text-zinc-500 text-xs">
                      No guest feedback archived yet.
                    </div>
                  );
                }
                return feedbacks.map((fb) => (
                  <div key={fb.id} className="p-3.5 bg-white dark:bg-[#151515] border border-charcoal/10 dark:border-white/5 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-1 text-left">
                      <p className="text-xs text-gray-800 dark:text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap">{fb.text}</p>
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium block">
                        Submitted: {new Date(fb.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const filtered = feedbacks.filter((f: any) => f.id !== fb.id);
                        localStorage.setItem('antigravity_web_feedback', JSON.stringify(filtered));
                        window.location.reload();
                      }}
                      className="p-1.5 hover:bg-rose-500/10 rounded-xl text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title="Delete Feedback"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : (
          <div id="feedback-section" className="mt-16 mb-8 max-w-xl mx-auto p-6 bg-[#FCFBF7] dark:bg-[#1E1E1E] border border-charcoal/10 dark:border-white/5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-charcoal dark:text-white">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-bold font-serif">Share Your Feedback</h4>
            </div>
            <p className="text-[11px] text-charcoalMuted dark:text-gray-400">How is your experience with strata? Let us know what changes we should make!</p>
            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Type your suggestions or comments here..."
                className="w-full h-24 p-3.5 rounded-2xl border border-charcoal/15 dark:border-white/10 bg-white dark:bg-[#151515] text-xs focus:border-charcoal dark:focus:border-white outline-none text-charcoal dark:text-white resize-none"
                required
              />
              <div className="flex justify-between items-center">
                {feedbackSaved ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 animate-bounce" /> Feedback saved locally. Thank you!
                  </span>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-charcoal text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl text-xs font-sans font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        )}

        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      {notes.length > 0 && (
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-center select-none">
          {/* Expanded Options */}
          <AnimatePresence>
            {fabExpanded && (
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={{
                  initial: { opacity: 0, y: 15 },
                  animate: { 
                    opacity: 1, 
                    y: 0,
                    transition: { staggerChildren: 0.05, delayChildren: 0.05 }
                  },
                  exit: { 
                    opacity: 0, 
                    y: 15,
                    transition: { duration: 0.15 }
                  }
                }}
                className="flex flex-col items-center gap-3 mb-3"
              >
                {/* Option 1: Standard Note */}
                <div className="flex items-center gap-2 group/fab relative">
                  <span className="bg-charcoal text-white dark:bg-[#1E1E1E] dark:border dark:border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold shadow-md opacity-0 group-hover/fab:opacity-100 transition-opacity pointer-events-none whitespace-nowrap absolute right-full mr-2">
                    Standard Note
                  </span>
                  <motion.button
                    variants={{
                      initial: { scale: 0, opacity: 0 },
                      animate: { scale: 1, opacity: 1 },
                      exit: { scale: 0, opacity: 0 }
                    }}
                    onClick={() => {
                      onCreateNoteWithType('note');
                      setFabExpanded(false);
                    }}
                    className="w-11 h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                    title="Create Standard Note"
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Option 2: Word Document */}
                <div className="flex items-center gap-2 group/fab relative">
                  <span className="bg-charcoal text-white dark:bg-[#1E1E1E] dark:border dark:border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold shadow-md opacity-0 group-hover/fab:opacity-100 transition-opacity pointer-events-none whitespace-nowrap absolute right-full mr-2">
                    Word Document
                  </span>
                  <motion.button
                    variants={{
                      initial: { scale: 0, opacity: 0 },
                      animate: { scale: 1, opacity: 1 },
                      exit: { scale: 0, opacity: 0 }
                    }}
                    onClick={() => {
                      onCreateNoteWithType('document');
                      setFabExpanded(false);
                    }}
                    className="w-11 h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                    title="Create Word Document"
                  >
                    <FileText className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Option 3: Spreadsheet */}
                <div className="flex items-center gap-2 group/fab relative">
                  <span className="bg-charcoal text-white dark:bg-[#1E1E1E] dark:border dark:border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-sans font-bold shadow-md opacity-0 group-hover/fab:opacity-100 transition-opacity pointer-events-none whitespace-nowrap absolute right-full mr-2">
                    Spreadsheet
                  </span>
                  <motion.button
                    variants={{
                      initial: { scale: 0, opacity: 0 },
                      animate: { scale: 1, opacity: 1 },
                      exit: { scale: 0, opacity: 0 }
                    }}
                    onClick={() => {
                      onCreateNoteWithType('sheet');
                      setFabExpanded(false);
                    }}
                    className="w-11 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                    title="Create Spreadsheet"
                  >
                    <Table className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB Trigger */}
          <motion.button
            onClick={() => setFabExpanded(!fabExpanded)}
            className="w-14 h-14 bg-charcoal text-white hover:bg-charcoal/90 dark:bg-transparent dark:border dark:border-white/20 dark:text-white hover:dark:bg-white/5 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
            title="Create New..."
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: fabExpanded ? 135 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Plus className="w-6 h-6" />
            </motion.div>
          </motion.button>
        </div>
      )}

      {/* Batch Actions Bar (fixed overlay at bottom) */}
      <AnimatePresence>
        {isEditMode && selectedNoteIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-creamCard dark:bg-[#1E1E1E] border border-charcoal/25 dark:border-white/10 px-6 py-3.5 rounded-2xl shadow-2xl z-30 flex items-center gap-6 text-xs font-sans text-charcoal dark:text-white select-none backdrop-blur-md"
          >
            <div className="font-bold text-charcoalMuted dark:text-gray-300">
              Selected: {selectedNoteIds.size}
            </div>

            <div className="w-[1px] h-4 bg-charcoal/20 dark:bg-white/10" />

            <button
              onClick={() => {
                const allSelected = selectedNoteIds.size === notes.length;
                if (allSelected) {
                  setSelectedNoteIds(new Set());
                } else {
                  setSelectedNoteIds(new Set(notes.map(n => n.id)));
                }
              }}
              className="hover:text-warmAmber transition-all cursor-pointer font-semibold text-charcoal dark:text-white"
            >
              {selectedNoteIds.size === notes.length ? 'Deselect All' : 'Select All'}
            </button>

            <div className="w-[1px] h-4 bg-charcoal/20 dark:bg-white/10" />

            {/* Batch Restore for Trash, or Batch Standard Actions */}
            {selectedSubFilter === 'deleted' ? (
              <>
                {/* Batch Restore */}
                <button
                  onClick={() => {
                    onBatchRestore(Array.from(selectedNoteIds));
                    setSelectedNoteIds(new Set());
                    setIsEditMode(false);
                  }}
                  className="hover:text-warmAmber transition-all cursor-pointer flex items-center gap-1.5 font-semibold text-charcoal dark:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-charcoal dark:text-white" /> Restore
                </button>

                <div className="w-[1px] h-4 bg-charcoal/20 dark:bg-white/10" />

                {/* Batch Permanent Delete */}
                <button
                  onClick={() => {
                    onBatchDelete(Array.from(selectedNoteIds));
                    setSelectedNoteIds(new Set());
                    setIsEditMode(false);
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete Permanently
                </button>
              </>
            ) : (
              <>
                {/* Batch Pin */}
                <button
                  onClick={() => {
                    const ids = Array.from(selectedNoteIds);
                    const someUnpinned = ids.some(id => !notes.find(n => n.id === id)?.pinned);
                    onBatchPin(ids, someUnpinned);
                    setSelectedNoteIds(new Set());
                    setIsEditMode(false);
                  }}
                  className="hover:text-warmAmber transition-all cursor-pointer flex items-center gap-1.5 font-semibold text-charcoal dark:text-white"
                >
                  <Pin className="w-3.5 h-3.5 text-charcoal dark:text-white" /> Pin
                </button>

                {/* Batch Archive */}
                <button
                  onClick={() => {
                    const ids = Array.from(selectedNoteIds);
                    const someUnarchived = ids.some(id => !notes.find(n => n.id === id)?.archived);
                    onBatchArchive(ids, someUnarchived);
                    setSelectedNoteIds(new Set());
                    setIsEditMode(false);
                  }}
                  className="hover:text-warmAmber transition-all cursor-pointer flex items-center gap-1.5 font-semibold text-charcoal dark:text-white"
                >
                  <Archive className="w-3.5 h-3.5 text-charcoal dark:text-white" /> Archive
                </button>

                {/* Batch Lock */}
                <button
                  onClick={() => {
                    onBatchLock(Array.from(selectedNoteIds));
                    setSelectedNoteIds(new Set());
                    setIsEditMode(false);
                  }}
                  className="hover:text-warmAmber transition-all cursor-pointer flex items-center gap-1.5 font-semibold text-charcoal dark:text-white"
                >
                  <Lock className="w-3.5 h-3.5 text-charcoal dark:text-white" /> Lock
                </button>

                {/* Batch Delete */}
                <button
                  onClick={() => {
                    onBatchDelete(Array.from(selectedNoteIds));
                    setSelectedNoteIds(new Set());
                    setIsEditMode(false);
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>



    </div>
  );
};
