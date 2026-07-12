import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, Settings, X, Edit } from 'lucide-react';

interface LocalMeeting {
  id: string;
  title: string;
  time: string;
  date: string; // YYYY-MM-DD
  topic?: string;
  preMeetingSummary?: string;
  postMeetingInfo?: string;
  postMeetingSummary?: string;
}

const DEFAULT_MEETINGS: LocalMeeting[] = [
  {
    id: 'm1',
    title: 'Project Kickoff & Requirements Sync',
    time: '10:00',
    date: new Date().toISOString().split('T')[0],
    topic: 'strata Form pre-fill settings mapping',
    preMeetingSummary: `### 🎯 Pre-Meeting Summary (15 Min Brief)

**📝 Submitted Topic:** strata Form pre-fill settings mapping

---

##### 💡 Context & Past Decisions
*   **Focus Area:** Discussing the dynamic field mapping rules before kickoff.
*   *Past Decision:* Form mapping must search keys case-insensitively and avoid overwriting typed content.

---

##### 🚀 Key Discussion Points
1. Finalize basic details field identifiers.
2. Verify photo upload LocalStorage serialization limits.`,
    postMeetingInfo: 'We agreed to use base64 data URLs for student photos and map Student Name, Mother Name, Father Name, and Occupation.',
    postMeetingSummary: `### 📝 Post-Meeting Summary

**📝 Topic Discussed:** strata Form pre-fill settings mapping

---

##### 📌 Decisions & Action Items
*   **Decision:** Saved photo must be previewed and removable.
*   **Action Item:** Connect student photo upload to autofill buttons.
*   **Action Item:** Verify occupation field rendering.`
  }
];

interface AutoBriefingsProps {
  darkMode: boolean;
  onBackToHome: () => void;
}

