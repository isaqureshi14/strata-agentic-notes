import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Delete } from 'lucide-react';

interface LockScreenProps {
  onUnlock?: () => void;
  onClose: () => void;
  onSetPasscode?: (passcode: string) => void;
  correctPasscode?: string;
  mode?: 'enter' | 'setup';
}

export const LockScreen: React.FC<LockScreenProps> = ({
  onUnlock,
  onClose,
  onSetPasscode,
  correctPasscode = '1234',
  mode = 'enter',
}) => {
  const [passcode, setPasscode] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (num: string) => {
    if (passcode.length < 4) {
      setError(false);
      const newPasscode = passcode + num;
      setPasscode(newPasscode);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleDelete = () => {
    if (passcode.length > 0) {
      setError(false);
      setPasscode(passcode.slice(0, -1));
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  useEffect(() => {
    if (passcode.length === 4) {
      if (mode === 'enter') {
        if (passcode === correctPasscode) {
          setIsSuccess(true);
          setTimeout(() => {
            if (onUnlock) onUnlock();
          }, 300);
        } else {
          setError(true);
          setTimeout(() => {
            setPasscode('');
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, 500);
        }
      } else if (mode === 'setup') {
        setIsSuccess(true);
        setTimeout(() => {
          if (onSetPasscode) onSetPasscode(passcode);
        }, 300);
      }
    }
  }, [passcode, correctPasscode, mode, onUnlock, onSetPasscode]);

  useEffect(() => {
    // Focus the hidden input on mount
    inputRef.current?.focus();
    
    // Blur any focused element (like search inputs or text editor) on mount
    if (document.activeElement instanceof HTMLElement && document.activeElement !== inputRef.current) {
      document.activeElement.blur();
    }
    
    // Re-focus the input if user clicks anywhere on the lock screen
    const handleGlobalClick = () => {
      inputRef.current?.focus();
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    // Listen for Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A] flex flex-col items-center justify-center p-6 text-white select-none transition-all duration-300">
      
      {/* Hidden input field to capture native keyboard inputs on desktop & mobile */}
      <input
        ref={inputRef}
        type="text"
        pattern="[0-9]*"
        inputMode="numeric"
        maxLength={4}
        value={passcode}
        onChange={(e) => {
          if (isSuccess) return;
          const val = e.target.value.replace(/[^0-9]/g, '');
          if (val.length <= 4) {
            setError(false);
            setPasscode(val);
          }
        }}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        autoFocus
      />

      {/* Top Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 px-4 py-2 rounded-full border border-white/10 text-sm font-sans font-medium hover:bg-white/5 active:scale-95 transition-all text-gray-400 hover:text-white"
      >
        Cancel
      </button>

      {/* Lock Icon & Title */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className={`w-16 h-16 rounded-full bg-warmAmber/10 flex items-center justify-center mb-4 transition-all duration-300 ${isSuccess ? 'scale-110 bg-emerald-500/10' : ''}`}>
          {isSuccess ? (
            <Unlock className="w-8 h-8 text-emerald-400" />
          ) : (
            <Lock className="w-8 h-8 text-warmAmber animate-pulse" />
          )}
        </div>
        <h2 className="text-2xl font-serif font-bold text-warmAmber mb-2">
          {mode === 'setup' ? 'Set Note Passcode' : 'Unlock Note'}
        </h2>
        <p className="text-sm font-sans text-gray-400">
          {mode === 'setup' 
            ? 'Choose a 4-digit code to protect this note' 
            : error 
              ? 'Incorrect passcode. Try again.' 
              : 'Enter your 4-digit passcode to unlock'}
        </p>
      </div>

      {/* Dot Indicators */}
      <div className={`flex gap-6 mb-12 items-center justify-center ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              index < passcode.length
                ? isSuccess
                  ? 'bg-emerald-400 border-emerald-400 scale-125'
                  : 'bg-warmAmber border-warmAmber scale-125'
                : 'border-white/20 bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-6 max-w-xs w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            disabled={isSuccess}
            className="w-16 h-16 mx-auto rounded-full bg-[#2A2A2A] active:bg-[#3E3E3E] text-xl font-sans font-bold flex items-center justify-center border border-white/5 shadow-md active:scale-90 transition-all duration-100"
          >
            {num}
          </button>
        ))}
        <div className="w-16 h-16" />
        <button
          onClick={() => handleKeyPress('0')}
          disabled={isSuccess}
          className="w-16 h-16 mx-auto rounded-full bg-[#2A2A2A] active:bg-[#3E3E3E] text-xl font-sans font-bold flex items-center justify-center border border-white/5 shadow-md active:scale-90 transition-all duration-100"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={isSuccess}
          className="w-16 h-16 mx-auto rounded-full bg-[#2A2A2A]/50 hover:bg-[#2A2A2A] active:bg-[#3E3E3E] text-lg font-sans font-medium flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all duration-100"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};
