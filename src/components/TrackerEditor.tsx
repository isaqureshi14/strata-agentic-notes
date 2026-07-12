import React, { useState } from 'react';
import { 
  TrendingUp, Plus, Trash2, Sparkles, RefreshCw, Save, BookOpen, AlertCircle, 
  BarChart2, PieChart, Sliders
} from 'lucide-react';
import { type Note } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { generateText, type AIConfig } from '../utils/aiService';

interface TrackerEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  darkMode: boolean;
}

interface SubjectData {
  name: string;
  marks: number[];
  classAverage: number;
}

interface TrackerData {
  milestones: string[];
  subjects: SubjectData[];
  aiReport: string;
  rowLabel?: string;
  columnLabel?: string;
  benchmarkLabel?: string;
  unit?: string;
  showBenchmark?: boolean;
  showGrades?: boolean;
}

const PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export const TrackerEditor: React.FC<TrackerEditorProps> = ({
  note,
  onUpdateNote,
  darkMode,
}) => {
  const [data, setData] = useState<TrackerData>(() => {
    try {
      const parsed = JSON.parse(note.content);
      if (parsed.milestones && parsed.subjects) {
        return parsed;
      }
    } catch {}
    return {
      milestones: [],
      subjects: [],
      aiReport: "",
      rowLabel: "Metric",
      columnLabel: "Interval",
      benchmarkLabel: "Target",
      unit: "",
      showBenchmark: true,
      showGrades: false
    };
  });

  const [activeTab, setActiveTab] = useState<'charts' | 'data' | 'report'>('charts');
  const [activeChartType, setActiveChartType] = useState<'line' | 'bar' | 'radar'>('line');
  const [reportLoading, setReportLoading] = useState(false);
  const [editingReport, setEditingReport] = useState(false);
  const [tempReport, setTempReport] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState<{ subject: string; milestoneIndex: number; val: number; x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Setup Wizard Form States
  const [setupTitle, setSetupTitle] = useState(note.title || 'My Progress Tracker');
  const [setupRowLabel, setSetupRowLabel] = useState('Metric');
  const [setupColumnLabel, setSetupColumnLabel] = useState('Interval');
  const [setupBenchmarkLabel, setSetupBenchmarkLabel] = useState('Target');
  const [setupUnit, setSetupUnit] = useState('%');
  const [setupShowBenchmark, setSetupShowBenchmark] = useState(true);
  const [setupShowGrades, setSetupShowGrades] = useState(false);
  const [setupMilestonesInput, setSetupMilestonesInput] = useState('');
  const [setupSubjectsInput, setSetupSubjectsInput] = useState('');

  const handleInitialize = () => {
    const milestones = setupMilestonesInput
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);
      
    const subjectNames = setupSubjectsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (milestones.length === 0) {
      alert(`Please enter at least one column/interval name!`);
      return;
    }
    if (subjectNames.length === 0) {
      alert(`Please enter at least one row/metric name!`);
      return;
    }

    const subjects = subjectNames.map(name => ({
      name,
      marks: Array(milestones.length).fill(0),
      classAverage: 0
    }));

    const initializedData: TrackerData = {
      milestones,
      subjects,
      aiReport: '',
      rowLabel: setupRowLabel,
      columnLabel: setupColumnLabel,
      benchmarkLabel: setupBenchmarkLabel,
      unit: setupUnit,
      showBenchmark: setupShowBenchmark,
      showGrades: setupShowGrades
    };

    saveData(initializedData);
    
    onUpdateNote({
      ...note,
      title: setupTitle,
      content: JSON.stringify(initializedData),
      updatedAt: new Date().toISOString(),
    });

    setActiveTab('data'); // Go straight to the grid sheet so they can enter values!
  };

  // Extract config with safe defaults
  const rowLabel = data.rowLabel || "Subject";
  const columnLabel = data.columnLabel || "Milestone";
  const benchmarkLabel = data.benchmarkLabel || "Class Avg";
  const unit = data.unit !== undefined ? data.unit : "%";
  const showBenchmark = data.showBenchmark !== false;
  const showGrades = data.showGrades !== false;

  // Calculate dynamic maximum value for charts scale
  const allValues: number[] = [];
  data.subjects.forEach(s => {
    s.marks.forEach(m => {
      if (typeof m === 'number' && !isNaN(m)) allValues.push(m);
    });
    if (typeof s.classAverage === 'number' && !isNaN(s.classAverage)) allValues.push(s.classAverage);
  });
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 10) : 100;
  const scaleMax = Math.ceil(maxVal / 10) * 10;

  const formatValue = (val: number | string) => {
    if (unit === '$') return `$${val}`;
    return `${val}${unit}`;
  };

  // Sync state changes back to note
  const saveData = (updatedData: TrackerData) => {
    setData(updatedData);
    onUpdateNote({
      ...note,
      content: JSON.stringify(updatedData),
      updatedAt: new Date().toISOString(),
    });
  };

  // Grade grid editing helpers
  const handleMarkChange = (subjIdx: number, milestoneIdx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const newSubjects = [...data.subjects];
    newSubjects[subjIdx].marks[milestoneIdx] = num;
    saveData({ ...data, subjects: newSubjects });
  };

  const handleAverageChange = (subjIdx: number, val: string) => {
    const num = parseFloat(val) || 0;
    const newSubjects = [...data.subjects];
    newSubjects[subjIdx].classAverage = num;
    saveData({ ...data, subjects: newSubjects });
  };

  const handleSubjectNameChange = (subjIdx: number, newName: string) => {
    const newSubjects = [...data.subjects];
    newSubjects[subjIdx].name = newName;
    saveData({ ...data, subjects: newSubjects });
  };

  const handleMilestoneNameChange = (milestoneIdx: number, newName: string) => {
    const newMilestones = [...data.milestones];
    newMilestones[milestoneIdx] = newName;
    saveData({ ...data, milestones: newMilestones });
  };

  const addSubject = () => {
    const name = window.prompt(`Enter new ${rowLabel.toLowerCase()} name:`);
    if (!name || !name.trim()) return;
    const initialMarks = Array(data.milestones.length).fill(75);
    saveData({
      ...data,
      subjects: [...data.subjects, { name: name.trim(), marks: initialMarks, classAverage: 75 }]
    });
  };

  const removeSubject = (subjIdx: number) => {
    if (!window.confirm(`Are you sure you want to remove ${data.subjects[subjIdx].name}?`)) return;
    const newSubjects = data.subjects.filter((_, idx) => idx !== subjIdx);
    saveData({ ...data, subjects: newSubjects });
  };

  const addMilestone = () => {
    const name = window.prompt(`Enter milestone name (e.g. S4-Midterm or Month):`);
    if (!name || !name.trim()) return;
    const newMilestones = [...data.milestones, name.trim()];
    const newSubjects = data.subjects.map(s => {
      const lastMark = s.marks[s.marks.length - 1] ?? 75;
      return {
        ...s,
        marks: [...s.marks, lastMark]
      };
    });
    saveData({ ...data, milestones: newMilestones, subjects: newSubjects });
  };

  const removeMilestone = (milestoneIdx: number) => {
    if (data.milestones.length <= 1) {
      alert(`You must keep at least one ${columnLabel.toLowerCase()}!`);
      return;
    }
    if (!window.confirm(`Remove ${columnLabel.toLowerCase()} "${data.milestones[milestoneIdx]}"? This will delete all data for this period.`)) return;
    const newMilestones = data.milestones.filter((_, idx) => idx !== milestoneIdx);
    const newSubjects = data.subjects.map(s => ({
      ...s,
      marks: s.marks.filter((_, idx) => idx !== milestoneIdx)
    }));
    saveData({ ...data, milestones: newMilestones, subjects: newSubjects });
  };

  // Local Analytical Fallback Engine
  const generateLocalReport = (): string => {
    const { milestones, subjects } = data;
    if (subjects.length === 0 || milestones.length === 0) {
      return `# No Data Available\n\nPlease add ${rowLabel.toLowerCase()}s and ${columnLabel.toLowerCase()}s first.`;
    }

    const latestIdx = milestones.length - 1;

    // 1. Overall Trend
    // Calculate milestone averages
    const milestoneAverages = milestones.map((_, mIdx) => {
      const sum = subjects.reduce((acc, s) => acc + (s.marks[mIdx] ?? 0), 0);
      return sum / subjects.length;
    });

    let overallTrend = "Stagnant";
    if (milestoneAverages.length > 1) {
      const diff = milestoneAverages[latestIdx] - milestoneAverages[0];
      const threshold = scaleMax * 0.03;
      if (diff > threshold) overallTrend = "Upward";
      else if (diff < -threshold) overallTrend = "Declining";
    }

    // 2. Top Performing
    const topPerforming = subjects
      .map(s => ({ name: s.name, lastMark: s.marks[latestIdx] ?? 0 }))
      .filter(s => s.lastMark >= scaleMax * 0.85)
      .map(s => s.name);

    // 3. Areas needing attention
    const areasNeedingAttention = subjects
      .map(s => ({ name: s.name, lastMark: s.marks[latestIdx] ?? 0, avg: s.classAverage }))
      .filter(s => s.lastMark < scaleMax * 0.70 || (showBenchmark && s.lastMark < s.avg))
      .map(s => `${s.name} (Latest Score: ${formatValue(s.lastMark)}${showBenchmark ? `, Target: ${formatValue(s.avg)}` : ''})`);

    // 4. Insights (Hidden patterns)
    const insights: string[] = [];

    // Check for continuous drop
    const continuousDropSubjects: string[] = [];
    subjects.forEach(s => {
      if (s.marks.length >= 3) {
        const len = s.marks.length;
        if (s.marks[len-1] < s.marks[len-2] && s.marks[len-2] < s.marks[len-3]) {
          continuousDropSubjects.push(s.name);
        }
      }
    });

    if (continuousDropSubjects.length > 0) {
      insights.push(`**Critical Declining Trajectory:** Performance in ${continuousDropSubjects.join(', ')} has steadily declined over the last three consecutive periods. Action is recommended to reverse this trend.`);
    } else {
      insights.push(`**Consistency:** Tracked metrics maintain stable trends across evaluation periods, avoiding prolonged downward momentum.`);
    }

    // 5. Predictions & Trajectory
    let nextPeriodAvgPrediction = 75;
    const predictionsList: string[] = [];
    subjects.forEach(s => {
      const len = s.marks.length;
      if (len >= 2) {
        const diff = s.marks[len - 1] - s.marks[len - 2];
        const nextPred = Math.min(scaleMax, Math.max(0, Math.round(s.marks[len - 1] + diff)));
        predictionsList.push(`* **${s.name}:** Projecting **${formatValue(nextPred)}** (based on a ${diff >= 0 ? '+' : ''}${formatValue(diff)} trend from prior period).`);
      } else {
        predictionsList.push(`* **${s.name}:** Projecting **${formatValue(s.marks[latestIdx] || 75)}** (insufficient trend data).`);
      }
    });

    if (milestoneAverages.length >= 2) {
      const diff = milestoneAverages[latestIdx] - milestoneAverages[latestIdx - 1];
      nextPeriodAvgPrediction = Math.min(scaleMax, Math.max(0, Math.round(milestoneAverages[latestIdx] + diff)));
    } else {
      nextPeriodAvgPrediction = Math.round(milestoneAverages[latestIdx] || 75);
    }

    // Assemble report
    let markdown = `# Progress Analysis Report: ${note.title || 'Profile'}\n\n`;
    markdown += `📊 **1. Graphical Breakdown (Chart Data)**\n`;
    markdown += `Below are key tabular metrics matching the dashboard visualisations:\n\n`;
    
    // Add tabular representation of current status
    markdown += `| ${rowLabel} | Latest Value | ${showBenchmark ? `${benchmarkLabel} | ` : ''}Trend |\n`;
    markdown += `| :--- | :---: | ${showBenchmark ? ':---: | ' : ''}:---: |\n`;
    subjects.forEach(s => {
      const trendSymbol = s.marks.length > 1 && s.marks[latestIdx] > s.marks[latestIdx - 1] ? '📈' : s.marks.length > 1 && s.marks[latestIdx] < s.marks[latestIdx - 1] ? '📉' : '➡️';
      markdown += `| ${s.name} | ${formatValue(s.marks[latestIdx])} | ${showBenchmark ? `${formatValue(s.classAverage)} | ` : ''}${trendSymbol} |\n`;
    });
    markdown += `\n`;

    markdown += `🔍 **2. Core Analysis**\n`;
    markdown += `* **Overall Trend:** ${overallTrend}\n`;
    markdown += `* **Top Performing ${rowLabel}s:** ${topPerforming.length > 0 ? topPerforming.join(', ') : 'None currently meeting the benchmark'}\n`;
    markdown += `* **Needs Improvement:** ${areasNeedingAttention.length > 0 ? areasNeedingAttention.join(', ') : 'All metrics are performing adequately relative to targets'}\n\n`;

    markdown += `💡 **3. Key Insights**\n`;
    insights.forEach(ins => {
      markdown += `* ${ins}\n`;
    });
    markdown += `\n`;

    markdown += `🔮 **4. Future Predictions & Recommendations**\n`;
    markdown += `* **Trajectory:** Based on current metrics, the cumulative average for the next evaluation is projected at **${formatValue(nextPeriodAvgPrediction)}**.\n`;
    markdown += `Individual Projections:\n`;
    predictionsList.forEach(pred => {
      markdown += `  ${pred}\n`;
    });
    markdown += `\n`;

    return markdown;
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    const apiKey = localStorage.getItem('aura_gemini_api_key') || '';
    const apiUrl = localStorage.getItem('aura_api_url') || '';
    const apiModel = localStorage.getItem('aura_api_model') || '';

    try {
      if (apiKey.trim() !== '' || !apiUrl) {
        // Query Gemini AI
        const prompt = `You are strata AI. Analyze my progress tracking data for "${note.title}".
We are tracking "${rowLabel}" values over different "${columnLabel}" periods.
The unit is "${unit}" and the benchmark target is called "${benchmarkLabel}".

Current data JSON:
${JSON.stringify({ milestones: data.milestones, subjects: data.subjects }, null, 2)}

Please write a highly understandable, clear, short, and precise analysis report. Avoid academic or student jargon unless the tracker title/labels explicitly indicate it. Keep it relevant to the actual data.

Ensure your output matches these 4 Markdown sections:
📊 1. Graphical Breakdown (Chart Data)
🔍 2. Core Analysis
💡 3. Key Insights
🔮 4. Future Predictions & Recommendations`;

        const config: AIConfig = {
          apiKey,
          apiUrl,
          apiModel
        };

        const aiOutput = await generateText({
          config,
          prompt,
          systemInstruction: "You are a professional data analyst. Output a clear, understandable, short, and precise markdown report analyzing progress metrics. Speak directly about the metrics, avoid generic templates, and keep insights actionable."
        });

        saveData({ ...data, aiReport: aiOutput });
      } else {
        // Fallback to local analytical report generator
        const localOutput = generateLocalReport();
        saveData({ ...data, aiReport: localOutput });
      }
    } catch (e: any) {
      console.error(e);
      // Fallback on error
      const localOutput = generateLocalReport();
      saveData({ ...data, aiReport: `${localOutput}\n\n*Note: AI generation failed (${e.message}). Reverted to local analytical calculations.*` });
    } finally {
      setReportLoading(false);
    }
  };

  // Custom SVG Chart rendering computations
  const renderLineChart = () => {
    const width = 600;
    const height = 280;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 40;

    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const milestonesCount = data.milestones.length;
    if (milestonesCount === 0 || data.subjects.length === 0) return null;

    // Helper to map values to coordinates
    const getX = (idx: number) => {
      if (milestonesCount <= 1) return padL + chartW / 2;
      return padL + (idx / (milestonesCount - 1)) * chartW;
    };

    const getY = (val: number) => {
      return padT + (1 - val / scaleMax) * chartH;
    };

    // Draw horizontal grid lines (every 20% of scaleMax)
    const gridLines = [];
    const step = scaleMax / 5;
    for (let i = 0; i <= 5; i++) {
      const val = Math.round(i * step);
      const y = getY(val);
      gridLines.push(
        <g key={`grid-${val}`}>
          <line 
            x1={padL} 
            y1={y} 
            x2={width - padR} 
            y2={y} 
            stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 
            strokeWidth={1}
          />
          <text 
            x={padL - 10} 
            y={y + 4} 
            textAnchor="end" 
            className="text-[10px] fill-charcoalMuted dark:fill-gray-500 font-sans font-semibold"
          >
            {formatValue(val)}
          </text>
        </g>
      );
    }

    // Draw lines and points for each subject
    const subjectPaths = data.subjects.map((s, subjIdx) => {
      const color = PALETTE[subjIdx % PALETTE.length];
      const points = s.marks.map((m, mIdx) => ({ x: getX(mIdx), y: getY(m) }));
      
      // Build bezier curve or straight path
      let d = "";
      points.forEach((p, idx) => {
        if (idx === 0) {
          d += `M ${p.x} ${p.y}`;
        } else {
          // Add curve control points
          const prev = points[idx - 1];
          const cpX1 = prev.x + (p.x - prev.x) / 3;
          const cpY1 = prev.y;
          const cpX2 = prev.x + 2 * (p.x - prev.x) / 3;
          const cpY2 = p.y;
          d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
        }
      });

      return (
        <g key={`subj-${s.name}`}>
          {/* Main Line */}
          <motion.path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Dots */}
          {s.marks.map((m, mIdx) => {
            const x = getX(mIdx);
            const y = getY(m);
            const isHovered = hoveredPoint && hoveredPoint.subject === s.name && hoveredPoint.milestoneIndex === mIdx;

            return (
              <circle
                key={`dot-${s.name}-${mIdx}`}
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4}
                className="cursor-pointer transition-all duration-150"
                fill={color}
                stroke={darkMode ? "#1C1C1E" : "#FFF"}
                strokeWidth={isHovered ? 2.5 : 1.5}
                onMouseEnter={() => {
                  setHoveredPoint({
                    subject: s.name,
                    milestoneIndex: mIdx,
                    val: m,
                    x: x - 40,
                    y: y - 45
                  });
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </g>
      );
    });

    // Draw X-axis labels
    const xLabels = data.milestones.map((m, idx) => (
      <text
        key={`x-label-${idx}`}
        x={getX(idx)}
        y={height - padB + 20}
        textAnchor="middle"
        className="text-[10px] fill-charcoalMuted dark:fill-gray-500 font-sans font-semibold max-w-[50px] truncate"
      >
        {m}
      </text>
    ));

    return (
      <div className="relative w-full overflow-x-auto select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px] h-auto overflow-visible">
          {gridLines}
          {subjectPaths}
          {xLabels}
          
          {/* Tooltip Overlay */}
          {hoveredPoint && (
            <g>
              {/* Tooltip Background */}
              <rect
                x={hoveredPoint.x}
                y={hoveredPoint.y}
                width={80}
                height={30}
                rx={6}
                fill={darkMode ? "#2C2C2E" : "#1C1C1E"}
                className="shadow-xl"
              />
              {/* Tooltip Text */}
              <text
                x={hoveredPoint.x + 40}
                y={hoveredPoint.y + 19}
                textAnchor="middle"
                className="text-[10px] font-sans font-bold fill-white"
              >
                {hoveredPoint.subject}: {formatValue(hoveredPoint.val)}
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  };

  const renderBarChart = () => {
    const width = 600;
    const height = 280;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 40;

    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const subjectsCount = data.subjects.length;
    if (subjectsCount === 0) return null;

    const latestIdx = data.milestones.length - 1;

    // Helper to map values to coordinates
    const getY = (val: number) => {
      return padT + (1 - val / scaleMax) * chartH;
    };

    // Y Axis Grid lines
    const gridLines = [];
    const step = scaleMax / 5;
    for (let i = 0; i <= 5; i++) {
      const val = Math.round(i * step);
      const y = getY(val);
      gridLines.push(
        <g key={`grid-${val}`}>
          <line 
            x1={padL} 
            y1={y} 
            x2={width - padR} 
            y2={y} 
            stroke={darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} 
            strokeWidth={1}
          />
          <text 
            x={padL - 10} 
            y={y + 4} 
            textAnchor="end" 
            className="text-[10px] fill-charcoalMuted dark:fill-gray-500 font-sans font-semibold"
          >
            {formatValue(val)}
          </text>
        </g>
      );
    }

    // Bar variables
    const groupWidth = chartW / subjectsCount;
    const barWidth = Math.min(22, groupWidth * 0.35);
    const gap = 4;

    const bars = data.subjects.map((s, idx) => {
      const groupX = showBenchmark
        ? padL + idx * groupWidth + (groupWidth - (barWidth * 2 + gap)) / 2
        : padL + idx * groupWidth + (groupWidth - barWidth) / 2;
      const latestMark = s.marks[latestIdx] ?? 0;
      const classAverage = s.classAverage;

      const studentBarH = (latestMark / scaleMax) * chartH;
      const classBarH = (classAverage / scaleMax) * chartH;

      const colorStudent = PALETTE[idx % PALETTE.length];
      const colorAverage = darkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)";

      return (
        <g key={`bar-group-${s.name}`}>
          {/* Student Bar */}
          <motion.rect
            x={groupX}
            y={getY(latestMark)}
            width={barWidth}
            height={studentBarH}
            rx={4}
            fill={colorStudent}
            initial={{ scaleY: 0, originY: 1 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, delay: idx * 0.05 }}
          />
          <text
            x={groupX + barWidth / 2}
            y={getY(latestMark) - 6}
            textAnchor="middle"
            className="text-[9px] font-sans font-bold fill-charcoal dark:fill-white"
          >
            {formatValue(latestMark)}
          </text>

          {/* Class Avg Bar */}
          {showBenchmark && (
            <>
              <motion.rect
                x={groupX + barWidth + gap}
                y={getY(classAverage)}
                width={barWidth}
                height={classBarH}
                rx={4}
                fill={colorAverage}
                initial={{ scaleY: 0, originY: 1 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, delay: (idx + 0.5) * 0.05 }}
              />
              <text
                x={groupX + barWidth + gap + barWidth / 2}
                y={getY(classAverage) - 6}
                textAnchor="middle"
                className="text-[9px] font-sans font-bold fill-charcoalMuted dark:fill-gray-400"
              >
                {formatValue(classAverage)}
              </text>
            </>
          )}

          {/* Subject X axis label */}
          <text
            x={padL + idx * groupWidth + groupWidth / 2}
            y={height - padB + 20}
            textAnchor="middle"
            className="text-[10px] fill-charcoalMuted dark:fill-gray-500 font-sans font-semibold"
          >
            {s.name}
          </text>
        </g>
      );
    });

    return (
      <div className="relative w-full overflow-x-auto select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[550px] h-auto overflow-visible">
          {gridLines}
          {bars}
        </svg>
      </div>
    );
  };

  const renderRadarChart = () => {
    const width = 400;
    const height = 300;
    const cx = width / 2;
    const cy = height / 2;
    const r = 95;

    const subjectsCount = data.subjects.length;
    if (subjectsCount < 3) {
      return (
        <div className="flex items-center justify-center h-48 text-center text-xs font-sans text-charcoalMuted dark:text-gray-400">
          <AlertCircle className="w-4 h-4 mr-1 text-warmAmber" /> Add at least 3 {rowLabel.toLowerCase()}s to render the Strength Radar Profile.
        </div>
      );
    }

    const latestIdx = data.milestones.length - 1;

    // Angle mapping
    const getAngle = (idx: number) => {
      return (idx * 2 * Math.PI) / subjectsCount - Math.PI / 2;
    };

    // Concentric grid webs (20%, 40%, 60%, 80%, 100%)
    const grids = [];
    for (let j = 1; j <= 5; j++) {
      const radius = (j / 5) * r;
      const points = [];
      for (let i = 0; i < subjectsCount; i++) {
        const angle = getAngle(i);
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        points.push(`${px},${py}`);
      }
      grids.push(
        <polygon
          key={`radar-grid-${j}`}
          points={points.join(' ')}
          fill="none"
          stroke={darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}
          strokeWidth={1}
        />
      );
    }

    // Radar axes and labels
    const axes = [];
    for (let i = 0; i < subjectsCount; i++) {
      const angle = getAngle(i);
      const ax = cx + r * Math.cos(angle);
      const ay = cy + r * Math.sin(angle);
      const s = data.subjects[i];

      // Shift text slightly to avoid overlapping
      const textRadius = r + 15;
      const tx = cx + textRadius * Math.cos(angle);
      const ty = cy + textRadius * Math.sin(angle) + 4;
      const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';

      axes.push(
        <g key={`axis-${i}`}>
          <line
            x1={cx}
            y1={cy}
            x2={ax}
            y2={ay}
            stroke={darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"}
            strokeWidth={1}
          />
          <text
            x={tx}
            y={ty}
            textAnchor={anchor}
            className="text-[9px] fill-charcoal dark:fill-white font-sans font-semibold"
          >
            {s.name} ({formatValue(s.marks[latestIdx])})
          </text>
        </g>
      );
    }

    // Student profile polygon points
    const studentPoints = data.subjects.map((s, idx) => {
      const mark = s.marks[latestIdx] ?? 0;
      const radius = (mark / scaleMax) * r;
      const angle = getAngle(idx);
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      return { x: px, y: py };
    });

    const studentPolygonStr = studentPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <div className="w-full flex justify-center select-none py-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px] h-auto overflow-visible">
          {grids}
          {axes}

          {/* Filled polygon for grades */}
          <motion.polygon
            points={studentPolygonStr}
            fill="rgba(245, 158, 11, 0.25)"
            stroke="#F59E0B"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="origin-center"
            transition={{ duration: 0.5 }}
          />

          {/* Inner dots */}
          {studentPoints.map((p, idx) => (
            <circle
              key={`radar-dot-${idx}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#F59E0B"
            />
          ))}
        </svg>
      </div>
    );
  };

  const isSetupNeeded = data.milestones.length === 0 || data.subjects.length === 0;

  if (isSetupNeeded) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-[#FAF9F5] dark:bg-[#121212] p-8 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white dark:bg-[#1E1E20] border border-charcoal/10 dark:border-white/5 rounded-3xl p-8 shadow-xl flex flex-col gap-6 relative select-text">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-warmAmber/10 flex items-center justify-center text-warmAmber shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-charcoal dark:text-white">Configure Progress Tracker</h2>
              <p className="text-xs font-sans text-charcoalMuted dark:text-gray-400">
                Set up your customized metrics, intervals, and targets to begin tracking.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Tracker Title
              </label>
              <input
                type="text"
                value={setupTitle}
                onChange={e => setSetupTitle(e.target.value)}
                placeholder="e.g. Sales KPI Tracker, Workout Logs"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2.5 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
              />
            </div>

            {/* Row Label */}
            <div>
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Row Label (e.g. What you track)
              </label>
              <input
                type="text"
                value={setupRowLabel}
                onChange={e => setSetupRowLabel(e.target.value)}
                placeholder="e.g. Metric, Exercise, Team Member"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2.5 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
              />
            </div>

            {/* Column Label */}
            <div>
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Column Label (e.g. Measurement Interval)
              </label>
              <input
                type="text"
                value={setupColumnLabel}
                onChange={e => setSetupColumnLabel(e.target.value)}
                placeholder="e.g. Interval, Milestone, Week, Month"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2.5 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
              />
            </div>

            {/* Benchmark Label */}
            <div>
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Target / Benchmark Label
              </label>
              <input
                type="text"
                value={setupBenchmarkLabel}
                onChange={e => setSetupBenchmarkLabel(e.target.value)}
                placeholder="e.g. Target, Quota, Goal"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2.5 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
              />
            </div>

            {/* Unit Symbol */}
            <div>
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Unit Symbol
              </label>
              <input
                type="text"
                value={setupUnit}
                onChange={e => setSetupUnit(e.target.value)}
                placeholder="e.g. %, $, kg, lbs, or leave blank"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2.5 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
              />
            </div>

            {/* Predefined Columns input */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Columns / Intervals (comma-separated list)
              </label>
              <textarea
                value={setupMilestonesInput}
                onChange={e => setSetupMilestonesInput(e.target.value)}
                rows={2}
                placeholder="e.g. Week 1, Week 2, Week 3, Week 4"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber resize-none"
              />
            </div>

            {/* Predefined Rows input */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1.5">
                Rows / Items (comma-separated list)
              </label>
              <textarea
                value={setupSubjectsInput}
                onChange={e => setSetupSubjectsInput(e.target.value)}
                rows={2}
                placeholder="e.g. Pushups, Pullups, Squats"
                className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-xl px-3 py-2 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber resize-none"
              />
            </div>

            {/* Option Checkboxes */}
            <div className="flex items-center gap-6 md:col-span-2 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-charcoal dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setupShowBenchmark}
                  onChange={e => setSetupShowBenchmark(e.target.checked)}
                  className="w-4 h-4 rounded text-warmAmber focus:ring-warmAmber border-charcoal/20 dark:border-white/20 bg-transparent"
                />
                Enable Benchmark / Target
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-charcoal dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setupShowGrades}
                  onChange={e => setSetupShowGrades(e.target.checked)}
                  className="w-4 h-4 rounded text-warmAmber focus:ring-warmAmber border-charcoal/20 dark:border-white/20 bg-transparent"
                />
                Show Academic Grades (A-F)
              </label>
            </div>

          </div>

          <button
            onClick={handleInitialize}
            className="w-full py-3 bg-charcoal dark:bg-white dark:text-black text-white rounded-xl text-xs font-sans font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-4"
          >
            <TrendingUp className="w-4 h-4" /> Create Progress Tracker Grid
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-[#FAF9F5] dark:bg-[#121212] overflow-hidden select-none">
      
      {/* Editor Sub-Header Tabs */}
      <div className="px-8 py-3 bg-white dark:bg-[#1C1C1E] border-b border-charcoal/10 dark:border-white/5 flex items-center justify-between shrink-0 select-none">
        <div className="flex gap-1">
          {[
            { id: 'charts', label: 'Dashboard & Charts', icon: TrendingUp },
            { id: 'data', label: 'Data Grid Sheet', icon: BookOpen },
            { id: 'report', label: 'AI Analytics Report', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-sans font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  active 
                    ? 'bg-charcoal text-white dark:bg-white dark:text-black shadow-sm' 
                    : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5 hover:text-charcoal dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Generate Report quick action */}
        {activeTab !== 'report' && (
          <button
            onClick={() => {
              setActiveTab('report');
              handleGenerateReport();
            }}
            className="px-3.5 py-1.5 bg-charcoal text-white dark:bg-white dark:text-black hover:opacity-90 text-xs font-sans font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyze Metrics
          </button>
        )}
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 overflow-y-auto px-8 py-6 select-text">
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Charts Dashboard */}
          {activeTab === 'charts' && (
            <motion.div
              key="charts-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              {/* Chart Selector Button group */}
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white flex items-center gap-2">
                  {rowLabel} Dashboard
                </h3>
                <div className="bg-white dark:bg-[#1E1E1E] border border-charcoal/15 dark:border-white/10 rounded-xl p-1 flex gap-1 shadow-sm select-none">
                  {[
                    { id: 'line', label: 'Progress Line', icon: TrendingUp },
                    { id: 'bar', label: 'Value Bar', icon: BarChart2 },
                    { id: 'radar', label: 'Strength Radar', icon: PieChart },
                  ].map(cOpt => {
                    const Icon = cOpt.icon;
                    const selected = activeChartType === cOpt.id;
                    return (
                      <button
                        key={cOpt.id}
                        onClick={() => setActiveChartType(cOpt.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          selected
                            ? 'bg-charcoal text-white dark:bg-white dark:text-black shadow-sm'
                            : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cOpt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart Display Panel */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                {activeChartType === 'line' && renderLineChart()}
                {activeChartType === 'bar' && renderBarChart()}
                {activeChartType === 'radar' && renderRadarChart()}
                
                {/* Visual Legend */}
                {activeChartType !== 'radar' && (
                  <div className="flex flex-wrap gap-4 justify-center mt-4 select-none">
                    {activeChartType === 'line' ? (
                      data.subjects.map((s, idx) => (
                        <div key={`legend-${s.name}`} className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-charcoalMuted dark:text-gray-400">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                          {s.name}
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-charcoalMuted dark:text-gray-400">
                          <span className="w-3 h-3 rounded bg-warmAmber" />
                          Latest {rowLabel} Value
                        </div>
                        {showBenchmark && (
                          <div className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-charcoalMuted dark:text-gray-400">
                            <span className="w-3 h-3 rounded bg-charcoal/15 dark:bg-white/20" />
                            {benchmarkLabel}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Summary Stats Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.subjects.map((s) => {
                  const latest = s.marks[s.marks.length - 1] ?? 0;
                  const prev = s.marks[s.marks.length - 2] ?? latest;
                  const diff = latest - prev;
                  const isUp = diff > 0;
                  return (
                    <div key={`stat-${s.name}`} className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-xl p-4 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider">{s.name}</p>
                        <p className="text-xl font-sans font-bold text-charcoal dark:text-white mt-1">{formatValue(latest)}</p>
                      </div>
                      {s.marks.length > 1 && (
                        <span className={`text-xs font-sans font-bold px-2 py-0.5 rounded-full flex items-center ${
                          diff === 0 
                            ? 'bg-gray-100 text-gray-500 dark:bg-white/5' 
                            : isUp 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}>
                          {diff === 0 ? '•' : isUp ? '↑' : '↓'} {Math.abs(diff)}{unit}
                        </span>
                      )}
                    </div>
                  );
                }).slice(0, 3)}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Grade Data Entry Sheet */}
          {activeTab === 'data' && (
            <motion.div
              key="data-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white">
                    {rowLabel} Data Grid
                  </h3>
                  <p className="text-xs font-sans text-charcoalMuted mt-0.5">
                    Modify values, benchmarks, {rowLabel.toLowerCase()}s, or {columnLabel.toLowerCase()}s. Charts update in real-time.
                  </p>
                </div>
                <div className="flex gap-2 select-none">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      showSettings 
                        ? 'bg-charcoal text-white border-charcoal dark:bg-white dark:text-black dark:border-white shadow-sm' 
                        : 'bg-white dark:bg-[#1E1E1E] border-charcoal/15 dark:border-white/10 text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" /> Customize Grid
                  </button>
                  <button
                    onClick={addSubject}
                    className="px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-charcoal/15 dark:border-white/10 rounded-lg text-xs font-sans font-semibold text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> {rowLabel}
                  </button>
                  <button
                    onClick={addMilestone}
                    className="px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-charcoal/15 dark:border-white/10 rounded-lg text-xs font-sans font-semibold text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> {columnLabel}
                  </button>
                </div>
              </div>

              {/* Collapsible settings panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="p-4 bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 shadow-inner">
                      <div>
                        <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1">
                          Row Type Label (e.g. Subject)
                        </label>
                        <input
                          type="text"
                          value={rowLabel}
                          onChange={(e) => saveData({ ...data, rowLabel: e.target.value })}
                          className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-lg px-3 py-2 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1">
                          Column Type Label (e.g. Milestone)
                        </label>
                        <input
                          type="text"
                          value={columnLabel}
                          onChange={(e) => saveData({ ...data, columnLabel: e.target.value })}
                          className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-lg px-3 py-2 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1">
                          Benchmark Label (e.g. Target)
                        </label>
                        <input
                          type="text"
                          value={benchmarkLabel}
                          onChange={(e) => saveData({ ...data, benchmarkLabel: e.target.value })}
                          className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-lg px-3 py-2 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider mb-1">
                          Unit Symbol (e.g. %, $)
                        </label>
                        <input
                          type="text"
                          value={unit}
                          onChange={(e) => saveData({ ...data, unit: e.target.value })}
                          className="w-full text-xs bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/5 rounded-lg px-3 py-2 text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber"
                        />
                      </div>
                      <div className="flex items-center gap-6 pt-4 sm:col-span-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal dark:text-gray-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showBenchmark}
                            onChange={(e) => saveData({ ...data, showBenchmark: e.target.checked })}
                            className="w-4 h-4 rounded text-warmAmber focus:ring-warmAmber border-charcoal/20 dark:border-white/20 bg-transparent"
                          />
                          Show Benchmark Column
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-charcoal dark:text-gray-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showGrades}
                            onChange={(e) => saveData({ ...data, showGrades: e.target.checked })}
                            className="w-4 h-4 rounded text-warmAmber focus:ring-warmAmber border-charcoal/20 dark:border-white/20 bg-transparent"
                          />
                          Show Academic Grades (A-F)
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Data Table Grid container */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-charcoal/5 dark:bg-white/3 border-b border-charcoal/10 dark:border-white/5">
                        <th className="p-3 font-bold text-charcoalMuted dark:text-gray-400 w-44">{rowLabel} Name</th>
                        {data.milestones.map((m, mIdx) => (
                          <th key={`th-${mIdx}`} className="p-3 font-bold text-charcoalMuted dark:text-gray-400 text-center w-28 relative group">
                            <input
                              type="text"
                              value={m}
                              onChange={(e) => handleMilestoneNameChange(mIdx, e.target.value)}
                              className="w-full text-center bg-transparent border-none outline-none font-bold text-charcoal dark:text-white focus:ring-1 focus:ring-warmAmber focus:bg-white dark:focus:bg-[#2A2A2C]"
                            />
                            <button
                              onClick={() => removeMilestone(mIdx)}
                              className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/10 rounded cursor-pointer"
                              title={`Delete ${columnLabel}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </th>
                        ))}
                        {showBenchmark && (
                          <th className="p-3 font-bold text-charcoalMuted dark:text-gray-400 text-center w-32">{benchmarkLabel}</th>
                        )}
                        <th className="p-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/5 dark:divide-white/5">
                      {data.subjects.map((s, subjIdx) => {
                        const latestMark = s.marks[s.marks.length - 1] ?? 0;
                        let letterGrade = 'F';
                        let badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
                        if (latestMark >= 90) {
                          letterGrade = 'A';
                          badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                        } else if (latestMark >= 80) {
                          letterGrade = 'B';
                          badgeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                        } else if (latestMark >= 70) {
                          letterGrade = 'C';
                          badgeColor = 'bg-warmAmber/10 text-warmAmber border-warmAmber/20';
                        } else if (latestMark >= 60) {
                          letterGrade = 'D';
                          badgeColor = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                        }

                        const progressPercent = Math.min(100, Math.max(0, (latestMark / scaleMax) * 100));

                        return (
                          <tr key={`tr-${subjIdx}`} className="hover:bg-charcoal/3 dark:hover:bg-white/2">
                            <td className="p-3 font-semibold text-charcoal dark:text-white">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={s.name}
                                  onChange={(e) => handleSubjectNameChange(subjIdx, e.target.value)}
                                  className="flex-1 bg-transparent border-none outline-none font-semibold text-charcoal dark:text-white focus:ring-1 focus:ring-warmAmber focus:bg-white dark:focus:bg-[#2A2A2C] px-1 py-0.5 rounded"
                                />
                                {showGrades && (
                                  <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${badgeColor} shrink-0`}>
                                    Grade: {letterGrade}
                                  </span>
                                )}
                              </div>
                              <div className="w-full bg-charcoal/10 dark:bg-white/10 h-1 rounded-full mt-2 overflow-hidden" title={`Latest: ${formatValue(latestMark)}`}>
                                <div 
                                  className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </td>
                            {s.marks.map((mark, mIdx) => {
                              return (
                                <td key={`td-${subjIdx}-${mIdx}`} className="p-3 text-center">
                                  <input
                                    type="number"
                                    value={mark}
                                    onChange={(e) => handleMarkChange(subjIdx, mIdx, e.target.value)}
                                    className="w-16 text-center bg-transparent border rounded px-1.5 py-1 text-xs text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber border-charcoal/10 dark:border-white/10 focus:border-warmAmber focus:bg-white dark:focus:bg-[#2A2A2C]"
                                  />
                                </td>
                              );
                            })}
                            {showBenchmark && (
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  value={s.classAverage}
                                  onChange={(e) => handleAverageChange(subjIdx, e.target.value)}
                                  className="w-16 text-center bg-transparent border rounded px-1.5 py-1 text-xs text-charcoal dark:text-white outline-none focus:ring-1 focus:ring-warmAmber font-semibold border-charcoal/10 dark:border-white/10 focus:border-warmAmber focus:bg-white dark:focus:bg-[#2A2A2C] text-warmAmber"
                                />
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => removeSubject(subjIdx)}
                                className="p-1 hover:bg-red-500/10 text-red-500 transition-all rounded cursor-pointer"
                                title={`Delete ${rowLabel}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Milestone Averages Row */}
                      {data.subjects.length > 0 && (
                        <tr className="bg-charcoal/5 dark:bg-white/5 font-bold">
                          <td className="p-3 text-charcoal dark:text-white font-bold text-xs uppercase tracking-wider">
                            {columnLabel} Average
                          </td>
                          {data.milestones.map((_, mIdx) => {
                            const validMarks = data.subjects
                              .map(s => s.marks[mIdx])
                              .filter(val => val !== undefined && !isNaN(val));
                            const average = validMarks.length > 0 
                              ? Math.round(validMarks.reduce((a, b) => a + b, 0) / validMarks.length) 
                              : 0;
                            return (
                              <td key={`avg-${mIdx}`} className="p-3 text-center text-charcoal dark:text-white font-bold">
                                {formatValue(average)}
                              </td>
                            );
                          })}
                          {showBenchmark && (
                            <td className="p-3 text-center text-warmAmber font-bold">
                              {formatValue(Math.round(data.subjects.reduce((sum, s) => sum + s.classAverage, 0) / data.subjects.length))}
                            </td>
                          )}
                          <td className="p-3"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: AI / Local Analytics Report */}
          {activeTab === 'report' && (
            <motion.div
              key="report-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl text-charcoal dark:text-white flex items-center gap-2">
                    Performance Insight Report
                  </h3>
                  <p className="text-xs font-sans text-charcoalMuted mt-0.5">
                    Generates diagnostic analytics, identifies anomalies, and projects future grades.
                  </p>
                </div>
                <div className="flex gap-2 select-none">
                  {data.aiReport && (
                    <button
                      onClick={() => {
                        if (editingReport) {
                          saveData({ ...data, aiReport: tempReport });
                          setEditingReport(false);
                        } else {
                          setTempReport(data.aiReport);
                          setEditingReport(true);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-white dark:bg-[#1E1E1E] border border-charcoal/15 dark:border-white/10 text-xs font-sans font-semibold text-charcoal dark:text-white rounded-lg hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {editingReport ? <Save className="w-3.5 h-3.5" /> : 'Edit Report'}
                    </button>
                  )}
                  <button
                    onClick={handleGenerateReport}
                    disabled={reportLoading}
                    className="px-3.5 py-1.5 bg-charcoal text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black text-xs font-sans font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {reportLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {data.aiReport ? 'Re-Analyze' : 'Generate Report'}
                  </button>
                </div>
              </div>

              {/* Report Output Panel */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl p-6 shadow-sm min-h-[300px]">
                {reportLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <RefreshCw className="w-8 h-8 text-warmAmber animate-spin" />
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-400">Evaluating trends, calculating projections, and synthesis...</p>
                  </div>
                ) : editingReport ? (
                  <textarea
                    value={tempReport}
                    onChange={(e) => setTempReport(e.target.value)}
                    className="w-full min-h-[400px] text-sm font-mono p-4 border border-charcoal/15 dark:border-white/10 rounded-xl bg-transparent outline-none focus:border-warmAmber focus:ring-1 focus:ring-warmAmber text-charcoal dark:text-white"
                  />
                ) : data.aiReport ? (
                  <div className="prose dark:prose-invert max-w-none text-sm font-sans leading-relaxed text-charcoal dark:text-white/90">
                    {/* Render basic markdown blocks simply */}
                    {data.aiReport.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) {
                        return <h1 key={idx} className="text-2xl font-serif font-bold border-b border-charcoal/10 dark:border-white/5 pb-2 mb-4 mt-6 text-charcoal dark:text-white">{line.slice(2)}</h1>;
                      }
                      if (line.startsWith('## ')) {
                        return <h2 key={idx} className="text-lg font-serif font-bold mb-3 mt-6 text-charcoal dark:text-white">{line.slice(3)}</h2>;
                      }
                      if (line.startsWith('### ')) {
                        return <h3 key={idx} className="text-base font-serif font-bold mb-2 mt-4 text-charcoal dark:text-white">{line.slice(4)}</h3>;
                      }
                      if (line.startsWith('* ') || line.startsWith('- ')) {
                        // Render bold inline patterns in lists
                        const cleanLine = line.slice(2);
                        const parts = cleanLine.split('**');
                        return (
                          <li key={idx} className="ml-4 list-disc mb-1.5">
                            {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-warmAmber">{p}</strong> : p)}
                          </li>
                        );
                      }
                      if (line.startsWith('|')) {
                        // Simple table lines bypass block structure
                        const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
                        if (cells.some(c => c.includes('---'))) return null;
                        const isHeader = idx === 0 || data.aiReport.split('\n')[idx - 1]?.startsWith('#') || idx < 4;
                        return (
                          <div key={idx} className={`grid grid-cols-4 gap-2 py-2 px-3 border-b border-charcoal/5 dark:border-white/5 text-xs ${isHeader ? 'font-bold bg-charcoal/5 dark:bg-white/3' : ''}`}>
                            {cells.map((c, cIdx) => <span key={cIdx} className="truncate">{c}</span>)}
                          </div>
                        );
                      }
                      if (line.trim() === '') return <div key={idx} className="h-2" />;
                      
                      const parts = line.split('**');
                      return (
                        <p key={idx} className="mb-2">
                          {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-semibold text-warmAmber">{p}</strong> : p)}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 select-none">
                    <Sparkles className="w-10 h-10 text-warmAmber/40" />
                    <div>
                      <p className="text-sm font-sans font-bold text-charcoal dark:text-white">No Report Generated</p>
                      <p className="text-xs font-sans text-charcoalMuted dark:text-gray-500 mt-1 max-w-sm">Run performance diagnostics to check academic trends, detect stress drops, and extrapolate predictions.</p>
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      className="px-4 py-2 bg-charcoal text-white hover:opacity-90 dark:bg-white dark:text-black rounded-lg text-xs font-sans font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Analyze Now
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};
