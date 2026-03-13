import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (start: Date, end: Date) => void;
  currentStart: Date;
  currentEnd: Date;
}

export default function PeriodSelectorModal({ isOpen, onClose, onApply, currentStart, currentEnd }: Props) {
  const [tempStart, setTempStart] = useState(format(currentStart, 'yyyy-MM'));
  const [tempEnd, setTempEnd] = useState(format(currentEnd, 'yyyy-MM'));

  useEffect(() => {
    if (isOpen) {
      setTempStart(format(currentStart, 'yyyy-MM'));
      setTempEnd(format(currentEnd, 'yyyy-MM'));
    }
  }, [isOpen, currentStart, currentEnd]);

  if (!isOpen) return null;

  const handleApply = () => {
    const [startYear, startMonth] = tempStart.split('-');
    const [endYear, endMonth] = tempEnd.split('-');
    
    const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, 1);
    const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1, 1);
    
    if (startDate > endDate) {
      alert('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }
    
    onApply(startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">Période</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">De</label>
            <input 
              type="month" 
              value={tempStart} 
              onChange={e => setTempStart(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">À</label>
            <input 
              type="month" 
              value={tempEnd} 
              onChange={e => setTempEnd(e.target.value)} 
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            />
          </div>
        </div>
        
        <button 
          onClick={handleApply} 
          className="w-full bg-neutral-900 text-white font-semibold py-4 rounded-xl hover:bg-neutral-800 transition-colors active:scale-95"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
}
