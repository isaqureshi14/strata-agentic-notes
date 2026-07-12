import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { validator } from './utils/validation';
import { LockScreen } from './components/LockScreen';
import { DrawingCanvas } from './components/DrawingCanvas';
import { EmptyState } from './components/EmptyState';
import { Dashboard } from './components/Dashboard';
import { type Note, type Category, type SortOption } from './types';
import { Plus, ArrowRight, Menu, X, Trash2, Code, Eye, EyeOff, Lock } from 'lucide-react';
import { BasicDetails } from './components/BasicDetails';
import { AutoBriefings } from './components/AutoBriefings';
import { AboutSection } from './components/AboutSection';

// Mock Initial Categories (starts empty by default)
const INITIAL_CATEGORIES: Category[] = [];

// Initial empty notes database
const INITIAL_NOTES: Note[] = [];

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => {
    return sessionStorage.getItem('aura_has_started') === 'true';
  });

  const handleStart = (val: boolean) => {
    setHasStarted(val);
    sessionStorage.setItem('aura_has_started', String(val));
  };

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('aura_dark_mode') === 'true';
  });

  // Prevent browser back from exiting the app, routing back to home page dashboard instead
  useEffect(() => {
    window.history.pushState({ page: 'home' }, '');
    
    const handlePopState = () => {
      window.history.pushState({ page: 'home' }, '');
      setSelectedSubFilter('none');
      setSelectedCategoryId('all');
      setViewMode('home');
      setUnlockedNoteIds([]);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Developer Portal states for Welcome / Starting page
  const [showDevLoginWelcome, setShowDevLoginWelcome] = useState(false);
  const [showDevPortalWelcome, setShowDevPortalWelcome] = useState(() => {
    const shouldShow = sessionStorage.getItem('aura_show_dev_portal') === 'true';
    if (shouldShow) {
      sessionStorage.removeItem('aura_show_dev_portal');
    }
    return shouldShow;
  });
  const [devUserWelcome, setDevUserWelcome] = useState('');
  const [devPassWelcome, setDevPassWelcome] = useState('');
  const [devLoginErrorWelcome, setDevLoginErrorWelcome] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [isDevLoggedWelcome, setIsDevLoggedWelcome] = useState(() => {
    return sessionStorage.getItem('antigravity_dev_logged_in') === 'true';
  });
  const [feedbacksWelcome, setFeedbacksWelcome] = useState<any[]>([]);

  const loadFeedbacksWelcome = () => {
    const saved = localStorage.getItem('antigravity_web_feedback');
    if (saved) {
      try {
        setFeedbacksWelcome(JSON.parse(saved));
      } catch (e) {
        setFeedbacksWelcome([]);
      }
    } else {
      setFeedbacksWelcome([]);
    }
  };

  useEffect(() => {
    if (showDevPortalWelcome) {
      loadFeedbacksWelcome();
    }
  }, [showDevPortalWelcome]);

  const handleDevLoginSubmitWelcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (devUserWelcome === 'developer' && devPassWelcome === 'dev@2024') {
      sessionStorage.setItem('antigravity_dev_logged_in', 'true');
      sessionStorage.setItem('aura_show_dev_portal', 'true');
      setShowDevLoginWelcome(false);
      setDevUserWelcome('');
      setDevPassWelcome('');
      setDevLoginErrorWelcome('');
      setShowDevPassword(false);
      window.location.reload();
    } else {
      setDevLoginErrorWelcome('Invalid credentials. Access denied.');
    }
  };

  const handleDevLogoutWelcome = () => {
    setIsDevLoggedWelcome(false);
    sessionStorage.removeItem('antigravity_dev_logged_in');
    sessionStorage.removeItem('aura_has_started');
    setShowDevPortalWelcome(false);
    window.location.reload();
  };

  const handleDeleteFeedbackWelcome = (id: string) => {
    const saved = localStorage.getItem('antigravity_web_feedback');
    if (saved) {
      try {
        const list = JSON.parse(saved);
        const filtered = list.filter((f: any) => f.id !== id);
        localStorage.setItem('antigravity_web_feedback', JSON.stringify(filtered));
        setFeedbacksWelcome(filtered);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleClearAllWelcome = () => {
    localStorage.removeItem('antigravity_web_feedback');
    setFeedbacksWelcome([]);
  };



  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('aura_notes_list_v3');
    const initialNotes: Note[] = saved ? JSON.parse(saved) : INITIAL_NOTES;
    return initialNotes.map((note, index) => {
      if (note.customIndex === undefined) {
        return { ...note, customIndex: index };
      }
      return note;
    });
  });

  const [viewMode, setViewMode] = useState<'welcome' | 'home' | 'editor'>(() => {
    return 'home';
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('aura_categories_list_v3');
    const list = saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    return list.filter((c: Category) => !c.isDefault);
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubFilter, setSelectedSubFilter] = useState<'none' | 'archive' | 'locked' | 'deleted' | 'tracker' | 'expense' | 'details' | 'briefings' | 'about' | 'developers'>('none');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => {
    const active = notes.filter(n => !n.deleted && !n.archived);
    return active.length > 0 ? active[0].id : '';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('aura_sort_by');
    return (saved as SortOption) || 'updated-desc';
  });

  useEffect(() => {
    localStorage.setItem('aura_sort_by', sortBy);
  }, [sortBy]);
  
  // Security locks state
  // Security locks state
  const [lockedNoteToUnlock, setLockedNoteToUnlock] = useState<Note | null>(null);
  const [setupPasscodeNoteId, setSetupPasscodeNoteId] = useState<string | null>(null);
  const [unlockedNoteIds, setUnlockedNoteIds] = useState<string[]>([]);
  const [lockedNoteToRemoveLock, setLockedNoteToRemoveLock] = useState<string | null>(null);
  const [lockedNoteToDelete, setLockedNoteToDelete] = useState<string | null>(null);
  const [showCreateNoteTypeModal, setShowCreateNoteTypeModal] = useState<boolean>(false);

  // Drawing Canvas modal state
  const [drawingOpen, setDrawingOpen] = useState<boolean>(false);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('aura_notes_list_v3', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    cleanUpEmptyNotes();
  }, []);

  useEffect(() => {
    localStorage.setItem('aura_categories_list_v3', JSON.stringify(categories));
  }, [categories]);

  // Sync dark mode class with HTML document root
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('aura_dark_mode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('aura_dark_mode', 'false');
    }
  }, [darkMode]);

  // Handle Note selection with Lock screen boundary check
  const handleSelectNote = (note: Note): boolean => {
    if (note.locked && !unlockedNoteIds.includes(note.id)) {
      setLockedNoteToUnlock(note);
      return false;
    } else {
      setSelectedNoteId(note.id);
      return true;
    }
  };

  const handleUnlockSuccess = () => {
    if (lockedNoteToUnlock) {
      setUnlockedNoteIds((prev) => [...prev, lockedNoteToUnlock.id]);
      setSelectedNoteId(lockedNoteToUnlock.id);
      setViewMode('editor');
      setLockedNoteToUnlock(null);
    }
  };

  // Update note details
  const handleUpdateNote = (updatedNote: Note) => {
    try {
      validator.validateNote(updatedNote);
    } catch (e: any) {
      console.error('Note validation failed:', e.message);
      return; // Rejects saving if size or type schema mismatch
    }

    setNotes((prevNotes) =>
      prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n))
    );
  };

  // Toggle Pinned
  const handlePinNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes((prevNotes) =>
      prevNotes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n))
    );
  };

  // Delete note / Trash / Permanent
  const handleDeleteNote = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    if (note.locked) {
      // Require password before deleting
      setLockedNoteToDelete(id);
      return;
    }

    executeDeleteNote(id);
  };

  const executeDeleteNote = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    if (note.deleted) {
      // Permanent delete
      const updatedNotes = notes.filter((n) => n.id !== id);
      setNotes(updatedNotes);
      
      // Auto select next note
      const remaining = updatedNotes.filter((n) => n.deleted);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : '');
    } else {
      // Move to trash
      const updatedNotes = notes.map((n) =>
        n.id === id ? { ...n, deleted: true, pinned: false, archived: false, updatedAt: new Date().toISOString() } : n
      );
      setNotes(updatedNotes);
      
      // Auto select next active note
      const remaining = updatedNotes.filter((n) => !n.deleted && !n.archived);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : '');
    }
    
    // Redirect to home page
    setViewMode('home');
  };

  // Automatically delete notes that have no title and no text content
  const cleanUpEmptyNotes = (excludeCurrentId?: string) => {
    setNotes((prevNotes) => {
      const updated = prevNotes.filter((note) => {
        if (excludeCurrentId && note.id === excludeCurrentId) {
          return true;
        }
        
        const isTitleEmpty = !note.title || note.title.trim() === '';
        
        let isContentEmpty = false;
        if (!note.type || note.type === 'note' || note.type === 'document') {
          const cleanText = note.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
          isContentEmpty = cleanText === '';
        } else if (note.type === 'sheet') {
          try {
            const parsed = JSON.parse(note.content);
            const cells = parsed.data || {};
            const hasValues = Object.values(cells).some((cell: any) => cell && cell.value && cell.value.trim() !== '');
            isContentEmpty = !hasValues;
          } catch {
            isContentEmpty = true;
          }
        } else if (note.type === 'tracker') {
          try {
            const parsed = JSON.parse(note.content);
            isContentEmpty = !parsed.subjects || parsed.subjects.length === 0;
          } catch {
            isContentEmpty = true;
          }
        } else if (note.type === 'expense') {
          try {
            const parsed = JSON.parse(note.content);
            isContentEmpty = !parsed.transactions || parsed.transactions.length === 0;
          } catch {
            isContentEmpty = true;
          }
        }

        if (isTitleEmpty && isContentEmpty) {
          return false;
        }
        return true;
      });

      // Update selectedNoteId if it was deleted
      if (selectedNoteId && !updated.some(n => n.id === selectedNoteId)) {
        const remaining = updated.filter(n => !n.deleted && !n.archived);
        setSelectedNoteId(remaining.length > 0 ? remaining[0].id : '');
      }

      return updated;
    });
  };

  // Restore note from Trash
  const handleRestoreNote = (id: string) => {
    const updatedNotes = notes.map((n) =>
      n.id === id ? { ...n, deleted: false, updatedAt: new Date().toISOString() } : n
    );
    setNotes(updatedNotes);
    setSelectedNoteId(id);
    setSelectedSubFilter('none');
  };

  // Archive note
  const handleArchiveNote = (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    const isArchived = !note.archived;
    const updatedNotes = notes.map((n) =>
      n.id === id ? { ...n, archived: isArchived, pinned: false, updatedAt: new Date().toISOString() } : n
    );
    setNotes(updatedNotes);

    if (isArchived) {
      // Select next active note
      const remaining = updatedNotes.filter((n) => !n.deleted && !n.archived);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // Batch actions to prevent React batching state race conditions
  const handleBatchDelete = (ids: string[]) => {
    setNotes((prevNotes) => {
      const firstNote = prevNotes.find(n => ids.includes(n.id));
      if (!firstNote) return prevNotes;
      if (firstNote.deleted) {
        return prevNotes.filter(n => !ids.includes(n.id));
      } else {
        return prevNotes.map(n =>
          ids.includes(n.id) ? { ...n, deleted: true, pinned: false, archived: false, updatedAt: new Date().toISOString() } : n
        );
      }
    });
  };

  const handleBatchArchive = (ids: string[], archiveState: boolean) => {
    setNotes((prevNotes) =>
      prevNotes.map(n =>
        ids.includes(n.id) ? { ...n, archived: archiveState, pinned: false, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const handleBatchPin = (ids: string[], pinState: boolean) => {
    setNotes((prevNotes) =>
      prevNotes.map(n =>
        ids.includes(n.id) ? { ...n, pinned: pinState, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const handleBatchLock = (ids: string[]) => {
    setNotes((prevNotes) =>
      prevNotes.map(n =>
        ids.includes(n.id) ? { ...n, locked: !n.locked, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const handleBatchRestore = (ids: string[]) => {
    setNotes((prevNotes) =>
      prevNotes.map(n =>
        ids.includes(n.id) ? { ...n, deleted: false, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  // Lock Note / Toggle Lock passcode status
  const handleToggleLock = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    if (note.locked) {
      // Require passcode to unlock (remove passcode protection)
      setLockedNoteToRemoveLock(id);
    } else {
      // Ask to set passcode
      setSetupPasscodeNoteId(id);
    }
  };

  // Toggle Hide note status (puts in locked folder menu)
  const handleToggleHideNote = (id: string) => {
    setNotes((prevNotes) =>
      prevNotes.map((n) => {
        if (n.id === id) {
          return { ...n, hidden: !n.hidden, updatedAt: new Date().toISOString() };
        }
        return n;
      })
    );
  };

  // Reorder notes by swapping positions in customIndex mapping
  const handleReorderNotes = (draggedId: string, targetId: string) => {
    setNotes((prevNotes) => {
      const draggedIndex = prevNotes.findIndex((n) => n.id === draggedId);
      const targetIndex = prevNotes.findIndex((n) => n.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prevNotes;

      const reordered = [...prevNotes];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      // Reassign customIndex for ALL notes to match their new array order
      return reordered.map((note, idx) => ({
        ...note,
        customIndex: idx,
      }));
    });
  };

  const handleSetPasscode = (passcode: string) => {
    if (setupPasscodeNoteId) {
      setNotes((prevNotes) =>
        prevNotes.map((n) => {
          if (n.id === setupPasscodeNoteId) {
            return { ...n, locked: true, passcode, updatedAt: new Date().toISOString() };
          }
          return n;
        })
      );
      setUnlockedNoteIds((prev) => [...prev, setupPasscodeNoteId]);
      setSetupPasscodeNoteId(null);
    }
  };


  // Create Note
  const handleCreateNote = (type: 'note' | 'document' | 'sheet' | 'tracker' | 'expense' = 'note') => {
    cleanUpEmptyNotes();
    const minIndex = notes.length > 0 ? Math.min(...notes.map((n) => n.customIndex ?? 0)) : 0;

    let initialTitle = '';
    let initialContent = '';

    if (type === 'sheet') {
      initialContent = JSON.stringify({
        data: {},
        rowCount: 30,
        colCount: 10,
      });
    } else if (type === 'tracker') {
      initialTitle = 'New Progress Tracker';
      initialContent = JSON.stringify({
        milestones: [],
        subjects: [],
        aiReport: "",
        rowLabel: "Metric",
        columnLabel: "Interval",
        benchmarkLabel: "Target",
        unit: "%",
        showBenchmark: true,
        showGrades: false
      });
    } else if (type === 'expense') {
      initialTitle = 'Monthly Expenses';
      initialContent = JSON.stringify({
        transactions: [],
        categories: ['Salary', 'Rent', 'Food', 'Entertainment'],
        aiReport: ""
      });
    }

    const newNote: Note = {
      id: `note-${Math.random().toString(36).substr(2, 9)}`,
      title: initialTitle,
      content: initialContent,
      type,
      categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
      updatedAt: new Date().toISOString(),
      pinned: false,
      locked: false,
      archived: false,
      deleted: false,
      customIndex: minIndex - 1, // Place at the very top of custom sort
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
    setSelectedSubFilter('none');
    setViewMode('editor');
  };

  const handleCreateCategory = (name: string) => {
    const newCat: Category = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      icon: 'Folder',
      isDefault: false
    };
    setCategories(prev => [...prev, newCat]);
  };

  const handleUpdateNoteCategory = (noteId: string, categoryId: string | undefined) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, categoryId, updatedAt: new Date().toISOString() } : n));
  };

  // Filter and sort notes
  const getFilteredNotes = () => {
    if (selectedSubFilter === 'details' || selectedSubFilter === 'briefings') {
      return [];
    }
    const filtered = notes.filter((note) => {
      // 1. Sub-filter tab checks (Trash, Archived, Locked)
      if (selectedSubFilter === 'deleted') {
        if (!note.deleted) return false;
      } else if (selectedSubFilter === 'archive') {
        if (!note.archived || note.deleted) return false;
      } else if (selectedSubFilter === 'locked') {
        if (!note.locked || note.deleted || note.archived) return false;
      } else if (selectedSubFilter === 'tracker') {
        if (note.type !== 'tracker' || note.deleted || note.archived) return false;
      } else if (selectedSubFilter === 'expense') {
        if (note.type !== 'expense' || note.deleted || note.archived) return false;
      } else {
        // Standard view: filter out deleted, archived, and hidden notes
        if (note.deleted || note.archived || note.hidden) return false;
        
        // Category check
        if (selectedCategoryId !== 'all' && note.categoryId !== selectedCategoryId) {
          return false;
        }
      }

      // 2. Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = note.title.toLowerCase().includes(query);
        const matchContent = note.content.toLowerCase().includes(query);
        if (!matchTitle && !matchContent) return false;
      }

      return true;
    });

    // Sort notes according to preference
    return [...filtered].sort((a, b) => {
      if (sortBy === 'updated-desc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'updated-asc') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'custom') {
        const orderA = a.customIndex ?? 0;
        const orderB = b.customIndex ?? 0;
        return orderA - orderB;
      }
      return 0;
    });
  };

  // Global keyboard navigation & shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Global Navigation/Action Shortcuts (even when typing, if Alt key or Cmd key is held)
      if (e.altKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          handleCreateNote();
          setViewMode('editor');
        } else if (e.key.toLowerCase() === 'h') {
          e.preventDefault();
          setViewMode('home');
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setDarkMode(prev => !prev);
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setIsSidebarOpen(prev => !prev);
        }
      }

      // 2. Global search shortcut Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setViewMode('home');
        
        // Find and click search button to make sure it's active
        const searchBtn = document.getElementById('search-toggle-btn');
        if (searchBtn) {
          searchBtn.click();
        }
        setTimeout(() => {
          const searchInput = document.getElementById('dashboard-search-input');
          if (searchInput) {
            searchInput.focus();
            (searchInput as HTMLInputElement).select();
          }
        }, 50);
      }

      // 3. Escape key (closes sidebar, drawing, etc.)
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
        setSetupPasscodeNoteId(null);
        setLockedNoteToUnlock(null);
        setDrawingOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCategoryId]);



  const filteredNotes = getFilteredNotes();
  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;



  if (!hasStarted) {
    return (
      <div className={`min-h-screen w-full font-sans transition-colors duration-300 flex flex-col ${darkMode ? 'bg-[#121212] text-zinc-100 dark' : 'bg-gray-50 text-gray-900'}`}>
        
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#2a2a2a] shrink-0">
          <div /> {/* Left empty */}
          <button
            onClick={() => {
              if (isDevLoggedWelcome) {
                setShowDevPortalWelcome(true);
              } else {
                setShowDevLoginWelcome(true);
              }
            }}
            className="px-4 py-2 hover:bg-gray-200/50 dark:hover:bg-white/5 text-gray-700 dark:text-zinc-300 transition-all cursor-pointer rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 uppercase tracking-wider"
            title="Developer Portal"
          >
            <Code className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span>{isDevLoggedWelcome ? 'developer console' : 'developer portal'}</span>
          </button>
        </nav>

        {/* Content Body */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <main className="flex flex-col items-center justify-center text-center max-w-2xl">
            {isDevLoggedWelcome && (
              <div className="mb-6 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Developer Mode Active
              </div>
            )}
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Your thoughts, <br className="hidden md:block" /> beautifully organized.
            </h1>
            <p className="text-lg md:text-xl mb-10 text-gray-500 dark:text-zinc-400">
              A minimalist workspace for your notes, ideas, and tasks.
            </p>
            {isDevLoggedWelcome ? (
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStart(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-transform hover:scale-105 active:scale-95 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-lg font-bold"
                >
                  Enter Developer Workspace <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDevLogoutWelcome}
                  className="mt-4 text-xs font-semibold text-rose-500 hover:underline cursor-pointer bg-transparent border-none outline-none"
                >
                  Log Out of Developer Mode
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => handleStart(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-transform hover:scale-105 active:scale-95 bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white cursor-pointer shadow-lg"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Note: Guest data is saved in sandbox storage and will be cleared when you close your tab.
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Modals relocated to global block to allow opening from workspace dashboard */}

      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-warmBg transition-colors duration-200 overflow-hidden relative">
      
      {/* Sliding Sidebar Drawer Overlay (fixed on top of layout) */}
      <div className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-200 ${
        isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className={`fixed top-0 bottom-0 left-0 z-50 transition-transform duration-300 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-80 h-full p-0`}>
        <Sidebar
          selectedSubFilter={selectedSubFilter}
          onSelectCategory={(id) => {
            setSelectedCategoryId(id);
            setSelectedSubFilter('none');
            setIsSidebarOpen(false);
            setUnlockedNoteIds([]);
            setViewMode('home');
            cleanUpEmptyNotes();
          }}
          onSelectSubFilter={(filter) => {
            setSelectedSubFilter(filter);
            setSelectedCategoryId('all');
            setIsSidebarOpen(false);
            setUnlockedNoteIds([]);
            setViewMode('home');
            cleanUpEmptyNotes();
          }}
          isDevLogged={isDevLoggedWelcome}
          onDevLogout={handleDevLogoutWelcome}
        />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
        {selectedSubFilter === 'details' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-creamCard dark:bg-[#121212]">
            {/* Header row to allow toggle sidebar on mobile */}
            <div className="p-4 border-b border-charcoal/10 dark:border-white/5 flex items-center gap-3 md:hidden shrink-0">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-charcoal dark:text-white rounded-lg hover:bg-charcoal/5 dark:hover:bg-white/5">
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm text-charcoal dark:text-white">Menu</span>
            </div>
            <BasicDetails darkMode={darkMode} onBackToHome={() => setSelectedSubFilter('none')} />
          </div>
        ) : selectedSubFilter === 'briefings' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-creamCard dark:bg-[#121212]">
            {/* Header row to allow toggle sidebar on mobile */}
            <div className="p-4 border-b border-charcoal/10 dark:border-white/5 flex items-center gap-3 md:hidden shrink-0">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-charcoal dark:text-white rounded-lg hover:bg-charcoal/5 dark:hover:bg-white/5">
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm text-charcoal dark:text-white">Menu</span>
            </div>
            {isDevLoggedWelcome ? (
              <AutoBriefings darkMode={darkMode} onBackToHome={() => setSelectedSubFilter('none')} />
            ) : (
              <div className="flex-1 h-full flex flex-col items-center justify-center bg-creamCard p-8 text-center text-charcoalMuted dark:text-gray-400">
                <Lock className="w-8 h-8 text-amber-500 mb-3" />
                <h3 className="font-serif font-bold text-sm text-charcoal dark:text-white">Developer Account Required</h3>
                <p className="text-xs font-sans mt-1.5 max-w-sm">Auto-Briefings and Meeting workspaces are restricted features. Please sign in via the Developer Portal to access them.</p>
              </div>
            )}
          </div>
        ) : selectedSubFilter === 'about' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-creamCard dark:bg-[#121212]">
            {/* Header row to allow toggle sidebar on mobile */}
            <div className="p-4 border-b border-charcoal/10 dark:border-white/5 flex items-center gap-3 md:hidden shrink-0">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-charcoal dark:text-white rounded-lg hover:bg-charcoal/5 dark:hover:bg-white/5">
                <Menu className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm text-charcoal dark:text-white">Menu</span>
            </div>
            <AboutSection onBackToHome={() => setSelectedSubFilter('none')} />
          </div>

        ) : viewMode === 'home' ? (
          <Dashboard
            notes={filteredNotes}
            selectedCategoryId={selectedCategoryId}
            selectedSubFilter={selectedSubFilter}
            categories={categories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectCategory={setSelectedCategoryId}
            onSelectNote={(note) => {
              const success = handleSelectNote(note);
              if (success) {
                setViewMode('editor');
              }
            }}
            onCreateNote={() => {
              setShowCreateNoteTypeModal(true);
            }}
            onCreateNoteWithType={handleCreateNote}
            onPinNote={handlePinNote}
            onArchiveNote={handleArchiveNote}
            onDeleteNote={handleDeleteNote}
            onRestoreNote={handleRestoreNote}
            onBatchDelete={handleBatchDelete}
            onBatchArchive={handleBatchArchive}
            onBatchPin={handleBatchPin}
            onBatchLock={handleBatchLock}
            onBatchRestore={handleBatchRestore}
            onUpdateNoteCategory={handleUpdateNoteCategory}
            onCreateCategory={handleCreateCategory}
            onToggleSidebar={() => setIsSidebarOpen(true)}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onToggleLock={handleToggleLock}
            onToggleHideNote={handleToggleHideNote}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onReorderNotes={handleReorderNotes}
            onOpenDeveloperPortal={() => {
              if (isDevLoggedWelcome) {
                setShowDevPortalWelcome(true);
              } else {
                setShowDevLoginWelcome(true);
              }
            }}
            isDevLogged={isDevLoggedWelcome}
          />
        ) : (
          /* Note Editor Workspace container */
          <div className="flex-1 h-full overflow-hidden flex flex-col border border-charcoal/25 bg-creamCard">
            {activeNote && (!activeNote.locked || unlockedNoteIds.includes(activeNote.id)) ? (
              <NoteEditor
                note={activeNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onArchiveNote={handleArchiveNote}
                onToggleLock={handleToggleLock}
                onOpenDrawing={() => setDrawingOpen(true)}
                onCreateNewNote={() => setShowCreateNoteTypeModal(true)}
                onRestoreNote={handleRestoreNote}
                onBackToHome={() => {
                  setUnlockedNoteIds([]);
                  setViewMode('home');
                  cleanUpEmptyNotes();
                }}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                categories={categories}
              />
            ) : activeNote && activeNote.locked ? (
              <div className="flex-1 h-full flex flex-col items-center justify-center bg-creamCard p-8 text-center">
                <EmptyState
                  title="Note is Locked"
                  description="Please unlock this note from the dashboard to view and edit its content."
                  onActionClick={() => setViewMode('home')}
                  actionText="Go to Dashboard"
                />
              </div>
            ) : (
              <div className="flex-1 h-full flex items-center justify-center bg-creamCard">
                <EmptyState
                  title="No Note Selected"
                  description="Pick a note from the dashboard, or click the plus button to start writing your ideas."
                  onActionClick={() => {
                    setShowCreateNoteTypeModal(true);
                  }}
                  actionText="Create New Note"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lock Passcode Modal overlay */}
      {lockedNoteToUnlock && (
        <LockScreen
          mode="enter"
          correctPasscode={lockedNoteToUnlock.passcode || '1234'}
          onUnlock={handleUnlockSuccess}
          onClose={() => setLockedNoteToUnlock(null)}
        />
      )}

      {/* Remove Lock Passcode Modal overlay */}
      {lockedNoteToRemoveLock && (
        <LockScreen
          mode="enter"
          correctPasscode={notes.find(n => n.id === lockedNoteToRemoveLock)?.passcode || '1234'}
          onUnlock={() => {
            // Remove lock (unprotect note) and automatically unhide
            setNotes((prevNotes) =>
              prevNotes.map((n) => {
                if (n.id === lockedNoteToRemoveLock) {
                  return { ...n, locked: false, hidden: false, passcode: undefined, updatedAt: new Date().toISOString() };
                }
                return n;
              })
            );
            setUnlockedNoteIds((prev) => prev.filter((nid) => nid !== lockedNoteToRemoveLock));
            setLockedNoteToRemoveLock(null);
          }}
          onClose={() => setLockedNoteToRemoveLock(null)}
        />
      )}

      {/* Delete Locked Note Passcode Modal overlay */}
      {lockedNoteToDelete && (
        <LockScreen
          mode="enter"
          correctPasscode={notes.find(n => n.id === lockedNoteToDelete)?.passcode || '1234'}
          onUnlock={() => {
            executeDeleteNote(lockedNoteToDelete);
            setLockedNoteToDelete(null);
          }}
          onClose={() => setLockedNoteToDelete(null)}
        />
      )}

      {/* Set passcode Setup Modal overlay */}
      {setupPasscodeNoteId && (
        <LockScreen
          mode="setup"
          onSetPasscode={handleSetPasscode}
          onClose={() => setSetupPasscodeNoteId(null)}
        />
      )}

      {/* Drawing Canvas overlay */}
      {drawingOpen && activeNote && (
        <DrawingCanvas
          initialDrawing={activeNote.drawing}
          onSave={(dataUrl) => {
            if (activeNote.type === 'document') {
              const imgHtml = `<p><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 12px 0;" /></p>`;
              handleUpdateNote({
                ...activeNote,
                content: activeNote.content + imgHtml,
                updatedAt: new Date().toISOString(),
              });
            } else {
              handleUpdateNote({
                ...activeNote,
                drawing: dataUrl,
                updatedAt: new Date().toISOString(),
              });
            }
            setDrawingOpen(false);
          }}
          onClose={() => setDrawingOpen(false)}
        />
      )}

      {/* Choice Modal: Create Note Type Selection */}
      {showCreateNoteTypeModal && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center p-6 text-white select-none">
          <div className="bg-creamCard dark:bg-charcoalDarkCard border border-charcoal/25 dark:border-white/10 rounded-3xl shadow-2xl p-8 max-w-lg w-full text-charcoal dark:text-white">
            <h3 className="text-xl font-serif font-bold text-center mb-1 text-charcoal dark:text-white">
              Create New
            </h3>
            <p className="text-xs text-charcoalMuted dark:text-gray-400 text-center mb-6">
              Choose the layout for your new workspace
            </p>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
               <button
                 onClick={() => {
                   handleCreateNote('note');
                   setShowCreateNoteTypeModal(false);
                 }}
                 className="flex items-center gap-4 p-4 rounded-2xl border border-charcoal/15 dark:border-white/5 hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-left cursor-pointer group bg-white dark:bg-[#1E1E1E]"
               >
                 <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                   <Plus className="w-5 h-5" />
                 </div>
                 <h4 className="font-sans font-bold text-sm text-charcoal dark:text-white group-hover:text-warmAmber">
                   Standard Note
                 </h4>
               </button>

               <button
                 onClick={() => {
                   handleCreateNote('document');
                   setShowCreateNoteTypeModal(false);
                 }}
                 className="flex items-center gap-4 p-4 rounded-2xl border border-charcoal/15 dark:border-white/5 hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-left cursor-pointer group bg-white dark:bg-[#1E1E1E]"
               >
                 <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                 </div>
                 <h4 className="font-sans font-bold text-sm text-charcoal dark:text-white group-hover:text-warmAmber">
                   Word Document
                 </h4>
               </button>

                <button
                  onClick={() => {
                    handleCreateNote('sheet');
                    setShowCreateNoteTypeModal(false);
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-charcoal/15 dark:border-white/5 hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-left cursor-pointer group bg-white dark:bg-[#1E1E1E]"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-sans font-bold text-sm text-charcoal dark:text-white group-hover:text-warmAmber">
                    Spreadsheet
                  </h4>
                </button>

                <button
                  onClick={() => {
                    handleCreateNote('tracker');
                    setShowCreateNoteTypeModal(false);
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-charcoal/15 dark:border-white/5 hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-left cursor-pointer group bg-white dark:bg-[#1E1E1E]"
                >
                  <div className="w-10 h-10 rounded-full bg-warmAmber/10 flex items-center justify-center text-warmAmber shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h4 className="font-sans font-bold text-sm text-charcoal dark:text-white group-hover:text-warmAmber">
                    Progress Tracker
                  </h4>
                </button>

                <button
                  onClick={() => {
                    handleCreateNote('expense');
                    setShowCreateNoteTypeModal(false);
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-charcoal/15 dark:border-white/5 hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-left cursor-pointer group bg-white dark:bg-[#1E1E1E]"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-sans font-bold text-sm text-charcoal dark:text-white group-hover:text-warmAmber">
                    Expense Tracker
                  </h4>
                </button>
             </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateNoteTypeModal(false)}
                className="px-5 py-2.5 rounded-full border border-charcoal/15 dark:border-white/10 text-xs font-sans font-semibold hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Developer Login Modal ── */}
      {showDevLoginWelcome && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 select-none text-charcoal">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] border border-charcoal/20 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 dark:border-white/5">
              <h4 className="text-sm font-bold text-charcoal dark:text-white font-serif">Developer Portal Login</h4>
              <button
                type="button"
                onClick={() => { setShowDevLoginWelcome(false); setDevLoginErrorWelcome(''); setShowDevPassword(false); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDevLoginSubmitWelcome} className="space-y-4 text-xs">
              {devLoginErrorWelcome && (
                <div className="p-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-semibold">
                  {devLoginErrorWelcome}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-gray-500 dark:text-zinc-400 font-bold uppercase text-[9px]">Developer ID</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your developer ID"
                  value={devUserWelcome}
                  onChange={e => setDevUserWelcome(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#151515] text-charcoal dark:text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 dark:text-zinc-400 font-bold uppercase text-[9px]">Password</label>
                <div className="relative">
                  <input
                    type={showDevPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={devPassWelcome}
                    onChange={e => setDevPassWelcome(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#151515] text-charcoal dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDevPassword(!showDevPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors"
                  >
                    {showDevPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDevLoginWelcome(false); setDevLoginErrorWelcome(''); setShowDevPassword(false); }}
                  className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-200 transition-all cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Developer Feedback Portal Modal ── */}
      {showDevPortalWelcome && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 text-charcoal">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1E1E1E] border border-charcoal/20 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 dark:border-white/5 shrink-0">
              <div>
                <h4 className="text-sm font-bold text-charcoal dark:text-white font-serif">Developer Feedback Portal</h4>
                <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">View and manage feedback submitted by users.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearAllWelcome}
                  disabled={feedbacksWelcome.length === 0}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/15 disabled:opacity-50 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-sans font-bold transition-all cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={handleDevLogoutWelcome}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-white/10 rounded-xl text-[10px] font-sans font-bold transition-all cursor-pointer"
                >
                  Logout
                </button>
                <button
                  type="button"
                  onClick={() => setShowDevPortalWelcome(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feedbacks Grid List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2 text-left">
              {feedbacksWelcome.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-zinc-500 text-xs">
                  No feedback received yet.
                </div>
              ) : (
                feedbacksWelcome.map((fb) => (
                  <div key={fb.id} className="p-4 bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-white/5 rounded-2xl flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-800 dark:text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap">{fb.text}</p>
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium block">
                        Submitted: {new Date(fb.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedbackWelcome(fb.id)}
                      className="p-1.5 hover:bg-rose-500/10 rounded-xl text-gray-400 hover:text-rose-500 transition-colors shrink-0"
                      title="Delete Feedback"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
