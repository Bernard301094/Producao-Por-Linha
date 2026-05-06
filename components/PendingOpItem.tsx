import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, useAnimation, useMotionValue, useTransform } from 'motion/react';
import { CheckCircle2, Clock, Pencil, Trash2, ChevronDown, ChevronUp, Plus, Loader2, Search, History, ArrowRight, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { cn } from '../src/lib/utils';
import { ParadaRecord, updateOperation } from '../src/api';
import { CustomTimePicker } from './CustomTimePicker';
import { QuickCounter } from './QuickCounter';
import { format } from 'date-fns';

export const PendingOpItem = React.memo(({ op, handleFinish, openEdit, setDeletingOp, availableParadas, linhaHistory = [] }: any) => {
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishQtd, setFinishQtd] = useState('');
  const [finishQtdReprocesso, setFinishQtdReprocesso] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [finishParadas, setFinishParadas] = useState<ParadaRecord[]>(op.paradas || []);
  
  useEffect(() => {
    setFinishParadas(op.paradas || []);
  }, [op.paradas]);

  const [finishParadaSelectedCode, setFinishParadaSelectedCode] = useState('');
  const [finishParadaStart, setFinishParadaStart] = useState('');
  const [finishParadaEnd, setFinishParadaEnd] = useState('');
  const [searchParadaText, setSearchParadaText] = useState('');
  
  const [itemLoading, setItemLoading] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [showParadas, setShowParadas] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Build flattened history of all paradas from both finished and other pending ops of same linha
  const allHistoryParadas = useMemo(() => {
    const result: Array<{ opNumber: string; carimbo?: string; horaInicial: string; isFinished: boolean; parada: any }> = [];
    for (const item of linhaHistory) {
      if (!item.paradas || item.paradas.length === 0) continue;
      for (const p of item.paradas) {
        result.push({
          opNumber: item.opNumber,
          carimbo: item.carimbo,
          horaInicial: item.horaInicial,
          isFinished: 'quantidade' in item, // Finished ops have 'quantidade'
          parada: p,
        });
      }
    }
    // Sort by carimbo or start time descending (most recent first)
    return result.sort((a, b) => {
      if (a.parada.horaInicio && b.parada.horaInicio) {
        return b.parada.horaInicio.localeCompare(a.parada.horaInicio);
      }
      return 0;
    });
  }, [linhaHistory]);

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
      await handleFinish(op, finishQtd, finishTime, finishQtdReprocesso, finishParadas, () => {
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

  const controls = useAnimation();
  const x = useMotionValue(0);

  const handleDragEnd = async (_e: any, info: any) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      // Swiped right -> Concluir OP (Apontar)
      controls.start({ x: 0 });
      setIsFinishing(true);
      setFinishQtd('');
      setFinishTime(format(new Date(), 'HH:mm'));
    } else if (info.offset.x < -threshold) {
      // Swiped left -> Parada
      controls.start({ x: 0 });
      setShowParadas(true);
      // scroll is nice but handled automatically usually or we can rely on user scrolling
    } else {
      controls.start({ x: 0 });
    }
  };

  // Transform values for background opacity
  const bgOpacityRight = useTransform(x, [0, 80], [0, 1]);
  const bgOpacityLeft = useTransform(x, [0, -80], [0, 1]);

  return (
    <div className="relative mb-3 group rounded-[1.5rem] sm:rounded-[2rem]">
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-zinc-100 pointer-events-none">
         {/* Left background -> Swipe Right to Finish */}
         <motion.div style={{ opacity: bgOpacityRight }} className="absolute inset-y-0 left-0 w-1/2 bg-emerald-500 flex items-center pl-6 rounded-l-[1.5rem] sm:rounded-l-[2rem]">
            <CheckCircle2 className="w-8 h-8 text-white" />
            <span className="text-white font-black ml-3 text-lg hidden sm:block">Apontar OP</span>
         </motion.div>
         {/* Right background -> Swipe Left to Parada */}
         <motion.div style={{ opacity: bgOpacityLeft }} className="absolute inset-y-0 right-0 w-1/2 bg-amber-500 flex items-center justify-end pr-6 rounded-r-[1.5rem] sm:rounded-r-[2rem]">
            <span className="text-white font-black mr-3 text-lg hidden sm:block">Registrar Parada</span>
            <History className="w-8 h-8 text-white" />
         </motion.div>
      </div>

      <motion.div 
        drag={!isFinishing ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-white sm:rounded-[2rem] rounded-[1.5rem] p-4 sm:p-5 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md transition-all shadow-sm overflow-hidden text-left flex flex-col gap-3 sm:gap-4 touch-pan-y"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 group-hover:bg-amber-500 transition-colors animate-[pulse_2s_ease-in-out_infinite]" />
        
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pl-3">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
             <span className="text-[10px] font-black tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 shadow-sm w-fit">OP {op.opNumber}</span>
             <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200/80">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
             {op.litragem && (
               <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">{op.litragem}</span>
             )}
             <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold bg-white/50 border border-zinc-100 px-2 py-0.5 rounded shrink-0 ml-auto sm:ml-0">
               <Clock className="w-3 h-3 text-zinc-400" /> {op.horaInicial}
             </div>
          </div>
          <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-snug w-full line-clamp-2">{op.produto}</h3>
        </div>
      </div>

      {/* Accordion Paradas */}
      <div className="border border-zinc-200/80 rounded-2xl overflow-hidden bg-white shadow-sm mt-1">
        <button 
          type="button"
          className="flex items-center justify-between w-full px-4 py-3 sm:p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
          onClick={() => setShowParadas(!showParadas)}
        >
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-black text-zinc-700 uppercase tracking-widest">Paradas</span>
            <div className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-md border transition-colors", finishParadas.length > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-500 border-zinc-200 shadow-sm")}>
              {finishParadas.length} {finishParadas.length === 1 ? 'registro' : 'registros'}
            </div>
          </div>
          <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-zinc-200/60 shadow-sm text-zinc-500 transition-transform">
            {showParadas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        
        {showParadas && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 border-t border-zinc-200/80 bg-zinc-50/50">
            <div className="space-y-3 mb-5">
              {finishParadas.map((parada, idx) => (
                <div key={idx} className="group/parada relative flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 opacity-80" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pl-3 flex-1 min-w-[200px]">
                     <span className="text-sm font-bold text-zinc-900 leading-tight flex-1 break-words">{parada.seq} - {parada.tipologia}</span>
                     <div className="flex items-center gap-1.5 align-middle bg-zinc-50 self-start sm:self-auto px-2.5 py-1.5 rounded-md border border-zinc-100 shrink-0">
                       <Clock className="w-3.5 h-3.5 text-zinc-400" />
                       <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">{parada.horaInicio} até {parada.horaFim}</span>
                     </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-auto w-full sm:w-auto shrink-0 pl-3 sm:pl-0">
                     <Button type="button" variant="outline" size="sm" onClick={() => editParada(idx)} className="flex-1 sm:flex-none h-10 px-4 text-xs bg-white hover:bg-zinc-50 text-zinc-700 font-bold border-2 border-zinc-200/80 rounded-xl shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-zinc-900/20">
                       Editar
                     </Button>
                     <Button type="button" variant="outline" size="sm" onClick={() => removeParada(idx)} className="flex-1 sm:flex-none h-10 px-4 text-xs bg-red-50/50 hover:bg-red-50 text-red-600 font-bold border-2 border-red-100 rounded-xl shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-red-500/20">
                       Remover
                     </Button>
                  </div>
                </div>
              ))}
              {finishParadas.length === 0 && (
                <div className="flex flex-col items-center justify-center p-6 bg-white border border-zinc-200/60 border-dashed rounded-2xl text-zinc-400 shadow-sm">
                   <p className="text-sm font-medium">Nenhuma parada registrada</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-4">Adicionar Parada</p>
              <div className="flex flex-col gap-4">
                <div className="w-full">
                  <Select value={finishParadaSelectedCode} onValueChange={setFinishParadaSelectedCode}>
                    <SelectTrigger className="min-h-[4.5rem] py-3 h-auto px-4 sm:px-5 bg-white w-full text-left font-semibold text-zinc-800 shadow-sm border-2 border-zinc-200/80 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-900/10 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal whitespace-normal rounded-[1.25rem] transition-all group hover:border-zinc-300 items-center">
                      <SelectValue placeholder="Selecione o motivo da parada">
                        {finishParadaSelectedCode 
                          ? (
                            <div className="flex items-center gap-3 w-full pr-2">
                              <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 font-black text-sm border border-zinc-200/80 shadow-inner">
                                {finishParadaSelectedCode}
                              </span>
                              <span className="font-bold text-sm sm:text-base text-zinc-950 break-words leading-tight flex-1">
                                {availableParadas.find((p: any) => p.seq.toString() === finishParadaSelectedCode)?.tipologia || ''}
                              </span>
                            </div>
                          )
                          : <span className="text-zinc-400 font-bold text-sm sm:text-base flex items-center pr-2"><ChevronDown className="w-5 h-5 mr-3 shrink-0 text-zinc-300" />Toque para selecionar...</span>}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[50vh] w-[calc(100vw-3rem)] sm:w-[--radix-select-trigger-width] overflow-y-auto overflow-x-hidden rounded-[1.5rem] p-2 shadow-2xl border-0 ring-1 ring-zinc-200/80 bg-white/95 backdrop-blur-xl z-50">
                      <div className="p-2 border-b border-zinc-100/80 sticky top-0 bg-white/95 backdrop-blur-xl z-[60] -m-2 mb-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            type="text" 
                            placeholder="Buscar parada..." 
                            className="w-full h-10 pl-9 pr-4 bg-zinc-50 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-800 placeholder:text-zinc-400"
                            value={searchParadaText}
                            onChange={(e) => setSearchParadaText(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      {availableParadas.filter((p: any) => p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText)).map((p: any) => (
                        <SelectItem key={p.seq} value={p.seq.toString()} className="group outline-none py-3 px-3 rounded-2xl mb-1 last:mb-0 cursor-pointer focus:bg-[#F9FAFB] focus:text-zinc-950 transition-all border border-transparent focus:border-zinc-200/80 data-[state=checked]:bg-zinc-950 data-[state=checked]:text-white data-[state=checked]:focus:bg-zinc-950 data-[state=checked]:focus:text-white items-start sm:items-center">
                          <div className="flex items-center sm:items-center gap-3.5 pr-2 w-full flex-1">
                            <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600 font-black text-xs group-focus:bg-white group-focus:text-zinc-950 group-data-[state=checked]:bg-white/20 group-data-[state=checked]:text-white group-focus:shadow-sm border border-zinc-200/60 group-data-[state=checked]:border-white/10 transition-all">
                              {p.seq}
                            </span>
                            <span className="font-bold text-sm sm:text-sm text-zinc-700 group-focus:text-zinc-950 group-data-[state=checked]:text-white whitespace-normal break-words [&]:line-clamp-none text-left flex-1 leading-snug pt-0.5 sm:pt-0">
                              {p.tipologia}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {availableParadas.filter((p: any) => p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText)).length === 0 && (
                        <div className="py-6 text-center text-sm font-medium text-zinc-500">
                          Nenhuma parada encontrada.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none">
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <CustomTimePicker 
                      value={finishParadaStart} 
                      onChange={setFinishParadaStart}
                      placeholder="Início"
                      wrapperClass="h-14 bg-[#F9FAFB] rounded-[1.25rem] shadow-sm border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors"
                      inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 bg-transparent focus:ring-0"
                    />
                  </div>
                  <div className="space-y-1.5 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none">
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <CustomTimePicker 
                      value={finishParadaEnd} 
                      onChange={setFinishParadaEnd}
                      placeholder="Fim"
                      wrapperClass="h-14 bg-[#F9FAFB] rounded-[1.25rem] shadow-sm border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors"
                      inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 bg-transparent focus:ring-0"
                    />
                  </div>
                </div>
              </div>
              <Button type="button" variant="outline" onClick={addParada} className="w-full mt-5 h-14 text-sm font-bold border-dashed border-2 border-zinc-200 rounded-[1.25rem] bg-white hover:bg-zinc-50 hover:text-zinc-900 text-zinc-600 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-zinc-900/20">
                <Plus className="w-5 h-5 mr-2" /> Adicionar Parada
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico da Linha */}
      <div className="border border-zinc-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
        <button
          type="button"
          className="flex items-center justify-between w-full px-4 py-3 sm:p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="flex items-center gap-3">
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-[13px] font-black text-zinc-700 uppercase tracking-widest">Histórico da Linha</span>
            <div className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-md border transition-colors", allHistoryParadas.length > 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-zinc-50 text-zinc-500 border-zinc-200 shadow-sm")}>
              {allHistoryParadas.length} {allHistoryParadas.length === 1 ? 'parada' : 'paradas'}
            </div>
          </div>
          <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-zinc-200/60 shadow-sm text-zinc-500">
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showHistory && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 border-t border-zinc-200/80 bg-zinc-50/50">
            {allHistoryParadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 bg-white border border-zinc-200/60 border-dashed rounded-2xl text-zinc-400 shadow-sm">
                <p className="text-sm font-medium">Nenhuma parada nas OPs concluídas desta linha</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allHistoryParadas.map((item, idx) => (
                  <div key={idx} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden group/hist hover:border-zinc-300 transition-all">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 opacity-70", item.isFinished ? "bg-emerald-400" : "bg-amber-400")} />
                    <div className="flex flex-col pl-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter",
                          item.isFinished ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-amber-50 text-amber-700 border-amber-200/60"
                        )}>
                          {item.isFinished ? 'Concluída' : 'Em Aberto'}
                        </span>
                        <span className="text-[10px] font-black text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/60">OP {item.opNumber}</span>
                        {item.carimbo && <span className="text-[9px] font-bold text-zinc-400">{item.carimbo.split(' ')[0]}</span>}
                      </div>
                      <span className="text-sm font-bold text-zinc-900 leading-tight group-hover/hist:text-black transition-colors">{item.parada.seq} - {item.parada.tipologia}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-3 sm:pl-0 shrink-0 bg-zinc-50/50 self-start sm:self-auto px-3 py-2 rounded-xl border border-zinc-100 group-hover/hist:bg-white transition-colors">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <span className="text-xs font-black text-zinc-600 whitespace-nowrap">{item.parada.horaInicio} — {item.parada.horaFim}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Actions Block */}
      {isFinishing ? (
        <div className="mt-1 pt-4 border-t border-zinc-200/60 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 w-full items-start">
            <QuickCounter 
              label="Quantidade (UN)" 
              value={finishQtd} 
              onChange={setFinishQtd} 
              className="w-full"
            />
            <QuickCounter 
              label="Reprocesso" 
              value={finishQtdReprocesso} 
              onChange={setFinishQtdReprocesso} 
              className="w-full"
            />
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
               <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Hora Final</label>
               <CustomTimePicker 
                 value={finishTime} 
                 onChange={setFinishTime} 
                 clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                 wrapperClass="h-12 bg-[#F9FAFB] rounded-xl border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                 inputClass="pl-9 pr-4 text-sm font-bold bg-transparent focus:ring-0 w-full"
               />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Dialog open={isConfirmingFinish} onOpenChange={setIsConfirmingFinish}>
              <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                <Button size="lg" onClick={onConfirm} disabled={itemLoading} className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all focus-visible:ring-4 focus-visible:ring-emerald-500/20">
                  {itemLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Encerramento'}
                </Button>
              </motion.div>
              <DialogContent className="w-[calc(100%-2rem)] max-w-[420px] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
                <DialogHeader className="text-center space-y-3 mb-8">
                  <div className="w-16 h-16 bg-emerald-100/50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-200/50 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <DialogTitle className="text-2xl font-black text-zinc-950 tracking-tight">Confirmar OP</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-medium text-base leading-relaxed mx-auto max-w-[280px]">
                    Confirmar o encerramento da produção?
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                  <div className="flex flex-col items-center justify-center flex-1 min-w-[30%] h-24 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-2xl shadow-inner">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">OP</span>
                    <span className="text-2xl font-black text-zinc-950 tracking-tight">{op.opNumber}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-[1.2] min-w-[40%] h-24 bg-emerald-50 border-2 border-emerald-200/60 rounded-2xl shadow-inner">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Total (UN)</span>
                    <span className="text-2xl font-black text-emerald-700 tracking-tight">{finishQtd}</span>
                  </div>
                  {finishQtdReprocesso && parseInt(finishQtdReprocesso) > 0 && (
                     <div className="flex flex-col items-center justify-center flex-1 min-w-[30%] h-24 bg-amber-50 border-2 border-amber-200/60 rounded-2xl shadow-inner mt-3 sm:mt-0">
                       <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Reprocesso</span>
                       <span className="text-2xl font-black text-amber-700 tracking-tight">{finishQtdReprocesso}</span>
                     </div>
                  )}
                </div>

                {finishParadas && finishParadas.length > 0 && (
                  <div className="mb-8 bg-[#F9FAFB] rounded-2xl p-4 border border-zinc-200/80 max-h-48 overflow-y-auto shadow-inner">
                    <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-4 text-center">Registros de Parada</p>
                    <div className="space-y-3 flex flex-col">
                      {finishParadas.map((p, i) => (
                        <div key={i} className="text-xs font-bold text-zinc-700 flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-zinc-200/60 shadow-sm">
                          <span className="bg-amber-100/50 text-amber-700 px-2 py-1 rounded-md border border-amber-200/60 font-black">{p.seq}</span>
                          <span className="text-zinc-500 font-medium tracking-tight bg-zinc-50 px-2 flex-1 text-center py-1 rounded-md">{p.horaInicio} - {p.horaFim}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-col gap-3">
                  <Button onClick={handleActualFinish} disabled={itemLoading} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-black shadow-xl shadow-emerald-500/20 focus-visible:ring-4 focus-visible:ring-emerald-500/20 transition-all">
                    {itemLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sim, Salvar OP'}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsConfirmingFinish(false)} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">
                    Cancelar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="lg" variant="outline" onClick={() => { setIsFinishing(false); setFinishQtd(''); setFinishTime(''); setFinishQtdReprocesso(''); }} className="w-full h-12 text-sm font-bold bg-white border-2 border-zinc-200/80 rounded-xl hover:bg-zinc-50 text-zinc-600 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900/20 shadow-sm">
               Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-zinc-200/60">
           <div className="flex gap-2">
             <motion.button whileTap={{ scale: 0.95 }} onClick={() => openEdit(op)} title="Editar" className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-colors bg-transparent outline-none">
               <Pencil className="w-4 h-4" />
             </motion.button>
             <motion.button whileTap={{ scale: 0.95 }} onClick={() => setDeletingOp(op)} title="Excluir" className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors bg-transparent outline-none">
               <Trash2 className="w-4 h-4" />
             </motion.button>
           </div>
           
           <div className="flex gap-2">
             <Button size="sm" variant="ghost" onClick={() => setShowParadas(true)} className="text-zinc-500 font-bold hover:bg-zinc-100 hover:text-zinc-900 h-10 px-3 rounded-xl">
               <History className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Parada</span>
             </Button>
             <Button size="sm" variant="ghost" onClick={() => { setIsFinishing(true); setFinishQtd(''); setFinishTime(format(new Date(), 'HH:mm')); }} className="text-zinc-500 font-bold hover:bg-zinc-100 hover:text-zinc-900 h-10 px-3 rounded-xl">
               <CheckCircle2 className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Apontar</span>
             </Button>
           </div>
        </div>
      )}
      </motion.div>
    </div>
  );
});
