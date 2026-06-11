import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, useAnimation, useMotionValue, useTransform } from 'motion/react';
import { CheckCircle2, Clock, Pencil, Trash2, Plus, Loader2, Search, History, ArrowRight, ArrowLeft } from 'lucide-react';
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

  const [finishTime, setFinishTime] = useState('');
  const [finishParadas, setFinishParadas] = useState<ParadaRecord[]>(op.paradas || []);
  
  useEffect(() => {
    setFinishParadas(op.paradas || []);
  }, [op.paradas]);

  const [finishParadaSelectedCode, setFinishParadaSelectedCode] = useState('');
  const [finishParadaStart, setFinishParadaStart] = useState('');
  const [finishParadaEnd, setFinishParadaEnd] = useState('');
  const [finishParadaOS, setFinishParadaOS] = useState('');
  const [finishParadaObs, setFinishParadaObs] = useState('');
  const [searchParadaText, setSearchParadaText] = useState('');
  
  const [itemLoading, setItemLoading] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [showParadas, setShowParadas] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!op.carimboInicial) return;
    
    let startTime = new Date(op.carimboInicial);
    if (op.horaInicial) {
      const [hours, minutes] = op.horaInicial.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        startTime.setHours(hours, minutes, 0, 0);
        // If the resulting time is in the future by more than a minute,
        // it likely means the OP started before midnight of the current day.
        if (startTime.getTime() > Date.now() + 60000) {
          startTime.setDate(startTime.getDate() - 1);
        }
      }
    }

    const update = () => {
      // Prevent negative times if the clock is slightly off
      const diff = Math.max(0, Date.now() - startTime.getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setElapsed(`${h}h ${m}m`);
      else if (m > 0) setElapsed(`${m}m ${s}s`);
      else setElapsed(`${s}s`);
    };
    
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [op.carimboInicial, op.horaInicial]);

  const allHistoryParadas = useMemo(() => {
    const result: Array<{ opNumber: string; carimbo?: string; horaInicial: string; isFinished: boolean; parada: any }> = [];
    for (const item of linhaHistory) {
      if (!item.paradas || item.paradas.length === 0) continue;
      for (const p of item.paradas) {
        result.push({
          opNumber: item.opNumber,
          carimbo: item.carimbo,
          horaInicial: item.horaInicial,
          isFinished: 'quantidade' in item,
          parada: p,
        });
      }
    }
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
      numeroOS: finishParadaOS,
      observacao: finishParadaObs,
    };
    
    const newParadas = [...finishParadas, newParada];
    setFinishParadas(newParadas);
    updateOperation(op.id, { paradas: newParadas }).catch(console.error);
    setFinishParadaSelectedCode('');
    setFinishParadaStart('');
    setFinishParadaEnd('');
    setFinishParadaOS('');
    setFinishParadaObs('');
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
      await handleFinish(op, finishQtd, finishTime, '0', finishParadas, () => {
        setIsFinishing(false);
        setFinishQtd('');
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
      controls.start({ x: 0 });
      setIsFinishing(true);
      setFinishQtd('');
      setFinishTime(format(new Date(), 'HH:mm'));
    } else if (info.offset.x < -threshold) {
      controls.start({ x: 0 });
      setShowParadas(true);
    } else {
      controls.start({ x: 0 });
    }
  };

  const bgOpacityRight = useTransform(x, [0, 80], [0, 1]);
  const bgOpacityLeft = useTransform(x, [0, -80], [0, 1]);

  return (
    <div className="relative mb-3 group rounded-[1.5rem] sm:rounded-[2rem]">
      <div className="absolute inset-0 flex items-center justify-between rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 pointer-events-none">
         <motion.div style={{ opacity: bgOpacityRight }} className="absolute inset-y-0 left-0 w-1/2 bg-emerald-500 flex items-center pl-6 rounded-l-[1.5rem] sm:rounded-l-[2rem]">
            <CheckCircle2 className="w-8 h-8 text-white" />
            <span className="text-white font-black ml-3 text-lg hidden sm:block">Apontar OP</span>
         </motion.div>
         <motion.div style={{ opacity: bgOpacityLeft }} className="absolute inset-y-0 right-0 w-1/2 bg-amber-500 flex items-center justify-end pr-6 rounded-r-[1.5rem] sm:rounded-r-[2rem]">
            <span className="text-white font-black mr-3 text-lg hidden sm:block">Registrar Parada</span>
            <History className="w-8 h-8 text-white" />
         </motion.div>
      </div>

      <motion.div 
        drag={!isFinishing && !showParadas && !showHistory ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-white dark:bg-zinc-950 sm:rounded-[2rem] rounded-[1.5rem] p-4 sm:p-5 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 hover:shadow-lg transition-all shadow-md overflow-hidden text-left flex flex-col gap-3 sm:gap-4 touch-pan-y"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />

        <div className="pl-3 flex items-start justify-between gap-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="text-xs font-bold tracking-widest text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-sm">OP {op.opNumber}</span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-800">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
              <span className="text-[10px] font-bold tracking-widest text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm">{op.turno?.startsWith('Turno') ? op.turno : `Turno ${op.turno}`}</span>
              {op.litragem && <span className="text-[10px] font-semibold text-slate-400">{op.litragem}</span>}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight line-clamp-1 mb-1">{op.produto}</h3>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span className="text-[10px] font-semibold text-zinc-400">Início {op.horaInicial}</span>
            </div>
          </div>
          {elapsed && (
            <div className="shrink-0 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-2.5 py-2 text-center min-w-[52px]">
              <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500 mb-0.5 leading-none">em curso</p>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums leading-none">{elapsed}</p>
            </div>
          )}
        </div>

        {showParadas && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {finishParadas.length > 0 && (
              <div className="space-y-1.5">
                {finishParadas.map((parada, idx) => (
                  <div key={idx} className="relative flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2.5 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md shrink-0 ml-1">{parada.seq}</span>
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-1 min-w-0 truncate">{parada.tipologia}</span>
                    <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">{parada.horaInicio}–{parada.horaFim}</span>
                    <button
                      type="button"
                      onClick={() => editParada(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-white dark:bg-zinc-950 transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeParada(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-950/30 transition-colors shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 rotate-[135deg]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-3 space-y-3">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                {finishParadaSelectedCode ? `Motivo selecionado — ${availableParadas.find((p: any) => p.seq.toString() === finishParadaSelectedCode)?.tipologia}` : 'Selecione o motivo'}
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar motivo..."
                  value={searchParadaText}
                  onChange={e => setSearchParadaText(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-950 transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {availableParadas
                  .filter((p: any) =>
                    p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) ||
                    p.seq.toString().includes(searchParadaText)
                  )
                  .map((p: any) => (
                    <button
                      key={p.seq}
                      type="button"
                      onClick={() => setFinishParadaSelectedCode(p.seq.toString())}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95",
                        finishParadaSelectedCode === p.seq.toString()
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                          : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-400"
                      )}
                    >
                      <span className={cn("text-[9px] font-black tabular-nums", finishParadaSelectedCode === p.seq.toString() ? "text-zinc-400" : "text-zinc-400")}>{p.seq}</span>
                      {p.tipologia}
                    </button>
                  ))}
                {availableParadas.filter((p: any) =>
                  p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) ||
                  p.seq.toString().includes(searchParadaText)
                ).length === 0 && (
                  <p className="text-sm text-zinc-400 font-medium py-2 w-full text-center">Nenhum motivo encontrado</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Início</label>
                  <CustomTimePicker
                    value={finishParadaStart}
                    onChange={setFinishParadaStart}
                    placeholder="00:00"
                    clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                    wrapperClass="h-12 bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                    inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Fim</label>
                  <CustomTimePicker
                    value={finishParadaEnd}
                    onChange={setFinishParadaEnd}
                    placeholder="00:00"
                    clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                    wrapperClass="h-12 bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                    inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Número O.S.</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={finishParadaOS}
                    onChange={e => setFinishParadaOS(e.target.value)}
                    className="w-full h-12 px-3 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-950 transition-colors shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Observação</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={finishParadaObs}
                    onChange={e => setFinishParadaObs(e.target.value)}
                    className="w-full h-12 px-3 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-950 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={addParada}
                disabled={!finishParadaSelectedCode || !finishParadaStart || !finishParadaEnd}
                className="w-full h-12 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 dark:bg-zinc-700 disabled:text-zinc-400 text-white font-black text-sm rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Registrar Parada
              </Button>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {allHistoryParadas.length === 0 ? (
              <div className="flex items-center justify-center py-5 text-zinc-400">
                <p className="text-sm font-medium">Nenhuma parada registrada nesta linha</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allHistoryParadas.map((item, idx) => (
                  <div key={idx} className="relative flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl overflow-hidden">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", item.isFinished ? "bg-emerald-400" : "bg-amber-400")} />
                    <div className="flex flex-col pl-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">OP {item.opNumber}</span>
                        {item.carimbo && <span className="text-[9px] text-zinc-300 font-medium">{item.carimbo.substring(0, 10)}</span>}
                      </div>
                      <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-tight truncate">{item.parada.seq} – {item.parada.tipologia}</span>
                    </div>
                    <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">{item.parada.horaInicio}–{item.parada.horaFim}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isFinishing && (
          <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-4 space-y-4 bg-emerald-50 dark:bg-emerald-950/30 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-1 mt-1">
            <div className="grid grid-cols-2 gap-3 items-end">
              <QuickCounter label="Quantidade (UN)" value={finishQtd} onChange={setFinishQtd} className="w-full" />
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Hora Final</label>
                <CustomTimePicker
                  value={finishTime}
                  onChange={setFinishTime}
                  clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                  wrapperClass="h-[46px] bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                  inputClass="pl-9 pr-4 text-sm font-bold bg-transparent focus:ring-0 w-full h-full"
                />
              </div>
            </div>
            <Dialog open={isConfirmingFinish} onOpenChange={setIsConfirmingFinish}>
              <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                <Button size="lg" onClick={onConfirm} disabled={itemLoading} className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all">
                  {itemLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Confirmar Encerramento</>}
                </Button>
              </motion.div>
              <DialogContent className="w-full max-w-full rounded-t-[2rem] p-0 border-0 gap-0 top-auto bottom-0 translate-y-0 max-h-[92dvh] overflow-hidden flex flex-col bg-white dark:bg-zinc-950 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.25)]">
                <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-pointer" onClick={() => setIsConfirmingFinish(false)}>
                  <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>

                <div className="bg-zinc-950 mx-4 rounded-2xl p-4 shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff06_0%,transparent_60%)]" />
                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">Encerrar Produção</span>
                      <span className="text-xl font-black text-white leading-none truncate">{op.produto}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">OP {op.opNumber}</span>
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  <DialogTitle className="sr-only">Confirmar OP {op.opNumber}</DialogTitle>
                  <DialogDescription className="sr-only">Confirmar encerramento da producción</DialogDescription>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 block mb-1">Produzido</span>
                      <span className="text-2xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{parseInt(finishQtd || '0').toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-emerald-500/70 block mt-1">UN</span>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Período</span>
                        <span className="text-sm font-black text-zinc-800 dark:text-zinc-200 tabular-nums">{op.horaInicial} → {finishTime}</span>
                      </div>
                    </div>
                    {elapsed && <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/60 px-2.5 py-1 rounded-lg">{elapsed}</span>}
                  </div>

                  {finishParadas && finishParadas.length > 0 && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-3">
                      <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase mb-2.5 flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        {finishParadas.length} {finishParadas.length === 1 ? 'Parada' : 'Paradas'} registradas
                      </p>
                      <div className="space-y-1.5">
                        {finishParadas.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white dark:bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800/60">
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md shrink-0">{p.seq}</span>
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex-1 truncate">{p.tipologia}</span>
                            <span className="text-[10px] font-black text-zinc-400 tabular-nums shrink-0">{p.horaInicio}–{p.horaFim}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0 space-y-2 bg-white dark:bg-zinc-950">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button onClick={handleActualFinish} disabled={itemLoading} className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-black shadow-xl shadow-emerald-500/20 transition-all">
                      {itemLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Salvar e Concluir OP</>}
                    </Button>
                  </motion.div>
                  <Button variant="ghost" onClick={() => setIsConfirmingFinish(false)} className="w-full h-11 rounded-2xl text-sm font-bold text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800">
                    Voltar e revisar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
          {isFinishing ? (
            <button
              onClick={() => { setIsFinishing(false); setFinishQtd(''); setFinishTime(''); }}
              className="w-full sm:w-auto h-10 px-4 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => openEdit(op)} className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 rounded-xl transition-colors">
                  <Pencil className="w-4 h-4" />
                </motion.button>
                <motion.button whileTap={{ scale: 0.93 }} onClick={() => setDeletingOp(op)} className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-950/30 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" />
                </motion.button>
                <button
                  onClick={() => { setShowParadas(p => !p); setShowHistory(false); }}
                  className={cn("flex items-center gap-1.5 h-9 px-2 sm:px-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-colors shrink-0",
                    showParadas ? "bg-amber-100 text-amber-700 dark:text-amber-400" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 hover:text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Paradas</span>
                  <span className="sm:hidden">Paradas</span>
                  {finishParadas.length > 0 && <span className="bg-amber-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black">{finishParadas.length}</span>}
                </button>
                <button
                  onClick={() => { setShowHistory(h => !h); setShowParadas(false); }}
                  className={cn("flex items-center gap-1.5 h-9 px-2 sm:px-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-colors shrink-0",
                    showHistory ? "bg-blue-100 text-blue-700 dark:text-blue-400" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 hover:text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Hist.
                </button>
              </div>
              <motion.div whileTap={{ scale: 0.96 }} className="ml-auto">
                <button
                  onClick={() => { setIsFinishing(true); setFinishQtd(''); setFinishTime(format(new Date(), 'HH:mm')); }}
                  className="h-10 sm:h-12 px-3 sm:px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 sm:gap-2 shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" /> Concluir
                </button>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
});