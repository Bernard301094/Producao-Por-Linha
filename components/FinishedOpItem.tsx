import React, { useState } from 'react';
import { Clock, Pencil, RotateCcw, Trash2, CloudOff, RefreshCw, Plus, ArrowRightLeft, Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CustomTimePicker } from './CustomTimePicker';
import { cn } from '../src/lib/utils';
import { toast } from 'sonner';

export const FinishedOpItem = React.memo(({ op, openEdit, setDeletingOp, setRevertingOp, onSyncRetry, availableParadas = [], onAddForgottenParada, onConvertToOp }: any) => {
  // ── Parada Esquecida modal ──────────────────────────────────────────────────
  const [showForgotModal, setShowForgotModal]   = useState(false);
  const [forgotMotivo,    setForgotMotivo]       = useState('');
  const [forgotStart,     setForgotStart]        = useState('');
  const [forgotEnd,       setForgotEnd]          = useState('');
  const [forgotOS,        setForgotOS]           = useState('');
  const [forgotObs,       setForgotObs]          = useState('');
  const [forgotSearch,    setForgotSearch]       = useState('');
  const [loadingForgot,   setLoadingForgot]      = useState(false);

  // ── Converter para OP modal ─────────────────────────────────────────────────
  const [showConvertModal, setShowConvertModal]  = useState(false);
  const [convHoraInicial,  setConvHoraInicial]   = useState('');
  const [convHoraFinal,    setConvHoraFinal]     = useState('');
  const [loadingConvert,   setLoadingConvert]    = useState(false);

  const resetForgot  = () => { setForgotMotivo(''); setForgotStart(''); setForgotEnd(''); setForgotSearch(''); setForgotOS(''); setForgotObs(''); };
  const resetConvert = () => { setConvHoraInicial(''); setConvHoraFinal(''); };

  const handleAddForgot = async () => {
    if (!forgotMotivo || !forgotStart || !forgotEnd) { toast.error('Preencha motivo e horários.'); return; }
    const base = availableParadas.find((p: any) => p.seq.toString() === forgotMotivo);
    if (!base) { toast.error('Selecione um motivo válido.'); return; }
    setLoadingForgot(true);
    try {
      await onAddForgottenParada?.(op, { ...base, horaInicio: forgotStart, horaFim: forgotEnd, numeroOS: forgotOS, observacao: forgotObs });
      toast.success('Parada adicionada ao histórico!');
      setShowForgotModal(false); resetForgot();
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setLoadingForgot(false); }
  };

  const handleConvert = async () => {
    if (!convHoraInicial || !convHoraFinal) {
      toast.error('Preencha a hora de início e de término.'); return;
    }
    setLoadingConvert(true);
    try {
      await onConvertToOp?.(op, { horaInicial: convHoraInicial, horaFinal: convHoraFinal });
      toast.success('OP convertida com sucesso!');
      setShowConvertModal(false); resetConvert();
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setLoadingConvert(false); }
  };

  return (
    <div className={`relative bg-white dark:bg-zinc-950 rounded-2xl xl:rounded-3xl overflow-hidden mb-3 border transition-all shadow-md hover:shadow-lg ${op.syncStatus === 'error' ? 'border-red-200 dark:border-red-800/50 ring-1 ring-red-100' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}>
      {/* Top accent */}
      <div className={`h-1 xl:h-1.5 w-full ${op.syncStatus === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />

      <div className="p-4 xl:p-5 2xl:p-6">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3 mb-3 xl:mb-4">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-[10px] xl:text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg">
                OP {op.opNumber}
              </span>
              <span className="text-[10px] xl:text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg">
                {op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}
              </span>
              {op.litragem && (
                <span className="text-[10px] xl:text-xs font-semibold text-slate-400">{op.litragem}</span>
              )}
              <span className="text-[10px] xl:text-xs font-bold tracking-widest text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg shadow-sm">
                {op.turno?.startsWith('Turno') ? op.turno : `Turno ${op.turno}`}
              </span>
              {op.isAvulsa && (
                <span className="text-[10px] xl:text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg">PARADA AVULSA</span>
              )}
            </div>
            <h3 className="text-base xl:text-lg 2xl:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight line-clamp-1">{op.produto}</h3>
          </div>
          {/* Time badge */}
          <div className="shrink-0 flex items-center gap-1 text-[10px] xl:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-xl">
            <Clock className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-slate-400" />
            {op.horaInicial}{op.horaFinal ? ` → ${op.horaFinal}` : ''}
          </div>
        </div>

        {/* Stats */}
        {op.quantidade && (
          <div className="flex items-stretch gap-2 xl:gap-3 mb-3 xl:mb-4">
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 rounded-xl xl:rounded-2xl px-3 xl:px-4 py-2 xl:py-3 flex flex-col">
              <span className="text-[8px] xl:text-[9px] font-bold text-emerald-600 dark:text-emerald-500/70 uppercase tracking-widest leading-none mb-1">Produzido</span>
              <span className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{parseInt(op.quantidade).toLocaleString()}</span>
              <span className="text-[9px] xl:text-[10px] font-bold text-emerald-500/60 mt-1">UN</span>
            </div>
          </div>
        )}

        {/* Paradas chips */}
        {op.paradas && op.paradas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 xl:mb-4">
            {op.paradas.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-2.5 xl:px-3 py-1.5 xl:py-2">
                <span className="text-[9px] xl:text-[10px] font-black text-zinc-500 dark:text-zinc-400 tabular-nums">{p.seq}</span>
                <span className="text-[10px] xl:text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[120px] xl:max-w-[160px] truncate">{p.tipologia}</span>
                <span className="text-[9px] xl:text-[10px] font-black text-zinc-400 tabular-nums">{p.horaInicio}–{p.horaFim}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sync error */}
        {op.syncStatus === 'error' && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-3 mb-3 xl:mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-xs xl:text-sm font-bold text-red-700 dark:text-red-400">Falha na sincronização</span>
            </div>
            <button
              onClick={() => onSyncRetry && onSyncRetry(op)}
              className="flex items-center gap-1.5 text-[11px] xl:text-xs font-bold bg-white dark:bg-zinc-950 text-red-700 dark:text-red-400 px-3 py-1.5 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Tentar
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 xl:pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {op.isAvulsa ? (
            <button
              onClick={() => { resetConvert(); setShowConvertModal(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 xl:h-12 text-xs xl:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl xl:rounded-2xl transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 xl:w-4 xl:h-4" /> Converter para OP
            </button>
          ) : (
            <button
              onClick={() => setRevertingOp(op)}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 xl:h-12 text-xs xl:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl xl:rounded-2xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 xl:w-4 xl:h-4" /> Reverter OP
            </button>
          )}
          <button
            onClick={() => openEdit(op)}
            className="w-10 xl:w-12 h-10 xl:h-12 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 rounded-xl xl:rounded-2xl transition-colors border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950"
          >
            <Pencil className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
          </button>
          <button
            onClick={() => setDeletingOp(op)}
            className="w-10 xl:w-12 h-10 xl:h-12 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:bg-red-950/30 rounded-xl xl:rounded-2xl transition-colors border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950"
          >
            <Trash2 className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
          </button>
        </div>

        {/* + Adicionar Parada Esquecida */}
        <button
          onClick={() => { resetForgot(); setShowForgotModal(true); }}
          className="w-full mt-2 flex items-center justify-center gap-1.5 h-9 text-[11px] xl:text-xs font-bold text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900/50 rounded-xl transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"
        >
          <Plus className="w-3 h-3 xl:w-3.5 xl:h-3.5" /> Adicionar Parada Esquecida
        </button>
      </div>

      {/* ── Parada Esquecida Modal ───────────────────────────────────────────── */}
      <Dialog open={showForgotModal} onOpenChange={(o) => { if (!o) { setShowForgotModal(false); resetForgot(); } }}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 border-0 ring-1 ring-zinc-200 dark:ring-zinc-800/50 shadow-2xl top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 gap-0 max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="mb-5 space-y-1">
            <DialogTitle className="text-xl font-black text-zinc-950 dark:text-zinc-50">+ Parada Esquecida</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">OP {op.opNumber} — {op.produto}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 block">Motivo da Parada</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar motivo..."
                  value={forgotSearch}
                  onChange={e => setForgotSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium focus:outline-none focus:border-zinc-950 transition-colors"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {availableParadas
                  .filter((p: any) => p.tipologia.toLowerCase().includes(forgotSearch.toLowerCase()) || p.seq.toString().includes(forgotSearch))
                  .map((p: any) => (
                    <button
                      key={p.seq}
                      type="button"
                      onClick={() => setForgotMotivo(p.seq.toString())}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95',
                        forgotMotivo === p.seq.toString()
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                          : 'bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-400'
                      )}
                    >
                      <span className="text-[9px] font-black tabular-nums opacity-50">{p.seq}</span>
                      {p.tipologia}
                    </button>
                  ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 block">Início</Label>
                <CustomTimePicker
                  value={forgotStart} onChange={setForgotStart} placeholder="00:00"
                  clockIconClass="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                  wrapperClass="h-12 bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                  inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0 w-full"
                />
              </div>
              <div>
                <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 block">Término</Label>
                <CustomTimePicker
                  value={forgotEnd} onChange={setForgotEnd} placeholder="00:00"
                  clockIconClass="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                  wrapperClass="h-12 bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                  inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0 w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 block">Número O.S.</Label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={forgotOS}
                  onChange={e => setForgotOS(e.target.value)}
                  className="w-full h-12 px-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium focus:outline-none focus:border-zinc-950 transition-colors"
                />
              </div>
              <div>
                <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 block">Observação</Label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={forgotObs}
                  onChange={e => setForgotObs(e.target.value)}
                  className="w-full h-12 px-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium focus:outline-none focus:border-zinc-950 transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              onClick={handleAddForgot}
              disabled={loadingForgot || !forgotMotivo || !forgotStart || !forgotEnd}
              className="w-full h-14 bg-zinc-950 hover:bg-zinc-800 text-white rounded-2xl font-black text-base disabled:opacity-50 transition-all"
            >
              {loadingForgot ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Parada'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForgotModal(false); resetForgot(); }} className="w-full h-11 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Converter para OP Modal ─────────────────────────────────────────── */}
      <Dialog open={showConvertModal} onOpenChange={(o) => { if (!o) { setShowConvertModal(false); resetConvert(); } }}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-sm rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 border-0 ring-1 ring-zinc-200 dark:ring-zinc-800/50 shadow-2xl top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 gap-0">
          <DialogHeader className="mb-5 space-y-1">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-2 border border-amber-200 dark:border-amber-800/50">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle className="text-xl font-black text-zinc-950 dark:text-zinc-50">Converter para OP</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              Informe o período de produção da OP.
            </DialogDescription>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-lg">OP {op.opNumber}</span>
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/60 px-2 py-0.5 rounded-lg">{op.produto}</span>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/60 px-2 py-0.5 rounded-lg">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Hora Início</Label>
              <CustomTimePicker
                value={convHoraInicial} onChange={setConvHoraInicial} placeholder="00:00"
                clockIconClass="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                wrapperClass="h-14 bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Hora Término</Label>
              <CustomTimePicker
                value={convHoraFinal} onChange={setConvHoraFinal} placeholder="00:00"
                clockIconClass="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                wrapperClass="h-14 bg-white dark:bg-zinc-950 rounded-xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0 w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              onClick={handleConvert}
              disabled={loadingConvert || !convHoraInicial || !convHoraFinal}
              className="w-full h-14 bg-zinc-950 hover:bg-zinc-800 text-white rounded-2xl font-black text-base disabled:opacity-50 transition-all"
            >
              {loadingConvert ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Conversão'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setShowConvertModal(false); resetConvert(); }} className="w-full h-11 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
