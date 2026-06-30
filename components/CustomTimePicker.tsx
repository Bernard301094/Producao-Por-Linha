import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { cn } from '../src/lib/utils';
import { Clock, ChevronUp, ChevronDown, Delete } from 'lucide-react';
import { format, subMinutes } from 'date-fns';

export const CustomTimePicker = ({ value, onChange, clockIconClass, wrapperClass, inputClass, id, placeholder = "--:--" }: any) => {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(value ? value.split(':')[0] : '12');
  const [minute, setMinute] = useState(value ? (value.split(':')[1] || '00') : '00');
  
  // 'hour' | 'minute'
  const [activeField, setActiveField] = useState<'hour' | 'minute'>('hour');

  useEffect(() => {
    if (value) {
      const parts = value.split(':');
      if (parts[0]) setHour(parts[0]);
      if (parts[1]) setMinute(parts[1]);
    }
  }, [value, open]);

  const handleConfirm = () => {
    let hTemp = parseInt(hour || '0', 10);
    let mTemp = parseInt(minute || '0', 10);
    if(isNaN(hTemp)) hTemp = 0;
    if(isNaN(mTemp)) mTemp = 0;
    
    if(hTemp < 0) hTemp = 0;
    if(hTemp > 23) hTemp = 23;
    if(mTemp < 0) mTemp = 0;
    if(mTemp > 59) mTemp = 59;

    onChange(`${hTemp.toString().padStart(2, '0')}:${mTemp.toString().padStart(2, '0')}`);
    setOpen(false);
  };

  const applyQuickTime = (minutesToSubtract: number) => {
    const time = subMinutes(new Date(), minutesToSubtract);
    setHour(format(time, 'HH'));
    setMinute(format(time, 'mm'));
  };

  // Numpad logic
  const handleNumpad = (num: string) => {
    if (activeField === 'hour') {
      setHour(prev => {
        let current = prev === '00' || prev === '0' ? '' : prev;
        let next = current + num;
        if (next.length > 2) next = next.slice(-2);
        
        // Auto-advance if 2 digits entered
        if (next.length === 2) {
          let h = parseInt(next, 10);
          if (h > 23) h = 23;
          setTimeout(() => setActiveField('minute'), 100);
          return h.toString().padStart(2, '0');
        }
        return next;
      });
    } else {
      setMinute(prev => {
        let current = prev === '00' || prev === '0' ? '' : prev;
        let next = current + num;
        if (next.length > 2) next = next.slice(-2);
        
        if (next.length === 2) {
          let m = parseInt(next, 10);
          if (m > 59) m = 59;
          return m.toString().padStart(2, '0');
        }
        return next;
      });
    }
  };

  const handleBackspace = () => {
    if (activeField === 'hour') {
      setHour(prev => prev.length > 0 ? prev.slice(0, -1) : '');
    } else {
      setMinute(prev => prev.length > 0 ? prev.slice(0, -1) : '');
    }
  };

  // Steppers
  const adjustHour = (delta: number) => {
    let h = parseInt(hour || '0', 10) + delta;
    if (h > 23) h = 0;
    if (h < 0) h = 23;
    setHour(h.toString().padStart(2, '0'));
  };

  const adjustMinute = (delta: number) => {
    let m = parseInt(minute || '0', 10) + delta;
    if (m > 59) {
      m = 0;
      adjustHour(1);
    } else if (m < 0) {
      m = 59;
      adjustHour(-1);
    }
    setMinute(m.toString().padStart(2, '0'));
  };

  return (
    <>
      <div 
         className={cn("relative flex items-center bg-[#F9FAFB] border-2 border-zinc-200 dark:border-zinc-800/80 rounded-2xl focus-within:border-zinc-950 transition-colors shadow-sm focus-within:bg-white dark:bg-zinc-950 overflow-hidden cursor-pointer", wrapperClass)}
         onClick={() => { setOpen(true); setActiveField('hour'); }}
      >
         {clockIconClass && <Clock className={clockIconClass} />}
         <input 
           id={id}
           type="text" 
           readOnly
           value={value || ''} 
           placeholder={placeholder}
           className={cn("w-full h-full bg-transparent border-none shadow-none focus-visible:ring-0 pointer-events-none px-4 font-bold text-zinc-900 dark:text-zinc-100", inputClass)} 
         />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[340px] rounded-[2rem] p-5 shadow-2xl border-0 ring-1 ring-zinc-200 dark:ring-zinc-800/50 gap-0 [&>button]:hidden bg-card">
          <DialogTitle className="text-center text-lg font-black text-zinc-950 dark:text-zinc-50 mb-4 tracking-tight uppercase">Definir Horário</DialogTitle>
          
          {/* Displays and Steppers */}
          <div className="flex items-center justify-center gap-3 mb-6 select-none">
             
             {/* Hour */}
             <div className="flex flex-col items-center gap-2">
               <button onClick={() => adjustHour(1)} className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"><ChevronUp className="w-6 h-6 text-zinc-600 dark:text-zinc-400"/></button>
               
               <div 
                 onClick={() => setActiveField('hour')}
                 className={cn(
                   "w-20 h-20 flex items-center justify-center text-4xl font-black rounded-2xl transition-all cursor-pointer shadow-sm border-2",
                   activeField === 'hour' 
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500 scale-105" 
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                 )}
               >
                 {hour || '00'}
               </div>
               
               <button onClick={() => adjustHour(-1)} className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"><ChevronDown className="w-6 h-6 text-zinc-600 dark:text-zinc-400"/></button>
             </div>

             <div className="text-3xl font-black text-zinc-300 dark:text-zinc-700 pb-12">:</div>

             {/* Minute */}
             <div className="flex flex-col items-center gap-2">
               <button onClick={() => adjustMinute(1)} className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"><ChevronUp className="w-6 h-6 text-zinc-600 dark:text-zinc-400"/></button>
               
               <div 
                 onClick={() => setActiveField('minute')}
                 className={cn(
                   "w-20 h-20 flex items-center justify-center text-4xl font-black rounded-2xl transition-all cursor-pointer shadow-sm border-2",
                   activeField === 'minute' 
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500 scale-105" 
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800"
                 )}
               >
                 {minute || '00'}
               </div>
               
               <button onClick={() => adjustMinute(-1)} className="p-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"><ChevronDown className="w-6 h-6 text-zinc-600 dark:text-zinc-400"/></button>
             </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-4 gap-2 mb-6 px-1">
            <button onClick={() => applyQuickTime(0)} className="col-span-2 h-10 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors active:scale-95">Agora</button>
            <button onClick={() => applyQuickTime(5)} className="h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95">-5m</button>
            <button onClick={() => applyQuickTime(15)} className="h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95">-15m</button>
          </div>

          {/* Integrated Numpad */}
          <div className="grid grid-cols-3 gap-2 mb-6 px-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num} 
                onClick={() => handleNumpad(num.toString())}
                className="h-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xl font-black text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <div className="h-12"></div>
            <button 
                onClick={() => handleNumpad('0')}
                className="h-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xl font-black text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
            >
              0
            </button>
            <button 
                onClick={handleBackspace}
                className="h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xl font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 active:scale-95 transition-all shadow-sm flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button onClick={() => setOpen(false)} className="flex-1 h-12 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-2xl font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ring-1 ring-inset ring-zinc-200 dark:ring-zinc-800">
              Cancelar
            </button>
            <button onClick={handleConfirm} className="flex-1 h-12 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 active:scale-95">
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

