import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { cn } from '../src/lib/utils';
import { Clock } from 'lucide-react';

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
      {/* Mobile/Tablet Trigger - hidden on lg and above */}
      <div 
         className={cn("relative flex items-center bg-white border border-zinc-200/60 rounded-md focus-within:ring-1 focus-within:ring-zinc-400 overflow-hidden cursor-pointer lg:hidden", wrapperClass)}
         onClick={() => setOpen(true)}
      >
         {clockIconClass && <Clock className={clockIconClass} />}
         <input 
           id={id}
           type="text" 
           readOnly
           value={value || ''} 
           placeholder={placeholder}
           className={cn("w-full h-full bg-transparent border-none shadow-none focus-visible:ring-0 pointer-events-none px-3 font-mono text-zinc-900", inputClass)} 
         />
      </div>

      {/* Desktop Native Input - hidden below lg */}
      <div 
         className={cn("relative flex items-center bg-white border border-zinc-200/60 rounded-md focus-within:ring-1 focus-within:ring-zinc-400 overflow-hidden hidden lg:flex", wrapperClass)}
      >
         {clockIconClass && <Clock className={clockIconClass} />}
         <input 
           id={id ? `${id}-desktop` : undefined}
           type="time" 
           value={value || ''} 
           onChange={(e) => onChange(e.target.value)}
           className={cn("w-full h-full bg-transparent border-none shadow-none focus-visible:ring-0 cursor-pointer px-3 font-mono text-zinc-900 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:bg-transparent", inputClass)} 
         />
      </div>

      <Dialog open={open} onOpenChange={(v) => { 
        setOpen(v); 
        if (v) { 
           setTimeout(() => hourRef.current?.focus(), 100);
        }
      }}>
        <DialogContent className="max-w-[280px] rounded-3xl p-5 shadow-2xl border-zinc-200/60 bg-white [&>button]:hidden">
          <DialogTitle className="text-center text-sm font-black text-zinc-900 mb-4 tracking-tight">Definir Horário</DialogTitle>
          
          <div className="flex items-center justify-center gap-3 mb-6 mt-2">
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
                 className="w-20 h-24 text-5xl font-black text-center text-zinc-900 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-2xl focus:border-amber-500 focus:bg-amber-50/50 focus:ring-0 focus:outline-none transition-colors selection:bg-amber-200"
               />
               <span className="absolute -bottom-5 left-0 w-full text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Hora</span>
             </div>
             <span className="text-3xl font-black text-zinc-400 self-start mt-5">:</span>
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
                 className="w-20 h-24 text-5xl font-black text-center text-zinc-900 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-2xl focus:border-amber-500 focus:bg-amber-50/50 focus:ring-0 focus:outline-none transition-colors selection:bg-amber-200"
               />
               <span className="absolute -bottom-5 left-0 w-full text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Min.</span>
             </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-8">
            <button onClick={() => setOpen(false)} className="w-full sm:flex-1 h-12 bg-zinc-100 text-zinc-500 rounded-xl font-bold text-sm hover:bg-zinc-200 hover:text-zinc-700 transition-colors">
              Cancelar
            </button>
            <button onClick={handleConfirm} className="w-full sm:flex-[1.5] h-12 bg-zinc-900 text-white rounded-xl font-black text-sm hover:bg-zinc-800 transition-colors shadow-md">
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