export const AutoBriefings: React.FC<AutoBriefingsProps> = ({ onBackToHome }) => {
  const [meetings, setMeetings] = useState<LocalMeeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('m1');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Active Tab for Pre/Post pages
  const [activePage, setActivePage] = useState<'pre' | 'post'>('pre');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  // Input states for active meeting
  const [topicInput, setTopicInput] = useState('');
  const [postInfoInput, setPostInfoInput] = useState('');

  // Editing states
  const [isEditingPre, setIsEditingPre] = useState(false);
  const [preEditText, setPreEditText] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [postEditText, setPostEditText] = useState('');

  // Add Meeting Modal Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('10:00');

  const [loadingPre, setLoadingPre] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);

  useEffect(() => {
    const savedMeetings = localStorage.getItem('antigravity_briefing_meetings_v6');
    if (savedMeetings) {
      try {
        const parsed = JSON.parse(savedMeetings);
        setMeetings(parsed);
        if (parsed.length > 0) {
          setSelectedMeetingId(parsed[0].id);
          const active = parsed[0];
          setTopicInput(active.topic || '');
          setPostInfoInput(active.postMeetingInfo || '');
        }
      } catch (e) {
        setMeetings(DEFAULT_MEETINGS);
      }
    } else {
      setMeetings(DEFAULT_MEETINGS);
      localStorage.setItem('antigravity_briefing_meetings_v6', JSON.stringify(DEFAULT_MEETINGS));
    }
  }, []);

  const saveMeetings = (updated: LocalMeeting[]) => {
    setMeetings(updated);
    localStorage.setItem('antigravity_briefing_meetings_v6', JSON.stringify(updated));
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newMeeting: LocalMeeting = {
      id: 'm-' + Math.random().toString(36).substr(2, 9),
      title: newTitle,
      time: newTime,
      date: selectedDate
    };

    const updated = [...meetings, newMeeting];
    saveMeetings(updated);
    setSelectedMeetingId(newMeeting.id);
    setTopicInput('');
    setPostInfoInput('');
    setNewTitle('');
    setShowAddForm(false);
  };

  const handleDeleteMeeting = (id: string) => {
    const updated = meetings.filter(m => m.id !== id);
    saveMeetings(updated);
    if (selectedMeetingId === id && updated.length > 0) {
      setSelectedMeetingId(updated[0].id);
      setTopicInput(updated[0].topic || '');
      setPostInfoInput(updated[0].postMeetingInfo || '');
    }
  };

  const handleSelectMeeting = (id: string) => {
    setSelectedMeetingId(id);
    const matched = meetings.find(m => m.id === id);
    if (matched) {
      setTopicInput(matched.topic || '');
      setPostInfoInput(matched.postMeetingInfo || '');
    }
    setIsEditingPre(false);
    setIsEditingPost(false);
  };

  // Pre-meeting brief generation
  const handleGeneratePreBrief = () => {
    if (!topicInput.trim()) return;
    setLoadingPre(true);

    setTimeout(() => {
      const active = meetings.find(m => m.id === selectedMeetingId);
      if (!active) return;

      const summary = `### 🎯 Pre-Meeting Summary (15 Min Brief)

**📝 Submitted Topic:** ${topicInput}

---

##### 💡 Context & Relationship History
*   **Focus Area:** Discussing "${topicInput}" dynamically before kickoff.
*   **Attendees context:** Connected with local student autofill profile parameters.

---

##### 🚀 Key Discussion Points
1. Outline implementation steps for the topic.
2. Review local storage persistence lag questions.`;

      const updated = meetings.map(m => {
        if (m.id === selectedMeetingId) {
          return { ...m, topic: topicInput, preMeetingSummary: summary };
        }
        return m;
      });

      saveMeetings(updated);
      setLoadingPre(false);
    }, 1000);
  };

  // Post-meeting brief generation
  const handleGeneratePostBrief = () => {
    if (!postInfoInput.trim()) return;
    setLoadingPost(true);

    setTimeout(() => {
      const active = meetings.find(m => m.id === selectedMeetingId);
      if (!active) return;

      const summary = `### 📝 Post-Meeting Summary

**📝 Topic Discussed:** ${active.topic || 'General sync'}

---

##### 📌 Decisions & Action Items
*   **Discussion Points:** ${postInfoInput}
*   **Action Item:** Review student photo upload.
*   **Action Item:** Style outlined back buttons.`;

      const updated = meetings.map(m => {
        if (m.id === selectedMeetingId) {
          return { ...m, postMeetingInfo: postInfoInput, postMeetingSummary: summary };
        }
        return m;
      });

      saveMeetings(updated);
      setLoadingPost(false);
    }, 1000);
  };

  const handleSavePreText = () => {
    const updated = meetings.map(m => {
      if (m.id === selectedMeetingId) {
        return { ...m, preMeetingSummary: preEditText };
      }
      return m;
    });
    saveMeetings(updated);
    setIsEditingPre(false);
  };

  const handleSavePostText = () => {
    const updated = meetings.map(m => {
      if (m.id === selectedMeetingId) {
        return { ...m, postMeetingSummary: postEditText };
      }
      return m;
    });
    saveMeetings(updated);
    setIsEditingPost(false);
  };

  // Calendar calculations
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formatSelectedDate = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${currentYear}-${mm}-${dd}`;
  };

  const activeMeeting = meetings.find(m => m.id === selectedMeetingId);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentDayMeetings = meetings.filter(m => m.date === selectedDate);

  return (
    <div className="flex-1 flex bg-[#0c0c0d] text-zinc-100 overflow-hidden font-sans h-full w-full select-none">
      
      {/* 1. Left Sidebar Panel (Contains Mini Calendar & Meeting Pipeline below it) */}
      <div className="w-[280px] bg-[#121214] border-r border-[#1c1c1f] p-4 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-5">
          
          {/* Header Title - renamed to Meetings and font styles fixed */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-black tracking-tight text-white font-sans uppercase">Meetings</span>
          </div>

          {/* Sidebar Menu Options */}
          <div className="space-y-1 text-xs font-semibold">
            <button className="w-full text-left px-3.5 py-2.5 rounded-lg bg-white/5 text-white flex items-center gap-3">
              <CalendarIcon className="w-4 h-4 text-emerald-500" /> My Meetings
            </button>
          </div>

          {/* Mini Calendar Widget */}
          <div className="bg-[#18181b] border border-white/5 rounded-2xl p-3 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-black text-white px-0.5">
              <span>{monthsList[currentMonth]} {currentYear}</span>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="hover:text-emerald-500 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <button onClick={nextMonth} className="hover:text-emerald-500 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-[9px] font-black text-zinc-500 text-center uppercase tracking-wider">
              <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-[10px] text-center font-medium">
              {Array.from({ length: firstDay }).map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = formatSelectedDate(dayNum);
                const isSelected = selectedDate === dateStr;
                const hasMeeting = meetings.some(m => m.date === dateStr);

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-6 rounded-md font-bold transition-all relative flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasMeeting && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Pipeline Section: PLACED DIRECTLY BELOW THE CALENDAR */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-black text-zinc-400 uppercase tracking-wider">
                Pipeline: {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                className="p-1 text-emerald-500 hover:bg-white/5 rounded transition-all"
                title="Add New Meeting"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List of meeting cards for the selected date */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {currentDayMeetings.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 text-[10px] font-medium">
                  No pipeline meetings.
                </div>
              ) : (
                currentDayMeetings.map((meeting) => {
                  const isSelected = meeting.id === selectedMeetingId;
                  return (
                    <div
                      key={meeting.id}
                      onClick={() => handleSelectMeeting(meeting.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 text-left ${
                        isSelected
                          ? 'bg-[#182a21] border-[#22c55e]/30'
                          : 'bg-[#18181b] border-white/5 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <h4 className="text-[11px] font-bold text-white leading-tight font-sans">{meeting.title}</h4>
                          <span className="text-[9px] font-sans text-emerald-500 font-bold block mt-0.5">{meeting.time}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting.id); }}
                          className="p-1 hover:bg-rose-500/15 rounded text-zinc-500 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        <div className="text-[10px] text-zinc-600 text-center select-none pt-4 border-t border-[#1c1c1f] font-medium">
          strata Meeting System
        </div>
      </div>

      {/* 2. Main Area (Contains Tab Switcher for Pre-Meeting & Post-Meeting Pages) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Toolbar */}
        <div className="h-14 border-b border-[#1c1c1f] px-6 flex items-center justify-between shrink-0">
          <button
            onClick={onBackToHome}
            className="h-9 px-4 rounded-none border border-charcoal/30 dark:border-white/30 text-zinc-300 hover:text-white transition-all flex items-center justify-center text-xs font-sans font-bold tracking-wide uppercase cursor-pointer"
          >
            <span>&lt; HOME</span>
          </button>
          
          <button className="p-2 text-zinc-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection Pages Bar */}
        <div className="bg-[#121214] border-b border-[#1c1c1f] px-6 py-2 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActivePage('pre')}
            className={`px-4 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${
              activePage === 'pre'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Pre-Meeting
          </button>
          <button
            onClick={() => setActivePage('post')}
            className={`px-4 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer ${
              activePage === 'post'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Post-Meeting
          </button>
        </div>

        {/* Active Tab Page Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#0c0c0d] flex flex-col justify-start">
          
          {activeMeeting ? (
            <div className="max-w-3xl mx-auto w-full bg-[#121214] border border-[#1c1c1f] rounded-2xl p-6 space-y-6 shadow-sm">
              
              {/* Meeting Header Metadata */}
              <div className="border-b border-[#1c1c1f] pb-4 flex flex-col items-start gap-1">
                <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-zinc-400 font-bold uppercase tracking-wider font-sans">{activePage === 'pre' ? 'Pre-Meeting Workspace' : 'Post-Meeting Workspace'}</span>
                <h2 className="text-base font-bold text-white font-sans tracking-tight mt-1">{activeMeeting.title}</h2>
                <p className="text-xs text-zinc-400 font-medium">{activeMeeting.date} at {activeMeeting.time}</p>
              </div>

              {/* Tab 1: Pre-Meeting Workspace */}
              {activePage === 'pre' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-white font-sans uppercase tracking-wide">Submit Meeting Topic</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Submit meeting topic for proactive context briefing before 15 min.</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter topic related to the meeting..."
                        value={topicInput}
                        onChange={e => setTopicInput(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-800 bg-[#18181b] text-xs text-white focus:border-emerald-500 outline-none"
                      />
                      <button
                        onClick={handleGeneratePreBrief}
                        disabled={loadingPre || !topicInput.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {loadingPre ? 'Generating...' : 'Generate Pre-Meeting Briefing'}
                      </button>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#18181b] border border-white/5 rounded-xl p-5 overflow-y-auto min-h-[220px]">
                    {isEditingPre ? (
                      <div className="space-y-3 h-full flex flex-col">
                        <textarea
                          value={preEditText}
                          onChange={e => setPreEditText(e.target.value)}
                          className="w-full p-4 bg-[#1c1c20] border border-white/10 rounded-lg text-xs text-white outline-none font-mono resize-none h-[180px]"
                        />
                        <div className="flex gap-2 justify-end shrink-0">
                          <button onClick={() => setIsEditingPre(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs cursor-pointer">Cancel</button>
                          <button onClick={handleSavePreText} className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer">Save</button>
                        </div>
                      </div>
                    ) : activeMeeting.preMeetingSummary ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Generated Pre-Meeting Summary</span>
                          <button
                            onClick={() => { setPreEditText(activeMeeting.preMeetingSummary || ''); setIsEditingPre(true); }}
                            className="text-zinc-400 hover:text-white transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-zinc-300 leading-relaxed prose prose-sm dark:prose-invert whitespace-pre-wrap font-sans">
                          {activeMeeting.preMeetingSummary}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center text-zinc-500 text-xs py-12">
                        <Sparkles className="w-8 h-8 text-zinc-700 mb-2" />
                        Enter a topic above to generate the pre-meeting brief.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Post-Meeting Workspace */}
              {activePage === 'post' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-white font-sans uppercase tracking-wide">Minutes & Decisions</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Enter notes or decisions after sync to trigger post-meeting summary.</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter decisions, notes, or items agreed upon..."
                        value={postInfoInput}
                        onChange={e => setPostInfoInput(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-800 bg-[#18181b] text-xs text-white focus:border-emerald-500 outline-none"
                      />
                      <button
                        onClick={handleGeneratePostBrief}
                        disabled={loadingPost || !postInfoInput.trim()}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {loadingPost ? 'Generating...' : 'Generate Post-Meeting Summary'}
                      </button>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-[#18181b] border border-white/5 rounded-xl p-5 overflow-y-auto min-h-[220px]">
                    {isEditingPost ? (
                      <div className="space-y-3 h-full flex flex-col">
                        <textarea
                          value={postEditText}
                          onChange={e => setPostEditText(e.target.value)}
                          className="w-full p-4 bg-[#1c1c20] border border-white/10 rounded-lg text-xs text-white outline-none font-mono resize-none h-[180px]"
                        />
                        <div className="flex gap-2 justify-end shrink-0">
                          <button onClick={() => setIsEditingPost(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded text-xs cursor-pointer">Cancel</button>
                          <button onClick={handleSavePostText} className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer">Save</button>
                        </div>
                      </div>
                    ) : activeMeeting.postMeetingSummary ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-sans">Generated Post-Meeting Summary</span>
                          <button
                            onClick={() => { setPostEditText(activeMeeting.postMeetingSummary || ''); setIsEditingPost(true); }}
                            className="text-zinc-400 hover:text-white transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-zinc-300 leading-relaxed prose prose-sm dark:prose-invert whitespace-pre-wrap font-sans">
                          {activeMeeting.postMeetingSummary}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center text-zinc-500 text-xs py-12">
                        <CalendarIcon className="w-8 h-8 text-zinc-700 mb-2" />
                        Enter decisions above to generate the post-meeting summary.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="max-w-md mx-auto bg-[#121214] border border-[#1c1c1f] rounded-2xl p-8 text-center text-zinc-500 text-xs py-12 font-sans font-medium">
              No active meeting selected. Click on a pipeline card in the left sidebar under the calendar.
            </div>
          )}

        </div>
      </div>

      {/* New Meeting Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddMeeting} className="w-full max-w-md bg-[#121214] border border-[#1c1c1f] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1f]">
              <h4 className="text-sm font-bold text-white font-sans uppercase">Add New Agenda Meeting</h4>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[9px]">Meeting Title</label>
                <input
                  type="text"
                  required
                  placeholder="Project sync meeting"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-800 bg-[#18181b] text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 uppercase text-[9px]">Time (HH:MM)</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-zinc-800 bg-[#18181b] text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-all cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all cursor-pointer"
              >
                Add Meeting
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
