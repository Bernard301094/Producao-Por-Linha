import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { cn } from '../src/lib/utils';
import { Clock } from 'lucide-react';

import { format, subMinutes } from 'date-fns';

export const CustomTimePicker = ({ value, onChange, clockIconClass, wrapperClass, inputClass, id, placeholder = "--:--" }: any) => {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(value ? value.split(':')[0] : '12');
  const [minute, setMinute] = useState(value ? (value.split(':')[1] || '00') : '00');
  
  const hourRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);

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

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setHour(val);
    if (val.length === 2 && parseInt(val, 10) <= 23) {
      minRef.current?.focus();
    }
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setMinute(val);
  };

  return (
    <>
      {/* Trigger for all devices */}
      <div 
         className={cn("relative flex items-center bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-2xl focus-within:border-zinc-950 transition-colors shadow-sm focus-within:bg-white overflow-hidden cursor-pointer", wrapperClass)}
         onClick={() => setOpen(true)}
      >
         {clockIconClass && <Clock className={clockIconClass} />}
         <input 
           id={id}
           type="text" 
           readOnly
           value={value || ''} 
           placeholder={placeholder}
           className={cn("w-full h-full bg-transparent border-none shadow-none focus-visible:ring-0 pointer-events-none px-4 font-bold text-zinc-900", inputClass)} 
         />
      </div>

      <Dialog open={open} onOpenChange={(v) => { 
        setOpen(v); 
        if (v) { 
           setTimeout(() => hourRef.current?.focus(), 100);
        }
      }}>
        <DialogContent className="max-w-[320px] rounded-[2rem] p-6 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0 [&>button]:hidden">
          <DialogTitle className="text-center text-xl font-black text-zinc-950 mb-6 tracking-tight">Definir Horário</DialogTitle>
          
          <div className="flex items-center justify-center gap-3 mb-8">
             <div className="relative">
               <input 
                 ref={hourRef}
                 type="text" 
                 inputMode="numeric"
                 value={hour}
                 onChange={handleHourChange}
                 onFocus={(e) => e.target.select()}
                 onBlur={(e) => {
                    let h = parseInt(e.target.value, 10);
                    if (isNaN(h)) h = 0;
                    if (h > 23) h = 23;
                    setHour(h.toString().padStart(2, '0'));
                 }}
                 className="w-24 h-24 text-5xl font-black text-center text-zinc-900 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-[1.25rem] focus:border-zinc-950 focus:bg-white focus:ring-0 focus:outline-none transition-all shadow-sm selection:bg-zinc-200"
               />
               <span className="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hora</span>
             </div>
             <span className="text-4xl font-black text-zinc-300 self-start mt-4">:</span>
             <div className="relative">
               <input 
                 ref={minRef}
                 type="text" 
                 inputMode="numeric"
                 value={minute}
                 onChange={handleMinChange}
                 onFocus={(e) => e.target.select()}
                 onBlur={(e) => {
                    let m = parseInt(e.target.value, 10);
                    if (isNaN(m)) m = 0;
                    if (m > 59) m = 59;
                    setMinute(m.toString().padStart(2, '0'));
                 }}
                 className="w-24 h-24 text-5xl font-black text-center text-zinc-900 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-[1.25rem] focus:border-zinc-950 focus:bg-white focus:ring-0 focus:outline-none transition-all shadow-sm selection:bg-zinc-200"
               />
               <span className="absolute -bottom-6 left-0 w-full text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">Min.</span>
             </div>
          </div>

          <div className="flex gap-2 mb-6 justify-center">
            <button onClick={() => applyQuickTime(0)} className="flex-1 h-10 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs border border-blue-200/60 hover:bg-blue-100 transition-colors">Agora</button>
            <button onClick={() => applyQuickTime(5)} className="flex-1 h-10 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-xs border border-zinc-200 hover:bg-zinc-200 transition-colors">-5 min</button>
            <button onClick={() => applyQuickTime(15)} className="flex-1 h-10 bg-zinc-100 text-zinc-700 rounded-xl font-bold text-xs border border-zinc-200 hover:bg-zinc-200 transition-colors">-15 min</button>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <button onClick={handleConfirm} className="w-full h-14 bg-zinc-950 text-white rounded-2xl font-black text-base hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 focus-visible:ring-4 focus-visible:ring-zinc-900/20">
              Confirmar
            </button>
            <button onClick={() => setOpen(false)} className="w-full h-14 bg-white text-zinc-500 rounded-2xl font-bold text-base hover:bg-zinc-100 hover:text-zinc-900 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900/20">
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
