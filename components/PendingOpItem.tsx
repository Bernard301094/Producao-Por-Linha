import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, useAnimation, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, Pencil, Trash2, Plus, Loader2, Search, History, ArrowRight, ArrowLeft, X, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { cn, formatLinhaName, getLinhaColors } from '../src/lib/utils';
import { ParadaRecord, updateOperation } from '../src/api';
import { CustomTimePicker } from './CustomTimePicker';
import { QuickCounter } from './QuickCounter';
import { format } from 'date-fns';

export const PendingOpItem = React.memo(({ op, handleFinish, openEdit, setDeletingOp, availableParadas, linhaHistory = [] }: any) => {
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishQtd, setFinishQtd] = useState('');

  const [finishTime, setFinishTime] = useState('');
  const [finishObs, setFinishObs] = useState('');
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
        if (startTime.getTime() > Date.now() + 60000) {
          startTime.setDate(startTime.getDate() - 1);
        }
      }
    }

    const update = () => {
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

  const openParada = useMemo(() => finishParadas.find(p => !p.horaFim), [finishParadas]);
  const [paradaElapsed, setParadaElapsed] = useState('');

  useEffect(() => {
    if (!openParada || !openParada.horaInicio) return;
    
    const [hours, minutes] = openParada.horaInicio.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;
    
    let pStartTime = new Date();
    pStartTime.setHours(hours, minutes, 0, 0);
    if (pStartTime.getTime() > Date.now() + 60000) {
      pStartTime.setDate(pStartTime.getDate() - 1);
    }

    const updateP = () => {
      const diff = Math.max(0, Date.now() - pStartTime.getTime());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setParadaElapsed(`${m}m ${s}s`);
    };
    
    updateP();
    const id = setInterval(updateP, 1000);
    return () => clearInterval(id);
  }, [openParada]);

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
    if (!finishParadaSelectedCode || !finishParadaStart) {
      toast.error('Preencha o motivo e a hora de início da parada.');
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
      ...(finishParadaEnd ? { horaFim: finishParadaEnd } : {}),
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
    setFinishParadaOS(paradaToEdit.numeroOS || '');
    setFinishParadaObs(paradaToEdit.observacao || '');
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
      await handleFinish(op, finishQtd || '0', finishTime, finishObs, finishParadas, () => {
        setIsFinishing(false);
        setFinishQtd('');
        setFinishTime('');
        setFinishObs('');
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
        <div className={cn("absolute top-0 left-0 w-1 h-full", openParada ? "bg-red-500" : "bg-emerald-500")} />

        <div className="pl-2 flex flex-col gap-3">
          
          {/* Top Row: Badge & Timers */}
          <div className="flex items-start justify-between">
            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-md text-[11px] font-black tracking-widest uppercase border border-border/50">
              OP {op.opNumber}
            </span>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); openEdit(op); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                title="Editar OP"
              >
                <Pencil className="w-4 h-4" />
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setDeletingOp(op); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-red-50 dark:bg-zinc-900 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 transition-colors"
                title="Excluir OP"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

              {openParada ? (
                <div className="shrink-0 flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-2.5 py-1 rounded-full shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-black tabular-nums">{paradaElapsed}</span>
                </div>
              ) : elapsed ? (
                <div className="shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-black tabular-nums">{elapsed}</span>
                </div>
              ) : null}
              
              <button 
                onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 ml-0.5"
                title="Histórico da Linha"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="flex flex-col mt-0.5">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight line-clamp-2">
              {op.produto}
            </h3>
            
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 mt-2 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
              <span style={{ color: getLinhaColors(formatLinhaName(op.linha)).text }}>{formatLinhaName(op.linha)}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span>{op.turno?.startsWith('Turno') ? op.turno : `Turno ${op.turno}`}</span>
              
              {op.litragem && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span>{op.litragem}</span>
                </>
              )}
              
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{op.horaInicial}</span>
              </div>
              
              {op.operador && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <div className="flex items-center gap-1 text-zinc-400">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{op.operador}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {openParada ? (
              <Button 
                variant="destructive" 
                onClick={(e) => { e.stopPropagation(); setShowParadas(true); }}
                className="h-14 rounded-xl font-black text-sm shadow-sm"
              >
                Terminar Parada
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={(e) => { e.stopPropagation(); setShowParadas(true); }}
                className="h-14 rounded-xl font-black text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 dark:text-amber-400 dark:border-amber-800/50 shadow-sm"
              >
                <Clock className="w-5 h-5 mr-2 opacity-80" /> Parada
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={(e) => { e.stopPropagation(); setIsFinishing(true); setFinishTime(format(new Date(), 'HH:mm')); }}
              className={cn(
                "h-14 rounded-xl font-black text-sm shadow-sm",
                openParada 
                  ? "bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-600 dark:border-zinc-800 opacity-60" 
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800/50"
              )}
              disabled={openParada}
            >
              <CheckCircle2 className="w-5 h-5 mr-2 opacity-80" /> Apontar
            </Button>
          </div>
        </div>



        {showHistory && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="sticky top-[100px] z-10 flex items-center justify-between py-2 -mt-2 mb-1 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/50">Histórico da Linha</span>
              <button 
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
                    <span className="text-xs font-black text-zinc-500 dark:text-zinc-400 shrink-0 tabular-nums">{item.parada.horaInicio}–{item.parada.horaFim || <span className="text-amber-500 uppercase tracking-widest text-[9px]">Pendente</span>}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isFinishing && (
          <div className="border-t border-emerald-200 dark:border-emerald-800/50 pt-4 space-y-4 bg-emerald-50 dark:bg-emerald-950/30 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-1 mt-1">
            <div className="grid gap-3 items-end grid-cols-2">
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
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Observação da OP (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Produto correto cherry wax..."
                value={finishObs}
                onChange={e => setFinishObs(e.target.value)}
                className="w-full h-10 px-4 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors shadow-sm"
              />
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
                        <span className="text-[10px] font-bold tracking-widest px-2 py-1 rounded-md border shadow-sm" style={{ backgroundColor: getLinhaColors(op.linha).bg, color: getLinhaColors(op.linha).text, borderColor: getLinhaColors(op.linha).border }}>
                          {formatLinhaName(op.linha).toUpperCase()}
                        </span>
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
                            <span className="text-[10px] font-black text-zinc-400 tabular-nums shrink-0">{p.horaInicio}–{p.horaFim || <span className="text-amber-500 uppercase tracking-widest text-[8px]">Pendente</span>}</span>
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

        {isFinishing && (
          <div className="flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-1">
            <button
              onClick={() => { setIsFinishing(false); setFinishQtd(''); setFinishTime(''); setFinishObs(''); }}
              className="w-full sm:w-auto h-10 px-4 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors"
            >
              Cancelar Apontamento
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showParadas && (
          <Dialog open={showParadas} onOpenChange={setShowParadas}>
            <DialogContent className="w-full max-w-full rounded-t-[2rem] p-0 border-0 gap-0 top-auto bottom-0 translate-y-0 max-h-[92dvh] overflow-hidden flex flex-col bg-white dark:bg-zinc-950 shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.25)]">
              <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-pointer bg-white dark:bg-zinc-950 sticky top-0 z-20" onClick={() => setShowParadas(false)}>
                <div className="w-10 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>

              <div className="px-4 pb-4 bg-white dark:bg-zinc-950 sticky top-6 z-10 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Registro de Paradas</h2>
                  <button 
                    type="button"
                    onClick={() => setShowParadas(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {finishParadas.length > 0 && (
                  <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                    {finishParadas.map((parada, idx) => (
                      <div key={idx} className="relative flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2.5 overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                        <div className="flex flex-col flex-1 min-w-0 pl-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md shrink-0">{parada.seq}</span>
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex-1 min-w-0 truncate">{parada.tipologia}</span>
                          </div>
                          {(parada.numeroOS || parada.observacao) && (
                            <div className="mt-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-2">
                              {parada.numeroOS && <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-bold">OS: {parada.numeroOS}</span>}
                              {parada.observacao && <span>{parada.observacao}</span>}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">{parada.horaInicio}–{parada.horaFim || <span className="text-amber-500 uppercase tracking-widest text-[8px]">Pendente</span>}</span>
                        <button
                          type="button"
                          onClick={() => editParada(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeParada(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 rotate-[135deg]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/10">
                <DialogTitle className="sr-only">Registrar Parada para OP {op.opNumber}</DialogTitle>
                <DialogDescription className="sr-only">Menu de registro de paradas de maquina</DialogDescription>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { setFinishParadaStart(format(new Date(), 'HH:mm')); }}
                    className="h-10 bg-white dark:bg-zinc-950 border-2 rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" /> Agora
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { 
                      const d = new Date(); 
                      d.setMinutes(d.getMinutes() - 10); 
                      setFinishParadaStart(format(d, 'HH:mm')); 
                    }}
                    className="h-10 bg-white dark:bg-zinc-950 border-2 rounded-xl text-xs font-bold shadow-sm"
                  >
                    -10 Minutos
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Motivo Rápido</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableParadas.slice(0, 3).map((p: any) => (
                      <Button
                        key={p.seq}
                        variant={finishParadaSelectedCode === p.seq.toString() ? "default" : "outline"}
                        onClick={() => setFinishParadaSelectedCode(p.seq.toString())}
                        className={cn("h-12 justify-start px-3 rounded-xl border-2 text-xs", 
                          finishParadaSelectedCode === p.seq.toString() 
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md"
                            : "bg-white dark:bg-zinc-950"
                        )}
                      >
                        <span className="truncate">{p.tipologia}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4 shadow-sm">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar outros motivos..."
                      value={searchParadaText}
                      onChange={e => setSearchParadaText(e.target.value)}
                      className="w-full h-11 pl-9 pr-4 bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-zinc-200 dark:focus:border-zinc-700 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none transition-colors"
                    />
                  </div>

                  {searchParadaText && (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
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
                                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-400"
                            )}
                          >
                            <span className={cn("text-[9px] font-black tabular-nums", finishParadaSelectedCode === p.seq.toString() ? "text-zinc-400" : "text-zinc-500")}>{p.seq}</span>
                            {p.tipologia}
                          </button>
                        ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Início</label>
                      <CustomTimePicker
                        value={finishParadaStart}
                        onChange={setFinishParadaStart}
                        placeholder="00:00"
                        clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                        wrapperClass="h-12 bg-zinc-50 dark:bg-zinc-900 rounded-xl border-2 border-transparent focus-within:border-zinc-200 dark:focus-within:border-zinc-700 transition-colors shadow-none"
                        inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Fim (Opcional)</label>
                      <CustomTimePicker
                        value={finishParadaEnd}
                        onChange={setFinishParadaEnd}
                        placeholder="--:--"
                        clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                        wrapperClass="h-12 bg-zinc-50 dark:bg-zinc-900 rounded-xl border-2 border-transparent focus-within:border-zinc-200 dark:focus-within:border-zinc-700 transition-colors shadow-none"
                        inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Nº O.S.</label>
                      <input
                        type="text"
                        placeholder="Opcional"
                        value={finishParadaOS}
                        onChange={e => setFinishParadaOS(e.target.value)}
                        className="w-full h-12 px-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-zinc-200 dark:focus:border-zinc-700 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Obs.</label>
                      <input
                        type="text"
                        placeholder="Opcional"
                        value={finishParadaObs}
                        onChange={e => setFinishParadaObs(e.target.value)}
                        className="w-full h-12 px-3 bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus:border-zinc-200 dark:focus:border-zinc-700 rounded-xl text-sm font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky bottom-0 z-10 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.05)]">
                <Button
                  type="button"
                  onClick={addParada}
                  disabled={!finishParadaSelectedCode || !finishParadaStart}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-400 text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" /> Salvar Parada
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
});