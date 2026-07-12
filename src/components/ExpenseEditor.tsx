import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Note, type Category } from '../types';
import { 
  TrendingUp, Plus, Trash2, PieChart, BarChart2, DollarSign, Calendar, Edit, Check, X, Sparkles, Brain, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { generateText, type AIConfig } from '../utils/aiService';

interface Transaction {
  id: string;
  date: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
}

interface ExpenseData {
  transactions: Transaction[];
  categories?: string[];
  aiReport?: string;
}

interface ExpenseEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  darkMode: boolean;
  categories: Category[];
}

const DEFAULT_CATEGORIES = ['Salary', 'Rent', 'Food', 'Entertainment'];
const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6', '#6B7280'];

export const ExpenseEditor: React.FC<ExpenseEditorProps> = ({ note, onUpdateNote, darkMode }) => {
  const parsedData = (() => {
    try {
      const parsed = JSON.parse(note.content) as ExpenseData;
      return {
        transactions: parsed.transactions || [],
        categories: parsed.categories || DEFAULT_CATEGORIES,
        aiReport: parsed.aiReport || '',
      };
    } catch {
      return { transactions: [], categories: DEFAULT_CATEGORIES, aiReport: '' };
    }
  })();

  const [transactions, setTransactions] = useState<Transaction[]>(parsedData.transactions);
  const [customCategories, setCustomCategories] = useState<string[]>(parsedData.categories);
  const [aiReport, setAiReport] = useState<string>(parsedData.aiReport);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'report'>('dashboard');

  // Transaction Form inputs
  const [dateMode, setDateMode] = useState<'exact' | 'month'>('exact');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newMonth, setNewMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [newCategory, setNewCategory] = useState<string>(parsedData.categories[0] || 'Food');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');

  // Category Manager States
  const [showCategoryManager, setShowCategoryManager] = useState<boolean>(false);
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatValue, setEditingCatValue] = useState<string>('');

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');

  // AI report generation states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = customCategories;

  // Month formatter helper
  const formatMonthLabel = (yyyyMm: string) => {
    try {
      const [year, month] = yyyyMm.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch {
      return yyyyMm;
    }
  };

  // Sync internal state when note content changes externally
  const lastSavedContentRef = useRef(note.content);
  const prevNoteIdRef = useRef(note.id);
  useEffect(() => {
    const isNoteSwitch = prevNoteIdRef.current !== note.id;
    prevNoteIdRef.current = note.id;
    const isExternalChange = note.content !== lastSavedContentRef.current;
    
    if (isNoteSwitch || isExternalChange) {
      try {
        const parsed = JSON.parse(note.content) as ExpenseData;
        const txsList = parsed.transactions || [];
        const catsList = parsed.categories || DEFAULT_CATEGORIES;
        const rptStr = parsed.aiReport || '';
        
        setTransactions(txsList);
        setCustomCategories(catsList);
        setAiReport(rptStr);
        lastSavedContentRef.current = note.content;
        
        // Reset form inputs on note switch to prevent input pollution
        if (isNoteSwitch) {
          setNewAmount('');
          setDateMode('exact');
          setNewDate(new Date().toISOString().split('T')[0]);
          setNewMonth(new Date().toISOString().substring(0, 7));
          setNewCategory(catsList[0] || 'Food');
          setNewType('expense');
          setEditingId(null);
          setActiveTab('dashboard'); // default to dashboard tab for clean entry switch
          setShowCategoryManager(false);
          setNewCatInput('');
          setEditingCatIndex(null);
        }
      } catch {
        // ignore
      }
    }
  }, [note.content, note.id]);

  // Save utility helper
  const commitSave = useCallback((txList: Transaction[], reportStr: string, catsList?: string[]) => {
    const activeCats = catsList || customCategories;
    const updatedContent = JSON.stringify({ 
      transactions: txList, 
      aiReport: reportStr,
      categories: activeCats 
    });
    lastSavedContentRef.current = updatedContent;
    onUpdateNote({
      ...note,
      content: updatedContent,
      updatedAt: new Date().toISOString(),
    });
  }, [note, onUpdateNote, customCategories]);

  // Category Manager Helpers
  const addCustomCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (customCategories.includes(trimmed)) {
      alert("Category already exists!");
      return;
    }
    const updatedCats = [...customCategories, trimmed];
    setCustomCategories(updatedCats);
    setNewCatInput('');
    commitSave(transactions, aiReport, updatedCats);
  };

  const deleteCustomCategory = (catName: string) => {
    if (customCategories.length <= 1) {
      alert("You must keep at least one category!");
      return;
    }
    if (!window.confirm(`Delete category "${catName}"? This will remove it from future quick options.`)) return;
    const updatedCats = customCategories.filter(c => c !== catName);
    setCustomCategories(updatedCats);
    commitSave(transactions, aiReport, updatedCats);
    
    if (newCategory === catName) {
      setNewCategory(updatedCats[0]);
    }
  };

  const startEditCategory = (index: number, val: string) => {
    setEditingCatIndex(index);
    setEditingCatValue(val);
  };

  const saveEditCategory = (index: number) => {
    const trimmed = editingCatValue.trim();
    if (!trimmed) return;
    const oldVal = customCategories[index];
    if (customCategories.includes(trimmed) && trimmed !== oldVal) {
      alert("Category already exists!");
      return;
    }
    const updatedCats = customCategories.map((c, i) => i === index ? trimmed : c);
    setCustomCategories(updatedCats);
    setEditingCatIndex(null);
    
    // Update transactions containing the old category to use the renamed category name!
    const updatedTxs = transactions.map(t => {
      if (t.category === oldVal) {
        return { ...t, category: trimmed };
      }
      return t;
    });
    setTransactions(updatedTxs);
    commitSave(updatedTxs, aiReport, updatedCats);

    if (newCategory === oldVal) {
      setNewCategory(trimmed);
    }
  };

  // Transaction Sorting (robust with empty/optional dates)
  const sortTransactions = (list: Transaction[]) => {
    return [...list].sort((a, b) => {
      if (!a.date && !b.date) return b.id.localeCompare(a.id);
      if (!a.date) return 1; // Put undated items at the end
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  };

  // Transaction management
  const addTransaction = () => {
    if (!newAmount || parseFloat(newAmount) <= 0) return;
    const amountVal = Math.round(parseFloat(newAmount) * 100) / 100;
    const newTx: Transaction = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      date: dateMode === 'exact'
        ? (newDate || new Date().toISOString().split('T')[0])
        : (newMonth || new Date().toISOString().substring(0, 7)),
      category: newCategory || 'Other',
      amount: amountVal,
      type: newType,
    };
    const updated = sortTransactions([...transactions, newTx]);
    setTransactions(updated);
    commitSave(updated, aiReport, customCategories);

    // reset input form fields
    setNewAmount('');
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    commitSave(updated, aiReport, customCategories);
  };

  const startInlineEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditDate(tx.date);
    setEditCategory(tx.category);
    setEditAmount(tx.amount.toString());
    setEditType(tx.type);
  };

  const saveInlineEdit = (id: string) => {
    if (!editAmount || parseFloat(editAmount) <= 0) return;
    const updated = sortTransactions(transactions.map(t => {
      if (t.id === id) {
        return {
          ...t,
          date: editDate,
          category: editCategory || 'Other',
          amount: Math.round(parseFloat(editAmount) * 100) / 100,
          type: editType,
        };
      }
      return t;
    }));

    setTransactions(updated);
    setEditingId(null);
    commitSave(updated, aiReport, customCategories);
  };

  // Math aggregates
  const filteredTxs = transactions.filter(t => {
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchType && matchCat;
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Daily Spend Calculations
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySpend = expenseTransactions
    .filter(t => t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  const uniqueExpenseDays = Array.from(new Set(expenseTransactions.map(t => t.date).filter(d => d !== '')));
  const averageDailySpend = uniqueExpenseDays.length > 0
    ? totalExpense / uniqueExpenseDays.length
    : 0;

  // Render SVG Pie Chart for category breakdowns
  const renderCategoryPieChart = () => {
    const categoryExpenses: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
      });

    const chartData = Object.entries(categoryExpenses).map(([category, amount]) => ({
      label: category,
      value: amount,
    })).sort((a, b) => b.value - a.value);

    const grandTotal = chartData.reduce((sum, d) => sum + d.value, 0) || 1;
    const cx = 90;
    const cy = 90;
    const radius = 65;

    if (chartData.length === 0) {
      return (
        <div className="text-center text-xs font-sans text-charcoalMuted dark:text-gray-500 py-10">
          No expenses logged to display distributions.
        </div>
      );
    }

    let startAngle = 0;
    const slices = chartData.map((d, idx) => {
      const angle = (d.value / grandTotal) * 360;
      const endAngle = startAngle + angle;
      const color = PALETTE[idx % PALETTE.length];

      const radStart = (startAngle - 90) * Math.PI / 180;
      const radEnd = (endAngle - 90) * Math.PI / 180;

      const x1 = cx + radius * Math.cos(radStart);
      const y1 = cy + radius * Math.sin(radStart);
      const x2 = cx + radius * Math.cos(radEnd);
      const y2 = cy + radius * Math.sin(radEnd);

      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      startAngle = endAngle;

      return (
        <g key={`slice-${idx}`} className="group/slice">
          <path
            d={pathData}
            fill={color}
            stroke={darkMode ? "#1E1E20" : "#FFF"}
            strokeWidth={1.5}
            className="transition-all duration-300 hover:scale-[1.03] origin-center cursor-pointer"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <title>{d.label}: ₹{d.value.toFixed(2)} ({Math.round(d.value / grandTotal * 100)}%)</title>
        </g>
      );
    });

    return (
      <div className="flex items-center justify-between w-full">
        <svg width={180} height={180} className="overflow-visible select-none shrink-0">
          {slices}
        </svg>
        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar flex-1 pl-4">
          {chartData.map((d, idx) => (
            <div key={`leg-${idx}`} className="flex items-center gap-1.5 text-[10px] font-sans font-semibold text-charcoalMuted dark:text-gray-400">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
              <span className="truncate max-w-[70px]" title={d.label}>{d.label}</span>
              <span className="ml-auto font-bold text-charcoal dark:text-white">₹{d.value.toFixed(0)}</span>
              <span className="text-[9px] opacity-60">({Math.round(d.value / grandTotal * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render SVG Monthly expenses bar chart
  const renderMonthlyTrendChart = () => {
    // Group expenses by date (sorted chronological)
    const dailyExpenses: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.date)
      .forEach(t => {
        const dateKey = t.date.substring(5, 10); // MM-DD
        dailyExpenses[dateKey] = (dailyExpenses[dateKey] || 0) + t.amount;
      });

    const trendData = Object.entries(dailyExpenses)
      .map(([date, amount]) => ({ label: date, value: amount }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-7); // Last 7 active days

    const width = 360;
    const height = 180;
    const padL = 35;
    const padB = 25;
    const padT = 15;
    const padR = 10;

    if (trendData.length === 0) {
      return (
        <div className="text-center text-xs font-sans text-charcoalMuted dark:text-gray-500 py-10">
          No transactions logged to display trends.
        </div>
      );
    }

    const chartW = width - padL - padR;
    const chartH = height - padT - padB;
    const maxVal = Math.max(...trendData.map(d => d.value), 50);

    const getY = (val: number) => padT + (1 - val / maxVal) * chartH;
    const getX = (idx: number) => padL + (idx * chartW) / trendData.length;
    const colW = Math.max(8, (chartW / trendData.length) - 10);

    const bars = trendData.map((d, idx) => {
      const x = getX(idx) + 5;
      const y = getY(d.value);
      const h = Math.max(0, height - padB - y);

      return (
        <g key={`tbar-${idx}`} className="group/tbar">
          <rect
            x={x}
            y={y}
            width={colW}
            height={h}
            rx={4}
            fill="url(#barTrendGradient)"
            className="transition-all duration-300 hover:opacity-85"
          />
          <text
            x={x + colW / 2}
            y={Math.max(y - 3, 10)}
            textAnchor="middle"
            className="text-[9px] font-sans font-bold fill-charcoal dark:fill-white opacity-0 group-hover/tbar:opacity-100 transition-opacity"
          >
            ₹{d.value.toFixed(0)}
          </text>
          <text
            x={x + colW / 2}
            y={height - padB + 12}
            textAnchor="middle"
            className="text-[9px] font-sans font-semibold fill-charcoalMuted dark:fill-gray-500"
          >
            {d.label}
          </text>
        </g>
      );
    });

    return (
      <svg width={width} height={height} className="overflow-visible select-none">
        <defs>
          <linearGradient id="barTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Y Axis helper grid lines */}
        {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
          const gridY = padT + (1 - ratio) * chartH;
          return (
            <line
              key={`grid-${i}`}
              x1={padL}
              y1={gridY}
              x2={width - padR}
              y2={gridY}
              stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              strokeDasharray="3 3"
            />
          );
        })}
        {/* Axis lines */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={darkMode ? "#444" : "#ccc"} strokeWidth={1} />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={darkMode ? "#444" : "#ccc"} strokeWidth={1} />
        {/* Bars */}
        {bars}
      </svg>
    );
  };

  const generateLocalReport = () => {
    // Group by category
    const categoryExpenses: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
      });

    const topSpendingCategory = Object.entries(categoryExpenses)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topSpendingAmt = Object.entries(categoryExpenses)
      .sort((a, b) => b[1] - a[1])[0]?.[1] || 0;

    // Group expenses by date keys to check regression trend (skip empty dates)
    const dailyExpenses: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.date)
      .forEach(t => {
        dailyExpenses[t.date] = (dailyExpenses[t.date] || 0) + t.amount;
      });

    const sortedDates = Object.entries(dailyExpenses)
      .sort((a, b) => a[0].localeCompare(b[0]));

    let trendMsg = 'Flat spending trajectory.';
    let projectedExpenseMsg = '';
    if (sortedDates.length >= 2) {
      const xValues = sortedDates.map((_, idx) => idx);
      const yValues = sortedDates.map(d => d[1]);

      // Calculate slope (linear regression)
      const n = xValues.length;
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, idx) => sum + x * yValues[idx], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
      
      if (slope > 1.5) {
        trendMsg = `Upward spending trajectory (+₹${slope.toFixed(2)} average daily increase). Your spending is rising.`;
      } else if (slope < -1.5) {
        trendMsg = `Downward spending trajectory (-₹${Math.abs(slope).toFixed(2)} average daily decrease). Great budget restraint!`;
      } else {
        trendMsg = 'Stable spending trajectory.';
      }

      // Project next week's average daily expense
      const projectedNextDay = slope * n + (sumY / n);
      projectedExpenseMsg = `Based on linear trend, your projected next-day expense is **₹${Math.max(0, projectedNextDay).toFixed(2)}**.`;
    }

    // Budget Warnings
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
    let warningAlert = '';
    if (expenseRatio > 85) {
      warningAlert = `⚠️ **CRITICAL WARNING**: Expenses represent **${expenseRatio.toFixed(1)}%** of your total monthly income. You are very close to exceeding your cash inflows.`;
    } else if (expenseRatio > 70) {
      warningAlert = `⚠️ **BUDGET NOTICE**: Expenses represent **${expenseRatio.toFixed(1)}%** of your income. Consider limiting non-essential category spending.`;
    } else {
      warningAlert = `✅ **HEALTHY SAVINGS RATE**: Savings represent **${(100 - expenseRatio).toFixed(1)}%** of your income. Excellent cash flow management!`;
    }

    const reportContent = `# Financial Diagnostics Report
Generated on ${new Date().toLocaleDateString()}

## 📊 Summary of Balances
* **Total Recorded Income**: ₹${totalIncome.toFixed(2)}
* **Total Recorded Expenses**: ₹${totalExpense.toFixed(2)}
* **Net Monthly Savings**: ₹${netSavings.toFixed(2)}

## 🚨 Budget Health & Validation
${warningAlert}

## 🔍 Key Spend Categories
* **Top Spending Category**: **${topSpendingCategory}** (₹${topSpendingAmt.toFixed(2)})
* Spend represent **${totalExpense > 0 ? Math.round((topSpendingAmt / totalExpense) * 100) : 0}%** of total monthly expenses.

## 📈 Spend Trajectory Forecast (Regression)
* **Spend Slope Trend**: ${trendMsg}
* ${projectedExpenseMsg}

## 💡 Financial Advisor Recommendations
1. **Reduce spending on ${topSpendingCategory}**: Since this is your highest cost center, trimming even 10% here will yield savings of **₹${(topSpendingAmt * 0.1).toFixed(2)}** immediately.
2. **Build an Emergency Fund**: Set aside at least ₹2,000 per month of your **₹${netSavings.toFixed(2)}** net balance into a high-yield savings account.
3. **Automate Savings**: Configure automated transfers to savings right after your income is credited.
`;

    setAiReport(reportContent);
    commitSave(transactions, reportContent);
    return reportContent;
  };

  // Financial Diagnostics & AI Regression Report Generator
  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);

    if (transactions.length === 0) {
      setError('Please log some transactions first to analyze.');
      setLoading(false);
      return;
    }

    const apiKey = localStorage.getItem('aura_gemini_api_key') || '';
    const apiUrl = localStorage.getItem('aura_api_url') || '';
    const apiModel = localStorage.getItem('aura_api_model') || '';

    try {
      if (apiKey.trim() !== '' || !apiUrl) {
        const prompt = `You are strata AI. Analyze my expense data and output a short, precise financial diagnostics report in markdown.
Avoid long paragraphs. Use clear bullet points and make the insights immediately actionable and brief.

Current financial transaction data JSON:
${JSON.stringify({ transactions }, null, 2)}

Ensure your output is structured in Markdown with these exact sections:
# Financial Diagnostics Report
Generated on ${new Date().toLocaleDateString()}

## 📊 Summary of Balances
* **Total Recorded Income**: ₹${totalIncome.toFixed(2)}
* **Total Recorded Expenses**: ₹${totalExpense.toFixed(2)}
* **Net Monthly Savings**: ₹${netSavings.toFixed(2)}

## 🚨 Budget Health & Validation
Provide a brief, direct assessment of budget health based on income vs expenses.

## 🔍 Key Spend Categories
Highlight top spending categories, their percentage share of expenses, and any outliers in 1-2 sentences or bullet points.

## 📈 Spend Trajectory Forecast (Regression)
Provide a short projection of future expenses based on daily trends.

## 💡 Financial Advisor Recommendations
List at least 3 short, actionable recommendations to save money or optimize cash flow based on my spending patterns.`;

        const config: AIConfig = {
          apiKey,
          apiUrl,
          apiModel
        };

        const aiOutput = await generateText({
          config,
          prompt,
          systemInstruction: "You are a professional financial data analyst. Output a short, precise, clear, and actionable markdown diagnostics report analyzing transaction patterns and spending trends."
        });

        setAiReport(aiOutput);
        commitSave(transactions, aiOutput);
      } else {
        // Fallback to local diagnostics
        generateLocalReport();
      }
    } catch (e: any) {
      console.error(e);
      // Fallback on error
      const localOutput = generateLocalReport();
      setAiReport(`${localOutput}\n\n*Note: AI generation failed (${e.message}). Reverted to local calculations.*`);
      commitSave(transactions, `${localOutput}\n\n*Note: AI generation failed (${e.message}). Reverted to local calculations.*`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#FAF9F6] dark:bg-[#1C1C1E] text-charcoal dark:text-white relative overflow-hidden">
      
      {/* ── Subheader Tabs ── */}
      <div className="px-8 py-3 bg-white dark:bg-[#1C1C1E] border-b border-charcoal/10 dark:border-white/5 flex items-center justify-between shrink-0 select-none flex-wrap gap-2">
        <div className="flex gap-1">
          {[
            { id: 'dashboard', label: 'Financial Dashboard', icon: TrendingUp },
            { id: 'transactions', label: 'Transactions Log', icon: DollarSign },
            { id: 'report', label: 'AI Advisor Report', icon: Sparkles },
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

        {/* Generate Diagnostics button */}
        {activeTab !== 'report' && (
          <button
            onClick={() => {
              setActiveTab('report');
              runDiagnostics();
            }}
            disabled={loading}
            className="px-3.5 py-1.5 bg-charcoal text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 text-xs font-sans font-bold transition-all rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Brain className="w-3.5 h-3.5" />
            {loading ? 'Analyzing...' : 'Analyze Expenses'}
          </button>
        )}
      </div>

      {/* ── Tab Views Container ── */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <AnimatePresence mode="wait">
          
          {/* Tab 1: Financial Dashboard */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              {/* Aggregates Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                
                {/* Income card */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/75 dark:bg-[#1E1E20]/80 border border-charcoal/10 dark:border-white/5 rounded-2xl p-5 shadow-lg shadow-emerald-500/5 backdrop-blur-md flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/25">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider">Total Income</h5>
                    <p className="text-2xl font-serif font-bold text-charcoal dark:text-white mt-1">₹{totalIncome.toFixed(2)}</p>
                  </div>
                </motion.div>

                {/* Expense card */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/75 dark:bg-[#1E1E20]/80 border border-charcoal/10 dark:border-white/5 rounded-2xl p-5 shadow-lg shadow-red-500/5 backdrop-blur-md flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-red-500/25">
                    <ArrowDownRight className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider">Total Expenses</h5>
                    <p className="text-2xl font-serif font-bold text-charcoal dark:text-white mt-1">₹{totalExpense.toFixed(2)}</p>
                  </div>
                </motion.div>

                {/* Daily Spend card */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/75 dark:bg-[#1E1E20]/80 border border-charcoal/10 dark:border-white/5 rounded-2xl p-5 shadow-lg shadow-amber-500/5 backdrop-blur-md flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-amber-500/25">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider">Daily Spend</h5>
                    <p className="text-2xl font-serif font-bold text-charcoal dark:text-white mt-1">₹{todaySpend.toFixed(2)}</p>
                    <span className="text-[10px] text-charcoalMuted dark:text-gray-400">Avg: ₹{averageDailySpend.toFixed(2)}/day</span>
                  </div>
                </motion.div>

                {/* Net Savings Card */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white/75 dark:bg-[#1E1E20]/80 border border-charcoal/10 dark:border-white/5 rounded-2xl p-5 shadow-lg backdrop-blur-md flex items-center gap-4 relative overflow-hidden ${
                    netSavings >= 0 ? 'shadow-blue-500/5' : 'shadow-red-500/5'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none ${
                    netSavings >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10'
                  }`} />
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
                    netSavings >= 0 
                      ? 'bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-blue-500/25' 
                      : 'bg-gradient-to-tr from-red-500 to-rose-400 shadow-red-500/25'
                  }`}>
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase tracking-wider">Net Savings</h5>
                    <p className={`text-2xl font-serif font-bold mt-1 ${
                      netSavings >= 0 ? 'text-charcoal dark:text-white' : 'text-red-500'
                    }`}>
                      {netSavings >= 0 ? '' : '-'}₹{Math.abs(netSavings).toFixed(2)}
                    </p>
                  </div>
                </motion.div>

              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Category Breakdown Pie Chart */}
                <div className="bg-white dark:bg-[#1E1E20] border border-charcoal/10 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                  <h4 className="font-serif font-bold text-sm text-charcoal dark:text-white w-full border-b border-charcoal/10 dark:border-white/5 pb-2.5 mb-4 flex items-center gap-1.5">
                    <PieChart className="w-4 h-4 text-warmAmber" /> Expense Distributions
                  </h4>
                  {renderCategoryPieChart()}
                </div>

                {/* Monthly Trend Bar Chart */}
                <div className="bg-white dark:bg-[#1E1E20] border border-charcoal/10 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                  <h4 className="font-serif font-bold text-sm text-charcoal dark:text-white w-full border-b border-charcoal/10 dark:border-white/5 pb-2.5 mb-4 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-warmAmber" /> Recent Expense Trends
                  </h4>
                  {renderMonthlyTrendChart()}
                </div>

              </div>

            </motion.div>
          )}

          {/* Tab 2: Transactions Log */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            >
              
              {/* Left Column: Quick Add Transaction Form Card */}
              <div className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl p-6 shadow-sm flex flex-col h-fit">
                <h4 className="font-serif font-bold text-sm text-charcoal dark:text-white mb-4 pb-2 border-b border-charcoal/10 dark:border-white/5 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-warmAmber" /> Quick Add
                </h4>
                
                <div className="space-y-4">
                  
                  {/* Transaction Type Selector (Sliding switch) */}
                  <div>
                    <label className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase block mb-1.5">Transaction Type</label>
                    <div className="flex rounded-xl bg-charcoal/5 dark:bg-white/5 p-1 border border-charcoal/10 dark:border-white/10 h-10 w-full select-none">
                      <button
                        onClick={() => setNewType('expense')}
                        className={`flex-1 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          newType === 'expense' 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" /> Expense
                      </button>
                      <button
                        onClick={() => setNewType('income')}
                        className={`flex-1 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          newType === 'income' 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Income
                      </button>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase block mb-1.5">Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-charcoalMuted dark:text-gray-500">₹</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-charcoal/15 dark:border-white/10 rounded-xl bg-transparent text-sm text-charcoal dark:text-white outline-none focus:ring-2 focus:ring-warmAmber/20 focus:border-warmAmber transition-all placeholder:text-neutral-400"
                      />
                    </div>
                  </div>

                  {/* Category Selector with Emojis */}
                  <div>
                    <div className="flex items-center justify-between mb-2 select-none">
                      <label className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase">Category</label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          showCategoryManager 
                            ? 'bg-warmAmber text-white border-warmAmber' 
                            : 'bg-charcoal/5 dark:bg-white/5 border-charcoal/15 dark:border-white/10 text-charcoal dark:text-white hover:bg-warmAmber hover:text-white hover:border-warmAmber'
                        }`}
                        title={showCategoryManager ? "Back to Selection" : "Add/Manage Categories"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    {showCategoryManager ? (
                      <div className="space-y-2.5 p-3 bg-charcoal/5 dark:bg-white/5 border border-charcoal/10 dark:border-white/10 rounded-xl mb-3 select-none">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="New category..."
                            value={newCatInput}
                            onChange={e => setNewCatInput(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 border border-charcoal/15 dark:border-white/10 rounded-lg bg-transparent text-xs text-charcoal dark:text-white outline-none focus:border-warmAmber"
                          />
                          <button
                            type="button"
                            onClick={addCustomCategory}
                            className="px-2.5 py-1.5 bg-charcoal text-white dark:bg-white dark:text-black rounded-lg text-[10px] font-bold font-sans cursor-pointer hover:opacity-95"
                          >
                            Add
                          </button>
                        </div>
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                          {customCategories.map((c, idx) => {
                            const isEditing = editingCatIndex === idx;
                            return (
                              <div key={idx} className="flex items-center justify-between gap-1.5 py-1 border-b border-charcoal/5 dark:border-white/5 last:border-0">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingCatValue}
                                    onChange={e => setEditingCatValue(e.target.value)}
                                    className="flex-1 px-1.5 py-0.5 border border-charcoal/15 dark:border-white/10 rounded bg-transparent text-xs text-charcoal dark:text-white font-semibold outline-none focus:border-warmAmber"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="text-xs text-charcoal dark:text-gray-300 font-semibold">{c}</span>
                                )}
                                <div className="flex items-center gap-1.5 select-none font-bold text-[10px]">
                                  {isEditing ? (
                                    <>
                                      <button type="button" onClick={() => saveEditCategory(idx)} className="text-emerald-500 hover:opacity-85">Save</button>
                                      <button type="button" onClick={() => setEditingCatIndex(null)} className="text-charcoalMuted">Cancel</button>
                                    </>
                                  ) : (
                                    <>
                                      <button type="button" onClick={() => startEditCategory(idx, c)} className="text-warmAmber hover:opacity-85">Rename</button>
                                      <button type="button" onClick={() => deleteCustomCategory(c)} className="text-red-500 hover:opacity-85">Delete</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 select-none no-scrollbar mb-3">
                        {customCategories.map(c => {
                          let emoji = '🏷️';
                          if (c === 'Salary') emoji = '💼';
                          else if (c === 'Rent') emoji = '🏠';
                          else if (c === 'Food') emoji = '🍔';
                          else if (c === 'Entertainment') emoji = '🎭';
                          
                          const isSelected = newCategory === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewCategory(c)}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-charcoal text-white border-charcoal dark:bg-white dark:text-black dark:border-white shadow-md'
                                  : 'bg-transparent border-charcoal/10 dark:border-white/5 text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span className="text-base">{emoji}</span>
                              <span className="truncate max-w-[90px] text-[10px]">{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase block mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-warmAmber" /> Date Option
                    </label>
                    <div className="flex rounded-xl bg-charcoal/5 dark:bg-white/5 p-1 border border-charcoal/10 dark:border-white/10 h-10 w-full select-none mb-2">
                      {[
                        { id: 'exact', label: 'Exact Date' },
                        { id: 'month', label: 'Month Only' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDateMode(opt.id as any)}
                          className={`flex-1 rounded-lg text-[10px] font-sans font-bold transition-all cursor-pointer flex items-center justify-center ${
                            dateMode === opt.id 
                              ? 'bg-charcoal text-white dark:bg-white dark:text-black shadow-sm' 
                              : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {dateMode === 'exact' && (
                      <input
                        type="date"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="w-full px-3 py-2 border border-charcoal/15 dark:border-white/10 rounded-xl bg-transparent text-sm text-charcoal dark:text-white outline-none focus:ring-2 focus:ring-warmAmber/20 focus:border-warmAmber transition-all cursor-pointer"
                      />
                    )}
                    {dateMode === 'month' && (
                      <input
                        type="month"
                        value={newMonth}
                        onChange={e => setNewMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-charcoal/15 dark:border-white/10 rounded-xl bg-transparent text-sm text-charcoal dark:text-white outline-none focus:ring-2 focus:ring-warmAmber/20 focus:border-warmAmber transition-all cursor-pointer"
                      />
                    )}
                  </div>

                  {/* Save button */}
                  <button
                    onClick={addTransaction}
                    className="w-full py-2.5 bg-charcoal hover:bg-[#2A2A2A] dark:bg-white dark:text-black dark:hover:bg-white/90 text-white rounded-xl text-xs font-sans font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Save Transaction
                  </button>

                </div>
              </div>

              {/* Right Column: Filters & Table Grid logs */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Filters card bar */}
                <div className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap select-none text-xs">
                  <h5 className="font-serif font-bold text-sm text-charcoal dark:text-white">Transaction Logs</h5>
                  
                  <div className="flex items-center gap-3.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase">Type:</span>
                      <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                        className="p-1.5 border border-charcoal/15 dark:border-white/10 rounded-lg bg-transparent text-xs text-charcoal dark:text-white outline-none focus:border-warmAmber cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        <option value="expense">Expenses</option>
                        <option value="income">Income</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-sans font-bold text-charcoalMuted dark:text-gray-500 uppercase">Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="p-1.5 border border-charcoal/15 dark:border-white/10 rounded-lg bg-transparent text-xs text-charcoal dark:text-white outline-none focus:border-warmAmber cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Logs Table Grid */}
                <div className="bg-white dark:bg-[#1C1C1E] border border-charcoal/10 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs font-sans">
                      <thead>
                        <tr className="bg-charcoal/5 dark:bg-white/3 border-b border-charcoal/10 dark:border-white/5">
                          <th className="p-3 font-bold text-charcoalMuted dark:text-gray-400 w-28">Date</th>
                          <th className="p-3 font-bold text-charcoalMuted dark:text-gray-400">Category</th>
                          <th className="p-3 font-bold text-charcoalMuted dark:text-gray-400 text-right w-24">Amount</th>
                          <th className="p-3 font-bold text-charcoalMuted dark:text-gray-400 text-center w-20">Type</th>
                          <th className="p-3 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/5 dark:divide-white/5">
                        {filteredTxs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-charcoalMuted dark:text-gray-500">
                              No transactions match the selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredTxs.map(t => {
                            const isEditing = editingId === t.id;

                            return (
                              <tr key={t.id} className="hover:bg-charcoal/3 dark:hover:bg-white/2 align-middle">
                                
                                {/* Date cell */}
                                <td className="p-3">
                                  {isEditing ? (
                                    <input
                                      type={editDate.length === 7 ? "month" : "date"}
                                      value={editDate}
                                      onChange={e => setEditDate(e.target.value)}
                                      className="w-full p-1 border border-charcoal/15 dark:border-white/10 rounded bg-transparent text-xs text-charcoal dark:text-white"
                                    />
                                  ) : (
                                    <span className="text-charcoal dark:text-white">
                                      {t.date ? (t.date.length === 7 ? formatMonthLabel(t.date) : t.date) : '—'}
                                    </span>
                                  )}
                                </td>

                                {/* Category cell */}
                                <td className="p-3">
                                  {isEditing ? (
                                    <select
                                      value={editCategory}
                                      onChange={e => setEditCategory(e.target.value)}
                                      className="w-full p-1 border border-charcoal/15 dark:border-white/10 rounded bg-white dark:bg-[#252525] text-xs text-charcoal dark:text-white"
                                    >
                                      {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full border border-charcoal/10 dark:border-white/10 text-[9px] font-sans font-semibold text-charcoalMuted dark:text-gray-400 bg-charcoal/5 dark:bg-white/5">
                                      {t.category}
                                    </span>
                                  )}
                                </td>

                                {/* Amount cell */}
                                <td className="p-3 text-right font-bold text-charcoal dark:text-white">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editAmount}
                                      onChange={e => setEditAmount(e.target.value)}
                                      className="w-full p-1 border border-charcoal/15 dark:border-white/10 rounded bg-transparent text-xs text-charcoal dark:text-white text-right font-bold"
                                    />
                                  ) : (
                                    <span>₹{t.amount.toFixed(2)}</span>
                                  )}
                                </td>

                                {/* Type cell */}
                                <td className="p-3 text-center">
                                  {isEditing ? (
                                    <select
                                      value={editType}
                                      onChange={e => setEditType(e.target.value as any)}
                                      className="p-1 border border-charcoal/15 dark:border-white/10 rounded bg-white dark:bg-[#252525] text-[10px] font-bold"
                                    >
                                      <option value="expense">Expense</option>
                                      <option value="income">Income</option>
                                    </select>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                                      t.type === 'income' 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                      {t.type === 'income' ? 'Income' : 'Expense'}
                                    </span>
                                  )}
                                </td>

                                {/* Actions cell */}
                                <td className="p-3 text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    {isEditing ? (
                                      <>
                                        <button
                                          onClick={() => saveInlineEdit(t.id)}
                                          className="p-1 hover:bg-emerald-500/15 text-emerald-500 transition-all rounded cursor-pointer"
                                          title="Save Edits"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => setEditingId(null)}
                                          className="p-1 hover:bg-red-500/15 text-red-500 transition-all rounded cursor-pointer"
                                          title="Cancel Edits"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startInlineEdit(t)}
                                          className="p-1 hover:bg-charcoal/5 dark:hover:bg-white/5 text-charcoalMuted hover:text-charcoal dark:hover:text-white transition-all rounded cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => deleteTransaction(t.id)}
                                          className="p-1 hover:bg-red-500/10 text-red-500 transition-all rounded cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>

                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* Tab 3: AI Advisor Diagnostic Report */}
          {activeTab === 'report' && (
            <motion.div
              key="report-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-2xl mx-auto select-text pb-16"
            >
              <div className="bg-white dark:bg-[#1E1E20] border border-charcoal/10 dark:border-white/5 rounded-2xl p-8 shadow-sm flex flex-col relative z-10">
                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 font-semibold rounded-xl text-xs flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}
                {aiReport ? (
                  <div className="prose dark:prose-invert max-w-none text-xs font-sans leading-relaxed text-charcoal dark:text-white">
                    {/* Render report items custom format */}
                    {aiReport.split('\n').map((line, idx) => {
                      if (line.startsWith('# ')) {
                        return <h2 key={idx} className="font-serif font-bold text-xl border-b border-charcoal/10 dark:border-white/5 pb-2 mt-4 mb-3 text-charcoal dark:text-white">{line.slice(2)}</h2>;
                      }
                      if (line.startsWith('## ')) {
                        return <h3 key={idx} className="font-serif font-bold text-sm mt-5 mb-2 text-warmAmber">{line.slice(3)}</h3>;
                      }
                      if (line.startsWith('* ') || line.startsWith('- ')) {
                        return <li key={idx} className="ml-4 list-disc my-1">{line.slice(2)}</li>;
                      }
                      if (line.startsWith('⚠️')) {
                        return (
                          <div key={idx} className="p-3.5 my-3 bg-red-500/10 border border-red-500/20 text-red-500 font-semibold rounded-xl text-[11px] leading-normal">
                            {line}
                          </div>
                        );
                      }
                      if (line.startsWith('✅')) {
                        return (
                          <div key={idx} className="p-3.5 my-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl text-[11px] leading-normal">
                            {line}
                          </div>
                        );
                      }
                      if (line.trim() === '') return <div key={idx} className="h-2" />;
                      return <p key={idx} className="my-1.5">{line}</p>;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 flex flex-col items-center justify-center select-none">
                    <div className="w-16 h-16 rounded-full bg-warmAmber/10 flex items-center justify-center mb-5">
                      <Sparkles className="w-8 h-8 text-warmAmber" />
                    </div>
                    <h4 className="font-serif font-bold text-base text-charcoal dark:text-white mb-2">No Financial Report Generated Yet</h4>
                    <p className="text-xs font-sans text-charcoalMuted dark:text-gray-500 max-w-sm mb-6 leading-relaxed">
                      Click the "Run Diagnostics" button in the toolbar to run regression models on your balances, analyze key budget categories, and generate recommendations.
                    </p>
                    <button
                      onClick={runDiagnostics}
                      className="px-5 py-2.5 bg-charcoal hover:bg-[#2A2A2A] dark:bg-white dark:text-black text-white font-sans font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Brain className="w-4 h-4" /> Run Financial Diagnostics
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
