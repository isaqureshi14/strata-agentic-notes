import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Note } from '../types';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Plus, Copy, Clipboard, ChevronDown, BarChart2, PieChart, Sparkles } from 'lucide-react';
import { generateText } from '../utils/aiService';

const PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

interface CellInfo {
  value: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  bgColor?: string;
  fontSize?: string;
  fontFamily?: string;
}

interface SpreadsheetData {
  data: Record<string, CellInfo>;
  rowCount: number;
  colCount: number;
  colWidths?: Record<number, number>;
}

interface SpreadsheetEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  darkMode: boolean;
  aiConfig: any;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const colToNumber = (col: string): number => {
  let num = 0;
  for (let i = 0; i < col.length; i++) num = num * 26 + (col.charCodeAt(i) - 64);
  return num;
};

export const numberToCol = (num: number): string => {
  let col = '';
  while (num > 0) {
    let rem = num % 26;
    if (rem === 0) { rem = 26; num = Math.floor(num / 26) - 1; }
    else num = Math.floor(num / 26);
    col = String.fromCharCode(rem + 64) + col;
  }
  return col;
};

const parseCellId = (id: string) => {
  const col = id.match(/[A-Z]+/)?.[0] || 'A';
  const row = parseInt(id.match(/\d+/)?.[0] || '1', 10);
  return { col, row, colNum: colToNumber(col) };
};

const getCellsInRange = (range: string): string[] => {
  const [start, end] = range.split(':');
  if (!start || !end) return [start];
  const s = parseCellId(start), e = parseCellId(end);
  const cells: string[] = [];
  for (let r = Math.min(s.row, e.row); r <= Math.max(s.row, e.row); r++)
    for (let c = Math.min(s.colNum, e.colNum); c <= Math.max(s.colNum, e.colNum); c++)
      cells.push(`${numberToCol(c)}${r}`);
  return cells;
};

