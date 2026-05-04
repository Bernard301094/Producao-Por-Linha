import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Pencil, Trash2, ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { cn } from '../src/lib/utils';
import { ParadaRecord, updateOperation } from '../src/api';
import { CustomTimePicker } from './CustomTimePicker';
import { QuickCounter } from './QuickCounter';
import { format } from 'date-fns';

export const PendingOpItem = React.memo(({ op, handleFinish, openEdit, setDeletingOp, availableParadas }: any) => {
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
  
  const [itemLoading, setItemLoading] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [showParadas, setShowParadas] = useState(false);

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

  return (
    <div className="group bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xl transition-all shadow-sm relative overflow-hidden text-left flex flex-col gap-5 mb-5">
      <div className="absolute top-0 left-0 w-2 h-full bg-amber-400 group-hover:bg-amber-500 transition-colors" />
      
      {/* Header Info */}
      <div className="flex flex-col gap-3 pl-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
             <span className="text-[10px] font-black tracking-widest text-zinc-600 uppercase bg-zinc-100/80 px-2 py-1 rounded-md border border-zinc-200/80 shadow-sm">OP {op.opNumber}</span>
             <span className="text-[10px] font-bold text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200 shadow-sm flex items-center justify-center min-w-[3rem]">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200 shadow-sm shrink-0">
             <Clock className="w-3.5 h-3.5 text-zinc-400" />
             <span className="text-xs font-bold">{op.horaInicial}</span>
          </div>
        </div>
        <div className="flex flex-col mt-1">
          <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-tight pr-2">{op.produto}</h3>
          {op.litragem && (
            <div className="flex items-center mt-2">
              <span className="text-xs text-zinc-500 font-mono font-bold bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200 shadow-sm">{op.litragem}</span>
            </div>
          )}
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
                <div key={idx} className="group/parada relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-zinc-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 opacity-80" />
                  <div className="flex flex-col pl-3">
                     <span className="text-sm font-bold text-zinc-900 leading-tight mb-2">{parada.seq} - {parada.tipologia}</span>
                     <div className="flex items-center gap-1.5 align-middle bg-zinc-50 self-start px-2 py-1 rounded-md border border-zinc-100">
                       <Clock className="w-3.5 h-3.5 text-zinc-400" />
                       <span className="text-xs font-semibold text-zinc-500">{parada.horaInicio} até {parada.horaFim}</span>
                     </div>
                  </div>
                  <div className="flex gap-2 self-start sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
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
                    <SelectContent className="max-h-[50vh] w-[calc(100vw-3rem)] sm:w-[--radix-select-trigger-width] overflow-hidden rounded-[1.5rem] p-2 shadow-2xl border-0 ring-1 ring-zinc-200/80 bg-white/95 backdrop-blur-xl">
                      {availableParadas.map((p: any) => (
                        <SelectItem key={p.seq} value={p.seq.toString()} className="group outline-none py-3 px-3 rounded-2xl mb-1 last:mb-0 cursor-pointer focus:bg-[#F9FAFB] focus:text-zinc-950 transition-all border border-transparent focus:border-zinc-200/80 data-[state=checked]:bg-zinc-950 data-[state=checked]:text-white data-[state=checked]:focus:bg-zinc-950 data-[state=checked]:focus:text-white items-start sm:items-center">
                          <div className="flex items-center sm:items-center gap-3.5 pr-2 w-full flex-1">
                            <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 text-zinc-600 font-black text-xs group-focus:bg-white group-focus:text-zinc-950 group-data-[state=checked]:bg-white/20 group-data-[state=checked]:text-white group-focus:shadow-sm border border-zinc-200/60 group-data-[state=checked]:border-white/10 transition-all">
                              {p.seq}
                            </span>
                            <span className="font-bold text-sm sm:text-sm text-zinc-700 group-focus:text-zinc-950 group-data-[state=checked]:text-white break-words text-left flex-1 leading-snug pt-0.5 sm:pt-0">
                              {p.tipologia}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none">
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <CustomTimePicker 
                      value={finishParadaStart} 
                      onChange={setFinishParadaStart}
                      placeholder="Início"
                      wrapperClass="h-14 bg-[#F9FAFB] rounded-[1.25rem] shadow-sm border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors"
                      inputClass="pl-12 pr-2 text-sm text-center font-bold text-zinc-800 bg-transparent focus:ring-0"
                    />
                  </div>
                  <div className="space-y-1.5 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 z-10 pointer-events-none">
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <CustomTimePicker 
                      value={finishParadaEnd} 
                      onChange={setFinishParadaEnd}
                      placeholder="Fim"
                      wrapperClass="h-14 bg-[#F9FAFB] rounded-[1.25rem] shadow-sm border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors"
                      inputClass="pl-12 pr-2 text-sm text-center font-bold text-zinc-800 bg-transparent focus:ring-0"
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

      {/* Main Actions Block */}
      {isFinishing ? (
        <div className="mt-2 pt-6 border-t border-zinc-200/60 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
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
            <div className="space-y-2 md:col-span-2">
               <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Hora Final</label>
               <CustomTimePicker 
                 value={finishTime} 
                 onChange={setFinishTime} 
                 clockIconClass="absolute left-4 w-5 h-5 text-zinc-400 pointer-events-none"
                 wrapperClass="h-14 bg-[#F9FAFB] rounded-2xl border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                 inputClass="pl-12 pr-4 text-base font-bold bg-transparent focus:ring-0"
               />
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Dialog open={isConfirmingFinish} onOpenChange={setIsConfirmingFinish}>
              <motion.div whileTap={{ scale: 0.98 }} className="w-full">
                <Button size="lg" onClick={onConfirm} disabled={itemLoading} className="w-full h-16 text-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all focus-visible:ring-4 focus-visible:ring-emerald-500/20">
                  {itemLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar Encerramento'}
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
            <Button size="lg" variant="outline" onClick={() => { setIsFinishing(false); setFinishQtd(''); setFinishTime(''); setFinishQtdReprocesso(''); }} className="w-full h-14 text-base font-bold bg-white border-2 border-zinc-200/80 rounded-2xl hover:bg-zinc-50 text-zinc-600 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900/20 shadow-sm">
               Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-2 pt-6 border-t border-zinc-200/60">
          <motion.div whileTap={{ scale: 0.98 }} className="col-span-4 sm:col-span-4">
            <Button size="lg" onClick={() => { setIsFinishing(true); setFinishQtd(''); setFinishTime(format(new Date(), 'HH:mm')); }} className="w-full h-14 text-sm sm:text-base bg-zinc-950 hover:bg-zinc-800 text-white font-black rounded-xl shadow-xl shadow-zinc-900/10 transition-all focus-visible:ring-4 focus-visible:ring-zinc-900/20">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Concluir OP
            </Button>
          </motion.div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => openEdit(op)} title="Editar" className="col-span-2 sm:col-span-1 flex items-center justify-center w-full h-14 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 hover:border-zinc-300 rounded-xl transition-colors border-2 border-zinc-200/80 shadow-sm bg-white focus-visible:ring-2 focus-visible:ring-zinc-900/20 outline-none">
             <Pencil className="w-5 h-5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setDeletingOp(op)} title="Excluir" className="col-span-2 sm:col-span-1 flex items-center justify-center w-full h-14 text-zinc-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors border-2 border-zinc-200/80 shadow-sm bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 outline-none">
             <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>
      )}
    </div>
  );
});
