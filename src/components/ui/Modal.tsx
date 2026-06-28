import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'light' | 'dark';
}

export function Modal({ open, onClose, title, children, size = 'md', theme = 'light' }: ModalProps) {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-black/40'}`}
        onClick={onClose}
      />
      <div className={`relative w-full ${sizes[size]} rounded-2xl shadow-2xl max-h-[90vh] flex flex-col
        ${isDark
          ? 'bg-[#141b2d] border border-[#1e2940]'
          : 'bg-white border border-slate-200'
        }`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b
          ${isDark ? 'border-[#1e2940]' : 'border-slate-200'}`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors
              ${isDark
                ? 'hover:bg-[#1e2940] text-[#475569] hover:text-slate-300'
                : 'hover:bg-slate-100 text-slate-500'
              }`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
