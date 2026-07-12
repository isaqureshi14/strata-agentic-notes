import { Info, Shield, LayoutGrid, CheckCircle, Mail, Code } from 'lucide-react';

interface AboutSectionProps {
  onBackToHome: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onBackToHome }) => {
  return (
    <div className="flex-1 p-6 md:p-10 max-w-2xl mx-auto space-y-8 overflow-y-auto w-full h-full select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-zinc-100 font-serif">About strata</h2>
            <p className="text-xs text-gray-400">Learn more about the application features, design, and developers.</p>
          </div>
        </div>

        <button
          onClick={onBackToHome}
          className="h-10 px-4 border border-charcoal/30 dark:border-white/30 text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all flex items-center justify-center text-xs font-sans font-bold tracking-wide uppercase cursor-pointer"
        >
          <span>&lt; HOME</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-3xl p-8 shadow-sm space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-serif text-gray-800 dark:text-zinc-100">
            Your ideas, beautifully organized.
          </h3>
          <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
            strata is a premium minimalist notes workspace designed to help you capture your thoughts, projects, meetings, finance details, and progress trackers in one elegant, secure space. Powered by high-performance React architectures, strata offers fluid transitions, beautiful typography, and customizable categories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 border border-charcoal/10 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-white/5 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-100">Dynamic Grid Layout</h4>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Google Keep-style masonry layout that adapts beautifully to display note cards, spreadsheets, and trackers.
            </p>
          </div>

          <div className="p-5 border border-charcoal/10 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-white/5 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-100">Privacy & Lock Control</h4>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Secure individual notes using customized passcodes and cryptographic local storage variables.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6 space-y-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Key Capabilities</h4>
          <ul className="space-y-2 text-xs text-gray-600 dark:text-zinc-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Note and Document Editor</strong>: Draft clean documents, checklists, or sketch directly on the canvas.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Spreadsheets & Finances</strong>: Keep structured budget charts and finance balance lists.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>AI-Powered Copilot Suggestions</strong>: Automatically generates contextual action suggestions based on your document headings for seamless one-click writing, essay generation, and list-to-table formatting.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Smart Spreadsheet AI Templates</strong>: Instantiate pre-coded templates instantly, get context-aware formula recommendations, or request the AI to generate structured sheets dynamically.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Progress Tracking</strong>: Log tasks, projects, and set dynamic completion percentages.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Meeting Briefings</strong>: Track scheduled agendas and sync with automatic summarization tools.</span>
            </li>
          </ul>
        </div>

        {/* Integrated Developers Section */}
        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6 space-y-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Developers</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rehan Ansari Developer Card */}
            <div className="border border-charcoal/10 dark:border-white/5 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 flex items-center gap-4 hover:scale-[1.01] transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                <Code className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-100 font-serif uppercase tracking-wider truncate">
                  <a href="https://www.linkedin.com/in/rehan-ansari-1820363a5" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">Rehan Ansari</a>
                </h4>
                <a href="mailto:ansarirehan0044@gmail.com" className="text-[10px] text-gray-500 dark:text-zinc-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">ansarirehan0044@gmail.com</span>
                </a>
              </div>
            </div>

            {/* Isa Qureshi Developer Card */}
            <div className="border border-charcoal/10 dark:border-white/5 p-5 rounded-2xl bg-gray-50/50 dark:bg-white/5 flex items-center gap-4 hover:scale-[1.01] transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                <Code className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <h4 className="text-xs font-bold text-gray-800 dark:text-zinc-100 font-serif uppercase tracking-wider truncate">
                  <a href="https://www.linkedin.com/in/isa-qureshi-90088b38a" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">Isa Qureshi</a>
                </h4>
                <a href="mailto:isatanvirqureshi@gmail.com" className="text-[10px] text-gray-500 dark:text-zinc-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">isatanvirqureshi@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-6 flex justify-between items-center text-[10px] text-gray-400">
          <span>strata Workspace App</span>
          <span>Version 1.0.0</span>
        </div>
      </div>
    </div>
  );
};
