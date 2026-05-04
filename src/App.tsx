import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, FinishedOperation, Operation, getProducts, addProduct, removeFinishedOperation, getReportForDateAndShift, getAuthProfile, updateAuthProfile, moveFinishedToPending, updateFinishedOperation, updateOperation, subscribeToOperations, subscribeToFinishedOps, getParadas, Parada, ParadaRecord } from './api';
import { LINHAS } from './data';

// Componentes UI e Ícones
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { cn, useAutoIncrement } from './lib/utils';
import { toast, Toaster } from 'sonner';
import { Check, ChevronsUpDown, Package, ClipboardList, CheckCircle2, LogOut, Loader2, Trash2, Pencil, Eye, EyeOff, RotateCcw, Wifi, Clock, KeyRound, Plus, Minus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';

const PROFILES: Record<string, string> = {
  'Turno A': 'TurnoA@Vonixx2026',
  'Turno B': 'TurnoB@Vonixx2026',
  'Turno C': 'TurnoC@Vonixx2026',
  'Turno D': 'TurnoD@Vonixx2026'
};

function getActiveTurno(now: Date = new Date()): string {
  const logicalDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const logicalTimeZeroed = Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate());
  
  // Ref date is April 29th, 2026. This was an A/B day.
  const refDate = Date.UTC(2026, 3, 29); 
  const diffDays = Math.floor((logicalTimeZeroed - refDate) / (1000 * 60 * 60 * 24));
  
  const isABDay = Math.abs(diffDays) % 2 === 0;
  
  const h = now.getHours();
  const isDayTime = h >= 6 && h < 18;

  if (isABDay) {
      return isDayTime ? 'Turno A' : 'Turno B';
  } else {
      return isDayTime ? 'Turno C' : 'Turno D';
  }
}

function getLogicalDateStr(now: Date = new Date()): string {
  const logicalDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return format(logicalDate, 'yyyy-MM-dd');
}

function getSuggestedShift(now: Date, horaInicial: string): string {
  return getActiveTurno(now).replace('Turno ', '');
}

function isShiftAllowed(profile: string): { allowed: boolean, reason?: string } {
  const activeTurno = getActiveTurno();
  if (profile === activeTurno) {
      return { allowed: true };
  } else {
      return { allowed: false, reason: `Fora do horário. O turno atual é o ${activeTurno}` };
  }
}

// Parsea un string compacto "opNumber|linha|produto|litragem|quantidade|horaInicial|horaFinal|qntReprocesso"
function parseReportString(s: string, turno: string): FinishedOperation {
  if (typeof s !== 'string') {
    return {
      id: String(s),
      opNumber: '', linha: '', produto: '', litragem: '', quantidade: '', horaInicial: '', horaFinal: '',
      turno, carimboInicial: '', reportString: ''
    };
  }
  const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal, qntReprocesso] = s.split('|');
  return {
    id: s,
    opNumber: opNumber || '',
    linha: linha || '',
    produto: produto || '',
    litragem: litragem || '',
    quantidade: quantidade || '',
    horaInicial: horaInicial || '',
    horaFinal: horaFinal || '',
    qntReprocesso: qntReprocesso || '',
    turno,
    carimboInicial: '',
    reportString: s,
  };
}

const startOpSchema = z.object({
  opNumber: z.string().min(1, 'Obrigatório'),
  produto: z.string().min(1, 'Obrigatório'),
  linha: z.string().min(1, 'Obrigatório'),
  turno: z.string().min(1, 'Obrigatório'),
  horaInicial: z.string().min(1, 'Obrigatório'),
});

type StartOpFormValues = z.infer<typeof startOpSchema>;

const CustomTimePicker = ({ value, onChange, clockIconClass, wrapperClass, inputClass, id, placeholder = "--:--" }: any) => {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState(value ? value.split(':')[0] : '12');
  const [minute, setMinute] = React.useState(value ? (value.split(':')[1] || '00') : '00');
  
  const hourRef = React.useRef<HTMLInputElement>(null);
  const minRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
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



const QuickCounter = ({ value, onChange, label, className }: any) => {
  const handleMinus10 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange(Math.max(0, current - 10).toString());
  });

  const handleMinus1 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange(Math.max(0, current - 1).toString());
  });

  const handlePlus1 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange((current + 1).toString());
  });

  const handlePlus10 = useAutoIncrement(() => {
    const current = parseInt(value || '0', 10);
    onChange((current + 10).toString());
  });

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-[10px] font-bold text-zinc-500 uppercase">{label}</label>}
      <div className="grid grid-cols-[1fr_1fr_auto_1fr_1fr] sm:grid-cols-[1fr_1fr_auto_1fr_1fr] gap-1 sm:gap-1.5 items-center w-full">
        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handleMinus10}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 text-[10px] sm:text-xs font-bold border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            -10
          </Button>
        </motion.div>
        
        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handleMinus1}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            <Minus className="w-4 h-4 mx-auto" />
          </Button>
        </motion.div>

        <Input 
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value} 
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-14 sm:w-16 h-12 text-center text-lg md:text-xl font-black font-mono bg-zinc-100 border-2 border-zinc-200 px-1" 
        />

        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handlePlus1}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            <Plus className="w-4 h-4 mx-auto" />
          </Button>
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            type="button"
            variant="outline" 
            {...handlePlus10}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-12 text-[10px] sm:text-xs font-bold border-2 border-zinc-200 bg-white px-0 select-none touch-none"
          >
            +10
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

