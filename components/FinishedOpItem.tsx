import React, { useState } from 'react';
import { Clock, Pencil, RotateCcw, Trash2, CloudOff, RefreshCw, Plus, ArrowRightLeft, Search, Loader2, ChevronDown, ChevronUp, MoreHorizontal, AlertTriangle, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CustomTimePicker } from './CustomTimePicker';
import { cn, formatLinhaName, getLinhaColors } from '../src/lib/utils';
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
  const [convQuantidade,   setConvQuantidade]    = useState('');
  const [loadingConvert,   setLoadingConvert]    = useState(false);
  
  // ── Paradas Accordion ───────────────────────────────────────────────────────
  const [showParadas, setShowParadas] = useState(false);

  const resetForgot  = () => { setForgotMotivo(''); setForgotStart(''); setForgotEnd(''); setForgotSearch(''); setForgotOS(''); setForgotObs(''); };
  const resetConvert = () => { setConvHoraInicial(''); setConvHoraFinal(''); setConvQuantidade(''); };

  const handleAddForgot = async (addAnother: boolean = false) => {
    if (!forgotMotivo || !forgotStart || !forgotEnd) { toast.error('Preencha motivo e horários.'); return; }
    const base = availableParadas.find((p: any) => p.seq.toString() === forgotMotivo);
    if (!base) { toast.error('Selecione um motivo válido.'); return; }
    setLoadingForgot(true);
    try {
      await onAddForgottenParada?.(op, { ...base, horaInicio: forgotStart, horaFim: forgotEnd, numeroOS: forgotOS, observacao: forgotObs });
      toast.success('Parada adicionada ao histórico!');
      resetForgot();
      if (!addAnother) {
        setShowForgotModal(false);
      }
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setLoadingForgot(false); }
  };

  const handleConvert = async () => {
    if (!convHoraInicial || !convHoraFinal || !convQuantidade) {
      toast.error('Preencha a quantidade, hora de início e de término.'); return;
    }
    setLoadingConvert(true);
    try {
      await onConvertToOp?.(op, { horaInicial: convHoraInicial, horaFinal: convHoraFinal, quantidade: convQuantidade });
      toast.success('OP convertida com sucesso!');
      setShowConvertModal(false); resetConvert();
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    finally { setLoadingConvert(false); }
  };

  return (
    <div className={`relative bg-white dark:bg-zinc-950 rounded-[1.5rem] overflow-hidden mb-4 border transition-all shadow-sm hover:shadow-md ${op.syncStatus === 'error' ? 'border-red-200 dark:border-red-800/50 ring-1 ring-red-100' : 'border-border'}`}>
      {/* Top accent */}
      <div className={`h-1.5 w-full ${op.syncStatus === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />

      <div className="p-4 sm:p-5">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3 mb-4">
           {/* Identificação Panel */}
           <div className="flex-1 flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-3 sm:p-4 rounded-[1.25rem] border border-border">
             <div className="flex items-center gap-1.5 flex-wrap">
               <span className="text-[10px] sm:text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                 OP {op.opNumber}
               </span>
               <span className="text-[10px] sm:text-xs font-black tracking-widest text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-md shadow-sm uppercase">
                 {op.turno?.startsWith('Turno') ? op.turno : `Turno ${op.turno}`}
               </span>
               {op.isAvulsa && (
                 <span className="text-[10px] sm:text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md uppercase tracking-widest">PARADA AVULSA</span>
               )}
             </div>
             
             <div className="flex items-center gap-2">
               <Package className="w-4 h-4 text-zinc-400 shrink-0" />
               <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight line-clamp-2">{op.produto}</h3>
             </div>
             
             <div className="flex items-center gap-2 mt-1">
               {(() => {
                 const lName = formatLinhaName(op.linha);
                 const colors = getLinhaColors(lName);
                 return (
                   <span
                     className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md border shadow-sm uppercase"
                     style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                   >
                     {lName}
                   </span>
                 );
               })()}
               {op.litragem && (
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-border">{op.litragem}</span>
               )}
             </div>
           </div>
           
           {/* Actions / Menu */}
           <div className="shrink-0 flex items-start">
             <Popover>
                <PopoverTrigger asChild>
                  <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm active:scale-95">
                     <MoreHorizontal className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5 rounded-xl border-border shadow-xl z-10" align="end">
                   <button
                     onClick={() => openEdit(op)}
                     className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                   >
                     <Pencil className="w-4 h-4 text-zinc-400" /> Editar Registro
                   </button>
                   <button
                     onClick={() => setDeletingOp(op)}
                     className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors mt-0.5"
                   >
                     <Trash2 className="w-4 h-4 text-red-500/70" /> Excluir Registro
                   </button>
                </PopoverContent>
             </Popover>
           </div>
        </div>

        {/* Results Panel */}
        <div className="grid grid-cols-2 gap-3 mb-4">
           {/* Quantidade */}
           {!op.isAvulsa && op.quantidade ? (
             <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
               <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500/70 uppercase tracking-widest mb-1">Produzido</span>
               <div className="flex items-baseline gap-1">
                 <span className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none tracking-tighter">{parseInt(op.quantidade).toLocaleString()}</span>
                 <span className="text-[10px] font-black text-emerald-500/60">UN</span>
               </div>
             </div>
           ) : (
             <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Parada Avulsa</span>
               <span className="text-sm font-bold text-zinc-500">Sem produção</span>
             </div>
           )}

           {/* Horarios */}
           <div className="bg-zinc-50 dark:bg-zinc-900/50 border-2 border-border rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
             <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Horário</span>
             <span className="text-lg sm:text-xl font-black text-foreground tabular-nums tracking-tighter">
               {op.horaInicial}{op.horaFinal ? ` → ${op.horaFinal}` : ''}
             </span>
           </div>
        </div>

        {/* Paradas Accordion */}
        {op.paradas && op.paradas.length > 0 && (
          <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-border rounded-2xl p-3 mb-4">
            <button 
               onClick={() => setShowParadas(!showParadas)}
               className="w-full flex items-center justify-between p-1 focus:outline-none"
            >
               <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                 </div>
                 <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {op.paradas.length} Parada{op.paradas.length !== 1 && 's'} Registrada{op.paradas.length !== 1 && 's'}
                 </span>
               </div>
               {showParadas ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>
            
            {showParadas && (
               <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                 {op.paradas.map((p: any, i: number) => (
                   <div key={i} className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-border shadow-sm rounded-xl px-3 py-2">
                     <span className="text-[10px] font-black text-zinc-400 tabular-nums bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md">{p.seq}</span>
                     <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 max-w-[140px] truncate">{p.tipologia}</span>
                     <span className="text-[10px] font-black text-zinc-400 tabular-nums border-l border-border pl-2">{p.horaInicio} – {p.horaFim}</span>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* Sync error */}
        {op.syncStatus === 'error' && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-400">Falha na sincronização</span>
            </div>
            <button
              onClick={() => onSyncRetry && onSyncRetry(op)}
              className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold bg-white dark:bg-zinc-950 text-red-700 dark:text-red-400 px-3 py-1.5 border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Tentar
            </button>
          </div>
        )}

        {/* Actions (Reverter e Add Parada) */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          {op.isAvulsa ? (
            <button
              onClick={() => { resetConvert(); setShowConvertModal(true); }}
              className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" /> Converter para OP
            </button>
          ) : (
            <button
              onClick={() => setRevertingOp(op)}
              className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl transition-all shadow-md shadow-zinc-900/20 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" /> Reverter OP
            </button>
          )}
          
          <button
            onClick={() => { resetForgot(); setShowForgotModal(true); }}
            className="w-12 h-12 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 rounded-2xl transition-colors shrink-0 active:scale-95"
            title="Adicionar Parada Esquecida"
          >
            <Plus className="w-5 h-5" />
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddForgot(true)}
                disabled={loadingForgot || !forgotMotivo || !forgotStart || !forgotEnd}
                className="w-full h-14 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800 rounded-2xl font-black text-sm disabled:opacity-50 transition-all shadow-sm"
              >
                {loadingForgot ? <Loader2 className="w-5 h-5 animate-spin" /> : '+ Salvar e Nova'}
              </Button>
              <Button
                type="button"
                onClick={() => handleAddForgot(false)}
                disabled={loadingForgot || !forgotMotivo || !forgotStart || !forgotEnd}
                className="w-full h-14 bg-zinc-950 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-2xl font-black text-sm disabled:opacity-50 transition-all shadow-sm"
              >
                {loadingForgot ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar e Fechar'}
              </Button>
            </div>
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
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">Quantidade Produzida</Label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={convQuantidade}
                onChange={e => setConvQuantidade(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full h-14 px-4 bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-xl text-lg font-black text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-950 transition-colors shadow-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              onClick={handleConvert}
              disabled={loadingConvert || !convHoraInicial || !convHoraFinal || !convQuantidade}
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