export const evaluateFormula = (
  formula: string,
  cellData: Record<string, CellInfo>,
  visited: Set<string> = new Set()
): string => {
  if (!formula.startsWith('=')) return formula;
  try {
    const expr = formula.substring(1).toUpperCase().trim();
    const evalRange = (inner: string) => {
      const cells = getCellsInRange(inner);
      return cells.map(c => {
        if (visited.has(c)) return 0;
        const newVisited = new Set(visited);
        newVisited.add(c);
        const v = cellData[c]?.value || '0';
        return parseFloat(v.startsWith('=') ? evaluateFormula(v, cellData, newVisited) : v) || 0;
      });
    };
    if (expr.startsWith('SUM(') && expr.endsWith(')'))
      return evalRange(expr.slice(4, -1)).reduce((a, b) => a + b, 0).toString();
    if (expr.startsWith('AVERAGE(') && expr.endsWith(')')) {
      const nums = evalRange(expr.slice(8, -1)).filter(n => !isNaN(n));
      return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '0';
    }
    if (expr.startsWith('MAX(') && expr.endsWith(')'))
      return Math.max(...evalRange(expr.slice(4, -1))).toString();
    if (expr.startsWith('MIN(') && expr.endsWith(')'))
      return Math.min(...evalRange(expr.slice(4, -1))).toString();
    if (expr.startsWith('COUNT(') && expr.endsWith(')'))
      return evalRange(expr.slice(6, -1)).filter(n => !isNaN(n)).length.toString();
    let e2 = expr.replace(/[A-Z]+\d+/g, ref => {
      if (visited.has(ref)) return '0';
      const cell = cellData[ref];
      if (!cell) return '0';
      const newVisited = new Set(visited);
      newVisited.add(ref);
      return cell.value?.startsWith('=') ? evaluateFormula(cell.value, cellData, newVisited) : cell.value || '0';
    });
    e2 = e2.replace(/[^0-9+\-*/().\s]/g, '');
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${e2})`)();
    return result !== undefined ? result.toString() : '';
  } catch {
    return '#ERR!';
  }
};

export const exportToExcel = (cellData: Record<string, CellInfo>, rowCount: number, colCount: number, filename: string) => {
  let xml = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:shapes-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n <Worksheet ss:Name="Notes Sheet">\n  <Table>`;
  for (let r = 1; r <= rowCount; r++) {
    xml += '\n   <Row>';
    for (let c = 1; c <= colCount; c++) {
      const id = `${numberToCol(c)}${r}`, cell = cellData[id], val = cell?.value || '';
      if (val.startsWith('=')) {
        const ev = evaluateFormula(val, cellData);
        xml += `\n    <Cell><Data ss:Type="${isNaN(+ev) ? 'String' : 'Number'}">${ev}</Data></Cell>`;
      } else {
        xml += `\n    <Cell><Data ss:Type="${isNaN(+val) || val === '' ? 'String' : 'Number'}">${val}</Data></Cell>`;
      }
    }
    xml += '\n   </Row>';
  }
  xml += '\n  </Table>\n </Worksheet>\n</Workbook>';
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ── Component ─────────────────────────────────────────────────────────────────

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ note, onUpdateNote, darkMode, aiConfig }) => {
  const parsed: SpreadsheetData = (() => {
    try { return JSON.parse(note.content) as SpreadsheetData; }
    catch { return { data: {}, rowCount: 30, colCount: 10 }; }
  })();

  const [cellData, setCellData] = useState<Record<string, CellInfo>>(parsed.data || {});
  const [rowCount, setRowCount] = useState(parsed.rowCount || 30);
  const [colCount, setColCount] = useState(parsed.colCount || 10);
  const [colWidths, setColWidths] = useState<Record<number, number>>(parsed.colWidths || {});

  // AI Spreadsheet States
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenError, setAiGenError] = useState<string | null>(null);

  // Selection
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ anchor: string; focus: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<number>>(new Set());
  const [allSelected, setAllSelected] = useState(false);

  // Unused dragging selection states commented out to resolve TS6133 errors
  // const [isDraggingRange, setIsDraggingRange] = useState(false);
  // const [dragAnchorCell, setDragAnchorCell] = useState<string | null>(null);

  // Editing
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [formulaInput, setFormulaInput] = useState('');

  // UI
  const [showCharts, setShowCharts] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'cell' | 'row' | 'col'; target: string | number } | null>(null);
  const [clipboard, setClipboard] = useState<{ cells: Record<string, CellInfo>; rows: number; cols: number } | null>(null);

  // Column resize
  const resizingCol = useRef<{ colNum: number; startX: number; startWidth: number } | null>(null);

  const inlineInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Sync and Persistence ────────────────────────────────────────────────────

  // Keep track of the last content string we successfully saved/committed to the parent
  const lastSavedContentRef = useRef(note.content);
  // Keep track of the current note ID to detect switches
  const prevNoteIdRef = useRef(note.id);

  // Keep a ref of the current state for the debounced saver to read the latest values
  const stateRef = useRef({ cellData, rowCount, colCount, colWidths });
  useEffect(() => {
    stateRef.current = { cellData, rowCount, colCount, colWidths };
  }, [cellData, rowCount, colCount, colWidths]);

  // Global mouseup handler commented out since dragging selection is unused
  /*
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingRange(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);
  */

  // Debounced save to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      const { cellData: cData, rowCount: rCount, colCount: cCount, colWidths: cWidths } = stateRef.current;
      try {
        const parsedData = JSON.parse(note.content) as SpreadsheetData;
        const propSerialized = JSON.stringify({ 
          data: parsedData.data || {}, 
          rowCount: parsedData.rowCount || 30, 
          colCount: parsedData.colCount || 10, 
          colWidths: parsedData.colWidths || {} 
        });
        const currentSerialized = JSON.stringify({ data: cData, rowCount: rCount, colCount: cCount, colWidths: cWidths });
        
        if (currentSerialized !== propSerialized) {
          const newContent = JSON.stringify({ data: cData, rowCount: rCount, colCount: cCount, colWidths: cWidths });
          lastSavedContentRef.current = newContent;
          onUpdateNote({
            ...note,
            content: newContent,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // ignore
      }
    }, 450); // 450ms debounce
    return () => clearTimeout(timer);
  }, [cellData, rowCount, colCount, colWidths, note, onUpdateNote]);

  // Sync local state when note changes externally (switching notes / undo / redo)
  useEffect(() => {
    const isNoteSwitch = prevNoteIdRef.current !== note.id;
    prevNoteIdRef.current = note.id;

    const isExternalChange = note.content !== lastSavedContentRef.current;

    if (isNoteSwitch || isExternalChange) {
      try {
        const parsedData = JSON.parse(note.content) as SpreadsheetData;
        setCellData(parsedData.data || {});
        setRowCount(parsedData.rowCount || 30);
        setColCount(parsedData.colCount || 10);
        setColWidths(parsedData.colWidths || {});
        lastSavedContentRef.current = note.content;

        if (isNoteSwitch) {
          setSelectedCell(null);
          setSelectionRange(null);
          setEditingCell(null);
          setFormulaInput('');
        }
      } catch {
        // ignore
      }
    }
  }, [note.content, note.id]);

  const saveState = useCallback((
    data: Record<string, CellInfo>, rows: number, cols: number, widths: Record<number, number>,
    instant = false
  ) => {
    setCellData(data);
    setRowCount(rows);
    setColCount(cols);
    setColWidths(widths);

    if (instant) {
      const newContent = JSON.stringify({ data, rowCount: rows, colCount: cols, colWidths: widths });
      lastSavedContentRef.current = newContent;
      onUpdateNote({
        ...note,
        content: newContent,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [note, onUpdateNote]);

  // ── Computed selection set ─────────────────────────────────────────────────

  const getSelectedCells = useCallback((): Set<string> => {
    if (allSelected) {
      const s = new Set<string>();
      for (let r = 1; r <= rowCount; r++)
        for (let c = 1; c <= colCount; c++) s.add(`${numberToCol(c)}${r}`);
      return s;
    }
    if (selectedRows.size > 0) {
      const s = new Set<string>();
      selectedRows.forEach(r => {
        for (let c = 1; c <= colCount; c++) s.add(`${numberToCol(c)}${r}`);
      });
      return s;
    }
    if (selectedCols.size > 0) {
      const s = new Set<string>();
      selectedCols.forEach(cn => {
        for (let r = 1; r <= rowCount; r++) s.add(`${numberToCol(cn)}${r}`);
      });
      return s;
    }
    if (selectionRange) {
      return new Set(getCellsInRange(`${selectionRange.anchor}:${selectionRange.focus}`));
    }
    if (selectedCell) return new Set([selectedCell]);
    return new Set();
  }, [allSelected, selectedRows, selectedCols, selectionRange, selectedCell, rowCount, colCount]);

  const selectedCells = getSelectedCells();

  // ── Cell handlers ──────────────────────────────────────────────────────────

  const clearMultiSelection = () => {
    setSelectedRows(new Set()); setSelectedCols(new Set()); setAllSelected(false); setSelectionRange(null);
  };

  const handleCellClick = (cellId: string, e: React.MouseEvent) => {
    e.preventDefault();
    clearMultiSelection();
    if (e.shiftKey && selectedCell) {
      setSelectionRange({ anchor: selectedCell, focus: cellId });
    } else {
      setSelectedCell(cellId);
      setSelectionRange(null);
    }
    setFormulaInput(cellData[cellId]?.value || '');
    setEditingCell(null);
  };

  // Unused drag-selection handlers commented out to resolve TS6133 compilation errors.
  /*
  const handleCellMouseDown = (cellId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drag
    setIsDraggingRange(true);
    setDragAnchorCell(cellId);
    setSelectedCell(cellId);
    setSelectionRange({ anchor: cellId, focus: cellId });
    setFormulaInput(cellData[cellId]?.value || '');
    setEditingCell(null);
    setSelectedRows(new Set());
    setSelectedCols(new Set());
    setAllSelected(false);
  };

  const handleCellMouseEnter = (cellId: string) => {
    if (isDraggingRange && dragAnchorCell) {
      setSelectionRange({ anchor: dragAnchorCell, focus: cellId });
    }
  };
  */

  const handleCellDoubleClick = (cellId: string) => {
    clearMultiSelection();
    setSelectedCell(cellId);
    setEditingCell(cellId);
    setFormulaInput(cellData[cellId]?.value || '');
  };

  const handleCellChange = (cellId: string, val: string) => {
    const updated = { ...cellData, [cellId]: { ...(cellData[cellId] || {}), value: val } };
    setCellData(updated);
    saveState(updated, rowCount, colCount, colWidths);
  };

  const applyFormulaOperator = (operator: string) => {
    if (!selectedCell) return;
    
    // Parse selected cell column letter and row number (e.g. "B5")
    const match = selectedCell.match(/^([A-Z]+)([0-9]+)$/);
    if (!match) return;
    
    const colLetter = match[1];
    const rowNum = parseInt(match[2], 10);
    
    // Determine the range above this cell
    let startRow = 1;
    let endRow = rowNum - 1;
    
    if (endRow < 1) {
      startRow = rowNum + 1;
      endRow = rowNum + 4;
    }
    
    const formula = `=${operator}(${colLetter}${startRow}:${colLetter}${endRow})`;
    
    setFormulaInput(formula);
    handleCellChange(selectedCell, formula);
  };

  // ── Row / Col header selection ─────────────────────────────────────────────

  const handleRowHeaderClick = (rowNum: number, e: React.MouseEvent) => {
    setEditingCell(null); setSelectedCell(null); setSelectionRange(null); setSelectedCols(new Set()); setAllSelected(false);
    if (e.shiftKey) {
      setSelectedRows(prev => { const n = new Set(prev); n.has(rowNum) ? n.delete(rowNum) : n.add(rowNum); return n; });
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRows(prev => { const n = new Set(prev); n.has(rowNum) ? n.delete(rowNum) : n.add(rowNum); return n; });
    } else {
      setSelectedRows(new Set([rowNum]));
    }
    setFormulaInput('');
  };

  const handleColHeaderClick = (colNum: number, e: React.MouseEvent) => {
    setEditingCell(null); setSelectedCell(null); setSelectionRange(null); setSelectedRows(new Set()); setAllSelected(false);
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedCols(prev => { const n = new Set(prev); n.has(colNum) ? n.delete(colNum) : n.add(colNum); return n; });
    } else {
      setSelectedCols(new Set([colNum]));
    }
    setFormulaInput('');
  };

  const handleSelectAll = () => {
    setAllSelected(true); setSelectedRows(new Set()); setSelectedCols(new Set());
    setSelectedCell(null); setSelectionRange(null); setEditingCell(null);
  };

  // ── Formatting (applies to all selected cells) ─────────────────────────────

  const applyToSelection = (patch: Partial<CellInfo>) => {
    const targets = selectedCells.size > 0 ? selectedCells : selectedCell ? new Set([selectedCell]) : new Set<string>();
    if (targets.size === 0) return;
    const updated = { ...cellData };
    targets.forEach(id => { updated[id] = { ...(updated[id] || { value: '' }), ...patch }; });
    setCellData(updated);
    saveState(updated, rowCount, colCount, colWidths, true);
  };

  const toggleBold   = () => applyToSelection({ bold:   !(selectedCell && cellData[selectedCell]?.bold) });
  const toggleItalic = () => applyToSelection({ italic: !(selectedCell && cellData[selectedCell]?.italic) });
  const toggleUnderline = () => applyToSelection({ underline: !(selectedCell && cellData[selectedCell]?.underline) });
  const setAlignment = (align: 'left' | 'center' | 'right') => applyToSelection({ align });
  const setCellColor   = (color: string)   => applyToSelection({ color });
  const setCellBgColor = (bgColor: string) => applyToSelection({ bgColor });
  const setCellFontSize   = (fontSize: string)   => applyToSelection({ fontSize });
  const setCellFontFamily = (fontFamily: string) => applyToSelection({ fontFamily });

  const clearCells = () => {
    const targets = selectedCells.size > 0 ? selectedCells : selectedCell ? new Set([selectedCell]) : new Set<string>();
    if (targets.size === 0) return;
    const updated = { ...cellData };
    targets.forEach(id => { updated[id] = { ...(updated[id] || {}), value: '' }; });
    setCellData(updated); setFormulaInput('');
    saveState(updated, rowCount, colCount, colWidths, true);
  };

  // ── Copy / Paste ───────────────────────────────────────────────────────────

  const copySelection = useCallback(() => {
    const targets = selectedCells;
    if (targets.size === 0) return;
    const ids = Array.from(targets);
    const minRow = Math.min(...ids.map(id => parseCellId(id).row));
    const minCol = Math.min(...ids.map(id => parseCellId(id).colNum));
    const copied: Record<string, CellInfo> = {};
    const maxRow = Math.max(...ids.map(id => parseCellId(id).row));
    const maxCol = Math.max(...ids.map(id => parseCellId(id).colNum));
    ids.forEach(id => {
      if (cellData[id]) {
        const { row, colNum } = parseCellId(id);
        copied[`${numberToCol(colNum - minCol + 1)}${row - minRow + 1}`] = { ...cellData[id] };
      }
    });
    setClipboard({ cells: copied, rows: maxRow - minRow + 1, cols: maxCol - minCol + 1 });
  }, [selectedCells, cellData]);

  const pasteSelection = useCallback(() => {
    if (!clipboard || !selectedCell) return;
    const { row: startRow, colNum: startColNum } = parseCellId(selectedCell);
    const updated = { ...cellData };
    Object.entries(clipboard.cells).forEach(([relId, info]) => {
      const { row: relRow, colNum: relCol } = parseCellId(relId);
      const targetId = `${numberToCol(startColNum + relCol - 1)}${startRow + relRow - 1}`;
      updated[targetId] = { ...info };
    });
    setCellData(updated);
    saveState(updated, rowCount, colCount, colWidths, true);
  }, [clipboard, selectedCell, cellData, rowCount, colCount, colWidths, saveState]);

  // ── Add / Delete row / col ─────────────────────────────────────────────────

  const addRow = () => { const n = rowCount + 1; setRowCount(n); saveState(cellData, n, colCount, colWidths, true); };
  const addColumn = () => { const n = colCount + 1; setColCount(n); saveState(cellData, rowCount, n, colWidths, true); };

  const deleteRows = (rows: number[]) => {
    const sorted = [...rows].sort((a, b) => b - a);
    let data = { ...cellData };
    let newRowCount = rowCount;
    sorted.forEach(delRow => {
      const updated: Record<string, CellInfo> = {};
      Object.entries(data).forEach(([id, info]) => {
        const { col, row } = parseCellId(id);
        if (row < delRow) updated[id] = info;
        else if (row > delRow) updated[`${col}${row - 1}`] = info;
      });
      data = updated;
      newRowCount--;
    });
    setCellData(data); setRowCount(Math.max(1, newRowCount)); setSelectedRows(new Set()); setSelectedCell(null);
    saveState(data, Math.max(1, newRowCount), colCount, colWidths, true);
  };

  const deleteCols = (cols: number[]) => {
    const sorted = [...cols].sort((a, b) => b - a);
    let data = { ...cellData };
    let newColCount = colCount;
    sorted.forEach(delCol => {
      const updated: Record<string, CellInfo> = {};
      Object.entries(data).forEach(([id, info]) => {
        const { row, colNum } = parseCellId(id);
        if (colNum < delCol) updated[id] = info;
        else if (colNum > delCol) updated[`${numberToCol(colNum - 1)}${row}`] = info;
      });
      data = updated;
      newColCount--;
    });
    setCellData(data); setColCount(Math.max(1, newColCount)); setSelectedCols(new Set()); setSelectedCell(null);
    saveState(data, rowCount, Math.max(1, newColCount), colWidths, true);
  };

  const insertRowAbove = (rowNum: number) => {
    const updated: Record<string, CellInfo> = {};
    Object.entries(cellData).forEach(([id, info]) => {
      const { col, row } = parseCellId(id);
      updated[row < rowNum ? id : `${col}${row + 1}`] = info;
    });
    const n = rowCount + 1;
    setCellData(updated); setRowCount(n); saveState(updated, n, colCount, colWidths, true);
  };

  const insertColLeft = (colNum: number) => {
    const updated: Record<string, CellInfo> = {};
    Object.entries(cellData).forEach(([id, info]) => {
      const { row, colNum: cn } = parseCellId(id);
      updated[cn < colNum ? id : `${numberToCol(cn + 1)}${row}`] = info;
    });
    const n = colCount + 1;
    setCellData(updated); setColCount(n); saveState(updated, rowCount, n, colWidths, true);
  };

  // ── Column resize ──────────────────────────────────────────────────────────

  const handleResizeMouseDown = (e: React.MouseEvent, colNum: number) => {
    e.preventDefault(); e.stopPropagation();
    resizingCol.current = { colNum, startX: e.clientX, startWidth: colWidths[colNum] || 96 };
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const delta = ev.clientX - resizingCol.current.startX;
      const newWidth = Math.max(40, resizingCol.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [resizingCol.current!.colNum]: newWidth }));
    };
    const onUp = () => {
      if (resizingCol.current) {
        setColWidths(prev => {
          saveState(cellData, rowCount, colCount, prev, true);
          return prev;
        });
      }
      resizingCol.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingCell) return;

      // Ctrl+C copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { copySelection(); return; }
      // Ctrl+V paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { pasteSelection(); return; }
      // Ctrl+A select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); handleSelectAll(); return; }
      // Delete / Backspace clear
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editingCell) {
        clearCells(); setFormulaInput(''); e.preventDefault(); return;
      }

      if (!selectedCell) return;

      // Start typing directly to enter edit mode (printable character keypress)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        setEditingCell(selectedCell);
        handleCellChange(selectedCell, e.key);
        setFormulaInput(e.key);
        return;
      }

      const { row, colNum } = parseCellId(selectedCell);
      let nr = row, nc = colNum;

      if (e.key === 'ArrowUp')    { nr = Math.max(1, row - 1); e.preventDefault(); }
      else if (e.key === 'ArrowDown')  { nr = Math.min(rowCount, row + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft')  { nc = Math.max(1, colNum - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { nc = Math.min(colCount, colNum + 1); e.preventDefault(); }
      else if (e.key === 'Tab')   { nc = Math.min(colCount, colNum + 1); e.preventDefault(); }
      else if (e.key === 'Enter') { setEditingCell(selectedCell); e.preventDefault(); return; }
      else return;

      if (nr !== row || nc !== colNum) {
        const next = `${numberToCol(nc)}${nr}`;
        clearMultiSelection();
        setSelectedCell(next);
        setFormulaInput(cellData[next]?.value || '');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedCell, editingCell, rowCount, colCount, cellData, copySelection, pasteSelection]);

  // Focus inline input
  useEffect(() => {
    if (editingCell && inlineInputRef.current) {
      inlineInputRef.current.focus(); inlineInputRef.current.select();
    }
  }, [editingCell]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // ── Context menu handler ───────────────────────────────────────────────────

  const handleContextMenu = (e: React.MouseEvent, type: 'cell' | 'row' | 'col', target: string | number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, target });
  };

  // ── Helpers for cell state ─────────────────────────────────────────────────

  const activeCellInfo = selectedCell ? cellData[selectedCell] : null;

  const isCellInSelection = (cellId: string): boolean => {
    if (selectedCells.has(cellId)) return true;
    if (selectionRange) return getCellsInRange(`${selectionRange.anchor}:${selectionRange.focus}`).includes(cellId);
    return false;
  };

  const isRowSelected = (r: number) => selectedRows.has(r) || allSelected ||
    (selectionRange && Array.from({ length: colCount }, (_, i) => `${numberToCol(i + 1)}${r}`).every(id => selectedCells.has(id)));

  const isColSelected = (c: number) => selectedCols.has(c) || allSelected;

  // ── Reference label for selection ─────────────────────────────────────────
  const selectionLabel = (() => {
    if (allSelected) return 'All';
    if (selectedRows.size > 0) return `Row ${Array.from(selectedRows).join(', ')}`;
    if (selectedCols.size > 0) return Array.from(selectedCols).map(numberToCol).join(', ');
    if (selectionRange) return `${selectionRange.anchor}:${selectionRange.focus}`;
    return selectedCell || '--';
  })();

  // ── Charts Rendering Helpers ────────────────────────────────────────────────
  const getSpreadsheetChartData = () => {
    // 1. Get from selection if selectedCells exists
    const selectedIds = Array.from(selectedCells);
    if (selectedIds.length > 0) {
      const rows = selectedIds.map(id => parseCellId(id).row);
      const cols = selectedIds.map(id => parseCellId(id).colNum);
      const uniqueRows = Array.from(new Set(rows)).sort((a, b) => a - b);
      const uniqueCols = Array.from(new Set(cols)).sort((a, b) => a - b);

      if (uniqueCols.length >= 1) {
        const labelColNum = uniqueCols[0];
        const valColNum = uniqueCols[uniqueCols.length - 1]; // Use last column as value
        const items: { label: string; value: number }[] = [];

        uniqueRows.forEach(r => {
          const labelCellId = `${numberToCol(labelColNum)}${r}`;
          const valCellId = `${numberToCol(valColNum)}${r}`;
          
          const labelCell = cellData[labelCellId];
          const labelStr = labelCell?.value || `Row ${r}`;
          
          const valCell = cellData[valCellId];
          const rawVal = valCell?.value || '0';
          const valNum = parseFloat(rawVal.startsWith('=') ? evaluateFormula(rawVal, cellData) : rawVal) || 0;
          items.push({ label: labelStr, value: valNum });
        });

        const filtered = items.filter(item => !isNaN(item.value) && item.value !== 0);
        if (filtered.length > 0) return filtered;
      }
    }

    // 2. Default: scan Column A for labels and Column B for values
    const items: { label: string; value: number }[] = [];
    for (let r = 1; r <= Math.min(rowCount, 15); r++) {
      const labelCellId = `A${r}`;
      const valCellId = `B${r}`;
      const labelStr = cellData[labelCellId]?.value;
      const rawVal = cellData[valCellId]?.value;
      if (labelStr && rawVal && labelStr.trim() !== '') {
        const valNum = parseFloat(rawVal.startsWith('=') ? evaluateFormula(rawVal, cellData) : rawVal) || 0;
        if (!isNaN(valNum)) {
          items.push({ label: labelStr, value: valNum });
        }
      }
    }

    if (items.length > 0) return items;

    // Fallback template
    return [
      { label: 'Label A', value: 40 },
      { label: 'Label B', value: 65 },
      { label: 'Label C', value: 25 },
      { label: 'Label D', value: 80 },
    ];
  };

  const renderSpreadsheetBarChart = () => {
    const chartData = getSpreadsheetChartData();
    const width = 240;
    const height = 180;
    const padL = 35;
    const padB = 25;
    const padT = 15;
    const padR = 10;

    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const maxVal = Math.max(...chartData.map(d => d.value), 10);
    const getY = (val: number) => padT + (1 - val / maxVal) * chartH;
    const getX = (idx: number) => padL + (idx * chartW) / chartData.length;
    const colW = Math.max(8, (chartW / chartData.length) - 6);

    const bars = chartData.map((d, idx) => {
      const x = getX(idx) + 3;
      const y = getY(d.value);
      const h = Math.max(0, height - padB - y);
      const color = PALETTE[idx % PALETTE.length];

      return (
        <g key={`sbar-${idx}`} className="group/sbar">
          <rect
            x={x}
            y={y}
            width={colW}
            height={h}
            rx={2}
            fill={color}
            className="transition-all duration-300 hover:opacity-85"
          />
          <text
            x={x + colW / 2}
            y={Math.max(y - 3, 10)}
            textAnchor="middle"
            className="text-[8px] font-sans font-bold fill-charcoal dark:fill-white opacity-0 group-hover/sbar:opacity-100 transition-opacity"
          >
            {d.value}
          </text>
          <text
            x={x + colW / 2}
            y={height - padB + 10}
            textAnchor="middle"
            className="text-[7px] font-sans font-bold fill-charcoalMuted dark:fill-gray-500 max-w-[25px] truncate"
          >
            {d.label.length > 5 ? d.label.substring(0, 4) + '..' : d.label}
          </text>
        </g>
      );
    });

    return (
      <svg width={width} height={height} className="overflow-visible select-none">
        {/* Y Axis line */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke={darkMode ? "#444" : "#ccc"} strokeWidth={1} />
        {/* X Axis line */}
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={darkMode ? "#444" : "#ccc"} strokeWidth={1} />
        {/* Bars */}
        {bars}
      </svg>
    );
  };

  const renderSpreadsheetPieChart = () => {
    const chartData = getSpreadsheetChartData();
    const total = chartData.reduce((sum, d) => sum + d.value, 0) || 1;
    const width = 240;
    const height = 180;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 60;

    let startAngle = 0;
    const slices = chartData.map((d, idx) => {
      const angle = (d.value / total) * 360;
      const endAngle = startAngle + angle;
      const color = PALETTE[idx % PALETTE.length];

      const radStart = (startAngle - 90) * Math.PI / 180;
      const radEnd = (endAngle - 90) * Math.PI / 180;

      const x1 = cx + radius * Math.cos(radStart);
      const y1 = cy + radius * Math.sin(radStart);
      const x2 = cx + radius * Math.cos(radEnd);
      const y2 = cy + radius * Math.sin(radEnd);

      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = `
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;
      startAngle = endAngle;

      return (
        <g key={`spie-${idx}`} className="group/spie">
          <path
            d={pathData}
            fill={color}
            className="transition-all duration-300 hover:scale-105 origin-center"
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <title>{d.label}: {d.value} ({Math.round(d.value / total * 100)}%)</title>
        </g>
      );
    });

    return (
      <div className="flex flex-col items-center gap-2">
        <svg width={width} height={height} className="overflow-visible select-none">
          {slices}
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center max-w-[220px]">
          {chartData.map((d, idx) => (
            <div key={`plegend-${idx}`} className="flex items-center gap-1 text-[8px] font-sans font-semibold text-charcoalMuted dark:text-gray-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
              <span className="truncate max-w-[50px]">{d.label}</span>
              <span>({Math.round(d.value / total * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getSpreadsheetSuggestions = () => {
    const list: { label: string; action: () => void }[] = [];
    
    // Check if sheet is empty
    const hasData = Object.keys(cellData).some(id => cellData[id]?.value);
    if (!hasData) {
      list.push({
        label: "Grade Sheet Template",
        action: () => {
          const newData = { ...cellData };
          // Headers
          newData["A1"] = { value: "Student Name", bold: true, align: "center", bgColor: "#DBEAFE" };
          newData["B1"] = { value: "Maths", bold: true, align: "center", bgColor: "#DBEAFE" };
          newData["C1"] = { value: "Science", bold: true, align: "center", bgColor: "#DBEAFE" };
          newData["D1"] = { value: "Total Marks", bold: true, align: "center", bgColor: "#DBEAFE" };
          newData["E1"] = { value: "Percentage", bold: true, align: "center", bgColor: "#DBEAFE" };

          // Data rows
          const students = ["Aarav", "Ananya", "Vihaan", "Kabir", "Diya"];
          const marks = [
            [85, 90],
            [78, 88],
            [92, 95],
            [65, 72],
            [89, 91]
          ];

          students.forEach((name, idx) => {
            const r = idx + 2;
            newData[`A${r}`] = { value: name };
            newData[`B${r}`] = { value: marks[idx][0].toString() };
            newData[`C${r}`] = { value: marks[idx][1].toString() };
            newData[`D${r}`] = { value: `=SUM(B${r}:C${r})` };
            newData[`E${r}`] = { value: `=D${r}/200*100` };
          });
          
          saveState(newData, rowCount, colCount, colWidths, true);
        }
      });
      list.push({
        label: "Monthly Budget Template",
        action: () => {
          const newData = { ...cellData };
          newData["A1"] = { value: "Category", bold: true, align: "center", bgColor: "#FEF3C7" };
          newData["B1"] = { value: "Budgeted", bold: true, align: "center", bgColor: "#FEF3C7" };
          newData["C1"] = { value: "Actual", bold: true, align: "center", bgColor: "#FEF3C7" };
          newData["D1"] = { value: "Difference", bold: true, align: "center", bgColor: "#FEF3C7" };

          const items = ["Rent", "Groceries", "Utilities", "Insurance", "Entertainment"];
          const budgeted = [1200, 300, 150, 100, 200];
          const actual = [1200, 320, 140, 100, 180];

          items.forEach((item, idx) => {
            const r = idx + 2;
            newData[`A${r}`] = { value: item };
            newData[`B${r}`] = { value: budgeted[idx].toString() };
            newData[`C${r}`] = { value: actual[idx].toString() };
            newData[`D${r}`] = { value: `=B${r}-C${r}` };
          });

          // Total row
          const totalRow = items.length + 2;
          newData[`A${totalRow}`] = { value: "Total", bold: true, align: "center", bgColor: "#F3F4F6" };
          newData[`B${totalRow}`] = { value: `=SUM(B2:B${totalRow-1})`, bold: true };
          newData[`C${totalRow}`] = { value: `=SUM(C2:C${totalRow-1})`, bold: true };
          newData[`D${totalRow}`] = { value: `=SUM(D2:D${totalRow-1})`, bold: true };

          saveState(newData, rowCount, colCount, colWidths, true);
        }
      });
      return list;
    }

    // If cell selected, check context
    if (selectedCell) {
      const { col, row, colNum } = parseCellId(selectedCell);
      
      // 1. Check numbers above selected cell in same column
      const valsAbove: number[] = [];
      for (let r = 1; r < row; r++) {
        const val = parseFloat(cellData[`${col}${r}`]?.value);
        if (!isNaN(val)) valsAbove.push(val);
      }
      
      if (valsAbove.length >= 1) {
        list.push({
          label: `Calculate Sum (=SUM(${col}1:${col}${row-1}))`,
          action: () => {
            handleCellChange(selectedCell, `=SUM(${col}1:${col}${row-1})`);
            setFormulaInput(`=SUM(${col}1:${col}${row-1})`);
          }
        });
        list.push({
          label: `Calculate Average (=AVERAGE(${col}1:${col}${row-1}))`,
          action: () => {
            handleCellChange(selectedCell, `=AVERAGE(${col}1:${col}${row-1})`);
            setFormulaInput(`=AVERAGE(${col}1:${col}${row-1})`);
          }
        });
      }

      // 2. Check numbers to the left in same row (e.g. if we are in C5, check A5, B5)
      const valsLeft: { id: string; val: number; colLetter: string }[] = [];
      for (let c = 1; c < colNum; c++) {
        const colL = numberToCol(c);
        const val = parseFloat(cellData[`${colL}${row}`]?.value);
        if (!isNaN(val)) valsLeft.push({ id: `${colL}${row}`, val, colLetter: colL });
      }

      if (valsLeft.length >= 2) {
        const firstCol = valsLeft[0].colLetter;
        const lastCol = valsLeft[valsLeft.length - 1].colLetter;
        list.push({
          label: `Calculate Row Sum (=SUM(${firstCol}${row}:${lastCol}${row}))`,
          action: () => {
            handleCellChange(selectedCell, `=SUM(${firstCol}${row}:${lastCol}${row})`);
            setFormulaInput(`=SUM(${firstCol}${row}:${lastCol}${row})`);
          }
        });
        
        // If there are exactly two numbers (e.g. Obtained Marks in B and Max Marks in C), suggest percentage
        if (valsLeft.length === 2) {
          const obtained = valsLeft[0].colLetter + row;
          const maxMarks = valsLeft[1].colLetter + row;
          list.push({
            label: `Calculate Percentage (=${obtained}/${maxMarks}*100)`,
            action: () => {
              handleCellChange(selectedCell, `=${obtained}/${maxMarks}*100`);
              setFormulaInput(`=${obtained}/${maxMarks}*100`);
            }
          });
        }
      }
    }

    return list;
  };

  const handleAiTemplateGenerate = async () => {
    if (!aiConfig || !aiConfig.apiKey) {
      alert("Please configure your Gemini API Key in the AI Settings of a standard note (click the gear icon in note view).");
      return;
    }
    
    const promptText = window.prompt("What spreadsheet template would you like to generate? (e.g. 'Grade list of 5 students', 'Weekly task tracker', 'Monthly grocery expense list')");
    if (!promptText || !promptText.trim()) return;

    setAiGenerating(true);
    setAiGenError(null);

    const systemPrompt = `You are a professional spreadsheet template designer.
Generate a structured spreadsheet layout based on the user's request.
Output ONLY a valid JSON object matching this TypeScript format, with no explanation, markdown code blocks, or HTML wrappers:
{
  "data": {
    "A1": { "value": "Header", "bold": true, "bgColor": "#DBEAFE", "align": "center" }
  },
  "rowCount": number,
  "colCount": number
}
Ensure headings have bold and a soft background color.
Generate logical formulas where appropriate (e.g., =SUM(B2:B6) or =AVERAGE(C2:C6)).`;

    try {
      const response = await generateText({
        config: aiConfig,
        prompt: promptText,
        systemInstruction: systemPrompt
      });

      const cleanJson = response
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      if (parsed && parsed.data) {
        const rows = parsed.rowCount || rowCount;
        const cols = parsed.colCount || colCount;
        setCellData(parsed.data);
        setRowCount(rows);
        setColCount(cols);
        saveState(parsed.data, rows, cols, colWidths, true);
      } else {
        throw new Error("Invalid format returned by AI.");
      }
    } catch (err: any) {
      setAiGenError(err.message || 'Failed to generate spreadsheet template.');
      alert("Error: " + (err.message || "Failed to generate template"));
    } finally {
      setAiGenerating(false);
    }
  };

  const renderSpreadsheetSuggestionsBar = () => {
    const suggestions = getSpreadsheetSuggestions();
    const isDev = sessionStorage.getItem('antigravity_dev_logged_in') === 'true';
    
    // Don't show bar if there are no suggestions and user is not dev
    if (suggestions.length === 0 && !isDev) return null;
    
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-2 px-4 select-none shrink-0 bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-charcoal/20 dark:border-white/10">
        <span className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 fill-emerald-500/20" /> Smart Suggestions:
        </span>
        {suggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={sug.action}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-500/20 dark:bg-zinc-800 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 rounded-full text-[10px] font-sans font-semibold transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            {sug.label}
          </button>
        ))}
        
        {/* Ask AI Button — only for developer users */}
        {isDev && (
          <button
            onClick={handleAiTemplateGenerate}
            disabled={aiGenerating}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800 rounded-full text-[10px] font-sans font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 hover:scale-102 active:scale-98 shadow-sm ml-auto"
          >
            <Sparkles className="w-3 h-3 fill-white/20" /> {aiGenerating ? "Generating..." : "Generate template via AI"}
          </button>
        )}
        
        {aiGenError && (
          <span className="text-[9px] font-sans text-red-500 ml-2" title={aiGenError}>
            Generation Error
          </span>
        )}
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 h-full flex flex-col bg-[#FAF9F6] dark:bg-[#1E1E1E] text-charcoal dark:text-white select-none" ref={gridRef}>

      {/* ── Toolbar ── */}
      <div className="px-4 py-2 bg-[#F8F6F0] dark:bg-[#151515] border-b border-charcoal/20 dark:border-white/10 flex items-center gap-1.5 flex-wrap shrink-0 overflow-x-auto no-scrollbar">

        {/* Bold */}
        <button onClick={toggleBold} title="Bold (Ctrl+B)"
          className={`h-9 px-3 rounded border font-bold text-xs transition-all cursor-pointer ${activeCellInfo?.bold ? 'border-warmAmber text-warmAmber bg-warmAmber/8' : 'border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] hover:bg-charcoal/5 dark:hover:bg-white/5'}`}>
          B
        </button>

        {/* Italic */}
        <button onClick={toggleItalic} title="Italic"
          className={`h-9 px-3 rounded border italic font-bold text-xs transition-all cursor-pointer ${activeCellInfo?.italic ? 'border-warmAmber text-warmAmber bg-warmAmber/8' : 'border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] hover:bg-charcoal/5 dark:hover:bg-white/5'}`}>
          I
        </button>

        {/* Underline */}
        <button onClick={toggleUnderline} title="Underline"
          className={`h-9 px-3 rounded border underline font-bold text-xs transition-all cursor-pointer ${activeCellInfo?.underline ? 'border-warmAmber text-warmAmber bg-warmAmber/8' : 'border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] hover:bg-charcoal/5 dark:hover:bg-white/5'}`}>
          U
        </button>

        <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-0.5" />

        {/* Font Family */}
        <select onChange={e => setCellFontFamily(e.target.value)} value={activeCellInfo?.fontFamily || 'Segoe UI'}
          className="h-9 px-2 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs outline-none cursor-pointer">
          {['Segoe UI','Arial','Times New Roman','Georgia','Courier New'].map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Font Size */}
        <select onChange={e => setCellFontSize(e.target.value)} value={activeCellInfo?.fontSize || '12'}
          className="h-9 px-2 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs outline-none cursor-pointer w-16">
          {['8','10','11','12','14','16','18','20','24','28','32','36','48'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-0.5" />

        {/* Alignment */}
        {(['left','center','right'] as const).map(align => {
          const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
          return (
            <button key={align} onClick={() => setAlignment(align)} title={`Align ${align}`}
              className={`h-9 w-9 rounded border flex items-center justify-center transition-all cursor-pointer ${(activeCellInfo?.align || 'left') === align ? 'border-warmAmber text-warmAmber bg-warmAmber/8' : 'border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] hover:bg-charcoal/5 dark:hover:bg-white/5'}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}

        <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-0.5" />

        {/* Text Color */}
        <div className="flex flex-col items-center gap-0.5 relative group cursor-pointer" title="Text Color">
          <select onChange={e => setCellColor(e.target.value)} value={activeCellInfo?.color || '#000000'}
            className="h-9 px-2 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-xs outline-none cursor-pointer">
            <option value="#000000">⬛ Black</option>
            <option value="#ffffff">⬜ White</option>
            <option value="#2563EB">🟦 Blue</option>
            <option value="#16A34A">🟩 Green</option>
            <option value="#DC2626">🟥 Red</option>
            <option value="#D97706">🟧 Amber</option>
            <option value="#6B7280">🔲 Gray</option>
          </select>
        </div>

        {/* Fill Color */}
        <div title="Fill Color" className="flex items-center gap-1">
          <span className="text-[10px] text-charcoalMuted dark:text-gray-500 font-bold">Fill</span>
          <select onChange={e => setCellBgColor(e.target.value)} value={activeCellInfo?.bgColor || ''}
            className="h-9 px-2 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-xs outline-none cursor-pointer">
            <option value="">None</option>
            <option value="#FEF3C7">🟨 Yellow</option>
            <option value="#DCFCE7">🟩 Green</option>
            <option value="#DBEAFE">🟦 Blue</option>
            <option value="#FCE7F3">🩷 Pink</option>
            <option value="#F3F4F6">⬜ Gray</option>
            <option value="#FEE2E2">🟥 Red</option>
            <option value="#000000">⬛ Black</option>
          </select>
        </div>

        <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-0.5" />

        {/* Clear cells */}
        <button onClick={clearCells} title="Clear selected cells"
          className="h-9 px-3 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all cursor-pointer flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>

        {/* Copy */}
        <button onClick={copySelection} title="Copy (Ctrl+C)"
          className="h-9 px-3 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1">
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>

        {/* Paste */}
        <button onClick={pasteSelection} title="Paste (Ctrl+V)" disabled={!clipboard}
          className="h-9 px-3 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-40">
          <Clipboard className="w-3.5 h-3.5" /> Paste
        </button>

        <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-0.5" />

        {/* Add Row / Col */}
        <button onClick={addRow} className="h-9 px-3 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs hover:bg-charcoal/5 dark:hover:bg-white/5 cursor-pointer flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Row
        </button>
        <button onClick={addColumn} className="h-9 px-3 rounded border border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white text-xs hover:bg-charcoal/5 dark:hover:bg-white/5 cursor-pointer flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Col
        </button>

        {/* Delete selected rows/cols */}
        {selectedRows.size > 0 && (
          <button onClick={() => deleteRows(Array.from(selectedRows))}
            className="h-9 px-3 rounded border border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-600/30 dark:text-red-400 text-xs cursor-pointer flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> Delete Row{selectedRows.size > 1 ? 's' : ''}
          </button>
        )}
        {selectedCols.size > 0 && (
          <button onClick={() => deleteCols(Array.from(selectedCols))}
            className="h-9 px-3 rounded border border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-600/30 dark:text-red-400 text-xs cursor-pointer flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> Delete Col{selectedCols.size > 1 ? 's' : ''}
          </button>
        )}

        <div className="w-[1px] h-5 bg-charcoal/20 dark:bg-white/15 mx-0.5" />

        {/* Toggle Charts */}
        <button
          onClick={() => setShowCharts(!showCharts)}
          className={`h-9 px-3 rounded border text-xs font-sans font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            showCharts 
              ? 'border-warmAmber text-warmAmber bg-warmAmber/8' 
              : 'border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#252525] text-charcoal dark:text-white hover:bg-charcoal/5 dark:hover:bg-white/5'
          }`}
          title="Toggle Charts Panel"
        >
          <BarChart2 className="w-3.5 h-3.5" /> Charts
        </button>
      </div>

      {/* ── Formula Bar ── */}
      <div className="px-4 py-2 bg-[#FAF9F6] dark:bg-[#1C1C1C] border-b border-charcoal/20 dark:border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 select-text">
        <div className="flex items-center gap-2">
          <div className="min-w-[72px] py-1.5 px-2 text-center text-[11px] font-bold bg-white dark:bg-[#252525] border border-charcoal/20 dark:border-white/10 text-charcoal dark:text-white rounded shadow-sm truncate">
            {selectionLabel}
          </div>
          <div className="text-sm font-bold text-charcoalMuted dark:text-gray-500 italic px-1">fx</div>
        </div>

        {/* Predefined Basic Formula Operators */}
        <div className="flex flex-wrap gap-1">
          {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'].map((op) => (
            <button
              key={op}
              type="button"
              disabled={!selectedCell}
              onClick={() => applyFormulaOperator(op)}
              className="px-2.5 py-1 bg-white hover:bg-charcoal/5 dark:bg-[#252525] dark:hover:bg-white/5 border border-charcoal/20 dark:border-white/10 rounded text-[9px] font-bold text-charcoal dark:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none shadow-sm"
              title={`Calculate ${op} of cells above`}
            >
              {op}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Enter value or formula (=SUM, =AVERAGE, =MAX, =MIN, =COUNT…)"
          value={formulaInput}
          onChange={e => { setFormulaInput(e.target.value); if (selectedCell) handleCellChange(selectedCell, e.target.value); }}
          disabled={!selectedCell}
          className="flex-1 bg-white dark:bg-[#252525] border border-charcoal/20 dark:border-white/10 rounded px-3 py-1.5 text-xs font-sans outline-none focus:border-warmAmber/50 text-charcoal dark:text-white shadow-sm"
        />
      </div>

      {renderSpreadsheetSuggestionsBar()}

      {/* Split screen: Grid and Charts Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Grid ── */}
        <div className="flex-1 overflow-auto bg-[#F0EFEA] dark:bg-[#1A1A1A]"
          onContextMenu={e => { if (selectedCell) handleContextMenu(e, 'cell', selectedCell); }}
        >
        <table className="border-collapse table-fixed w-max text-xs font-sans">

          {/* Column headers */}
          <thead>
            <tr>
              {/* Corner: select-all */}
              <th
                onClick={handleSelectAll}
                className={`w-10 border border-[#ccc] dark:border-[#444] sticky top-0 left-0 z-20 cursor-pointer transition-all ${allSelected ? 'bg-warmAmber/20 dark:bg-warmAmber/15 text-warmAmber' : 'bg-[#E8E8E3] dark:bg-[#2A2A2A] hover:bg-charcoal/10 dark:hover:bg-white/10'}`}
                title="Select All"
              >
                <ChevronDown className="w-3 h-3 mx-auto opacity-50" />
              </th>
              {Array.from({ length: colCount }).map((_, c) => {
                const colNum = c + 1;
                const label = numberToCol(colNum);
                const w = colWidths[colNum] || 96;
                const active = isColSelected(colNum) || (selectedCell ? parseCellId(selectedCell).colNum === colNum : false);
                return (
                  <th
                    key={label}
                    style={{ width: w, minWidth: w, maxWidth: w }}
                    className={`relative border border-[#ccc] dark:border-[#444] sticky top-0 z-10 text-center font-bold transition-all cursor-pointer select-none ${
                      active ? 'bg-warmAmber/20 dark:bg-warmAmber/15 text-warmAmber' : 'bg-[#E8E8E3] dark:bg-[#2A2A2A] text-charcoal dark:text-white hover:bg-charcoal/10 dark:hover:bg-white/10'
                    }`}
                    onClick={e => handleColHeaderClick(colNum, e)}
                    onContextMenu={e => handleContextMenu(e, 'col', colNum)}
                  >
                    <span className="px-2 py-1 block">{label}</span>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-warmAmber/50 z-10"
                      onMouseDown={e => handleResizeMouseDown(e, colNum)}
                      onClick={e => e.stopPropagation()}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {Array.from({ length: rowCount }).map((_, r) => {
              const rowNum = r + 1;
              const rowActive = isRowSelected(rowNum) || (selectedCell ? parseCellId(selectedCell).row === rowNum : false);
              return (
                <tr key={rowNum}>
                  {/* Row number header */}
                  <td
                    className={`w-10 border border-[#ccc] dark:border-[#444] text-center font-bold sticky left-0 z-10 transition-all cursor-pointer select-none ${
                      rowActive ? 'bg-warmAmber/20 dark:bg-warmAmber/15 text-warmAmber font-black' : 'bg-[#E8E8E3] dark:bg-[#2A2A2A] text-charcoal dark:text-white hover:bg-charcoal/10 dark:hover:bg-white/10'
                    }`}
                    onClick={e => handleRowHeaderClick(rowNum, e)}
                    onContextMenu={e => handleContextMenu(e, 'row', rowNum)}
                  >
                    {rowNum}
                  </td>

                  {/* Cells */}
                  {Array.from({ length: colCount }).map((_, c) => {
                    const colNum = c + 1;
                    const cellId = `${numberToCol(colNum)}${rowNum}`;
                    const cell = cellData[cellId];
                    const isSelected = selectedCell === cellId;
                    const isInSel = isCellInSelection(cellId);
                    const isEditing = editingCell === cellId;
                    const rawVal = cell?.value || '';
                    const evalVal = rawVal.startsWith('=') ? evaluateFormula(rawVal, cellData) : rawVal;
                    const w = colWidths[colNum] || 96;

                    return (
                      <td
                        key={cellId}
                        style={{
                          width: w, minWidth: w, maxWidth: w,
                          color: cell?.color || undefined,
                          backgroundColor: cell?.bgColor || undefined,
                          fontSize: cell?.fontSize ? `${cell.fontSize}px` : undefined,
                          fontFamily: cell?.fontFamily || undefined,
                        }}
                        className={`h-7 border relative overflow-hidden transition-all duration-75
                          border-[#ccc] dark:border-[#444]
                          ${cell?.bold ? 'font-bold' : ''}
                          ${cell?.italic ? 'italic' : ''}
                          ${cell?.underline ? 'underline' : ''}
                          ${cell?.align === 'center' ? 'text-center' : cell?.align === 'right' ? 'text-right' : 'text-left'}
                          ${isSelected ? 'outline outline-2 outline-warmAmber z-10 shadow-lg' : ''}
                          ${isInSel && !isSelected ? 'bg-warmAmber/10 dark:bg-warmAmber/10' : ''}
                          ${!isInSel && !cell?.bgColor ? 'bg-white dark:bg-[#222]' : ''}
                        `}
                        onClick={e => handleCellClick(cellId, e)}
                        onDoubleClick={() => handleCellDoubleClick(cellId)}
                        onContextMenu={e => { handleCellClick(cellId, e); handleContextMenu(e, 'cell', cellId); }}
                      >
                        {isEditing ? (
                          <input
                            ref={inlineInputRef}
                            type="text"
                            value={rawVal}
                            onChange={e => { handleCellChange(cellId, e.target.value); setFormulaInput(e.target.value); }}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setEditingCell(null);
                                const { col, row } = parseCellId(cellId);
                                const next = `${col}${Math.min(rowCount, row + 1)}`;
                                setTimeout(() => { setSelectedCell(next); setFormulaInput(cellData[next]?.value || ''); }, 50);
                                e.preventDefault();
                              } else if (e.key === 'Tab') {
                                setEditingCell(null);
                                const { colNum: cn, row } = parseCellId(cellId);
                                const next = `${numberToCol(Math.min(colCount, cn + 1))}${row}`;
                                setTimeout(() => { setSelectedCell(next); setFormulaInput(cellData[next]?.value || ''); }, 50);
                                e.preventDefault();
                              } else if (e.key === 'Escape') {
                                setEditingCell(null); e.preventDefault();
                              }
                            }}
                            className="absolute inset-0 w-full h-full bg-white dark:bg-[#333] text-charcoal dark:text-white px-2 outline-none text-xs font-sans z-20"
                          />
                        ) : (
                          <span className="px-1.5 block pointer-events-none truncate leading-7">{evalVal}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts Sidebar */}
      {showCharts && (
        <div className="w-80 border-l border-charcoal/20 dark:border-white/10 bg-white dark:bg-[#1C1C1E] p-5 flex flex-col overflow-y-auto shrink-0 select-none animate-slideLeft">
          <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 dark:border-white/5 mb-4">
            <h4 className="font-serif font-bold text-sm text-charcoal dark:text-white flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-warmAmber" /> Spreadsheet Charts
            </h4>
            <button 
              onClick={() => setShowCharts(false)}
              className="text-xs font-medium text-charcoalMuted dark:text-gray-400 hover:text-charcoal dark:hover:text-white transition-all cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-2 mb-4 bg-charcoal/5 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setChartType('bar')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                chartType === 'bar' 
                  ? 'bg-warmAmber text-white shadow-sm' 
                  : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Bar Chart
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                chartType === 'pie' 
                  ? 'bg-warmAmber text-white shadow-sm' 
                  : 'text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" /> Pie Chart
            </button>
          </div>

          {/* Selected range summary */}
          <p className="text-[10px] text-charcoalMuted dark:text-gray-500 font-sans font-semibold mb-4 leading-normal">
            Showing chart for range: <span className="text-warmAmber font-bold">{selectionLabel}</span>. 
            Select a column of labels next to a column of numbers to update the chart in real-time.
          </p>

          {/* Chart Render container */}
          <div className="bg-charcoal/3 dark:bg-white/2 rounded-2xl p-4 border border-charcoal/5 dark:border-white/5 flex items-center justify-center min-h-[220px]">
            {chartType === 'bar' ? renderSpreadsheetBarChart() : renderSpreadsheetPieChart()}
          </div>
        </div>
      )}
    </div>

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-[#1E1E1E] border border-charcoal/20 dark:border-white/10 rounded-xl shadow-2xl py-1.5 text-xs font-sans text-charcoal dark:text-white min-w-[170px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {/* Copy / Paste */}
          <button onClick={() => { copySelection(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer">
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          {clipboard && (
            <button onClick={() => { pasteSelection(); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer">
              <Clipboard className="w-3.5 h-3.5" /> Paste
            </button>
          )}
          <button onClick={() => { clearCells(); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Clear Cell{selectedCells.size > 1 ? 's' : ''}
          </button>

          <div className="h-[1px] bg-charcoal/10 dark:bg-white/10 my-1" />

          {/* Row actions */}
          {contextMenu.type === 'row' || contextMenu.type === 'cell' ? (
            <>
              <button onClick={() => { insertRowAbove(contextMenu.type === 'row' ? contextMenu.target as number : parseCellId(contextMenu.target as string).row); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Insert Row Above
              </button>
              <button onClick={() => { deleteRows([contextMenu.type === 'row' ? contextMenu.target as number : parseCellId(contextMenu.target as string).row]); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Delete Row
              </button>
            </>
          ) : null}

          {/* Col actions */}
          {contextMenu.type === 'col' || contextMenu.type === 'cell' ? (
            <>
              <button onClick={() => { insertColLeft(contextMenu.type === 'col' ? contextMenu.target as number : parseCellId(contextMenu.target as string).colNum); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-charcoal/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Insert Column Left
              </button>
              <button onClick={() => { deleteCols([contextMenu.type === 'col' ? contextMenu.target as number : parseCellId(contextMenu.target as string).colNum]); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Delete Column
              </button>
            </>
          ) : null}

          <div className="h-[1px] bg-charcoal/10 dark:bg-white/10 my-1" />

          {/* Row height note */}
          <div className="px-4 py-1.5 text-[10px] text-charcoalMuted dark:text-gray-500">
            {selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}

    </div>
  );
};
