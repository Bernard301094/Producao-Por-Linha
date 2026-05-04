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
