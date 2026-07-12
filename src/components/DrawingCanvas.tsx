import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2, Check } from 'lucide-react';

interface DrawingCanvasProps {
  initialDrawing?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  initialDrawing,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState('#1A1A1A'); // Charcoal default
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    context.fillStyle = '#FFFDF9';
    context.fillRect(0, 0, rect.width, rect.height);

    if (initialDrawing) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialDrawing;
    }
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!contextRef.current || !canvasRef.current) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    contextRef.current.fillStyle = '#FFFDF9';
    contextRef.current.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    const rect = canvas.getBoundingClientRect();
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0, rect.width, rect.height);
      const dataUrl = tempCanvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 transition-all duration-200">
      <div className="bg-creamCard dark:bg-charcoalDarkCard w-full max-w-3xl rounded-3xl shadow-2xl border border-charcoal/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-charcoal/10 dark:border-white/10 bg-warmBg dark:bg-charcoalDarkBg">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-warmAmber" />
            <h3 className="font-serif text-lg font-bold text-charcoal">
              Canvas Drawing
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all text-charcoalMuted dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 flex flex-wrap gap-4 items-center justify-between bg-warmBg/50 dark:bg-charcoalDarkBg/30 border-b border-charcoal/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans text-charcoalMuted dark:text-gray-400 mr-1">Colors:</span>
            {[
              { hex: '#1A1A1A', name: 'Charcoal' },
              { hex: '#F4A261', name: 'Amber' },
              { hex: '#E76F51', name: 'Terracotta' },
              { hex: '#457B9D', name: 'Blue' },
              { hex: '#2A9D8F', name: 'Green' },
              { hex: '#E63946', name: 'Red' },
              { hex: '#FFFDF9', name: 'Eraser', isEraser: true },
            ].map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.hex)}
                title={c.name}
                className={`w-6 h-6 rounded-full border transition-all duration-150 relative ${
                  color === c.hex
                    ? 'scale-125 border-charcoal shadow-sm'
                    : 'border-charcoal/20 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: c.isEraser ? undefined : c.hex }}
              >
                {c.isEraser && (
                  <div className="absolute inset-0 flex items-center justify-center bg-creamCard dark:bg-[#1E1E1E] rounded-full">
                    <Eraser className="w-3.5 h-3.5 text-charcoal" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-sans text-charcoalMuted dark:text-gray-400">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 accent-warmAmber cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none dark:bg-gray-700"
            />
            <span className="text-xs font-mono text-charcoal w-4 text-right">{brushSize}px</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearCanvas}
              title="Clear Canvas"
              className="p-2 rounded-lg text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-warmBg dark:bg-charcoalDarkBg p-6 flex justify-center items-center overflow-auto min-h-[350px]">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="drawing-canvas shadow-lg rounded-2xl cursor-crosshair border border-charcoal/10 dark:border-white/10 w-full h-[400px] max-w-full touch-none"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 bg-warmBg dark:bg-charcoalDarkBg border-t border-charcoal/10 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-sans font-semibold text-charcoalMuted dark:text-gray-400 hover:bg-charcoal/5 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-full text-sm font-sans font-semibold bg-charcoal dark:bg-warmBg text-white dark:text-charcoal hover:bg-charcoal/90 dark:hover:bg-white/90 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Drawing
          </button>
        </div>
      </div>
    </div>
  );
};