const PendingOpItem = React.memo(({ op, handleFinish, openEdit, setDeletingOp, availableParadas }: any) => {
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [finishQtd, setFinishQtd] = React.useState('');
  const [finishQtdReprocesso, setFinishQtdReprocesso] = React.useState('');
  const [finishTime, setFinishTime] = React.useState('');
  const [finishParadas, setFinishParadas] = React.useState<ParadaRecord[]>(op.paradas || []);
  
  React.useEffect(() => {
    setFinishParadas(op.paradas || []);
  }, [op.paradas]);

  const [finishParadaSelectedCode, setFinishParadaSelectedCode] = React.useState('');
  const [finishParadaStart, setFinishParadaStart] = React.useState('');
  const [finishParadaEnd, setFinishParadaEnd] = React.useState('');
  
  const [itemLoading, setItemLoading] = React.useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = React.useState(false);
  const [showParadas, setShowParadas] = React.useState(false);

  const addParada = () => {
    if (!finishParadaSelectedCode || !finishParadaStart || !finishParadaEnd) {
      toast.error('Preencha o motivo da parada e os horários de início e término.');
      return;
    }
    const paradaBase = availableParadas.find((p: any) => p.seq.toString() === finishParadaSelectedCode);
    if (!paradaBase) {
      toast.error('Parada não encontrada.');
      return;
    }
    
    const newParada: ParadaRecord = {
      ...paradaBase,
      horaInicio: finishParadaStart,
      horaFim: finishParadaEnd,
    };
    
    const newParadas = [...finishParadas, newParada];
    setFinishParadas(newParadas);
    updateOperation(op.id, { paradas: newParadas }).catch(console.error);
    setFinishParadaSelectedCode('');
    setFinishParadaStart('');
    setFinishParadaEnd('');
  };

  const removeParada = (index: number) => {
    const newParadas = finishParadas.filter((_, i) => i !== index);
    setFinishParadas(newParadas);
    updateOperation(op.id, { paradas: newParadas }).catch(console.error);
  };

  const editParada = (index: number) => {
    const paradaToEdit = finishParadas[index];
    setFinishParadaSelectedCode(paradaToEdit.seq.toString());
    setFinishParadaStart(paradaToEdit.horaInicio);
    setFinishParadaEnd(paradaToEdit.horaFim);
    removeParada(index);
  };

  const onConfirm = async () => {
    if (!finishQtd || !finishTime) {
      toast.error('Preencha a quantidade e hora final.');
      return;
    }
    setIsConfirmingFinish(true);
  };

  const handleActualFinish = async () => {
    setItemLoading(true);
    try {
      await handleFinish(op.id, finishQtd, finishTime, finishQtdReprocesso, finishParadas, () => {
        setIsFinishing(false);
        setFinishQtd('');
        setFinishQtdReprocesso('');
        setFinishTime('');
        setFinishParadas([]);
        setIsConfirmingFinish(false);
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setItemLoading(false);
    }
  };

  const adjustQtd = (amount: number) => {
    setFinishQtd(prev => {
      const current = parseInt(prev || '0', 10);
      return Math.max(0, current + amount).toString();
    });
  };

  return (
    <div className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md transition-all shadow-sm relative overflow-hidden text-left flex flex-col gap-4 mt-2 mb-2">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-zinc-300/80 group-hover:bg-zinc-400 transition-colors" />
      <div className="flex flex-col gap-1 pl-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase bg-zinc-100/80 px-2 py-0.5 rounded-md border border-zinc-200/60 shadow-sm">OP {op.opNumber}</span>
          <span className="text-[10px] font-bold text-zinc-400 bg-white px-2 py-0.5 rounded-md border border-zinc-200/60">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
        </div>
        <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-snug">{op.produto}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {op.litragem && <span className="text-[10px] text-zinc-500 font-mono font-bold bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200">{op.litragem}</span>}
          <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Início</span>
            <span className="text-[11px] font-bold text-zinc-700">{op.horaInicial}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-zinc-200/60 pt-4">
        <div 
          className="flex items-center justify-between cursor-pointer group mb-2"
          onClick={() => setShowParadas(!showParadas)}
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-zinc-700 uppercase tracking-wider group-hover:text-zinc-900 transition-colors">Paradas</span>
            <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", finishParadas.length > 0 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500")}>
              {finishParadas.length} item(s)
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 group-hover:text-zinc-600 group-hover:bg-zinc-100 rounded-full transition-all">
            {showParadas ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </div>
        
        {showParadas && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-3 relative">
            <div className="space-y-2 mb-4">
              {finishParadas.map((parada, idx) => (
                <div key={idx} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <div className="flex flex-col pl-2">
                    <span className="text-[13px] sm:text-xs font-bold text-zinc-900 leading-tight mb-1">{parada.seq} - {parada.tipologia}</span>
                    <div className="flex items-center gap-1.5 align-middle">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span className="text-[11px] font-medium text-zinc-500">{parada.horaInicio} até {parada.horaFim}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 self-end sm:self-auto border-t border-zinc-100 sm:border-0 pt-2 sm:pt-0 w-full sm:w-auto">
                    <Button type="button" variant="ghost" size="sm" onClick={() => editParada(idx)} className="flex-1 sm:flex-none h-8 px-3 text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-600 font-semibold border border-zinc-200/60">
                      Editar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeParada(idx)} className="flex-1 sm:flex-none h-8 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-100">
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
              {finishParadas.length === 0 && (
                <div className="flex flex-col items-center justify-center p-4 bg-zinc-50/50 border border-zinc-200/50 border-dashed rounded-xl text-zinc-400 text-xs">
                   Nenhuma parada
                </div>
              )}
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 sm:p-4 shadow-sm relative">
              <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Adicionar Parada</p>
              <div className="flex flex-col gap-3">
                <div className="w-full">
                  <Select value={finishParadaSelectedCode} onValueChange={setFinishParadaSelectedCode}>
                    <SelectTrigger className="h-auto min-h-12 sm:min-h-10 py-2.5 sm:py-2 text-[13px] sm:text-xs bg-white w-full text-left font-medium text-zinc-700 shadow-sm border-zinc-200 focus:ring-zinc-900 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal whitespace-normal rounded-xl sm:rounded-lg">
                      <SelectValue placeholder="Selecione o motivo da parada">
                        {finishParadaSelectedCode 
                          ? `${finishParadaSelectedCode} - ${availableParadas.find((p: any) => p.seq.toString() === finishParadaSelectedCode)?.tipologia || ''}`
                          : <span className="text-zinc-400">Selecione o motivo da parada</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableParadas.map((p: any) => (
                        <SelectItem key={p.seq} value={p.seq.toString()} className="text-[13px] sm:text-xs [&>*]:whitespace-normal whitespace-normal py-2.5 sm:py-2 border-b border-zinc-100 last:border-0 h-auto min-h-12 sm:min-h-10 text-left">
                          {p.seq} - <span className="font-medium text-zinc-700">{p.tipologia}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none">
                      <Clock className="w-4 h-4" />
                    </div>
                    <CustomTimePicker 
                      value={finishParadaStart} 
                      onChange={setFinishParadaStart}
                      placeholder="Início"
                      wrapperClass="h-12 sm:h-10 bg-white rounded-xl sm:rounded-lg shadow-sm border border-zinc-200"
                      inputClass="text-[14px] sm:text-[13px] text-center px-1 font-bold text-zinc-800"
                    />
                  </div>
                  <div className="space-y-1.5 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none">
                      <Clock className="w-4 h-4" />
                    </div>
                    <CustomTimePicker 
                      value={finishParadaEnd} 
                      onChange={setFinishParadaEnd}
                      placeholder="Fim"
                      wrapperClass="h-12 sm:h-10 bg-white rounded-xl sm:rounded-lg shadow-sm border border-zinc-200"
                      inputClass="text-[14px] sm:text-[13px] text-center px-1 font-bold text-zinc-800"
                    />
                  </div>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addParada} className="w-full mt-4 h-11 sm:h-10 text-[13px] sm:text-xs font-bold dashed-border rounded-xl sm:rounded-lg bg-white hover:bg-zinc-100 text-zinc-700">
                <Plus className="w-4 h-4 mr-1.5" /> Adicionar à lista
              </Button>
            </div>
          </div>
        )}
      </div>

      {isFinishing ? (
        <div className="mt-3 pt-3 border-t border-zinc-200/60 space-y-4">
          <div className="space-y-4">
            <QuickCounter 
              label="Quantidade (UN)" 
              value={finishQtd} 
              onChange={setFinishQtd} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickCounter 
                label="Reprocesso" 
                value={finishQtdReprocesso} 
                onChange={setFinishQtdReprocesso} 
              />
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Hora Final</label>
                <CustomTimePicker 
                  value={finishTime} 
                  onChange={setFinishTime} 
                  clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                  wrapperClass="bg-white h-12 rounded-lg border-2 border-zinc-200 shadow-sm"
                  inputClass="pl-10 pr-3 text-base"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isConfirmingFinish} onOpenChange={setIsConfirmingFinish}>
              <motion.div whileTap={{ scale: 0.95 }} className="flex-1 w-full sm:w-auto">
                <Button size="lg" onClick={onConfirm} disabled={itemLoading} className="w-full h-16 text-lg bg-zinc-900 hover:bg-zinc-800 text-white font-black rounded-xl shadow-lg">
                  {itemLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finalizar Registro'}
                </Button>
              </motion.div>
              <DialogContent className="w-[calc(100%-2rem)] max-w-[360px] rounded-[28px] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
                <DialogHeader className="text-center space-y-2 mb-6">
                  <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">Confirmar Registro</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-medium text-[15px] leading-relaxed mx-auto max-w-[260px]">
                    Deseja salvar a produção registrada?
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-center gap-2 mb-6 flex-wrap sm:flex-nowrap">
                  <div className="flex flex-col items-center justify-center flex-1 h-20 bg-zinc-50/80 border border-zinc-200/50 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">OP</span>
                    <span className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">{op.opNumber}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-[1.2] h-20 bg-emerald-50/80 border border-emerald-200/50 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">QTD (UN)</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight">{finishQtd}</span>
                  </div>
                  {finishQtdReprocesso && parseInt(finishQtdReprocesso) > 0 && (
                     <div className="flex flex-col items-center justify-center flex-1 h-20 bg-amber-50/80 border border-amber-200/50 rounded-2xl shadow-sm">
                       <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">REP</span>
                       <span className="text-lg sm:text-xl font-black text-amber-700 tracking-tight">{finishQtdReprocesso}</span>
                     </div>
                  )}
                </div>

                {finishParadas && finishParadas.length > 0 && (
                  <div className="mb-6 bg-zinc-50 rounded-xl p-3 border border-zinc-200/60 max-h-32 overflow-y-auto">
                    <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-2 text-center">Paradas Incluídas</p>
                    <div className="space-y-1.5 flex flex-col items-center">
                      {finishParadas.map((p, i) => (
                        <div key={i} className="text-xs font-semibold text-zinc-700 text-center">
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{p.seq}</span>
                          {p.horaInicio} - {p.horaFim}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  <Button onClick={handleActualFinish} disabled={itemLoading} className="w-full h-[56px] sm:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[16px] font-black shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-900/10">
                    {itemLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sim, Salvar'}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsConfirmingFinish(false)} className="w-full h-[52px] sm:h-12 rounded-2xl text-[15px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                    Cancelar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="lg" variant="outline" onClick={() => { setIsFinishing(false); setFinishQtd(''); setFinishTime(''); setFinishQtdReprocesso(''); }} className="w-full sm:w-auto h-16 px-6 text-sm font-bold border-zinc-200/60 rounded-xl">Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-200/60">
          <motion.div whileTap={{ scale: 0.95 }} className="w-full sm:w-auto sm:flex-1">
            <Button size="lg" onClick={() => { setIsFinishing(true); setFinishQtd(''); setFinishTime(format(new Date(), 'HH:mm')); }} className="w-full h-12 sm:h-11 text-sm sm:text-[13px] bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-900/10 shadow-sm text-white font-bold rounded-xl sm:rounded-lg">
              <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2" /> Concluir OP
            </Button>
          </motion.div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => openEdit(op)} title="Editar" className="flex items-center justify-center w-12 h-12 sm:w-11 sm:h-11 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl sm:rounded-lg transition-colors border border-zinc-200 shadow-sm bg-white shrink-0"><Pencil className="w-5 h-5 sm:w-4 sm:h-4" /></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDeletingOp(op)} title="Excluir" className="flex items-center justify-center w-12 h-12 sm:w-11 sm:h-11 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl sm:rounded-lg transition-colors border border-zinc-200 shadow-sm bg-white shrink-0"><Trash2 className="w-5 h-5 sm:w-4 sm:h-4" /></motion.button>
        </div>
      )}
    </div>
  );
});

const FinishedOpItem = React.memo(({ op, openEdit, setDeletingOp, setRevertingOp }: any) => {
  return (
    <div className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md transition-all shadow-sm relative overflow-hidden flex flex-col mt-2 mb-2">
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/80 group-hover:bg-emerald-500 transition-colors" />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black tracking-widest text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shadow-sm">OP {op.opNumber}</span>
        <span className="text-[11px] font-bold text-zinc-400 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
      </div>

      <div className="text-center w-full my-2">
        <h3 className="text-[17px] sm:text-[19px] font-black text-zinc-900 tracking-tight leading-snug line-clamp-2 px-2">{op.produto}</h3>
        {op.litragem && (
          <span className="inline-block mt-2 text-[11px] text-zinc-500 font-mono font-bold bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-200">{op.litragem}</span>
        )}
      </div>

      {op.quantidade && (
        <div className="flex justify-center mt-2 mb-4">
          <div className="inline-flex items-center divide-x divide-emerald-200/50 bg-emerald-50/50 border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2 text-center bg-white">
              <span className="block text-[8px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">UNIDADES</span>
              <span className="block text-xl font-black text-emerald-600 tracking-tighter leading-none">{parseInt(op.quantidade).toLocaleString()}</span>
            </div>
            {op.qntReprocesso && parseInt(op.qntReprocesso) > 0 && (
              <div className="px-4 py-2 text-center bg-amber-50/30">
                <span className="block text-[8px] font-black text-amber-500/80 uppercase tracking-widest mb-0.5">REPROCESSO</span>
                <span className="block text-lg font-black text-amber-600 tracking-tighter leading-none">{parseInt(op.qntReprocesso).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-100/80 mt-1">
        <div className="flex items-center justify-around text-center divide-x divide-zinc-200/60">
          <div className="flex-1">
            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 pointer-events-none">Início</span>
            <span className="block text-[12px] font-black text-zinc-700">{op.horaInicial}</span>
          </div>
          {op.horaFinal && (
            <div className="flex-1">
              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 pointer-events-none">Fim</span>
              <span className="block text-[12px] font-black text-zinc-700">{op.horaFinal}</span>
            </div>
          )}
        </div>
      </div>

        {op.paradas && op.paradas.length > 0 && (
          <div className="mt-3">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Paradas Registradas ({op.paradas.length})</p>
            <div className="flex flex-col gap-1.5">
              {op.paradas.map((p: any, i: number) => (
                 <div key={i} className="flex items-center gap-2 bg-white border border-zinc-200/80 px-2 py-1.5 rounded-lg shadow-sm">
                   <div className="flex flex-col flex-1 min-w-0">
                     <span className="text-[10px] font-bold text-zinc-700 truncate">{p.seq} - {p.tipologia}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 whitespace-nowrap bg-zinc-50 px-1.5 py-0.5 rounded">
                     <Clock className="w-2.5 h-2.5" />
                     {p.horaInicio} às {p.horaFim}
                   </div>
                 </div>
              ))}
            </div>
          </div>
        )}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 overflow-x-auto scrollbar-none">
        <button
          onClick={() => openEdit(op)}
          title="Editar"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 bg-white border border-zinc-200 text-xs text-zinc-600 font-bold hover:text-zinc-900 hover:bg-zinc-100 rounded-xl sm:rounded-lg transition-colors shadow-sm uppercase tracking-wider whitespace-nowrap shrink-0"
        >
          <Pencil className="w-4 h-4" /> Editar
        </button>
        <button
          onClick={() => setRevertingOp(op)}
          title="Voltar para Pendentes"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 bg-white border border-zinc-200 text-xs text-zinc-600 font-bold hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 rounded-xl sm:rounded-lg transition-colors shadow-sm uppercase tracking-wider whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4" /> Pendentes
        </button>
        <button
          onClick={() => setDeletingOp(op)}
          title="Excluir"
          className="flex items-center justify-center shrink-0 w-11 h-11 sm:min-w-10 sm:w-10 sm:h-10 bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl sm:rounded-lg transition-colors shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default function App() {
  function extractLitragem(produto: string): string {
    const upper = (produto || '').toUpperCase();
    if (upper.includes(' IBC')) return 'IBC';
    const match = produto.match(/(\d+(?:,\d+)?)\s*(L|ML|G|KG)\b/i);
    if (match) {
      const unit = match[2].toUpperCase();
      const num = match[1];
      if (unit === 'L') return num === '1' ? '1 Litro' : `${num} Litros`;
      if (unit === 'ML') return `${num}ml`;
      if (unit === 'G') return `${num}g`;
      if (unit === 'KG') return `${num}Kg`;
    }
    return '';
  }

  const [loginProfile, setLoginProfile] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Change Password States
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changerOldPassword, setChangerOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPasswordLoading, setChangingPasswordLoading] = useState(false);
  const [showChangerPassword, setShowChangerPassword] = useState(false);

  const [mobileTab, setMobileTab] = useState<'pendentes' | 'nova' | 'concluidas'>('nova');
  const [openLineSelect, setOpenLineSelect] = useState(false);
  const [openEditLineSelect, setOpenEditLineSelect] = useState(false);
  const [searchPending, setSearchPending] = useState('');
  const [searchFinished, setSearchFinished] = useState('');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [finishedOps, setFinishedOps] = useState<FinishedOperation[]>([]);
  const [loadingNewOp, setLoadingNewOp] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingRevert, setLoadingRevert] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<{produto: string, litragem: string}[]>([]);
  const [availableParadas, setAvailableParadas] = useState<Parada[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [isTypingProduct, setIsTypingProduct] = useState(false);
  const [finishQtd, setFinishQtd] = useState('');
  const [finishQtdReprocesso, setFinishQtdReprocesso] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [finishParadas, setFinishParadas] = useState<ParadaRecord[]>([]);
  const [finishParadaSelectedCode, setFinishParadaSelectedCode] = useState('');
  const [finishParadaStart, setFinishParadaStart] = useState('');
  const [finishParadaEnd, setFinishParadaEnd] = useState('');
  
  const [searchLine, setSearchLine] = useState('');
  const [searchEditLine, setSearchEditLine] = useState('');
  const [customLinhas, setCustomLinhas] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('customLinhas');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('customLinhas', JSON.stringify(customLinhas));
  }, [customLinhas]);

  const allLinhas = useMemo(() => Array.from(new Set([...LINHAS, ...customLinhas])), [customLinhas]);

  const [editingOp, setEditingOp] = useState<Operation | FinishedOperation | null>(null);
  const [editParadas, setEditParadas] = useState<ParadaRecord[]>([]);
  const [editParadaSelectedCode, setEditParadaSelectedCode] = useState('');
  const [editParadaStart, setEditParadaStart] = useState('');
  const [editParadaEnd, setEditParadaEnd] = useState('');
  const [deletingOp, setDeletingOp] = useState<Operation | FinishedOperation | null>(null);
  const [revertingOp, setRevertingOp] = React.useState<FinishedOperation | null>(null);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [startFormData, setStartFormData] = useState<StartOpFormValues | null>(null);
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit } = useForm<StartOpFormValues & { quantidade?: string; horaFinal?: string; qntReprocesso?: string }>({});
  const watchEditProduto = watchEdit('produto');

  const novaOpRef = useRef<HTMLDivElement>(null);
  const editOpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (novaOpRef.current && !novaOpRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
        setIsTypingProduct(false);
      }
      if (editOpRef.current && !editOpRef.current.contains(event.target as Node)) {
        setShowEditProductSuggestions(false);
        setIsTypingEditProduct(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const openEdit = (op: Operation | FinishedOperation) => {
    setEditingOp(op);
    setEditParadas(op.paradas || []);
    setEditParadaSelectedCode('');
    setEditParadaStart('');
    setEditParadaEnd('');
    resetEdit({
      opNumber: op.opNumber,
      produto: op.produto,
      linha: op.linha,
      turno: op.turno,
      horaInicial: op.horaInicial,
      quantidade: (op as FinishedOperation).quantidade || '',
      horaFinal: (op as FinishedOperation).horaFinal || '',
      qntReprocesso: (op as FinishedOperation).qntReprocesso || ''
    });
  };

  const onEditOp = async (data: any) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!editingOp) return;
    setLoadingEdit(true);
    try {
      const matchedProduct = availableProducts.find(
        p => (p.produto || '').trim().toUpperCase() === (data.produto || '').trim().toUpperCase()
      );
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto || '');

      const normalizeTime = (t: string) =>
        t && t.length === 5 ? `${t}:00` : t;

      const linhaRaw = data.linha || '';
      const formattedLinha = linhaRaw
        ? isNaN(Number(linhaRaw)) ? linhaRaw : `Linha ${linhaRaw}`
        : editingOp.linha;

      if ('quantidade' in editingOp) {
        const turno = editingOp.turno || currentTurnForView;
        await updateFinishedOperation(
          editingOp.id,
          {
            opNumber: data.opNumber,
            produto: data.produto,
            litragem: derivedLitragem,
            linha: formattedLinha,
            turno: data.turno || turno,
            horaInicial: normalizeTime(data.horaInicial),
            quantidade: data.quantidade,
            horaFinal: normalizeTime(data.horaFinal),
            qntReprocesso: data.qntReprocesso,
            paradas: editParadas,
          },
          turno
        );
        toast.success('OP concluída actualizada.');
      } else {
        await updateOperation(editingOp.id, {
          opNumber: data.opNumber,
          produto: data.produto,
          litragem: derivedLitragem,
          linha: formattedLinha,
          turno: data.turno,
          horaInicial: normalizeTime(data.horaInicial),
          paradas: editParadas,
        });
        toast.success('OP actualizada.');
      }
      setEditingOp(null);
    } catch (err: any) {
      toast.error('Erro ao editar: ' + err.message);
    } finally {
      setLoadingEdit(false);
    }
  };

  const addEditParada = () => {
    if (!editParadaSelectedCode || !editParadaStart || !editParadaEnd) {
      toast.error('Preencha o motivo da parada e os horários de início e término.');
      return;
    }
    const selected = availableParadas.find((p: any) => p.seq.toString() === editParadaSelectedCode);
    if (!selected) return;
    const newParada: ParadaRecord = {
      seq: selected.seq,
      tipologia: selected.tipologia,
      horaInicio: editParadaStart,
      horaFim: editParadaEnd,
    };
    setEditParadas([...editParadas, newParada]);
    setEditParadaSelectedCode('');
    setEditParadaStart('');
    setEditParadaEnd('');
  };

  const removeEditParada = (index: number) => {
    setEditParadas(editParadas.filter((_, i) => i !== index));
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StartOpFormValues>({
    resolver: zodResolver(startOpSchema),
    defaultValues: { opNumber: '', produto: '', linha: '', turno: '', horaInicial: '' }
  });

  const loadProducts = async () => {
    const prods = await getProducts();
    setAvailableProducts(prods);
  };

  const loadParadas = async () => {
    try {
      const paradas = await getParadas();
      setAvailableParadas(paradas);
    } catch (e) {
      console.error("Error loading paradas:", e);
    }
  };

  const watchHoraInicial = watch('horaInicial');
  const watchProduto = watch('produto');

  const filteredProducts = useMemo(() => {
    if (!watchProduto) return availableProducts;
    return availableProducts.filter(p => (p.produto || '').toLowerCase().includes((watchProduto || '').toLowerCase()));
  }, [watchProduto, availableProducts]);

  const [showEditProductSuggestions, setShowEditProductSuggestions] = useState(false);
  const [isTypingEditProduct, setIsTypingEditProduct] = useState(false);
  const filteredEditProducts = useMemo(() => {
    if (!watchEditProduto) return availableProducts;
    return availableProducts.filter(p => (p.produto || '').toLowerCase().includes((watchEditProduto || '').toLowerCase()));
  }, [watchEditProduto, availableProducts]);

  useEffect(() => {
    if (watchHoraInicial) {
      if (!loginProfile) {
        setValue('turno', getSuggestedShift(new Date(), watchHoraInicial));
      } else {
        setValue('turno', loginProfile.replace('Turno ', ''));
      }
    }
  }, [watchHoraInicial, setValue, loginProfile]);

  const currentTurnForView = loginProfile
    ? loginProfile.replace('Turno ', '')
    : getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));

  const refreshData = async () => {
    try {
      await loadProducts();
      await loadParadas();
    } catch (e) {
      console.error("Error loading data:", e);
    }
  };

  useEffect(() => {
    const unsubOps = subscribeToOperations((ops) => {
      setOperations(ops);
    });
    
    const unsubFinished = subscribeToFinishedOps((ops) => {
      setFinishedOps(ops);
    });

    return () => {
      unsubOps();
      unsubFinished();
    };
  }, []);

  useEffect(() => {
    refreshData();
    setValue('horaInicial', format(new Date(), 'HH:mm'));

    const storedProfile = localStorage.getItem('loginProfile');
    if (storedProfile) {
      setLoginProfile(storedProfile);
      setValue('turno', storedProfile.replace('Turno ', ''));
    }
  }, [setValue]);

  useEffect(() => {
    refreshData();
  }, [loginProfile]);

  // Login
  const handleLogin = async () => {
    if (!selectedProfile) return;
    
    const shiftCheck = isShiftAllowed(selectedProfile);
    if (!shiftCheck.allowed) {
      toast.error(shiftCheck.reason);
      return;
    }

    setLoginLoading(true);

    try {
      const profileData = await getAuthProfile(selectedProfile);
      const correctPassword = profileData?.password || profileData?.senha || PROFILES[selectedProfile as keyof typeof PROFILES];
      if (passwordInput.trim() === correctPassword) {
        localStorage.setItem('loginProfile', selectedProfile);
        setLoginProfile(selectedProfile);
        if (selectedProfile !== 'Supervisor') setValue('turno', selectedProfile.replace('Turno ', ''));
        setPasswordInput('');
        setSelectedProfile(null);
      } else {
        toast.error('Senha incorreta. Tente novamente.');
      }
    } catch (err: any) {
      console.error("Login fetch error:", err);
      const correctPassword = PROFILES[selectedProfile as keyof typeof PROFILES];
      if (passwordInput.trim() === correctPassword) {
        localStorage.setItem('loginProfile', selectedProfile);
        setLoginProfile(selectedProfile);
        setValue('turno', selectedProfile.replace('Turno ', ''));
        setPasswordInput('');
        setSelectedProfile(null);
      } else {
        toast.error('Senha incorreta. Tente novamente.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!loginProfile) return;
    if (newPassword !== confirmNewPassword) {
      toast.error('As novas senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setChangingPasswordLoading(true);
    try {
      const profileData = await getAuthProfile(loginProfile);
      const correctPassword = profileData?.password || PROFILES[loginProfile as keyof typeof PROFILES];
      
      if (changerOldPassword !== correctPassword) {
        toast.error('Senha atual incorreta.');
        setChangingPasswordLoading(false);
        return;
      }

      await updateAuthProfile(loginProfile, newPassword);
      toast.success('Senha alterada com sucesso!');
      setChangePasswordOpen(false);
      setChangerOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar a senha.');
    } finally {
      setChangingPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    if (loginProfile) {
      try {
        const shiftCheck = isShiftAllowed(loginProfile);
        if (!shiftCheck.allowed) {
          const turno = loginProfile.replace('Turno ', '');
          const r = await import('./api');
          await r.clearTurnoRecords(turno);
        }
      } catch (e) {
        console.error("Failed to clear turno records", e);
      }
    }
    localStorage.removeItem('loginProfile');
    setLoginProfile(null);
    setSelectedProfile(null);
    setPasswordInput('');
  };

  const handlePreStartOp = (data: StartOpFormValues) => {
    setStartFormData(data);
    setShowConfirmStart(true);
  };

  const onStartOp = async (data: StartOpFormValues) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (operations.some(op => op.opNumber === data.opNumber)) {
      toast.error('Essa OP já está listada como pendente.');
      return;
    }

    setLoadingNewOp(true);
    try {
      const matchedProduct = availableProducts.find(p => (p.produto || '').trim().toUpperCase() === (data.produto || '').trim().toUpperCase());
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto || '');
      const newOpId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2);

      const newOp: Operation = {
        id: newOpId, carimboInicial: new Date().toISOString(), ...data,
        horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial,
        litragem: derivedLitragem,
        turno: loginProfile ? loginProfile.replace('Turno ', '') : data.turno
      };
      // addOperation writes locally first (offline cache) — onSnapshot reacts instantly
      await addOperation(newOp);
      addProduct(data.produto, derivedLitragem); // fire and forget
      toast.success('Operação iniciada!');
      reset({ opNumber: '', produto: '', linha: '', turno: data.turno, horaInicial: format(new Date(), 'HH:mm') });
      setShowConfirmStart(false);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setLoadingNewOp(false);
    }
  };

  const handleFinish = async (id: string, qtd: string, time: string, reprocesso: string, paradas: ParadaRecord[], onSuccess: () => void) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!qtd || !time) { toast.error('Preencha a quantidade e hora final.'); return; }

    const op = operations.find(o => o.id === id);
    if (!op) { toast.error('Operação não encontrada.'); return; }

    try {
      // Firebase write is instant (offline cache) — UI updates immediately via onSnapshot
      await markOperationFinished(
        op,
        qtd,
        time.length === 5 ? `${time}:00` : time,
        reprocesso,
        paradas,
        (success, error) => {
          if (success) {
            toast.success('Sincronizado com a planilha!');
          } else {
            toast.warning(`OP salva, mas erro ao sincronizar planilha: ${error}`);
          }
        }
      );
      // onSuccess is called right after Firebase write — before OneDrive finishes
      toast.success('OP concluída!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    }
  };

  const confirmRevert = async () => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!revertingOp) return;
    setLoadingRevert(true);
    try {
      await moveFinishedToPending(revertingOp.id, revertingOp.turno || currentTurnForView);
      toast.success('OP movida de volta para Pendentes.');
    } catch (err: any) {
      toast.error('Erro ao reverter: ' + err.message);
    } finally {
      setLoadingRevert(false);
      setRevertingOp(null);
    }
  };

  const logicalToday = getLogicalDateStr(new Date());

  const myFinishedOps = useMemo(() => finishedOps.filter(op => {
    const sameTurn = op.turno === currentTurnForView;
    if (!op.carimboInicial) return sameTurn;
    return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
  }), [finishedOps, currentTurnForView, logicalToday]);

  const myPendingOps = useMemo(() => operations.filter(op => {
    const sameTurn = op.turno === currentTurnForView;
    if (!op.carimboInicial) return sameTurn;
    return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
  }), [operations, currentTurnForView, logicalToday]);

  const matchesSearch = (op: { opNumber?: string; linha?: string; produto?: string }, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (op.opNumber || '').toLowerCase().includes(lower) || 
           (op.linha || '').toLowerCase().includes(lower) || 
           (op.produto || '').toLowerCase().includes(lower);
  };

  const visiblePendingOps = useMemo(() => myPendingOps.filter(op => matchesSearch(op, searchPending)), [myPendingOps, searchPending]);
  const visibleFinishedOps = useMemo(() => myFinishedOps.filter(op => matchesSearch(op, searchFinished)), [myFinishedOps, searchFinished]);
  const totalUnidades = myFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);
  const visibleTotalUnidades = visibleFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);

  const confirmDelete = async () => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!deletingOp) return;
    setLoadingDelete(true);
    try {
      if ('quantidade' in deletingOp) {
        await removeFinishedOperation(deletingOp.id, deletingOp.turno || currentTurnForView);
        toast.success('Registro removido.');
      } else {
        await removeOperation(deletingOp.id);
        toast.message('Operação removida.');
      }
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    } finally {
      setLoadingDelete(false);
      setDeletingOp(null);
    }
  };

  // ─── Tela de Login ────────────────────────────────────────────────────────
  if (!loginProfile) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen w-full flex bg-white">
          
          {/* Left Panel - Branding (Hidden on mobile) */}
          <div className="hidden lg:flex w-1/2 bg-zinc-950 border-r border-zinc-800 p-12 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent"></div>
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
                <Package className="w-5 h-5 text-zinc-950" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight leading-none">Produção por Linha</h1>
                <p className="text-[11px] text-zinc-400 font-mono mt-1 uppercase tracking-widest font-semibold">Vonixx — Controle de OPs</p>
              </div>
            </div>
            
            <div className="relative z-10 mb-12">
              <h2 className="text-[3.5rem] font-black text-white tracking-tighter leading-[1.1] max-w-lg">
                Controle <br/>
                <span className="text-zinc-500">Inteligente</span> <br/>
                do Chão de Fábrica.
              </h2>
              <p className="mt-6 text-base text-zinc-400 max-w-md leading-relaxed font-medium">
                Gestão em tempo real de apontamentos, litragem e controle de reprocesso das linhas. Tudo sincronizado com o OneDrive.
              </p>
            </div>
          </div>

          {/* Right Panel - Login */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative bg-[#F9FAFB] sm:bg-[#F9FAFB]/50 lg:bg-[#F9FAFB]">
            
            <div className="w-full max-w-md sm:bg-white sm:shadow-2xl sm:shadow-zinc-200/40 sm:ring-1 sm:ring-zinc-200/60 rounded-[2rem] p-6 sm:p-8 lg:p-10 relative z-10">
              
              {/* Mobile/Tablet Branding */}
              <div className="lg:hidden flex flex-col items-center gap-3 mb-8 pt-2 sm:pt-0 text-center">
                <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-900/20">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-zinc-950 tracking-tight leading-none">Produção por Linha</h1>
                  <p className="text-[11px] text-zinc-500 font-mono mt-1.5 uppercase tracking-widest font-bold">Vonixx</p>
                </div>
              </div>

              <div className="mb-8 text-center lg:text-left">
                <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">Bem-vindo(a)</h3>
                <p className="text-sm text-zinc-500 mt-2 font-medium">Acesse seu perfil para continuar.</p>
              </div>
              
              <div className="space-y-6">
                {!selectedProfile ? (
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 text-center lg:text-left">Selecione seu perfil</p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {Object.keys(PROFILES).map((profile) => (
                        <button
                          key={profile}
                          onClick={() => { setSelectedProfile(profile); setPasswordInput(''); setShowPassword(false); }}
                          className={cn(
                            'w-full p-3 sm:p-4 rounded-2xl font-bold text-[13px] sm:text-sm transition-all duration-200 border-2 text-center lg:text-left flex flex-col md:flex-row items-center justify-center md:justify-between group gap-2 md:gap-0',
                            'bg-white border-zinc-200/80 text-zinc-700 hover:border-zinc-900 hover:text-zinc-950 hover:shadow-md'
                          )}
                        >
                          <span className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center border",
                              "bg-zinc-50 border-zinc-200/60 group-hover:bg-zinc-950 transition-colors"
                            )}>
                              <Package className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                            </div>
                            {profile.replace('Turno ', 'Turno ')}
                          </span>
                          <ChevronsUpDown className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0 hidden md:block" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <button
                      onClick={() => { setSelectedProfile(null); setPasswordInput(''); }}
                      className="flex items-center justify-center lg:justify-start gap-1 text-zinc-400 hover:text-zinc-900 text-xs font-bold transition-colors uppercase tracking-wider mx-auto lg:mx-0 w-full lg:w-auto text-center lg:text-left"
                    >
                      ← Mudar Perfil
                    </button>

                    <div className="flex flex-col lg:flex-row items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm text-center lg:text-left">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex flex-shrink-0 items-center justify-center border',
                        'bg-zinc-50 border-zinc-200'
                      )}>
                        <Package className="w-5 h-5 text-zinc-800" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Perfil Selecionado</p>
                        <p className="text-base font-black text-zinc-950">{selectedProfile}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                       <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center lg:text-left">Senha de Acesso</Label>
                       <div className="relative max-w-sm mx-auto lg:max-w-none">
                         <Input
                           type={showPassword ? 'text' : 'password'}
                           value={passwordInput}
                           onChange={e => setPasswordInput(e.target.value)}
                           onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                           placeholder="Digite a senha..."
                           autoFocus
                           className="w-full h-12 bg-white border-2 border-zinc-200 text-zinc-950 placeholder:text-zinc-400 pr-12 rounded-xl focus-visible:ring-0 focus-visible:border-zinc-950 text-base shadow-sm transition-colors text-center lg:text-left"
                         />
                         <button
                           type="button"
                           onClick={() => setShowPassword(v => !v)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                         >
                           {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </button>
                       </div>
                    </div>

                    <div className="pt-4 max-w-sm mx-auto lg:max-w-none">
                        <Button
                          onClick={handleLogin}
                          disabled={loginLoading || !passwordInput}
                          className={cn(
                            'w-full h-12 font-black text-base rounded-xl transition-all',
                            'bg-zinc-950 hover:bg-zinc-800 text-white shadow-md shadow-zinc-950/20'
                          )}
                        >
                          {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Acessar Painel'}
                        </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Deleted Painel Supervisor

  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200/60 shadow-sm sticky top-0 z-30 pt-1 sm:pt-2">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0 shrink">
                <h1 className="text-sm md:text-base font-black text-zinc-900 tracking-tight leading-none truncate">Produção</h1>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5 truncate">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100/80 border border-zinc-200/60 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 max-w-[100px] md:max-w-none overflow-hidden shrink border-dashed">
                <span className="text-[9px] sm:text-[11px] font-black text-zinc-700 uppercase tracking-wider truncate">{loginProfile}</span>
              </div>
              <div className="flex items-center shrink-0">
                <button onClick={() => setChangePasswordOpen(true)} className="flex items-center justify-center text-zinc-400 hover:text-zinc-800 w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-zinc-100 transition-colors shrink-0" title="Mudar Senha">
                  <KeyRound className="w-4 h-4 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline-block text-xs font-semibold">Senha</span>
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center text-zinc-400 hover:text-red-600 w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0" title="Sair">
                  <LogOut className="w-4 h-4 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline-block text-xs font-semibold">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden sticky top-[57px] z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200/60 shadow-sm">
          <div className="flex">
            {(['pendentes', 'nova', 'concluidas'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors',
                  mobileTab === tab
                    ? 'text-zinc-900 border-b-2 border-zinc-900 bg-zinc-50/50'
                    : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                {tab === 'pendentes' ? `Pendentes (${visiblePendingOps.length})` : tab === 'nova' ? 'Nova OP' : `Concluídas (${visibleFinishedOps.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-0 sm:py-4 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-4 md:gap-6 items-start">

            {/* Pendentes */}
            <div className={cn('bg-white sm:rounded-2xl shadow-sm sm:ring-1 ring-zinc-200/60 flex flex-col overflow-hidden lg:col-span-4 lg:order-2 -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-auto lg:max-h-[calc(100vh-120px)] border-y border-zinc-200/60 sm:border-y-0', mobileTab !== 'pendentes' && 'hidden lg:flex')}>
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-zinc-100 shadow-sm ring-1 ring-zinc-200/50 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Pendentes</span>
                  <span className="bg-zinc-100/80 text-zinc-600 ring-1 ring-zinc-200/60 text-[10px] font-black px-2 py-0.5 rounded-full">{visiblePendingOps.length}</span>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-zinc-100">
                <input type="text" value={searchPending} onChange={e => setSearchPending(e.target.value)} placeholder="Buscar OP, produto, linha..." className="w-full h-10 sm:h-9 px-3 bg-[#F9FAFB] border border-zinc-200/60 rounded-lg text-[13px] sm:text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-shadow" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visiblePendingOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
                    <ClipboardList className="w-10 h-10 mb-2" />
                    <p className="text-xs font-semibold text-zinc-400">Nenhuma OP pendente</p>
                  </div>
                ) : visiblePendingOps.map(op => (
                  <PendingOpItem 
                    key={op.id} 
                    op={op} 
                    handleFinish={handleFinish} 
                    openEdit={openEdit} 
                    setDeletingOp={setDeletingOp} 
                    availableParadas={availableParadas}
                  />
                ))}
              </div>
            </div>

            {/* Nova OP */}
            <Card className={cn('bg-white sm:rounded-2xl shadow-sm sm:ring-1 ring-zinc-200/60 flex flex-col overflow-hidden lg:col-span-3 lg:order-1 border-none -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-auto lg:max-h-[calc(100vh-120px)] border-y border-zinc-200/60 sm:border-y-0', mobileTab !== 'nova' && 'hidden lg:flex')}>
              <CardHeader className="bg-zinc-900 border-b border-zinc-800 p-4 space-y-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-zinc-300" />
                    <CardTitle className="text-xs font-bold text-zinc-100 uppercase tracking-widest">Nova Ordem de Produção</CardTitle>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-widest">Turno {currentTurnForView}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit(handlePreStartOp, (errors) => {
                  const errorMsg = Object.values(errors).map(e => e.message).join(', ');
                  if (errorMsg) toast.error('Faltam dados: ' + Object.keys(errors).join(', '));
                })} className="p-4 md:p-6 space-y-4 md:space-y-5">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label htmlFor="opNumber" className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
                      <Input id="opNumber" {...register('opNumber', { onChange: (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" className="w-full h-12 md:h-11 px-3 bg-[#F9FAFB] border border-zinc-200/60 rounded-lg text-base md:text-sm font-mono text-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-400" />
                      {errors.opNumber && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.opNumber.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="horaInicial" className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                      <CustomTimePicker
                        id="horaInicial"
                        value={watch('horaInicial')}
                        onChange={(v: string) => setValue('horaInicial', v, { shouldValidate: true })}
                        clockIconClass="absolute left-3 w-4 md:w-4 h-4 md:h-4 text-zinc-400 pointer-events-none"
                        wrapperClass="bg-[#F9FAFB] rounded-lg h-12 md:h-11"
                        inputClass="pl-9 pr-3 text-base md:text-sm"
                      />
                      {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.horaInicial.message}</p>}
                    </div>
                  </div>
                  <div className="relative" ref={novaOpRef}>
                    <Label htmlFor="produto" className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Produto</Label>
                    <input id="produto" {...register('produto')} readOnly={!isTypingProduct} onClick={() => setShowProductSuggestions(true)} autoComplete="off" onFocus={() => setShowProductSuggestions(true)} placeholder="Ex: ALUMAX 5L" className="flex h-12 md:h-11 w-full rounded-lg border border-zinc-200/60 bg-[#F9FAFB] px-3 py-2 text-base md:text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400" />
                    {showProductSuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200/60 rounded-lg shadow-xl max-h-56 overflow-y-auto p-1 ring-1 ring-zinc-900/5">
                        {!isTypingProduct && (
                          <div onClick={(e) => { e.preventDefault(); setIsTypingProduct(true); setTimeout(() => document.getElementById('produto')?.focus(), 50); }} className="cursor-pointer px-3 py-2.5 text-sm text-zinc-600 font-bold hover:bg-zinc-100 hover:text-zinc-900 rounded-md flex items-center justify-center gap-2 mb-1 border border-zinc-200/50 bg-zinc-50/50">
                            <Search className="w-4 h-4" /> Buscar ou digitar Produto...
                          </div>
                        )}
                        {filteredProducts.length > 0 ? filteredProducts.map(p => (
                          <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValue('produto', p.produto); setShowProductSuggestions(false); setIsTypingProduct(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-md flex items-center justify-between gap-2 font-medium">
                            <span>{p.produto}</span>
                            {p.litragem && <span className="text-[10px] text-zinc-400 font-mono tracking-tight shrink-0">{p.litragem}</span>}
                          </div>
                        )) : watch('produto') ? (
                           <div className="px-3 py-2 text-sm text-zinc-500 font-medium cursor-pointer hover:bg-zinc-50 rounded-md" onClick={() => { setShowProductSuggestions(false); setIsTypingProduct(false); }}>
                              Adicionar novo produto "{watch('produto')}"
                           </div>
                        ) : (
                           <div className="px-3 py-2 text-sm text-zinc-500 font-medium text-center">
                              Digite na busca acima...
                           </div>
                        )}
                      </div>
                    )}
                    {errors.produto && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.produto.message}</p>}
                  </div>
                  <div>
                    <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Linha de Produção</Label>
                    <input type="hidden" {...register('linha')} />
                    <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
                      <PopoverTrigger type="button" role="combobox" aria-expanded={openLineSelect} className={cn("flex items-center justify-between w-full h-12 md:h-11 px-3 border border-zinc-200/60 bg-[#F9FAFB] transition-all duration-200 text-base md:text-sm font-semibold rounded-lg outline-none focus:ring-1 focus:ring-zinc-400", watch('linha') ? 'border-zinc-300 bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:border-zinc-300')}>
                        {watch('linha') ? `Linha ${watch('linha')}` : 'Selecione a Linha'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-zinc-200/60 rounded-xl" align="start">
                        <Command className="border-none" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                          <CommandInput placeholder="Buscar linha..." className="bg-transparent text-sm" value={searchLine} onValueChange={setSearchLine} />
                          <CommandList className="max-h-[250px] overflow-y-auto mt-1 p-1">
                            <CommandEmpty className="py-2 text-center text-xs text-zinc-500">
                              {searchLine ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="w-full justify-start font-bold text-zinc-700"
                                  onClick={() => {
                                    const newLine = searchLine.trim().startsWith('Linha') ? searchLine.trim() : `Linha ${searchLine.trim()}`;
                                    const val = newLine.replace('Linha ', '');
                                    setCustomLinhas(prev => [...prev, newLine]);
                                    setValue('linha', val, { shouldValidate: true });
                                    setOpenLineSelect(false);
                                    setSearchLine('');
                                  }}
                                >
                                  Adicionar "{searchLine}"
                                </Button>
                              ) : (
                                "Nenhuma línea encontrada."
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {allLinhas.map((linhaFull) => {
                                const lineVal = linhaFull.replace('Linha ', '');
                                return (
                                  <CommandItem key={lineVal} value={linhaFull} onSelect={() => { setValue('linha', lineVal, { shouldValidate: true }); setOpenLineSelect(false); }} className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-md aria-selected:bg-zinc-900 aria-selected:text-white transition-colors">
                                    <span className="font-bold tracking-tight">{linhaFull}</span>
                                    <Check className={cn('h-4 w-4', watch('linha') === lineVal ? 'opacity-100' : 'opacity-0')} />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors.linha && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.linha.message}</p>}
                  </div>
                  <div className="hidden">
                    <input type="hidden" {...register('turno')} />
                    <Select onValueChange={(v) => setValue('turno', v)} value={watch('turno') || ''} disabled={!!loginProfile}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Dialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
                    <motion.div whileTap={{ scale: 0.95 }} className="pt-2">
                      <Button type="submit" disabled={loadingNewOp} className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-lg rounded-xl shadow-xl transition-all ring-1 ring-zinc-900/10">
                        {loadingNewOp ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Iniciar Produção</>}
                      </Button>
                    </motion.div>
                    <DialogContent className="w-[calc(100%-2rem)] max-w-[360px] rounded-[28px] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
                      <DialogHeader className="text-center space-y-2 mb-6">
                        <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">Confirmar Início</DialogTitle>
                        <DialogDescription className="text-zinc-500 font-medium text-[15px] leading-relaxed mx-auto max-w-[260px]">
                          Deseja iniciar a produção da seguinte OP?
                        </DialogDescription>
                      </DialogHeader>

                      <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="flex flex-col items-center justify-center flex-1 h-24 bg-zinc-50/80 border border-zinc-200/50 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">OP</span>
                          <span className="text-2xl font-black text-zinc-900 tracking-tight">{startFormData?.opNumber}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center flex-1 h-24 bg-zinc-50/80 border border-zinc-200/50 rounded-2xl shadow-sm">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Linha</span>
                          <span className="text-2xl font-black text-zinc-900 tracking-tight">
                            {startFormData?.linha.replace('Linha ', '').trim()}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <Button onClick={() => startFormData && onStartOp(startFormData)} disabled={loadingNewOp} className="w-full h-[56px] sm:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[16px] font-black shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-900/10">
                          {loadingNewOp ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sim, Iniciar'}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowConfirmStart(false)} className="w-full h-[52px] sm:h-12 rounded-2xl text-[15px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                          Cancelar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </form>
              </CardContent>
            </Card>

            {/* Concluídas */}
            <div className={cn('bg-white sm:rounded-2xl shadow-sm sm:ring-1 ring-zinc-200/60 flex flex-col overflow-hidden lg:col-span-5 lg:order-3 -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-auto lg:max-h-[calc(100vh-120px)] border-y border-zinc-200/60 sm:border-y-0', mobileTab !== 'concluidas' && 'hidden lg:flex')}>
              <div className="p-4 border-b border-zinc-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Concluídas</span>
                    <span className="bg-zinc-100/80 ring-1 ring-zinc-200/60 text-zinc-600 text-[10px] font-black px-2 py-0.5 rounded-full">{visibleFinishedOps.length}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total Produzido</p>
                    <p className="text-sm font-black text-zinc-900 font-mono tracking-tight">{visibleTotalUnidades.toLocaleString()} UN</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-zinc-100">
                <input type="text" value={searchFinished} onChange={e => setSearchFinished(e.target.value)} placeholder="Buscar OP, produto, linha..." className="w-full h-10 sm:h-9 px-3 bg-[#F9FAFB] border border-zinc-200/60 rounded-lg text-[13px] sm:text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visibleFinishedOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
                    <CheckCircle2 className="w-10 h-10 mb-2" />
                    <p className="text-xs font-semibold text-zinc-400">Nenhuma OP concluída</p>
                  </div>
                ) : visibleFinishedOps.map((op) => (
                  <FinishedOpItem
                    key={op.id}
                    op={op} 
                    openEdit={openEdit} 
                    setDeletingOp={setDeletingOp} 
                    setRevertingOp={setRevertingOp} 
                  />
                ))}
              </div>
              <div className="p-3 border-t border-zinc-100 lg:hidden">
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingOp} onOpenChange={(o: boolean) => { if (!o) setDeletingOp(null); }}>
        <DialogContent className="max-w-sm rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-900">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">Tem certeza que deseja remover esta operação? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingOp(null)} className="rounded-xl border-zinc-200/60">Cancelar</Button>
            <Button onClick={confirmDelete} disabled={loadingDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm">
              {loadingDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to Pending Confirmation Dialog */}
      <Dialog open={!!revertingOp} onOpenChange={(o: boolean) => { if (!o) setRevertingOp(null); }}>
        <DialogContent className="max-w-sm rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-900">Voltar para Pendentes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            A OP <span className="font-bold text-zinc-900">{revertingOp?.opNumber}</span> será removida de Concluídas e voltará para a lista de Pendentes. O registro na planilha também será removido.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevertingOp(null)} className="rounded-xl border-zinc-200/60">Cancelar</Button>
            <Button onClick={confirmRevert} disabled={loadingRevert} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm">
              {loadingRevert ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingOp} onOpenChange={(o: boolean) => { if (!o) setEditingOp(null); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg rounded-[24px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border-zinc-200/60 max-h-[90vh] overflow-y-auto scrollbar-none">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">Editar Operação</DialogTitle>
          </DialogHeader>
          {editingOp && (
            <form onSubmit={handleSubmitEdit(onEditOp)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" {...registerEdit('opNumber', { onChange: (e) => e.target.value = e.target.value.replace(/[^0-9]/g, '') })} className="w-full h-12 sm:h-10 px-3 py-2 bg-[#F9FAFB] border border-zinc-200/60 rounded-xl sm:rounded-lg text-base sm:text-sm font-mono text-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-400" />
                </div>
                <div>
                  <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                  <CustomTimePicker
                    value={watchEdit('horaInicial')}
                    onChange={(v: string) => setValueEdit('horaInicial', v, { shouldValidate: true })}
                    clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                    wrapperClass="bg-[#F9FAFB] h-12 sm:h-10 rounded-xl sm:rounded-lg"
                    inputClass="pl-9 pr-3 py-2 text-base sm:text-sm w-full bg-transparent outline-none flex-1"
                  />
                </div>
              </div>
              <div className="relative" ref={editOpRef}>
                <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Produto</Label>
                <input id="edit-produto" {...registerEdit('produto')} readOnly={!isTypingEditProduct} onClick={() => setShowEditProductSuggestions(true)} autoComplete="off" onFocus={() => setShowEditProductSuggestions(true)} className="flex h-12 sm:h-10 w-full rounded-xl sm:rounded-lg border border-zinc-200/60 bg-white px-3 py-2 text-base sm:text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400" />
                {showEditProductSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200/60 rounded-xl sm:rounded-lg shadow-lg max-h-60 overflow-y-auto p-1">
                    {!isTypingEditProduct && (
                      <div onClick={(e) => { e.preventDefault(); setIsTypingEditProduct(true); setTimeout(() => document.getElementById('edit-produto')?.focus(), 50); }} className="cursor-pointer px-3 py-2.5 text-sm md:text-xs text-zinc-600 font-bold hover:bg-zinc-100 hover:text-zinc-900 rounded-lg sm:rounded-md flex items-center justify-center gap-2 mb-1 border border-zinc-200/50 bg-zinc-50/50">
                        <Search className="w-4 h-4" /> Buscar ou digitar Produto...
                      </div>
                    )}
                    {filteredEditProducts.length > 0 ? filteredEditProducts.map(p => (
                      <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValueEdit('produto', p.produto); setShowEditProductSuggestions(false); setIsTypingEditProduct(false); }} className="cursor-pointer px-3 py-3 sm:py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg sm:rounded-sm border-b sm:border-0 border-zinc-100/50 last:border-0">{p.produto}</div>
                    )) : watchEdit('produto') ? (
                         <div className="px-3 py-3 sm:py-2 text-sm text-zinc-500 font-medium cursor-pointer hover:bg-zinc-50 rounded-lg sm:rounded-md" onClick={() => { setShowEditProductSuggestions(false); setIsTypingEditProduct(false); }}>
                            Adicionar novo produto "{watchEdit('produto')}"
                         </div>
                    ) : (
                         <div className="px-3 py-3 sm:py-2 text-sm text-zinc-500 font-medium text-center">
                            Digite na busca acima...
                         </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Linha de Produção</Label>
                <input type="hidden" {...registerEdit('linha')} />
                <Popover open={openEditLineSelect} onOpenChange={setOpenEditLineSelect}>
                  <PopoverTrigger type="button" role="combobox" aria-expanded={openEditLineSelect} className={cn("flex items-center justify-between w-full h-12 sm:h-10 px-3 border transition-all duration-200 text-base sm:text-sm font-semibold rounded-xl sm:rounded-lg outline-none focus:ring-1 focus:ring-zinc-400", watchEdit('linha') ? 'border-zinc-300 bg-white text-zinc-900 shadow-sm' : 'border-zinc-200/60 bg-[#F9FAFB] text-zinc-500 hover:border-zinc-300')}>
                    {watchEdit('linha') ? `Linha ${watchEdit('linha').replace(/^Linha\s*/i, '')}` : 'Selecione a Linha'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl rounded-xl border-zinc-200/60" align="start">
                    <Command className="border-none" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                      <CommandInput placeholder="Buscar linha..." className="bg-transparent text-sm" value={searchEditLine} onValueChange={setSearchEditLine} />
                      <CommandList className="max-h-[250px] overflow-y-auto mt-1 p-1">
                        <CommandEmpty className="py-2 text-center text-xs text-zinc-500">
                            {searchEditLine ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-start font-bold text-zinc-700"
                                onClick={() => {
                                  const newLine = searchEditLine.trim().startsWith('Linha') ? searchEditLine.trim() : `Linha ${searchEditLine.trim()}`;
                                  const val = newLine.replace('Linha ', '');
                                  setCustomLinhas(prev => [...prev, newLine]);
                                  setValueEdit('linha', val, { shouldValidate: true });
                                  setOpenEditLineSelect(false);
                                  setSearchEditLine('');
                                }}
                              >
                                Adicionar "{searchEditLine}"
                              </Button>
                            ) : (
                              "Nenhuma linha encontrada."
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                          {allLinhas.map((linhaFull) => {
                            const lineVal = linhaFull.replace('Linha ', '');
                            return (
                              <CommandItem key={lineVal} value={linhaFull} onSelect={() => { setValueEdit('linha', lineVal, { shouldValidate: true }); setOpenEditLineSelect(false); }} className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-md aria-selected:bg-zinc-900 aria-selected:text-white transition-colors">
                                <span className="font-bold tracking-tight">{linhaFull}</span>
                                <Check className={cn('h-4 w-4', watchEdit('linha')?.replace(/^Linha\s*/i, '') === lineVal ? 'opacity-100' : 'opacity-0')} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="hidden">
                <input type="hidden" {...registerEdit('turno')} />
                <Select onValueChange={(v) => setValueEdit('turno', v)} value={watchEdit('turno') || ''} disabled={!!loginProfile}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {'quantidade' in editingOp && (
                <div className="space-y-4">
                  <QuickCounter 
                    label="Quantidade (UN)"
                    value={watchEdit('quantidade') || ''}
                    onChange={(val: string) => setValueEdit('quantidade', val, { shouldValidate: true })}
                  />
                  <QuickCounter 
                    label="Reprocesso"
                    value={watchEdit('qntReprocesso') || ''}
                    onChange={(val: string) => setValueEdit('qntReprocesso', val, { shouldValidate: true })}
                  />
                  <div>
                    <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Hora Final</Label>
                    <CustomTimePicker
                      value={watchEdit('horaFinal')}
                      onChange={(v: string) => setValueEdit('horaFinal', v, { shouldValidate: true })}
                      clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                      wrapperClass="bg-[#F9FAFB] h-12 sm:h-10 rounded-xl sm:rounded-lg"
                      inputClass="pl-9 pr-3 py-2 text-base sm:text-sm w-full bg-transparent outline-none flex-1"
                    />
                  </div>

                  {/* Paradas Edit Section */}
                  <div className="mt-4 pt-4 border-t border-zinc-200/60">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider">Paradas Registradas</Label>
                      <div className="text-[10px] font-medium px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{editParadas.length}</div>
                    </div>
                    
                    <div className="space-y-2 max-h-[250px] overflow-y-auto mb-4 scrollbar-none pr-1">
                      {editParadas.map((parada, idx) => (
                        <div key={idx} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                          <div className="flex flex-col pl-2">
                            <span className="text-[13px] font-bold text-zinc-900 leading-tight mb-1">{parada.seq} - {parada.tipologia}</span>
                            <div className="flex items-center gap-1.5 align-middle">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span className="text-[11px] font-medium text-zinc-500">{parada.horaInicio} até {parada.horaFim}</span>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeEditParada(idx)} className="h-8 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-100 self-end sm:self-auto rounded-lg">
                            Remover
                          </Button>
                        </div>
                      ))}
                      {editParadas.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-4 bg-zinc-50/50 border border-zinc-200/50 border-dashed rounded-xl text-zinc-400 text-xs">
                          Nenhuma parada
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 sm:p-4 shadow-sm relative">
                      <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Adicionar Parada</p>
                      <div className="flex flex-col gap-3">
                        <Select value={editParadaSelectedCode} onValueChange={setEditParadaSelectedCode}>
                          <SelectTrigger className="h-auto min-h-14 sm:min-h-12 py-3 sm:py-2.5 text-sm sm:text-xs bg-white text-left font-medium text-zinc-700 shadow-sm border-zinc-200 whitespace-normal rounded-xl sm:rounded-lg">
                            <SelectValue placeholder="Selecione o motivo da parada">
                              {editParadaSelectedCode 
                                ? `${editParadaSelectedCode} - ${availableParadas.find((p: any) => p.seq.toString() === editParadaSelectedCode)?.tipologia || ''}`
                                : <span className="text-zinc-400">Selecione o motivo</span>}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[250px] rounded-xl">
                            {availableParadas.map((p: any) => (
                              <SelectItem key={p.seq} value={p.seq.toString()} className="text-[13px] sm:text-xs whitespace-normal py-2 border-b border-zinc-100 last:border-0 text-left">
                                {p.seq} - <span className="font-medium text-zinc-700">{p.tipologia}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="relative">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10"><Clock className="w-4 h-4" /></div>
                             <CustomTimePicker value={editParadaStart} onChange={setEditParadaStart} placeholder="Início" wrapperClass="h-12 sm:h-10 bg-white shadow-sm border border-zinc-200 rounded-xl sm:rounded-lg" inputClass="pl-9 pr-3 text-center text-base sm:text-sm font-bold text-zinc-800 w-full outline-none flex-1 bg-transparent" />
                           </div>
                           <div className="relative">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10"><Clock className="w-4 h-4" /></div>
                             <CustomTimePicker value={editParadaEnd} onChange={setEditParadaEnd} placeholder="Fim" wrapperClass="h-12 sm:h-10 bg-white shadow-sm border border-zinc-200 rounded-xl sm:rounded-lg" inputClass="pl-9 pr-3 text-center text-base sm:text-sm font-bold text-zinc-800 w-full outline-none flex-1 bg-transparent" />
                           </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addEditParada} className="w-full h-12 sm:h-10 mt-2 text-sm sm:text-xs font-bold border-dashed rounded-xl sm:rounded-lg bg-white">
                          <Plus className="w-4 h-4 mr-1.5" /> Adicionar à lista
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setEditingOp(null)} className="w-full sm:w-auto rounded-xl border-zinc-200/60 font-medium">Cancelar</Button>
                <Button type="submit" disabled={loadingEdit} className="bg-zinc-900 text-white w-full sm:w-auto rounded-xl shadow-sm hover:bg-zinc-800 font-semibold ring-1 ring-zinc-900/10">
                  {loadingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Correção'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={(o) => { if (!o) setChangePasswordOpen(false); }}>
        <DialogContent className="max-w-sm rounded-2xl shadow-xl border-zinc-200/60 flex flex-col pt-8">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-900 text-center">Mudar Senha - {loginProfile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1 relative">
              <Label className="text-xs font-bold text-zinc-700">Senha Atual</Label>
              <Input 
                type={showChangerPassword ? "text" : "password"} 
                className="rounded-xl" 
                value={changerOldPassword} 
                onChange={e => setChangerOldPassword(e.target.value)} 
              />
              <button
                type="button"
                onClick={() => setShowChangerPassword(v => !v)}
                className="absolute right-3 top-[26px] w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"
                title="Mostrar Senha"
              >
                {showChangerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-700">Nova Senha</Label>
              <Input 
                type={showChangerPassword ? "text" : "password"} 
                className="rounded-xl" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-700">Confirmar Nova Senha</Label>
              <Input 
                type={showChangerPassword ? "text" : "password"} 
                className="rounded-xl" 
                value={confirmNewPassword} 
                onChange={e => setConfirmNewPassword(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">A senha só pode ser alterada a cada 30 dias. Utilize a mesma senha nos demais dispositivos caso seja alterada.</p>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setChangePasswordOpen(false)} className="rounded-xl border-zinc-200/60 font-medium w-full">Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={changingPasswordLoading || !changerOldPassword || !newPassword || !confirmNewPassword} className="bg-zinc-900 text-white rounded-xl shadow-sm hover:bg-zinc-800 font-semibold ring-1 ring-zinc-900/10 w-full">
              {changingPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mudar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
