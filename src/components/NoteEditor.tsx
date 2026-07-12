import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, Unlock, Archive, Trash2, Volume2, VolumeX, Mic, MicOff,
  ImageIcon, Pencil, CheckSquare, Sparkles, Download, Pin, Trash,
  Plus, ListCheck, ChevronLeft, Sun, Moon, Keyboard, X,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Table as TableIcon,
  Settings, Send, Copy, Check, RefreshCw
} from 'lucide-react';
import { type Note, type ChecklistItem, type NoteSnapshot, type Category } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SpreadsheetEditor, exportToExcel, numberToCol, evaluateFormula } from './SpreadsheetEditor';
import { TrackerEditor } from './TrackerEditor';
import { ExpenseEditor } from './ExpenseEditor';
import { generateText, type AIConfig } from '../utils/aiService';

const exportToWord = (title: string, htmlContent: string, filename: string) => {
  const content = `
    <html xmlns:o='urn:schemas-microsoft-xml-doc:office:office' 
          xmlns:w='urn:schemas-microsoft-xml-doc:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          margin: 1in;
        }
        h1 { font-size: 24pt; color: #1a1a1a; margin-bottom: 12pt; }
        h2 { font-size: 18pt; color: #2e2e2e; margin-top: 18pt; margin-bottom: 6pt; }
        p { font-size: 11pt; margin-bottom: 6pt; }
        ul, ol { margin-bottom: 12pt; padding-left: 20pt; }
        li { font-size: 11pt; margin-bottom: 3pt; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 10.5pt; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>${title || 'Untitled Document'}</h1>
      <div>${htmlContent}</div>
    </body>
    </html>
  `;

  const blob = new Blob([content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') || filename.endsWith('.docx') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onArchiveNote: (id: string) => void;
  onToggleLock: (id: string) => void;
  onOpenDrawing: () => void;
  onCreateNewNote?: () => void;
  onRestoreNote?: (id: string) => void;
  onBackToHome?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  categories: Category[];
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onArchiveNote,
  onToggleLock,
  onOpenDrawing,
  onCreateNewNote,
  onRestoreNote,
  onBackToHome,
  darkMode,
  onToggleDarkMode,
  categories,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  
  // AI Panel & Output States
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'chat' | 'settings'>('chat');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; id: string }>>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    return {
      apiKey: localStorage.getItem('aura_gemini_api_key') || import.meta.env.VITE_AI_API_KEY || '',
      apiUrl: localStorage.getItem('aura_api_url') || import.meta.env.VITE_AI_API_URL || 'https://integrate.api.nvidia.com/v1',
      apiModel: localStorage.getItem('aura_api_model') || import.meta.env.VITE_AI_API_MODEL || 'meta/llama-3.1-70b-instruct',
    };
  });

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat history to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiLoading]);

  // Save config changes to localStorage
  const handleSaveAIConfig = (newConfig: AIConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('aura_gemini_api_key', newConfig.apiKey);
    localStorage.setItem('aura_api_url', newConfig.apiUrl);
    localStorage.setItem('aura_api_model', newConfig.apiModel);
  };

  // Formatting shortcuts active states
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState<string>('p');

  // Inline AI Assist States
  const [aiAssistVisible, setAiAssistVisible] = useState(false);
  const [aiAssistPos, setAiAssistPos] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [promptLoading, setPromptLoading] = useState(false);
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);

  // Table Customizer State
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [tableBorderStyle, setTableBorderStyle] = useState<'solid' | 'dashed' | 'none'>('solid');
  const [tableHeaderTheme, setTableHeaderTheme] = useState<'neutral' | 'blue' | 'green' | 'amber' | 'purple'>('neutral');
  const [tableZebra, setTableZebra] = useState(false);

  // Notion-style Slash Command States
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  
  const [localTitle, setLocalTitle] = useState(note?.title || '');
  const [localContent, setLocalContent] = useState(note?.content || '');

  // Dynamic AI Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  
  // Refs
  const timerRef = useRef<any>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any | null>(null);

  // History buffers
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSavedContentRef = useRef(note?.content || '');
  const noteRef = useRef(note);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  // Global click listener to close dropdowns and menus
  useEffect(() => {
    const handleGlobalClick = () => {
      setDownloadDropdownOpen(false);
      setSlashMenuOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Global selection change listener for Inline AI Assist
  useEffect(() => {
    const handleSelectionChange = () => {
      if (typeof window === 'undefined') return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        if (!aiDropdownOpen) {
          setAiAssistVisible(false);
        }
        return;
      }

      const text = sel.toString().trim();
      if (text.length > 0 && text.length < 100) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          setAiAssistPos({
            top: rect.top + window.scrollY - 42,
            left: rect.left + window.scrollX + (rect.width / 2)
          });
          setSelectedText(text);
          setAiAssistVisible(true);
        }
      } else {
        if (!aiDropdownOpen) {
          setAiAssistVisible(false);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [aiDropdownOpen]);

  // Heuristics for note/document dynamic suggestions
  const getNoteSuggestions = (title: string, content: string, _type: string): string[] => {
    const cleanContent = (content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const titleTrimmed = (title || '').trim();
    
    // Don't show suggestions when the note is essentially empty
    if (titleTrimmed.length < 3 && cleanContent.length < 30) {
      return [];
    }
    
    // Check if it's a checklist or simple lists
    const hasLists = content.includes('<ul>') || content.includes('<li>') || content.includes('\n-') || content.includes('\n*');
    
    // Check if it has comma-separated text or simple rows
    const lines = cleanContent.split('\n').filter(l => l.trim() !== '');
    const hasData = lines.some(line => line.includes(',') || line.includes('\t') || line.includes('|'));

    if (cleanContent.length < 50) {
      const t = (title || '').toLowerCase();
      if (t.includes('essay') || t.includes('article') || t.includes('blog') || t.includes('paragraph')) {
        return ["Write an essay", "Write a paragraph", "Create an outline"];
      }
      if (t.includes('letter') || t.includes('email') || t.includes('formal') || t.includes('request')) {
        return ["Draft professional email copy", "Draft a formal request letter", "Write a thank you note"];
      }
      if (t.includes('meeting') || t.includes('briefing') || t.includes('agenda') || t.includes('minutes')) {
        return ["Create meeting agenda outline", "Draft meeting minutes checklist", "Create feedback form outline"];
      }
      if (t.includes('recipe') || t.includes('cooking') || t.includes('food') || t.includes('dish')) {
        return ["Write a step-by-step recipe", "Create grocery shopping list", "Design a meal plan"];
      }
      if (t.includes('project') || t.includes('plan') || t.includes('todo') || t.includes('task') || t.includes('schedule')) {
        return ["Create project plan checklist", "Create task breakdown checklist", "Define key milestones"];
      }
      if (t.includes('marks') || t.includes('grades') || t.includes('performance') || t.includes('report')) {
        return ["Draft a performance review table", "Write student grading overview", "Create class agenda outline"];
      }
      // Generic fallback — only if title is meaningful
      if (titleTrimmed.length >= 3) {
        return ["Write an essay on this topic", "Write a paragraph about this", "Brainstorm 5 creative ideas"];
      }
      return [];
    }

    const suggestions: string[] = [];
    if (hasData || hasLists) {
      suggestions.push("Convert text to a table");
    }
    suggestions.push("Summarize in 3 bullet points");
    suggestions.push("Draft action items from this");
    suggestions.push("Improve tone and writing style");
    return suggestions.slice(0, 3);
  };

  const extractJsonArray = (text: string): string[] | null => {
    try {
      const match = text.match(/\[\s*".*?"\s*(?:,\s*".*?"\s*)*\]/s) || text.match(/\[.*\]/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
      const parsedDirect = JSON.parse(text.trim());
      if (Array.isArray(parsedDirect)) return parsedDirect.map(String);
    } catch {
      const matches = [...text.matchAll(/"([^"]+)"/g)];
      if (matches.length > 0) {
        return matches.map(m => m[1]);
      }
    }
    return null;
  };

  const fetchAISuggestions = async (title: string, content: string) => {
    if (!aiConfig.apiKey || aiConfig.apiKey.trim() === '') return;
    try {
      const cleanContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').substring(0, 600).trim();
      const response = await generateText({
        config: aiConfig,
        prompt: `Analyze this note title: "${title}" and content preview: "${cleanContent}". Generate 3 highly relevant, specific, short action prompts (under 6 words each) that the user might want to run on this note (e.g., "Write an essay", "Format as table", "Create project plan"). Return ONLY a JSON string array of 3 prompts, e.g., ["Prompt 1", "Prompt 2", "Prompt 3"]. No other text, markdown formatting or wrappers.`,
      });
      const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = extractJsonArray(cleanResponse);
      if (parsed && parsed.length > 0) {
        setAiSuggestions(parsed);
      }
    } catch {
      // Fallback silently to heuristics
    }
  };

  // Debounced trigger for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      const suggestions = getNoteSuggestions(localTitle, localContent || note.content || '', note.type || '');
      setAiSuggestions(suggestions);
      
      // Only call AI suggestions for developer users (not guest/sandbox users)
      const isDev = sessionStorage.getItem('antigravity_dev_logged_in') === 'true';
      if (isDev && aiConfig.apiKey && aiConfig.apiKey.trim() !== '' && suggestions.length > 0) {
        fetchAISuggestions(localTitle, localContent || note.content || '');
      }
    }, 1500); // 1.5s debounce
    
    return () => clearTimeout(timer);
  }, [localTitle, localContent, note?.type]);

  const handleSuggestionClick = async (suggestion: string) => {
    setSuggestionLoading(true);
    setSuggestionError(null);
    setSuggestionError(null);
    
    let promptText = suggestion;
    const activeContent = editorRef.current?.innerText || editorRef.current?.innerHTML || note.content;
    const cleanContent = activeContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    const predefinedList = [
      "Convert text to a table",
      "Write an essay on this topic", "Write an essay",
      "Write a paragraph about this", "Write a paragraph",
      "Draft a formal request letter",
      "Draft professional email copy",
      "Summarize in 3 bullet points",
      "Draft action items from this",
      "Improve tone and writing style",
      "Write a step-by-step recipe",
      "Create grocery shopping list",
      "Create meeting agenda outline",
      "Draft meeting minutes checklist",
      "Brainstorm 5 creative ideas"
    ];

    if (suggestion === "Convert text to a table") {
      promptText = `Analyze the following text data and convert it into a clean, formatted HTML table with standard table border styling. Do NOT wrap it in a code block. Output ONLY the raw HTML table structure:\n${cleanContent}`;
    } else if (suggestion === "Write an essay on this topic" || suggestion === "Write an essay") {
      promptText = `Write a detailed, informative 3-paragraph essay about the topic: "${localTitle}". Use clean formatting.`;
    } else if (suggestion === "Write a paragraph about this" || suggestion === "Write a paragraph") {
      promptText = `Write a short, engaging, descriptive paragraph about the topic: "${localTitle}".`;
    } else if (suggestion === "Draft a formal request letter") {
      promptText = `Draft a polite, professional formal request letter about the topic: "${localTitle}".`;
    } else if (suggestion === "Draft professional email copy") {
      promptText = `Draft a concise, professional business email copy about: "${localTitle}".`;
    } else if (suggestion.includes("checklist") || suggestion.includes("milestones")) {
      promptText = `Generate a detailed task checklist with checkbox items (- [ ] Item) based on: "${localTitle}".`;
    } else if (suggestion === "Summarize in 3 bullet points") {
      promptText = `Summarize the following text in exactly 3 clean, formatted bullet points:\n${cleanContent}`;
    } else if (suggestion === "Draft action items from this") {
      promptText = `Extract a list of actionable checklist tasks (- [ ] task) from the following text:\n${cleanContent}`;
    } else if (suggestion === "Improve tone and writing style") {
      promptText = `Rewrite the following text to improve its flow, structure, and professional tone:\n${cleanContent}`;
    } else if (suggestion === "Write a step-by-step recipe") {
      promptText = `Generate a complete, delicious step-by-step cooking recipe with list of ingredients and instructions for: "${localTitle}".`;
    } else if (suggestion === "Create grocery shopping list") {
      promptText = `Create a categorized grocery shopping list for: "${localTitle}".`;
    } else if (suggestion === "Create meeting agenda outline") {
      promptText = `Create a structured meeting agenda outline with time stamps and discussion topics for: "${localTitle}".`;
    } else if (suggestion === "Draft meeting minutes checklist") {
      promptText = `Create a checklist of standard meeting minutes items (- [ ] Item) to record for: "${localTitle}".`;
    } else if (suggestion === "Brainstorm 5 creative ideas") {
      promptText = `Provide 5 creative ideas, expansion topics, or next steps related to: "${localTitle}".`;
    } else if (!predefinedList.includes(suggestion)) {
      promptText = `Based on the note titled "${localTitle}" and content: "${cleanContent.substring(0, 1500)}", perform the requested action: "${suggestion}". Generate high quality, clean formatted output.`;
    }

    try {
      const response = await generateText({
        config: aiConfig,
        prompt: promptText,
        noteContext: {
          title: localTitle,
          content: activeContent,
          type: note.type
        }
      });
      
      // Auto-insert the result at cursor
      handleInsertAtCursor(response);
    } catch (err: any) {
      setSuggestionError(err.message || 'An unexpected error occurred.');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const renderSuggestionsBar = () => {
    if (aiSuggestions.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-2 px-3 select-none shrink-0 mb-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/10 dark:border-emerald-500/20">
        <span className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 fill-emerald-500/20" /> Suggestions:
        </span>
        {aiSuggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => handleSuggestionClick(sug)}
            disabled={suggestionLoading}
            className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-500/20 dark:bg-zinc-800 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 rounded-full text-[10px] font-sans font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
          >
            {sug}
          </button>
        ))}
        {suggestionLoading && (
          <span className="text-[10px] font-sans text-emerald-600 dark:text-emerald-400 animate-pulse ml-2 font-bold">
            Generating...
          </span>
        )}
        {suggestionError && (
          <span className="text-[9px] font-sans text-red-500 ml-2" title={suggestionError}>
            Error: {suggestionError.substring(0, 80)}{suggestionError.length > 80 ? '...' : ''}
          </span>
        )}
      </div>
    );
  };

  // Sync with selected note
  useEffect(() => {
    if (note) {
      setLocalTitle(note.title);
      setLocalContent(note.content);
      
      // Load content into contenteditable
      if (editorRef.current && editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content;
      }

      // Reset history stacks on note switch
      undoStackRef.current = [];
      redoStackRef.current = [];
      lastSavedContentRef.current = note.content;

      // Close panels
      setAiPanelOpen(false);
      setSlashMenuOpen(false);
    }
  }, [note?.id]);

  // Sync external content modifications (e.g. from drawings canvas)
  useEffect(() => {
    if (note && editorRef.current && editorRef.current.innerHTML !== note.content) {
      editorRef.current.innerHTML = note.content;
      setLocalContent(note.content);
    }
  }, [note?.content]);

  // Sync external title modifications
  useEffect(() => {
    if (note && note.title !== localTitle) {
      setLocalTitle(note.title);
    }
  }, [note?.title]);

  // Speech synthesizers setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Escape key listener to close dropdowns and menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDownloadDropdownOpen(false);
        setSlashMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Speech recognizer setup (Audio Note Transcription)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsRecording(true);
        };
        rec.onend = () => {
          setIsRecording(false);
        };

        rec.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript && editorRef.current) {
            const currentContent = editorRef.current.innerHTML;
            const updated = currentContent + (currentContent.endsWith(' ') || currentContent.length === 0 ? '' : ' ') + finalTranscript;
            editorRef.current.innerHTML = updated;
            setLocalContent(updated);
            onUpdateNote({
              ...noteRef.current,
              content: updated,
              updatedAt: new Date().toISOString()
            });
          }
        };

        rec.onerror = (e: any) => {
          console.error('Speech recognition error', e);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  // Check if note is active
  if (!note) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center text-charcoalMuted dark:text-gray-400 select-none">
        <h3 className="font-serif font-bold text-base text-charcoal">
          Select or Create a Note
        </h3>
        <p className="text-xs font-sans mt-1">
          Pick a note from the sidebar or click "New Note" to start writing.
        </p>
      </div>
    );
  }

  // Version History Snapshot Helper
  const addHistorySnapshot = (updatedNote: Note) => {
    const currentHist = updatedNote.history || [];
    const lastSnapshot = currentHist[currentHist.length - 1];
    
    if (lastSnapshot && lastSnapshot.title === updatedNote.title && lastSnapshot.content === updatedNote.content) {
      return;
    }

    const newSnapshot: NoteSnapshot = {
      id: `snapshot-${Math.random().toString(36).substr(2, 9)}`,
      title: updatedNote.title,
      content: updatedNote.content,
      updatedAt: new Date().toISOString()
    };

    const nextHist = [...currentHist, newSnapshot].slice(-10); // Keep max 10 snapshots
    onUpdateNote({
      ...updatedNote,
      history: nextHist
    });
  };

  // Undo Stack push helper
  const pushToUndoStack = (html: string) => {
    if (html === lastSavedContentRef.current) return;
    undoStackRef.current.push(lastSavedContentRef.current);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = []; // Clear redo
    lastSavedContentRef.current = html;
  };

  // HTML content sanitizer to prevent empty headings like <h1><br></h1> from saving raw tags
  const sanitizeHtmlContent = (html: string): string => {
    const textOnly = html.replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '').trim();
    if (!textOnly) {
      return '';
    }
    return html;
  };


  const generatePromptSuggestions = async (word: string) => {
    setPromptLoading(true);
    setAiDropdownOpen(true);
    try {
      const wordClean = word.toLowerCase();
      let suggestions = [
        `Write a detailed document about "${word}"`,
        `Create a step-by-step checklist for "${word}"`,
        `Summarize key concepts related to "${word}"`
      ];
      
      if (wordClean.includes('onboard')) {
        suggestions = [
          "Write an onboarding email",
          "Create an onboarding checklist",
          "Summarize onboarding best practices"
        ];
      } else if (wordClean.includes('meeting') || wordClean.includes('sync')) {
        suggestions = [
          "Create a meeting agenda",
          "Write meeting minutes draft",
          "Draft follow-up action items"
        ];
      } else if (wordClean.includes('plan') || wordClean.includes('project')) {
        suggestions = [
          "Outline project timeline",
          "Draft project risk assessment",
          "Create project status update email"
        ];
      } else if (wordClean.includes('expense') || wordClean.includes('cost')) {
        suggestions = [
          "Create expense policy guidelines",
          "Draft budget reduction ideas",
          "Summarize expense tracking best practices"
        ];
      }

      setSuggestedPrompts(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setPromptLoading(false);
    }
  };

  const executeAiPrompt = (prompt: string) => {
    setAiPrompt(prompt);
    setAiPanelOpen(true);
    handleAIRequest(prompt);
    setAiDropdownOpen(false);
    setAiAssistVisible(false);
  };

  // Track cursor location and selection formatting active states
  const updateActiveStates = () => {
    if (typeof document === 'undefined') return;
    setIsBoldActive(document.queryCommandState('bold'));
    setIsItalicActive(document.queryCommandState('italic'));
    
    let blockType = 'p';
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).startContainer;
      // Traverse upward to match standard heading tags
      while (node && node.nodeName !== 'DIV' && node.parentNode) {
        const name = node.nodeName.toLowerCase();
        if (['h1', 'h2', 'h3', 'p', 'blockquote', 'pre'].includes(name)) {
          blockType = name;
          break;
        }
        node = node.parentNode;
      }
    }
    setActiveBlockType(blockType);
  };

  // Title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTitle(val);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const updated = {
        ...note,
        title: val,
        updatedAt: new Date().toISOString(),
      };
      onUpdateNote(updated);
    }, 400);
  };

  const saveTitleNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const updated = {
      ...note,
      title: localTitle,
      updatedAt: new Date().toISOString(),
    };
    onUpdateNote(updated);
    addHistorySnapshot(updated);
  };

  const saveContentNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const rawHtml = editorRef.current?.innerHTML || '';
    const html = sanitizeHtmlContent(rawHtml);
    const updated = {
      ...note,
      content: html,
      updatedAt: new Date().toISOString(),
    };
    onUpdateNote(updated);
    addHistorySnapshot(updated);
    pushToUndoStack(html);
  };

  // Content editable handlers
  const handleEditableInput = (e: React.FormEvent<HTMLDivElement>) => {
    const rawHtml = e.currentTarget.innerHTML;
    const html = sanitizeHtmlContent(rawHtml);
    setLocalContent(rawHtml);
    updateActiveStates();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const updated = {
        ...note,
        content: html,
        updatedAt: new Date().toISOString(),
      };
      onUpdateNote(updated);
      pushToUndoStack(html);
    }, 400);

    // Detect slash commands
    const text = e.currentTarget.innerText;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBeforeCursor = text.slice(0, range.startOffset);
      const words = textBeforeCursor.split(/\s/);
      const lastWord = words[words.length - 1];

      if (lastWord.startsWith('/')) {
        setSlashMenuOpen(true);
        setSlashQuery(lastWord.slice(1));
        setSlashIndex(0);
      } else {
        setSlashMenuOpen(false);
      }
    }
  };

  const handleEditableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Slash commands keyboard navigation
    if (slashMenuOpen && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSlashCommand(filteredCommands[slashIndex].id);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenuOpen(false);
        return;
      }
    }

    // 2. Editor formatting & undo/redo shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        applyFormat('bold');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        applyFormat('italic');
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        applyFormat('underline');
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === '/') {
        e.preventDefault();
        setShortcutsModalOpen(true);
      } else if (e.key === '1') {
        e.preventDefault();
        applyFormat('formatBlock', 'h1');
      } else if (e.key === '2') {
        e.preventDefault();
        applyFormat('formatBlock', 'h2');
      } else if (e.key === '3') {
        e.preventDefault();
        applyFormat('formatBlock', 'h3');
      } else if (e.key === '0') {
        e.preventDefault();
        applyFormat('formatBlock', 'p');
      }
    }

    // 3. Tab key → indent with 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }

    // Update active toolbar button states
    setTimeout(updateActiveStates, 10);
  };

  // Native Rich Text Exec Formatting Actions (Focus Loss Prevention using preventDefault in buttons)
  const applyFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    const editorDiv = editorRef.current;
    if (editorDiv) {
      const rawHtml = editorDiv.innerHTML;
      const html = sanitizeHtmlContent(rawHtml);
      setLocalContent(rawHtml);
      const updated = {
        ...note,
        content: html,
        updatedAt: new Date().toISOString()
      };
      onUpdateNote(updated);
      pushToUndoStack(html);
      updateActiveStates();
    }
  };

  // Undo/Redo implementations
  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    
    const editorDiv = editorRef.current;
    if (!editorDiv) return;

    const currentHtml = editorDiv.innerHTML;
    redoStackRef.current.push(currentHtml);
    
    const prevHtml = undoStackRef.current.pop()!;
    lastSavedContentRef.current = prevHtml;
    setLocalContent(prevHtml);
    editorDiv.innerHTML = prevHtml;

    onUpdateNote({
      ...note,
      content: prevHtml,
      updatedAt: new Date().toISOString()
    });
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;

    const editorDiv = editorRef.current;
    if (!editorDiv) return;

    const currentHtml = editorDiv.innerHTML;
    undoStackRef.current.push(currentHtml);

    const nextHtml = redoStackRef.current.pop()!;
    lastSavedContentRef.current = nextHtml;
    setLocalContent(nextHtml);
    editorDiv.innerHTML = nextHtml;

    onUpdateNote({
      ...note,
      content: nextHtml,
      updatedAt: new Date().toISOString()
    });
  };
  // Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        if (note.type === 'document') {
          const imgHtml = `<p><img src="${base64Data}" style="max-width: 100%; border-radius: 8px; margin: 12px 0;" /></p>`;
          applyFormat('insertHTML', imgHtml);
        } else {
          const updated = {
            ...note,
            image: base64Data,
            updatedAt: new Date().toISOString(),
          };
          onUpdateNote(updated);
          addHistorySnapshot(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Voice Synthesizer
  const toggleSpeakAloud = () => {
    if (!synthRef.current) return;

    if (isPlayingAudio) {
      synthRef.current.cancel();
      setIsPlayingAudio(false);
    } else {
      const textToSpeak = `${noteRef.current.title}. ${editorRef.current?.innerText || ''}`;
      if (!textToSpeak.trim()) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => {
        setIsPlayingAudio(false);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
      };
      utteranceRef.current = utterance;
      setIsPlayingAudio(true);
      synthRef.current.speak(utterance);
    }
  };

  // Download export option
  const downloadNote = (format: 'txt' | 'md' | 'html' | 'pdf') => {
    const filename = `${note.title.toLowerCase().replace(/\s+/g, '-') || 'untitled'}.${format === 'html' ? 'html' : format}`;
    
    // Robust print script for PDF exports
    const printScript = `
      <script>
        function startPrint() {
          window.print();
          window.close();
        }
        if (document.readyState === 'complete') {
          setTimeout(startPrint, 500);
        } else {
          window.addEventListener('load', function() {
            setTimeout(startPrint, 500);
          });
          setTimeout(startPrint, 2500); // Fallback
        }
      </script>
    `;

    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export as PDF.');
        return;
      }
      
      const rawText = editorRef.current?.innerText || '';
      const cleanText = rawText.trim();
      const isFullHtml = cleanText.toLowerCase().startsWith('<!doctype html>') || cleanText.toLowerCase().startsWith('<html');

      if (isFullHtml) {
        let finalHtml = rawText;
        if (finalHtml.toLowerCase().includes('</body>')) {
          finalHtml = finalHtml.replace(/<\/body>/i, `${printScript}</body>`);
        } else {
          finalHtml += printScript;
        }
        printWindow.document.write(finalHtml);
      } else {
        const title = note.title || 'Untitled Note';
        let contentHtml = '';
        if (note.type === 'sheet') {
          try {
            const parsed = JSON.parse(note.content);
            const cells = parsed.data || {};
            const rows = parsed.rowCount || 30;
            const cols = parsed.colCount || 10;
            
            // Build printable HTML table
            let tableHtml = '<table style="width:100%; border-collapse:collapse; margin-top:20px; border:1px solid #ddd; font-size:10px;">';
            
            // Header Row (A, B, C...)
            tableHtml += '<thead><tr style="background-color:#f5f5f5;">';
            tableHtml += '<th style="border:1px solid #ddd; padding:6px; text-align:center; width:40px;"></th>';
            for (let c = 1; c <= cols; c++) {
              tableHtml += `<th style="border:1px solid #ddd; padding:6px; text-align:center; font-weight:bold;">${numberToCol(c)}</th>`;
            }
            tableHtml += '</tr></thead><tbody>';
            
            // Rows
            for (let r = 1; r <= rows; r++) {
              tableHtml += '<tr>';
              // Row Index Column
              tableHtml += `<td style="border:1px solid #ddd; padding:6px; text-align:center; font-weight:bold; background-color:#f9f9f9; width:40px;">${r}</td>`;
              for (let c = 1; c <= cols; c++) {
                const cellId = `${numberToCol(c)}${r}`;
                const cell = cells[cellId];
                const rawVal = cell ? cell.value : '';
                // Evaluate formula if any
                const val = rawVal.startsWith('=') ? evaluateFormula(rawVal, cells) : rawVal;
                
                // Style cell
                const alignStyle = cell?.align === 'center' ? 'text-align:center;' : cell?.align === 'right' ? 'text-align:right;' : 'text-align:left;';
                const weightStyle = cell?.bold ? 'font-weight:bold;' : '';
                const italicStyle = cell?.italic ? 'font-style:italic;' : '';
                const colorStyle = cell?.color ? `color:${cell.color};` : '';
                const fontSzStyle = cell?.fontSize ? `font-size:${cell.fontSize}px;` : '';
                const fontFmStyle = cell?.fontFamily ? `font-family:${cell.fontFamily};` : '';
                
                tableHtml += `<td style="border:1px solid #ddd; padding:6px; ${alignStyle} ${weightStyle} ${italicStyle} ${colorStyle} ${fontSzStyle} ${fontFmStyle}">${val || ''}</td>`;
              }
              tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table>';
            contentHtml = tableHtml;
          } catch {
            contentHtml = '<p>Spreadsheet Grid</p>';
          }
        } else if (note.type === 'tracker') {
          try {
            const parsed = JSON.parse(note.content);
            const report = parsed.aiReport || '# Progress Tracker Data\n\nRun analytics diagnostics in the editor to generate a comprehensive analysis report.';
            
            contentHtml = report.split('\n').map((line: string) => {
              if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
              if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
              if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
              if (line.startsWith('* ') || line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
              if (line.startsWith('|')) return ''; // Skip raw md table syntax
              if (line.trim() === '') return '<br/>';
              return `<p>${line}</p>`;
            }).join('');
          } catch {
            contentHtml = '<h2>Progress Analysis Report</h2><p>Progress Tracker Data</p>';
          }
        } else if (note.type === 'expense') {
          try {
            const parsed = JSON.parse(note.content);
            const report = parsed.aiReport || '# Expense Tracker Report\n\nRun financial diagnostics in the editor to generate a comprehensive analysis report.';
            
            contentHtml = report.split('\n').map((line: string) => {
              if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
              if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
              if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
              if (line.startsWith('* ') || line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
              if (line.startsWith('|')) return ''; // Skip raw md table syntax
              if (line.trim() === '') return '<br/>';
              return `<p>${line}</p>`;
            }).join('');
          } catch {
            contentHtml = '<h2>Expense Tracker Report</h2><p>Financial Diagnostics Data</p>';
          }
        } else {
          contentHtml = editorRef.current?.innerHTML || '';
        }
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Sora:wght@400;600;700&display=swap');
              body {
                font-family: 'Sora', sans-serif;
                padding: 40px;
                line-height: 1.65;
                color: #111111;
                background: #FFFFFF;
              }
              h1, h2, h3, h4, h5, h6 {
                font-family: 'Lora', serif;
                font-weight: bold;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
                color: #111111;
              }
              h1 { font-size: 28px; border-bottom: 1px solid #CCCCCC; padding-bottom: 8px; }
              h2 { font-size: 22px; }
              h3 { font-size: 18px; }
              .note-title {
                font-family: 'Lora', serif;
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 24px;
                border-bottom: 2px solid #111111;
                padding-bottom: 12px;
              }
              img {
                max-width: 100%;
                max-height: 350px;
                height: auto;
                border-radius: 6px;
                margin: 16px 0;
                display: block;
                object-fit: contain;
              }
              pre {
                background: #F5F5F5;
                padding: 12px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 13px;
                overflow-x: auto;
                border: 1px solid #E5E5E5;
              }
              blockquote {
                border-left: 4px solid #737373;
                padding-left: 16px;
                color: #555555;
                font-style: italic;
                margin: 16px 0;
              }
              /* Checklist styles */
              .checklist-title {
                font-family: 'Lora', serif;
                font-size: 16px;
                font-weight: bold;
                margin-top: 32px;
                margin-bottom: 12px;
                color: #111111;
                border-bottom: 1px dashed #CCCCCC;
                padding-bottom: 6px;
              }
              .checklist-item {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
                font-size: 14px;
              }
              .checkbox {
                width: 16px;
                height: 16px;
                border: 1px solid #737373;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
              }
              .checkbox.checked {
                background: #111111;
                border-color: #111111;
                color: #FFFFFF;
              }
              @media print {
                body {
                  padding: 0;
                }
                @page {
                  margin: 2cm;
                }
              }
            </style>
          </head>
          <body>
            <div class="note-title">${title}</div>
            
            ${note.drawing ? `<img src="${note.drawing}" alt="Drawing" />` : ''}
            ${note.image ? `<img src="${note.image}" alt="Attachment" />` : ''}
            
            <div>${contentHtml}</div>
            
            ${note.checklist && note.checklist.length > 0 ? `
              <div class="checklist-title">Checklist</div>
              <div style="margin-top: 12px;">
                ${note.checklist.map(item => `
                  <div class="checklist-item">
                    <div class="checkbox ${item.completed ? 'checked' : ''}">${item.completed ? '✓' : ''}</div>
                    <span style="${item.completed ? 'text-decoration: line-through; color: #737373;' : ''}">${item.text || 'Untitled Item'}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${printScript}
          </body>
          </html>
        `);
      }
      printWindow.document.close();
      setDownloadDropdownOpen(false);
      return;
    }

    let content = '';

    if (format === 'md') {
      content = `# ${note.title}\n\n${editorRef.current?.innerText || ''}`;
    } else if (format === 'html') {
      const rawText = editorRef.current?.innerText || '';
      const cleanText = rawText.trim();
      const isFullHtml = cleanText.toLowerCase().startsWith('<!doctype html>') || cleanText.toLowerCase().startsWith('<html');

      if (isFullHtml) {
        content = rawText;
      } else {
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${note.title}</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 40px;
      line-height: 1.6;
      background: #FAF6F0;
      color: #1E1E1E;
    }
    h1 {
      border-bottom: 1px solid #CCCCCC;
      padding-bottom: 8px;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 16px 0;
    }
    blockquote {
      border-left: 4px solid #737373;
      padding-left: 16px;
      color: #555555;
      font-style: italic;
    }
    pre {
      background: #F5F5F5;
      padding: 12px;
      border-radius: 6px;
      font-family: monospace;
    }
    .checklist-title {
      font-weight: bold;
      margin-top: 24px;
    }
    .checklist-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .checkbox {
      width: 16px;
      height: 16px;
      border: 1px solid #737373;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .checkbox.checked {
      background: #111111;
      border-color: #111111;
      color: #FFFFFF;
    }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  
  ${note.drawing ? `<img src="${note.drawing}" alt="Drawing" />` : ''}
  ${note.image ? `<img src="${note.image}" alt="Attachment" />` : ''}
  
  <div>${editorRef.current?.innerHTML || ''}</div>
  
  ${note.checklist && note.checklist.length > 0 ? `
    <div class="checklist-title">Checklist</div>
    <div style="margin-top: 12px;">
      ${note.checklist.map(item => `
        <div class="checklist-item">
          <div class="checkbox ${item.completed ? 'checked' : ''}">${item.completed ? '✓' : ''}</div>
          <span style="${item.completed ? 'text-decoration: line-through; color: #737373;' : ''}">${item.text || 'Untitled Item'}</span>
        </div>
      `).join('')}
    </div>
  ` : ''}
</body>
</html>`;
      }
    } else {
      content = `${note.title}\n\n${editorRef.current?.innerText || ''}`;
    }
    
    const mimeType = format === 'html' ? 'text/html' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadDropdownOpen(false);
  };
  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Chrome.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };


  // Checklist item actions
  const toggleChecklistItem = (itemId: string) => {
    if (!note.checklist) return;
    const updated = note.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateNote({
      ...note,
      checklist: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: '',
      completed: false,
    };
    const updated = note.checklist ? [...note.checklist, newItem] : [newItem];
    onUpdateNote({
      ...note,
      checklist: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const updateChecklistItemText = (itemId: string, val: string) => {
    if (!note.checklist) return;
    const updated = note.checklist.map((item) =>
      item.id === itemId ? { ...item, text: val } : item
    );
    onUpdateNote({
      ...note,
      checklist: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const removeChecklistItem = (itemId: string) => {
    if (!note.checklist) return;
    const updated = note.checklist.filter((item) => item.id !== itemId);
    onUpdateNote({
      ...note,
      checklist: updated.length > 0 ? updated : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleChecklistSupport = () => {
    if (note.checklist) {
      onUpdateNote({
        ...note,
        checklist: undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      addChecklistItem();
    }
  };

  const removeImage = () => {
    onUpdateNote({
      ...note,
      image: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const removeDrawing = () => {
    onUpdateNote({
      ...note,
      drawing: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  // Notion-style Slash command runner
  const executeSlashCommand = (cmd: string) => {
    const editorDiv = editorRef.current;
    if (!editorDiv) return;

    editorDiv.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      const offset = range.startOffset;
      if (textNode.nodeType === Node.TEXT_NODE) {
        const textVal = textNode.nodeValue || '';
        const slashIdx = textVal.lastIndexOf('/', offset - 1);
        if (slashIdx !== -1) {
          textNode.nodeValue = textVal.slice(0, slashIdx) + textVal.slice(offset);
          range.setStart(textNode, slashIdx);
          range.setEnd(textNode, slashIdx);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }

    let runSideAction: (() => void) | null = null;
    switch (cmd) {
      case 'h1': applyFormat('formatBlock', 'h1'); break;
      case 'h2': applyFormat('formatBlock', 'h2'); break;
      case 'todo': 
        applyFormat('insertHTML', '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><input type="checkbox" style="width:14px;height:14px;" />&nbsp;</div>'); 
        break;
      case 'code': 
        applyFormat('insertHTML', '<pre style="background:#252525;padding:8px;border-radius:6px;font-family:monospace;font-size:11px;"><code>Code...</code></pre>');
        break;
      case 'quote':
        applyFormat('insertHTML', '<blockquote style="border-left:4px solid #E76F51;padding-left:8px;color:#888;font-style:italic;">Quote...</blockquote>');
        break;
      case 'draw': runSideAction = () => onOpenDrawing(); break;
      case 'voice': runSideAction = () => toggleDictation(); break;
      case 'ai': runSideAction = () => setAiPanelOpen(true); break;
      case 'wiki':
        applyFormat('insertHTML', '[[Note]]');
        break;
      default: break;
    }

    const rawHtml = editorDiv.innerHTML;
    const html = sanitizeHtmlContent(rawHtml);
    setLocalContent(rawHtml);
    onUpdateNote({
      ...note,
      content: html,
      updatedAt: new Date().toISOString()
    });
    pushToUndoStack(html);
    setSlashMenuOpen(false);

    if (runSideAction) {
      runSideAction();
    }
  };

  const slashCommands = [
    { id: 'h1', name: 'Heading 1', desc: 'Heading section text', icon: 'H1' },
    { id: 'h2', name: 'Heading 2', desc: 'Subheading section text', icon: 'H2' },
    { id: 'todo', name: 'Checklist Task', desc: 'Checkbox bullet item', icon: 'CheckSquare' },
    { id: 'code', name: 'Code Block', desc: 'Fenced code snippet', icon: 'Code' },
    { id: 'quote', name: 'Quote Block', desc: 'Blockquote formatting', icon: 'Quote' },
    { id: 'wiki', name: 'Wiki Link [[Note]]', desc: 'Bidirectional note link', icon: 'Split' },
    { id: 'draw', name: 'Drawing Canvas', desc: 'Sketchpad drawing overlay', icon: 'Pencil' },
    { id: 'voice', name: 'Dictate Mic Voice', desc: 'Transcribe audio speech', icon: 'Mic' },
    { id: 'ai', name: 'AI Copilot Assist', desc: 'Summaries & tone styles', icon: 'Sparkles' },
  ];

  const filteredCommands = slashCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(slashQuery.toLowerCase()) ||
    cmd.id.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const markdownToHtml = (markdown: string): string => {
    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-weight: bold; font-size: 1.1em; margin: 10px 0 5px 0;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-weight: bold; font-size: 1.25em; margin: 12px 0 6px 0;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-weight: bold; font-size: 1.5em; margin: 15px 0 8px 0;">$1</h1>');
    
    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.9em; overflow-x: auto; margin: 8px 0;"><code>$1</code></pre>');
    html = html.replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
    
    // Checkboxes / Task lists
    html = html.replace(/^- \[ \] (.*$)/gim, '<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" disabled style="pointer-events: none;" /> <span>$1</span></div>');
    html = html.replace(/^- \[x\] (.*$)/gim, '<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" checked disabled style="pointer-events: none;" /> <span style="text-decoration: line-through; opacity: 0.6;">$1</span></div>');
    
    // Bullet lists (nested/wrapped in ul tags to prevent parent list counter increments)
    html = html.replace(/^\s*([-\*•])\s+(.*$)/gim, '<ul style="margin-left: 20px; list-style-type: disc; margin-top: 2px; margin-bottom: 2px;"><li style="margin: 2px 0;">$2</li></ul>');
    
    // Numbered lists (wrapped in ol tags, preserving original starting indices with value attributes)
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<ol style="margin-left: 20px; list-style-type: decimal; margin-top: 4px; margin-bottom: 4px;"><li value="$1" style="margin: 2px 0;">$2</li></ol>');

    // Paragraphs (split by double newlines)
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<div') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
        return trimmed;
      }
      return `<p style="margin-bottom: 8px;">${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('');

    // Merge consecutive <ul> tags and consecutive <ol> tags
    html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '');
    html = html.replace(/<\/ol>\s*<ol[^>]*>/g, '');

    return html;
  };

  const handleAIRequest = async (promptText: string, presetName?: string) => {
    if (!promptText.trim()) return;

    setAiLoading(true);
    setAiError(null);
    setAiError(null);

    const userMsgId = `user-${Date.now()}`;
    const userMessage = presetName ? `[${presetName}] ${promptText}` : promptText;
    setAiMessages(prev => [...prev, { sender: 'user', text: userMessage, id: userMsgId }]);
    if (!presetName) {
      setAiPrompt('');
    }

    try {
      const activeContent = editorRef.current?.innerHTML || note.content;
      const response = await generateText({
        config: aiConfig,
        prompt: promptText,
        noteContext: {
          title: localTitle,
          content: activeContent,
          type: note.type
        }
      });

      const aiMsgId = `ai-${Date.now()}`;
      setAiMessages(prev => [...prev, { sender: 'ai', text: response, id: aiMsgId }]);
    } catch (err: any) {
      setAiError(err.message || 'An unexpected error occurred.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleInsertAtCursor = (text: string) => {
    const htmlToInsert = markdownToHtml(text);
    if (editorRef.current) {
      editorRef.current.focus();
      
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          
          const el = document.createElement('div');
          el.innerHTML = htmlToInsert;
          
          const frag = document.createDocumentFragment();
          let node;
          while ((node = el.firstChild)) {
            frag.appendChild(node);
          }
          range.insertNode(frag);
        } else {
          editorRef.current.innerHTML += htmlToInsert;
        }
      } catch (err) {
        editorRef.current.innerHTML += htmlToInsert;
      }
      
      const rawHtml = editorRef.current.innerHTML;
      const html = sanitizeHtmlContent(rawHtml);
      setLocalContent(rawHtml);
      onUpdateNote({
        ...note,
        content: html,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleReplaceNoteContent = (text: string) => {
    const htmlToReplace = markdownToHtml(text);
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlToReplace;
      setLocalContent(htmlToReplace);
      onUpdateNote({
        ...note,
        content: htmlToReplace,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(`copied-${index}`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-creamCard dark:bg-charcoalDarkCard relative overflow-hidden transition-all duration-200">
      
      {/* Editor Header / Controls */}
      <div className="px-8 py-5 flex items-center justify-between border-b border-charcoal/20 dark:border-white/5">
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="mr-2 px-3.5 py-2 border border-charcoal/30 text-charcoal hover:bg-charcoal/5 font-sans text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              title="Go back to Home dashboard"
            >
              <ChevronLeft className="w-4 h-4" /> Home
            </button>
          )}

          {/* Lock status toggle */}
          <button
            onClick={() => onToggleLock(note.id)}
            className={`p-3 rounded-full border transition-all duration-150 ${
              note.locked 
                ? 'bg-warmAmber/15 border-warmAmber text-warmAmber' 
                : 'border-charcoal/25 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
            }`}
            title={note.locked ? 'Locked note settings' : 'Lock note'}
          >
            {note.locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </button>

          {/* Archive Status Toggle */}
          <button
            onClick={() => onArchiveNote(note.id)}
            className={`p-3 rounded-full border transition-all duration-150 ${
              note.archived 
                ? 'bg-warmAmber/15 border-warmAmber text-warmAmber' 
                : 'border-charcoal/25 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
            }`}
            title={note.archived ? 'Unarchive note' : 'Archive note'}
          >
            <Archive className="w-5 h-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-3 rounded-full border border-charcoal/25 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="w-[1px] h-6 bg-charcoal/10 dark:bg-white/15 mx-1" />

          {/* Expanding Tools Ball Menu */}
          <div className="relative flex items-center">
            <motion.div
              layout
              initial="collapsed"
              animate={toolbarExpanded ? "expanded" : "collapsed"}
              variants={{
                collapsed: { 
                  width: 50,
                  height: 50,
                  borderRadius: '8px',
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
                  overflow: 'hidden',
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } 
                },
                expanded: { 
                  width: 'auto',
                  height: 50,
                  borderRadius: '8px',
                  backgroundColor: darkMode ? '#1A1A1A' : '#FFFFFF',
                  borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
                  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
                  transitionEnd: { overflow: 'visible' }
                }
              }}
              className="border flex items-center pr-2 text-charcoal dark:text-white"
            >
              {/* Trigger Button (Matte Theme Matching Block) */}
              <motion.button
                onClick={() => setToolbarExpanded(!toolbarExpanded)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-[50px] h-[50px] bg-charcoal text-white hover:bg-charcoal/90 dark:bg-[#2C2C2E] dark:hover:bg-[#3C3C3E] flex items-center justify-center shrink-0 cursor-pointer shadow-md focus:outline-none rounded-none rounded-l-[7px]"
                title={toolbarExpanded ? "Close menu" : "Open tools menu"}
              >
                <motion.div
                  animate={{ rotate: toolbarExpanded ? 135 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Plus className="w-5 h-5 text-white" />
                </motion.div>
              </motion.button>

              {/* Collapsible Action Items */}
              <AnimatePresence>
                {toolbarExpanded && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.05
                        }
                      }
                    }}
                    className="flex items-center gap-3 px-3 shrink-0"
                  >
                    {note.type !== 'sheet' && note.type !== 'tracker' && note.type !== 'expense' && (
                      <>
                        {/* Item 1: Speak Aloud */}
                        <motion.button
                          variants={{
                            hidden: { opacity: 0, x: -15, scale: 0.8 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                          }}
                          onClick={toggleSpeakAloud}
                          className="p-2.5 rounded-lg text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer relative"
                          title={isPlayingAudio ? 'Pause reading aloud' : 'Read note aloud'}
                        >
                          {isPlayingAudio ? (
                            <>
                              <VolumeX className="w-5 h-5 text-warmAmber" />
                              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-warmAmber animate-ping" />
                            </>
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </motion.button>

                        {/* Item 2: Dictation Mic */}
                        <motion.button
                          variants={{
                            hidden: { opacity: 0, x: -15, scale: 0.8 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                          }}
                          onClick={toggleDictation}
                          className="p-2.5 rounded-lg text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer relative"
                          title={isRecording ? 'Stop voice recording' : 'Dictate contents'}
                        >
                          {isRecording ? (
                            <>
                              <MicOff className="w-5 h-5 text-warmAmber" />
                              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            </>
                          ) : (
                            <Mic className="w-5 h-5" />
                          )}
                        </motion.button>

                        {/* Item 3: Add Image */}
                        <motion.label
                          variants={{
                            hidden: { opacity: 0, x: -15, scale: 0.8 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                          }}
                          className="p-2.5 rounded-lg text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center animate-none"
                          title="Insert Image"
                        >
                          <ImageIcon className="w-5 h-5 text-charcoalMuted dark:text-gray-400" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </motion.label>

                        {/* Item 4: Drawing */}
                        <motion.button
                          variants={{
                            hidden: { opacity: 0, x: -15, scale: 0.8 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                          }}
                          onClick={onOpenDrawing}
                          className="p-2.5 rounded-lg text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                          title="Draw Canvas"
                        >
                          <Pencil className="w-5 h-5" />
                        </motion.button>

                        {/* Item 5: Checklist */}
                        <motion.button
                          variants={{
                            hidden: { opacity: 0, x: -15, scale: 0.8 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                          }}
                          onClick={toggleChecklistSupport}
                          className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                            note.checklist 
                              ? 'text-warmAmber bg-warmAmber/10' 
                              : 'text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
                          }`}
                          title="Checklist Layout"
                        >
                          <CheckSquare className="w-5 h-5" />
                        </motion.button>
                      </>
                    )}

                    {/* Item 7: Create New Note Trigger */}
                    {onCreateNewNote && (
                      <motion.button
                        variants={{
                          hidden: { opacity: 0, x: -15, scale: 0.8 },
                          visible: { opacity: 1, x: 0, scale: 1 }
                        }}
                        onClick={onCreateNewNote}
                        className="p-2.5 rounded-lg text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
                        title="Create new note / document / spreadsheet"
                      >
                        <Plus className="w-5 h-5 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white" />
                      </motion.button>
                    )}

                    {/* Item 6: Export / Download */}
                    <div className="relative">
                      <motion.button
                        variants={{
                          hidden: { opacity: 0, x: -15, scale: 0.8 },
                          visible: { opacity: 1, x: 0, scale: 1 }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadDropdownOpen(!downloadDropdownOpen);
                        }}
                        className="p-2.5 rounded-lg text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
                        title="Download options"
                      >
                        <Download className="w-5 h-5" />
                      </motion.button>
                      
                      {downloadDropdownOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full right-0 mt-2 w-42 bg-creamCard dark:bg-[#202020] border border-charcoal/25 dark:border-white/10 rounded-2xl shadow-xl z-30 py-2 text-left"
                        >
                            <button
                              onClick={() => {
                                downloadNote('md');
                                setDownloadDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-sans text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                              Markdown (.md)
                            </button>
                            <button
                              onClick={() => {
                                downloadNote('txt');
                                setDownloadDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-sans text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                              Plain Text (.txt)
                            </button>
                            <button
                              onClick={() => {
                                downloadNote('html');
                                setDownloadDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-sans text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                              Web Page (.html)
                            </button>
                            <button
                              onClick={() => {
                                downloadNote('pdf');
                                setDownloadDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-sans text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer border-t border-charcoal/10 dark:border-white/5 mt-1 pt-2"
                            >
                              PDF Document (.pdf)
                            </button>
                            {note.type === 'document' && (
                              <button
                                onClick={() => {
                                  exportToWord(localTitle, note.content, localTitle || 'Document');
                                  setDownloadDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-sans font-bold text-blue-500 hover:bg-blue-500/5 transition-all cursor-pointer border-t border-charcoal/10 dark:border-white/5 mt-1 pt-2"
                              >
                                MS Word (.doc/.docx)
                              </button>
                            )}
                            {note.type === 'sheet' && (
                              <button
                                onClick={() => {
                                  const parsed = JSON.parse(note.content);
                                  exportToExcel(parsed.data, parsed.rowCount || 30, parsed.colCount || 10, localTitle || 'Spreadsheet');
                                  setDownloadDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 text-xs font-sans font-bold text-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer border-t border-charcoal/10 dark:border-white/5 mt-1 pt-2"
                              >
                                MS Excel (.xls/.xlsx)
                              </button>
                            )}
                          </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Keyboard Shortcuts Help */}
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="p-3 rounded-full border border-charcoal/25 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all duration-150"
            title="Keyboard shortcuts (Ctrl+/)"
          >
            <Keyboard className="w-5 h-5" />
          </button>

          {/* Delete note */}
          <button
            onClick={() => onDeleteNote(note.id)}
            className="p-3 rounded-full border border-charcoal/25 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:border-red-500/30 hover:text-red-500 hover:bg-red-500/5 transition-all duration-150"
            title={note.deleted ? 'Delete note permanently' : 'Move to Trash'}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {note.type === 'sheet' ? (
        <SpreadsheetEditor note={note} onUpdateNote={onUpdateNote} darkMode={darkMode} aiConfig={aiConfig} />
      ) : note.type === 'tracker' ? (
        <TrackerEditor note={note} onUpdateNote={onUpdateNote} darkMode={darkMode} />
      ) : note.type === 'expense' ? (
        <ExpenseEditor note={note} onUpdateNote={onUpdateNote} darkMode={darkMode} categories={categories} />
      ) : (
        <>
          {/* Premium Formatting controls strip (rich text helper) */}
          <div className="flex items-center gap-2 px-8 py-4 bg-[#F8F6F0] dark:bg-[#151515] border-b border-charcoal/20 dark:border-white/10 text-xs select-none overflow-x-auto no-scrollbar shrink-0">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('formatBlock', activeBlockType === 'h1' ? 'p' : 'h1')}
              className={`h-10 px-4 rounded-md border font-serif font-bold text-xs transition-all duration-150 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer ${
                activeBlockType === 'h1' ? 'border-warmAmber text-warmAmber bg-warmAmber/5 dark:bg-warmAmber/5' : 'border-charcoal/20 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
              title={activeBlockType === 'h1' ? 'Remove Heading 1' : 'Heading 1'}
            >
              H1
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('formatBlock', activeBlockType === 'h2' ? 'p' : 'h2')}
              className={`h-10 px-4 rounded-md border font-serif font-bold text-xs transition-all duration-150 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer ${
                activeBlockType === 'h2' ? 'border-warmAmber text-warmAmber bg-warmAmber/5 dark:bg-warmAmber/5' : 'border-charcoal/20 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
              title={activeBlockType === 'h2' ? 'Remove Heading 2' : 'Heading 2'}
            >
              H2
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('formatBlock', activeBlockType === 'h3' ? 'p' : 'h3')}
              className={`h-10 px-4 rounded-md border font-serif font-bold text-xs transition-all duration-150 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer ${
                activeBlockType === 'h3' ? 'border-warmAmber text-warmAmber bg-warmAmber/5 dark:bg-warmAmber/5' : 'border-charcoal/20 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
              title={activeBlockType === 'h3' ? 'Remove Heading 3' : 'Heading 3'}
            >
              H3
            </button>
            
            <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-1" />
            
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('bold')}
              className={`h-10 px-4 rounded-md border font-sans font-bold text-xs transition-all duration-150 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer ${
                isBoldActive ? 'border-warmAmber text-warmAmber bg-warmAmber/5 dark:bg-warmAmber/5' : 'border-charcoal/20 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
              title="Bold"
            >
              B
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('italic')}
              className={`h-10 px-4 rounded-md border font-sans italic font-bold text-xs transition-all duration-150 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer ${
                isItalicActive ? 'border-warmAmber text-warmAmber bg-warmAmber/5 dark:bg-warmAmber/5' : 'border-charcoal/20 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
              title="Italic"
            >
              I
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFormat('underline')}
              className="h-10 px-4 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 font-sans underline font-bold text-xs transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-sm"
              title="Underline"
            >
              U
            </button>

            {note.type === 'document' && (
              <>
                <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-1" />

                <select
                  onChange={(e) => applyFormat('fontName', e.target.value)}
                  className="h-10 px-3 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs font-sans outline-none cursor-pointer hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all shadow-sm"
                  title="Font Family"
                >
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>

                <select
                  onChange={(e) => applyFormat('fontSize', e.target.value)}
                  className="h-10 px-3 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs font-sans outline-none cursor-pointer hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all shadow-sm"
                  title="Font Size"
                >
                  <option value="3">12px</option>
                  <option value="2">10px</option>
                  <option value="4">14px</option>
                  <option value="5">18px</option>
                  <option value="6">24px</option>
                  <option value="7">32px</option>
                </select>

                <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-1" />

                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('justifyLeft')}
                  className="h-10 w-10 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('justifyCenter')}
                  className="h-10 w-10 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('justifyRight')}
                  className="h-10 w-10 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('justifyFull')}
                  className="h-10 w-10 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white flex items-center justify-center hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
                  title="Justify"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-1" />

                <select
                  onChange={(e) => applyFormat('foreColor', e.target.value)}
                  className="h-10 px-3 rounded-md border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs font-sans outline-none cursor-pointer hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all shadow-sm"
                  title="Text Color"
                >
                  <option value="#000000">Black</option>
                  <option value="#333333">Charcoal</option>
                  <option value="#2563EB">Blue</option>
                  <option value="#16A34A">Green</option>
                  <option value="#DC2626">Red</option>
                  <option value="#D97706">Amber</option>
                </select>

                <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-1" />

                {/* Table Customizer */}
                <div>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setTablePickerOpen(p => !p)}
                    className={`h-10 px-4 border rounded-md font-sans font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                      tablePickerOpen
                        ? 'border-warmAmber text-warmAmber bg-warmAmber/5'
                        : 'border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
                    }`}
                    title="Insert / Customize Table"
                  >
                    <TableIcon className="w-4 h-4" /> Table
                  </button>

                  {tablePickerOpen && (
                    <div
                      onClick={() => setTablePickerOpen(false)}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs"
                    >
                      <div
                        onClick={e => e.stopPropagation()}
                        className="w-80 bg-white dark:bg-[#1E1E1E] border border-charcoal/15 dark:border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-4.5 text-xs font-sans text-charcoal dark:text-white select-none"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-charcoal/10 dark:border-white/5">
                          <p className="font-bold text-sm text-charcoal dark:text-white">Customize & Insert Table</p>
                          <button
                            onClick={() => setTablePickerOpen(false)}
                            className="p-1 hover:bg-charcoal/5 dark:hover:bg-white/5 rounded-full text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Rows × Cols */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted dark:text-gray-400">Rows</label>
                            <div className="flex items-center gap-2">
                              <button onMouseDown={e=>e.preventDefault()} onClick={()=>setTableRows(r=>Math.max(1,r-1))} className="w-7 h-7 rounded border border-charcoal/20 dark:border-white/10 bg-charcoal/5 dark:bg-white/5 flex items-center justify-center hover:bg-charcoal/10 cursor-pointer font-bold text-base leading-none">−</button>
                              <span className="flex-1 text-center font-bold text-sm">{tableRows}</span>
                              <button onMouseDown={e=>e.preventDefault()} onClick={()=>setTableRows(r=>Math.min(10,r+1))} className="w-7 h-7 rounded border border-charcoal/20 dark:border-white/10 bg-charcoal/5 dark:bg-white/5 flex items-center justify-center hover:bg-charcoal/10 cursor-pointer font-bold text-base leading-none">+</button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted dark:text-gray-400">Columns</label>
                            <div className="flex items-center gap-2">
                              <button onMouseDown={e=>e.preventDefault()} onClick={()=>setTableCols(c=>Math.max(1,c-1))} className="w-7 h-7 rounded border border-charcoal/20 dark:border-white/10 bg-charcoal/5 dark:bg-white/5 flex items-center justify-center hover:bg-charcoal/10 cursor-pointer font-bold text-base leading-none">−</button>
                              <span className="flex-1 text-center font-bold text-sm">{tableCols}</span>
                              <button onMouseDown={e=>e.preventDefault()} onClick={()=>setTableCols(c=>Math.min(8,c+1))} className="w-7 h-7 rounded border border-charcoal/20 dark:border-white/10 bg-charcoal/5 dark:bg-white/5 flex items-center justify-center hover:bg-charcoal/10 cursor-pointer font-bold text-base leading-none">+</button>
                            </div>
                          </div>
                        </div>

                        {/* Visual grid preview */}
                        <div className="w-full overflow-auto">
                          <div
                            className="grid gap-0.5"
                            style={{ gridTemplateColumns: `repeat(${tableCols}, 1fr)` }}
                          >
                            {Array.from({ length: Math.min(tableRows, 5) * tableCols }).map((_, i) => {
                              const row = Math.floor(i / tableCols);
                              const isHeader = tableHasHeader && row === 0;
                              const isZebra = tableZebra && !isHeader && row % 2 === 0;
                              const headerColors: Record<string, string> = {
                                neutral: '#e5e5e5',
                                blue:    '#dbeafe',
                                green:   '#dcfce7',
                                amber:   '#fef3c7',
                                purple:  '#ede9fe',
                              };
                              return (
                                <div
                                  key={i}
                                  className="h-5 rounded-sm border"
                                  style={{
                                    backgroundColor: isHeader
                                      ? headerColors[tableHeaderTheme]
                                      : isZebra ? '#f9f9f9' : '#fff',
                                    borderColor: tableBorderStyle === 'none' ? 'transparent' : '#ccc',
                                    borderStyle: tableBorderStyle === 'dashed' ? 'dashed' : 'solid',
                                  }}
                                />
                              );
                            })}
                          </div>
                          {tableRows > 5 && (
                            <p className="text-center text-[10px] text-charcoalMuted mt-1">+{tableRows - 5} more rows</p>
                          )}
                        </div>

                        {/* Header toggle */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted dark:text-gray-400">Header Row</span>
                          <button
                            onMouseDown={e=>e.preventDefault()}
                            onClick={()=>setTableHasHeader(h=>!h)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${
                              tableHasHeader ? 'bg-warmAmber' : 'bg-charcoal/20 dark:bg-white/15'
                            }`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${tableHasHeader ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* Zebra striping toggle */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted dark:text-gray-400">Zebra Striping</span>
                          <button
                            onMouseDown={e=>e.preventDefault()}
                            onClick={()=>setTableZebra(z=>!z)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${
                              tableZebra ? 'bg-warmAmber' : 'bg-charcoal/20 dark:bg-white/15'
                            }`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${tableZebra ? 'left-5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        {/* Border style */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted dark:text-gray-400">Border Style</span>
                          <div className="flex gap-2">
                            {(['solid','dashed','none'] as const).map(style => (
                              <button
                                key={style}
                                onMouseDown={e=>e.preventDefault()}
                                onClick={()=>setTableBorderStyle(style)}
                                className={`flex-1 py-1.5 rounded-md border text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                  tableBorderStyle === style
                                    ? 'border-warmAmber text-warmAmber bg-warmAmber/8'
                                    : 'border-charcoal/20 dark:border-white/10 hover:bg-charcoal/5 dark:hover:bg-white/5'
                                }`}
                              >{style}</button>
                            ))}
                          </div>
                        </div>

                        {/* Header color theme */}
                        {tableHasHeader && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoalMuted dark:text-gray-400">Header Color</span>
                            <div className="flex gap-2">
                              {([
                                { key: 'neutral', bg: '#e5e5e5', label: 'Gray'   },
                                { key: 'blue',    bg: '#3b82f6', label: 'Blue'   },
                                { key: 'green',   bg: '#22c55e', label: 'Green'  },
                                { key: 'amber',   bg: '#f59e0b', label: 'Amber'  },
                                { key: 'purple',  bg: '#a855f7', label: 'Purple' },
                              ] as const).map(({ key, bg, label }) => (
                                <button
                                  key={key}
                                  onMouseDown={e=>e.preventDefault()}
                                  onClick={()=>setTableHeaderTheme(key)}
                                  title={label}
                                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                                    tableHeaderTheme === key ? 'border-charcoal dark:border-white scale-110' : 'border-transparent hover:scale-105'
                                  }`}
                                  style={{ backgroundColor: bg }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Divider */}
                        <div className="h-[1px] bg-charcoal/10 dark:bg-white/10" />

                        {/* Insert button */}
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            const headerColors: Record<string, { bg: string; text: string }> = {
                              neutral: { bg: '#f0f0f0', text: '#1a1a1a' },
                              blue:    { bg: '#dbeafe', text: '#1e3a5f' },
                              green:   { bg: '#dcfce7', text: '#14532d' },
                              amber:   { bg: '#fef3c7', text: '#78350f' },
                              purple:  { bg: '#ede9fe', text: '#3b0764' },
                            };
                            const hc = headerColors[tableHeaderTheme];
                            const borderAttr = tableBorderStyle === 'none'
                              ? 'border: none;'
                              : `border: 1px ${tableBorderStyle} #ccc;`;

                            let html = `<table style="width:100%;border-collapse:collapse;margin:12px 0;${tableBorderStyle !== 'none' ? 'border:1px ' + tableBorderStyle + ' #ccc;' : ''}">`;

                            if (tableHasHeader) {
                              html += '<thead><tr>';
                              for (let c = 0; c < tableCols; c++) {
                                html += `<th style="${borderAttr}padding:8px 10px;font-weight:600;font-size:12px;background:${hc.bg};color:${hc.text};text-align:left;">Header ${c + 1}</th>`;
                              }
                              html += '</tr></thead>';
                            }

                            html += '<tbody>';
                            const dataRows = tableHasHeader ? tableRows - 1 : tableRows;
                            for (let r = 0; r < dataRows; r++) {
                              const rowBg = tableZebra && r % 2 === 1 ? 'background:#f9f9f9;' : '';
                              html += `<tr style="${rowBg}">`;
                              for (let c = 0; c < tableCols; c++) {
                                html += `<td style="${borderAttr}padding:7px 10px;font-size:12px;"> </td>`;
                              }
                              html += '</tr>';
                            }
                            html += '</tbody></table>';

                            applyFormat('insertHTML', html);
                            setTablePickerOpen(false);
                          }}
                          className="w-full py-2.5 rounded-xl bg-charcoal dark:bg-warmAmber text-white dark:text-charcoal font-bold text-xs tracking-wide hover:opacity-90 transition-all cursor-pointer"
                        >
                          Insert Table ({tableRows} × {tableCols})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {note.type === 'document' ? (
            /* Microsoft Word-style page view layout */
            <div className="flex-1 overflow-y-auto bg-[#F4F4F4] dark:bg-[#151515] pt-8 px-8 pb-32 flex justify-center items-start">
              <div className="w-full max-w-[812px] min-h-[1050px] bg-white dark:bg-[#202020] border border-charcoal/10 dark:border-white/5 shadow-xl rounded-sm p-16 flex flex-col relative z-10 shrink-0">
                {/* Title Input */}
                <input
                  type="text"
                  value={localTitle}
                  onChange={handleTitleChange}
                  onBlur={saveTitleNow}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      editorRef.current?.focus();
                    }
                  }}
                  placeholder="Untitled Document..."
                  className="w-full text-3xl font-serif font-bold text-black dark:text-white bg-transparent border-none outline-none focus:ring-0 placeholder:text-neutral-400 shrink-0 mb-8 border-b border-charcoal/10 dark:border-white/5 pb-2"
                />

                {renderSuggestionsBar()}

                {/* Main Content editable area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditableInput}
                  onKeyDown={handleEditableKeyDown}
                  onBlur={saveContentNow}
                  onMouseUp={updateActiveStates}
                  onKeyUp={updateActiveStates}
                  onFocus={updateActiveStates}
                  onClick={updateActiveStates}
                  data-placeholder="Start typing your document..."
                  className="w-full flex-1 min-h-[500px] text-sm font-sans text-black dark:text-white bg-transparent border-none outline-none focus:ring-0 leading-[1.8] placeholder:text-neutral-400 select-text note-editor-content prose dark:prose-invert max-w-none"
                />

                {/* Checklist Block for Document */}
                {note.checklist && (
                  <div className="border-t border-charcoal/20 dark:border-white/5 pt-5 mt-8 space-y-3 shrink-0 text-charcoal dark:text-white">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <ListCheck className="w-3.5 h-3.5 text-warmAmber" />
                        Document Tasks
                      </h5>
                      <span className="text-[9px] font-sans text-charcoalMuted">
                        {note.checklist.filter(item => item.completed).length} / {note.checklist.length} Done
                      </span>
                    </div>
                    
                    <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                      {note.checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 group">
                          <button
                            onClick={() => toggleChecklistItem(item.id)}
                            className={`w-5.5 h-5.5 rounded-md flex items-center justify-center border transition-all ${
                              item.completed 
                                ? 'bg-warmAmber border-warmAmber text-white' 
                                : 'border-charcoal/35 dark:border-white/20 text-transparent hover:border-warmAmberHover'
                            }`}
                          >
                            ✓
                          </button>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                            placeholder="Task description..."
                            className={`flex-1 text-xs font-sans bg-transparent border-none outline-none p-0 focus:ring-0 ${
                              item.completed 
                                ? 'line-through text-charcoalMuted/60 dark:text-gray-500' 
                                : 'text-charcoal dark:text-white'
                            }`}
                          />
                          <button
                            onClick={() => removeChecklistItem(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove item"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={addChecklistItem}
                      className="mt-2 text-xs font-sans font-semibold text-warmAmberHover dark:text-warmAmber hover:text-warmAmberHover/80 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add checklist item
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard Note workspace layout (original scrollpane) */
            <div className="flex-1 overflow-y-auto px-8 pt-6 pb-24 space-y-6 flex flex-col relative">
              
              {/* Notion-style Slash command menu overlay */}
              {slashMenuOpen && filteredCommands.length > 0 && (
                <div className="absolute left-8 top-12 w-64 bg-creamCard dark:bg-[#1E1E1E] border border-charcoal/25 dark:border-white/10 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto py-2 animate-fadeIn text-xs select-none">
                  <div className="px-3.5 py-1 text-[9px] font-sans font-bold text-charcoalMuted/60 dark:text-gray-500 uppercase tracking-wider">
                    Drafting Commands
                  </div>
                  {filteredCommands.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      onClick={() => executeSlashCommand(cmd.id)}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between transition-all ${
                        slashIndex === idx 
                          ? 'bg-warmAmber/20 text-warmAmber' 
                          : 'text-charcoal hover:bg-charcoal/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="font-sans font-bold text-[11px]">{cmd.name}</div>
                        <div className="text-[9px] text-charcoalMuted/80 dark:text-gray-400 font-sans mt-0.5">{cmd.desc}</div>
                      </div>
                      <span className="text-[9px] font-bold bg-charcoal/5 dark:bg-white/10 px-1 rounded text-charcoalMuted dark:text-gray-400">
                        /{cmd.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Deleted Banner with Restore & Delete Permanently options */}
              {note.deleted && onRestoreNote && (
                <div className="flex items-center justify-between gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-sans text-red-500 select-none shrink-0">
                  <span className="font-semibold">This note is currently in the Trash.</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRestoreNote(note.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white dark:bg-emerald-600/20 hover:bg-emerald-700 dark:hover:bg-emerald-600/35 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-sans font-bold transition-all"
                    >
                      Restore Note
                    </button>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="px-3.5 py-1.5 bg-red-600 text-white dark:bg-red-600/20 hover:bg-red-700 dark:hover:bg-red-600/35 text-red-600 dark:text-red-400 rounded-full text-[10px] font-sans font-bold transition-all"
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              )}
              
              {/* Pinned banner if active */}
              {note.pinned && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-charcoal text-white dark:bg-warmBg dark:text-charcoal rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider w-fit shrink-0">
                  <Pin className="w-3 h-3 fill-warmAmber text-warmAmber" />
                  Pinned Note
                </div>
              )}

              {/* Title Input */}
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                onBlur={saveTitleNow}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    editorRef.current?.focus();
                  }
                }}
                placeholder="Untitled Note..."
                className="w-full text-3xl font-serif font-bold text-black dark:text-white bg-transparent border-none outline-none focus:ring-0 placeholder:text-neutral-400 shrink-0"
              />

              {renderSuggestionsBar()}

              {/* Thumbnail Attachments (Grid) */}
              {(note.image || note.drawing) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none shrink-0">
                  {note.image && (
                    <div className="relative group rounded-2xl overflow-hidden border border-charcoal/25 dark:border-white/10 bg-warmBg dark:bg-charcoalDarkBg h-40">
                      <img src={note.image} alt="Uploaded attachment" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={removeImage}
                          className="p-2 rounded-full bg-red-500 text-white font-sans text-xs flex items-center gap-1 hover:bg-red-600 transition-all"
                        >
                          <Trash className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {note.drawing && (
                    <div className="relative group rounded-2xl overflow-hidden border border-charcoal/25 dark:border-white/10 bg-warmBg dark:bg-charcoalDarkBg h-40">
                      <img src={note.drawing} alt="Drawing canvas doodle" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={onOpenDrawing}
                          className="p-2 rounded-full bg-charcoal dark:bg-warmBg text-white dark:text-charcoal font-sans text-xs flex items-center gap-1 hover:opacity-90 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={removeDrawing}
                          className="p-2 rounded-full bg-red-500 text-white font-sans text-xs flex items-center gap-1 hover:bg-red-600 transition-all"
                        >
                          <Trash className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Main Note Body Area (contenteditable rich text editor) */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditableInput}
                onKeyDown={handleEditableKeyDown}
                onBlur={saveContentNow}
                onMouseUp={updateActiveStates}
                onKeyUp={updateActiveStates}
                onFocus={updateActiveStates}
                onClick={updateActiveStates}
                data-placeholder="Start writing here... (Type '/' to insert markdown blocks or trigger voice dictation)"
                className="w-full flex-1 min-h-[160px] md:min-h-[220px] text-sm font-sans text-black dark:text-white bg-transparent border-none outline-none focus:ring-0 leading-[1.8] placeholder:text-neutral-400 select-text overflow-y-auto note-editor-content"
              />

              {/* Checklist Block */}
              {note.checklist && (
                <div className="border-t border-charcoal/20 dark:border-white/5 pt-5 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <ListCheck className="w-3.5 h-3.5 text-warmAmber" />
                      Note Checklist
                    </h5>
                    <span className="text-[9px] font-sans text-charcoalMuted">
                      {note.checklist.filter(item => item.completed).length} / {note.checklist.length} Done
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                    {note.checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 group">
                        <button
                          onClick={() => toggleChecklistItem(item.id)}
                          className={`w-5.5 h-5.5 rounded-md flex items-center justify-center border transition-all ${
                            item.completed 
                              ? 'bg-warmAmber border-warmAmber text-white' 
                              : 'border-charcoal/35 dark:border-white/20 text-transparent hover:border-warmAmberHover'
                          }`}
                        >
                          ✓
                        </button>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => updateChecklistItemText(item.id, e.target.value)}
                          placeholder="Task description..."
                          className={`flex-1 text-xs font-sans bg-transparent border-none outline-none p-0 focus:ring-0 ${
                            item.completed 
                              ? 'line-through text-charcoalMuted/60 dark:text-gray-500' 
                              : 'text-charcoal'
                          }`}
                        />
                        <button
                          onClick={() => removeChecklistItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove item"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addChecklistItem}
                    className="mt-2 text-xs font-sans font-semibold text-warmAmberHover dark:text-warmAmber hover:text-warmAmberHover/80 transition-all flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add checklist item
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* AI Assistant Overlay Drawer */}
      {aiPanelOpen && (
        <div className="absolute right-0 top-0 bottom-0 w-85 md:w-96 bg-creamCard dark:bg-[#1E1E1E] border-l border-charcoal/25 dark:border-white/10 z-30 shadow-2xl p-5 flex flex-col animate-slideLeft duration-200 text-charcoal dark:text-white">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-charcoal/15 dark:border-white/10 mb-4 shrink-0">
            <h4 className="font-serif font-bold text-sm text-charcoal dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-warmAmber" />
              AI Copilot
            </h4>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiMode(prev => prev === 'chat' ? 'settings' : 'chat')}
                className="p-1.5 rounded-lg hover:bg-charcoal/5 dark:hover:bg-white/5 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer"
                title="AI Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAiPanelOpen(false)}
                className="text-xs font-sans font-medium text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Settings View */}
          {aiMode === 'settings' ? (() => {
            const isDev = sessionStorage.getItem('antigravity_dev_logged_in') === 'true';
            return (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
                <div className="space-y-4">
                  {!isDev ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-3 leading-relaxed">
                      <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        AI Features Under Development
                      </div>
                      <p>
                        The AI assistant is currently in preview/development. Temporary guest sessions are allocated 5 requests per session using a shared developer key.
                      </p>
                      <p className="font-medium">
                        Access to custom API configuration, custom endpoints, and unlimited usage is restricted. Please sign in via the Developer Portal to customize these settings.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-xs font-sans font-bold mb-3">AI Configuration</h5>
                        
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-sans font-bold text-charcoalMuted dark:text-gray-400">API Key</label>
                            </div>
                            <input
                              type="password"
                              placeholder="Enter your API Key..."
                              value={aiConfig.apiKey}
                              onChange={(e) => handleSaveAIConfig({ ...aiConfig, apiKey: e.target.value })}
                              className="w-full text-xs font-sans p-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-white dark:bg-black text-charcoal dark:text-white focus:outline-none focus:border-warmAmber"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-sans font-bold text-charcoalMuted dark:text-gray-400 block mb-1">API Base URL (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. https://integrate.api.nvidia.com/v1 (Leave empty for Gemini)"
                              value={aiConfig.apiUrl}
                              onChange={(e) => handleSaveAIConfig({ ...aiConfig, apiUrl: e.target.value })}
                              className="w-full text-xs font-sans p-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-white dark:bg-black text-charcoal dark:text-white focus:outline-none focus:border-warmAmber"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-sans font-bold text-charcoalMuted dark:text-gray-400 block mb-1">Model Name (Optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. meta/llama-3.1-70b-instruct"
                              value={aiConfig.apiModel}
                              onChange={(e) => handleSaveAIConfig({ ...aiConfig, apiModel: e.target.value })}
                              className="w-full text-xs font-sans p-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-white dark:bg-black text-charcoal dark:text-white focus:outline-none focus:border-warmAmber"
                            />
                          </div>
                        </div>

                        {aiConfig.apiKey && (
                          <div className="mt-3 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-sans font-semibold text-emerald-600 dark:text-emerald-400">Custom Key Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-charcoal/15 dark:border-white/10 mt-6 flex gap-2">
                  <button
                    onClick={() => setAiMode('chat')}
                    className="flex-1 py-2 rounded-xl bg-charcoal text-white dark:bg-white dark:text-black font-sans text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            );
          })() : (
            /* Chat / Copilot View */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <>
                  {/* Messages / Chat Area */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-charcoal/10">
                    {aiMessages.length === 0 ? (
                      <div className="py-6 space-y-4">
                        <div className="text-center space-y-1">
                          <Sparkles className="w-7 h-7 mx-auto text-warmAmber animate-pulse" />
                          <h5 className="font-serif font-bold text-xs text-charcoal dark:text-white">Ask Copilot Anything</h5>
                          <p className="text-[10px] font-sans text-charcoalMuted dark:text-gray-400">
                            Or pick one of the quick note actions below
                          </p>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => handleAIRequest("Summarize this note in 3-4 bullet points.", "Summarize")}
                            className="p-3 text-left border border-charcoal/15 dark:border-white/5 rounded-xl hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-xs font-sans cursor-pointer bg-white dark:bg-[#1A1A1A]"
                          >
                            <div className="font-bold text-charcoal dark:text-white mb-0.5">Summarize</div>
                            <div className="text-[10px] text-charcoalMuted dark:text-gray-400 line-clamp-2">Get quick bullet summaries.</div>
                          </button>
                          <button
                            onClick={() => handleAIRequest("Create a list of action items / tasks based on this note. Format it as checklist checkboxes (- [ ] task).", "Action Items")}
                            className="p-3 text-left border border-charcoal/15 dark:border-white/5 rounded-xl hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-xs font-sans cursor-pointer bg-white dark:bg-[#1A1A1A]"
                          >
                            <div className="font-bold text-charcoal dark:text-white mb-0.5">Tasks Checklist</div>
                            <div className="text-[10px] text-charcoalMuted dark:text-gray-400 line-clamp-2">Extract actionable tasks.</div>
                          </button>
                          <button
                            onClick={() => handleAIRequest("Rewrite this note to improve its flow, structure, and professional tone.", "Improve Writing")}
                            className="p-3 text-left border border-charcoal/15 dark:border-white/5 rounded-xl hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-xs font-sans cursor-pointer bg-white dark:bg-[#1A1A1A]"
                          >
                            <div className="font-bold text-charcoal dark:text-white mb-0.5">Improve Writing</div>
                            <div className="text-[10px] text-charcoalMuted dark:text-gray-400 line-clamp-2">Fix grammar and rewrite.</div>
                          </button>
                          <button
                            onClick={() => handleAIRequest("Provide 5 creative ideas, expansion topics, or next steps related to the topics discussed in this note.", "Brainstorm")}
                            className="p-3 text-left border border-charcoal/15 dark:border-white/5 rounded-xl hover:border-warmAmber/50 hover:bg-warmAmber/5 dark:hover:bg-warmAmber/5 transition-all text-xs font-sans cursor-pointer bg-white dark:bg-[#1A1A1A]"
                          >
                            <div className="font-bold text-charcoal dark:text-white mb-0.5">Brainstorm</div>
                            <div className="text-[10px] text-charcoalMuted dark:text-gray-400 line-clamp-2">Generate next steps & ideas.</div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-1">
                        {aiMessages.map((msg, index) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col space-y-1.5 ${
                              msg.sender === 'user' ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[10px] font-sans text-charcoalMuted dark:text-gray-400">
                              {msg.sender === 'user' ? (
                                <span>You</span>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-warmAmber animate-pulse" />
                                  <span>Copilot</span>
                                </>
                              )}
                            </div>
                            <div
                              className={`p-3 rounded-2xl text-xs max-w-[90%] leading-relaxed break-words font-sans ${
                                msg.sender === 'user'
                                  ? 'bg-charcoal text-white dark:bg-white dark:text-black rounded-tr-none'
                                  : 'bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 text-charcoal dark:text-gray-200 rounded-tl-none'
                              }`}
                            >
                              {msg.sender === 'user' ? (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                              ) : (
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none text-xs space-y-1.5"
                                  dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.text) }}
                                />
                              )}
                            </div>

                            {/* Actions for Copilot Messages */}
                            {msg.sender === 'ai' && (
                              <div className="flex items-center gap-2 pl-2">
                                <button
                                  onClick={() => handleCopyToClipboard(msg.text, index)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 text-[10px] font-sans text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer border border-charcoal/10 dark:border-white/5"
                                >
                                  {copiedIndex === `copied-${index}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-green-500" /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Copy
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleInsertAtCursor(msg.text)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 text-[10px] font-sans text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer border border-charcoal/10 dark:border-white/5"
                                  title="Insert at Cursor"
                                >
                                  Insert at Cursor
                                </button>
                                <button
                                  onClick={() => handleReplaceNoteContent(msg.text)}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-charcoal/5 dark:bg-white/5 hover:bg-charcoal/10 dark:hover:bg-white/10 text-[10px] font-sans text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer border border-charcoal/10 dark:border-white/5"
                                  title="Replace Note Content"
                                >
                                  Replace Note
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Loading State */}
                    {aiLoading && (
                      <div className="flex flex-col space-y-1.5 items-start">
                        <div className="flex items-center gap-1 text-[10px] font-sans text-charcoalMuted dark:text-gray-400">
                          <Sparkles className="w-3 h-3 text-warmAmber animate-pulse" />
                          <span>Copilot is writing...</span>
                        </div>
                        <div className="bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 text-charcoal dark:text-gray-200 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-charcoalMuted dark:bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-charcoalMuted dark:bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-charcoalMuted dark:bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}

                    {/* Error State */}
                    {aiError && (
                      <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-2xl text-xs font-sans text-red-600 dark:text-red-400 space-y-2 leading-relaxed">
                        <div className="font-bold flex items-center gap-1">
                          Failed to get response
                        </div>
                        <p className="text-[11px]">{aiError}</p>
                        <button
                          onClick={() => handleAIRequest(aiMessages[aiMessages.length - 1]?.text || aiPrompt || 'Retry last prompt')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry Request
                        </button>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Input / Form Control */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAIRequest(aiPrompt);
                    }}
                    className="pt-3 border-t border-charcoal/15 dark:border-white/10 mt-3 shrink-0 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask Copilot to write, edit, summarize..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      disabled={aiLoading}
                      className="flex-1 text-xs font-sans p-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 bg-white dark:bg-black text-charcoal dark:text-white focus:outline-none focus:border-warmAmber disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="p-2.5 rounded-xl bg-charcoal text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                      title="Send Message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    {aiMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAiMessages([])}
                        className="p-2.5 rounded-xl border border-charcoal/15 dark:border-white/10 text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer"
                        title="Clear Conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </form>
                </>
              </div>
            )}
          </div>
        )}
      {/* Floating Pill AI Button at the Bottom */}
      {note.type !== 'sheet' && note.type !== 'tracker' && note.type !== 'expense' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 select-none">
          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`px-5 py-2.5 rounded-full font-sans text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer shadow-md border ${
              aiPanelOpen
                ? 'bg-charcoal border-charcoal text-white dark:bg-white dark:border-white dark:text-black'
                : 'bg-white border-charcoal/25 text-charcoal hover:bg-charcoal/5 dark:bg-transparent dark:border-white/20 dark:text-white dark:hover:bg-white/5'
            }`}
            title="Ask AI Assistant"
          >
            <Sparkles className={`w-4 h-4 animate-pulse ${aiPanelOpen ? 'text-white dark:text-black' : 'text-warmAmber dark:text-white'}`} /> Ask AI Copilot
          </button>
        </div>
      )}
      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShortcutsModalOpen(false)}
        >
          <div
            className="relative bg-creamCard dark:bg-charcoalDarkCard border border-charcoal/20 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-xl mx-4 p-8 animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-5 h-5 text-warmAmber" />
                <h3 className="font-serif font-bold text-lg text-charcoal dark:text-white">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShortcutsModalOpen(false)}
                className="p-2 rounded-full border border-charcoal/15 dark:border-white/10 text-charcoalMuted hover:text-charcoal dark:hover:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcut groups */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {/* Navigation section */}
              <div className="col-span-2 mb-3">
                <div className="text-[9px] font-sans font-bold tracking-widest uppercase text-charcoalMuted/60 dark:text-gray-500 mb-2">Global Navigation</div>
              </div>
              {[
                { keys: ['Alt', 'N'], desc: 'New note' },
                { keys: ['Alt', 'H'], desc: 'Go to Home' },
                { keys: ['Alt', 'S'], desc: 'Toggle Sidebar' },
                { keys: ['Alt', 'D'], desc: 'Toggle Dark Mode' },
                { keys: ['Ctrl', 'K'], desc: 'Focus Search' },
                { keys: ['Esc'], desc: 'Close panels / modals' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between py-1.5 border-b border-charcoal/5 dark:border-white/5">
                  <span className="text-xs font-sans text-charcoalMuted dark:text-gray-400">{desc}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="px-2 py-0.5 text-[10px] font-sans font-bold bg-charcoal/8 dark:bg-white/10 border border-charcoal/15 dark:border-white/15 rounded-md text-charcoal dark:text-white">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}

              {/* Editor section */}
              <div className="col-span-2 mb-3 mt-5">
                <div className="text-[9px] font-sans font-bold tracking-widest uppercase text-charcoalMuted/60 dark:text-gray-500 mb-2">Editor Formatting</div>
              </div>
              {[
                { keys: ['Ctrl', 'B'], desc: 'Bold' },
                { keys: ['Ctrl', 'I'], desc: 'Italic' },
                { keys: ['Ctrl', 'U'], desc: 'Underline' },
                { keys: ['Ctrl', 'Z'], desc: 'Undo' },
                { keys: ['Ctrl', 'Y'], desc: 'Redo' },
                { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo (alternate)' },
                { keys: ['Ctrl', '1'], desc: 'Heading 1' },
                { keys: ['Ctrl', '2'], desc: 'Heading 2' },
                { keys: ['Ctrl', '3'], desc: 'Heading 3' },
                { keys: ['Ctrl', '0'], desc: 'Normal paragraph' },
                { keys: ['Tab'], desc: 'Indent text' },
                { keys: ['Ctrl', '/'], desc: 'Show this help' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between py-1.5 border-b border-charcoal/5 dark:border-white/5">
                  <span className="text-xs font-sans text-charcoalMuted dark:text-gray-400">{desc}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="px-2 py-0.5 text-[10px] font-sans font-bold bg-charcoal/8 dark:bg-white/10 border border-charcoal/15 dark:border-white/15 rounded-md text-charcoal dark:text-white">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}

              {/* Slash commands section */}
              <div className="col-span-2 mb-3 mt-5">
                <div className="text-[9px] font-sans font-bold tracking-widest uppercase text-charcoalMuted/60 dark:text-gray-500 mb-2">Slash Commands (type in editor)</div>
              </div>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-2">
                  {['/h1', '/h2', '/todo', '/code', '/quote', '/draw', '/voice', '/ai', '/wiki'].map(cmd => (
                    <span key={cmd} className="px-2.5 py-1 text-[10px] font-sans font-bold bg-warmAmber/10 border border-warmAmber/20 rounded-full text-warmAmber">{cmd}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-6 text-[10px] text-charcoalMuted/50 dark:text-gray-600 text-center font-sans">Press <kbd className="px-1.5 py-0.5 bg-charcoal/8 border border-charcoal/15 rounded text-[9px] font-bold text-charcoal dark:text-white dark:bg-white/10 dark:border-white/15">Esc</kbd> or click outside to close</p>
          </div>
        </div>
      )}

      {/* Floating Inline AI Assist Tooltip */}
      {aiAssistVisible && (
        <div 
          style={{ 
            position: 'absolute', 
            top: `${aiAssistPos.top}px`, 
            left: `${aiAssistPos.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 100
          }}
          className="flex flex-col items-center select-none"
        >
          <div className="flex items-center gap-1.5 p-1.5 bg-gray-950 text-white rounded-xl shadow-lg border border-white/10">
            <button
              type="button"
              onClick={() => generatePromptSuggestions(selectedText)}
              className="px-2.5 py-1 text-[10px] font-sans font-bold flex items-center gap-1 hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> ✨ Generate a Prompt
            </button>
          </div>

          {/* Prompt Suggestions Dropdown */}
          {aiDropdownOpen && (
            <div className="mt-2 w-64 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-xl p-2.5 space-y-1 text-left">
              <div className="text-[9px] font-sans font-bold text-gray-400 dark:text-zinc-500 uppercase px-2 mb-1">
                AI Suggestions
              </div>

              {promptLoading ? (
                <div className="text-[10px] text-gray-500 dark:text-zinc-400 px-2 py-1.5 animate-pulse">
                  Generating suggestions...
                </div>
              ) : (
                suggestedPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => executeAiPrompt(promptText)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-sans text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-white/5 transition-colors cursor-pointer font-medium"
                  >
                    {promptText}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
