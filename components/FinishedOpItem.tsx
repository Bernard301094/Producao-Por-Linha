import React from 'react';
import { Clock, Pencil, RotateCcw, Trash2, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export const FinishedOpItem = React.memo(({ op, openEdit, setDeletingOp, setRevertingOp, onSyncRetry }: any) => {
  return (
    <div className={`relative bg-white rounded-2xl xl:rounded-3xl overflow-hidden mb-3 border transition-all shadow-sm hover:shadow-md ${op.syncStatus === 'error' ? 'border-red-200 ring-1 ring-red-100' : 'border-zinc-200/70'}`}>
      {/* Top accent */}
      <div className={`h-1 xl:h-1.5 w-full ${op.syncStatus === 'error' ? 'bg-red-400' : 'bg-emerald-400'}`} />

      <div className="p-4 xl:p-5 2xl:p-6">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3 mb-3 xl:mb-4">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span className="text-[10px] xl:text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg">
                OP {op.opNumber}
              </span>
              <span className="text-[10px] xl:text-xs font-bold text-zinc-500 bg-zinc-100 border border-zinc-200/60 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg">
                {op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}
              </span>
              {op.litragem && (
                <span className="text-[10px] xl:text-xs font-semibold text-zinc-400">{op.litragem}</span>
              )}
              {op.isAvulsa && (
                <span className="text-[10px] xl:text-xs font-black text-amber-700 bg-amber-50 border border-amber-200/60 px-2 xl:px-2.5 py-0.5 xl:py-1 rounded-lg">PARADA AVULSA</span>
              )}
            </div>
            <h3 className="text-base xl:text-lg 2xl:text-xl font-black text-zinc-900 tracking-tight leading-tight line-clamp-1">{op.produto}</h3>
          </div>
          {/* Time badge */}
          <div className="shrink-0 flex items-center gap-1 text-[10px] xl:text-xs font-black text-zinc-500 bg-zinc-50 border border-zinc-200/60 px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-xl">
            <Clock className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-zinc-400" />
            {op.horaInicial}{op.horaFinal ? ` → ${op.horaFinal}` : ''}
          </div>
        </div>

        {/* Stats */}
        {op.quantidade && (
          <div className="flex items-stretch gap-2 xl:gap-3 mb-3 xl:mb-4">
            <div className="flex-1 bg-emerald-50/80 border border-emerald-100 rounded-xl xl:rounded-2xl px-3 xl:px-4 py-2 xl:py-3 flex flex-col">
              <span className="text-[8px] xl:text-[9px] font-black text-emerald-600/70 uppercase tracking-widest leading-none mb-1">Produzido</span>
              <span className="text-2xl xl:text-3xl 2xl:text-4xl font-black text-emerald-700 tabular-nums leading-none">{parseInt(op.quantidade).toLocaleString()}</span>
              <span className="text-[9px] xl:text-[10px] font-bold text-emerald-500/60 mt-1">UN</span>
            </div>
            <div className={`flex-1 border rounded-xl xl:rounded-2xl px-3 xl:px-4 py-2 xl:py-3 flex flex-col ${op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? 'bg-amber-50/80 border-amber-100' : 'bg-zinc-50/60 border-zinc-100'}`}>
              <span className={`text-[8px] xl:text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? 'text-amber-600/70' : 'text-zinc-400'}`}>Reprocesso</span>
              <span className={`text-2xl xl:text-3xl 2xl:text-4xl font-black tabular-nums leading-none ${op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? 'text-amber-700' : 'text-zinc-300'}`}>
                {op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? parseInt(op.qntReprocesso).toLocaleString() : '0'}
              </span>
              <span className={`text-[9px] xl:text-[10px] font-bold mt-1 ${op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? 'text-amber-500/60' : 'text-zinc-300'}`}>UN</span>
            </div>
          </div>
        )}

        {/* Paradas chips */}
        {op.paradas && op.paradas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 xl:mb-4">
            {op.paradas.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 rounded-xl px-2.5 xl:px-3 py-1.5 xl:py-2">
                <span className="text-[9px] xl:text-[10px] font-black text-zinc-500 tabular-nums">{p.seq}</span>
                <span className="text-[10px] xl:text-xs font-semibold text-zinc-700 max-w-[120px] xl:max-w-[160px] truncate">{p.tipologia}</span>
                <span className="text-[9px] xl:text-[10px] font-black text-zinc-400 tabular-nums">{p.horaInicio}–{p.horaFim}</span>
              </div>
            ))}
          </div>
        )}

        {/* Sync error */}
        {op.syncStatus === 'error' && (
          <div className="bg-red-50 border border-red-200/60 rounded-xl p-3 mb-3 xl:mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-xs xl:text-sm font-bold text-red-700">Falha na sincronização</span>
            </div>
            <button
              onClick={() => onSyncRetry && onSyncRetry(op)}
              className="flex items-center gap-1.5 text-[11px] xl:text-xs font-bold bg-white text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Tentar
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 xl:pt-4 border-t border-zinc-100">
          {!op.isAvulsa && (
            <button
              onClick={() => setRevertingOp(op)}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 xl:h-12 text-xs xl:text-sm font-black bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl xl:rounded-2xl transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 xl:w-4 xl:h-4" /> Reverter OP
            </button>
          )}
          <button
            onClick={() => openEdit(op)}
            className={`flex items-center justify-center gap-1.5 h-10 xl:h-12 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl xl:rounded-2xl transition-colors border border-zinc-200/60 bg-white ${op.isAvulsa ? 'flex-1 px-4 font-bold text-xs xl:text-sm' : 'w-10 xl:w-12'}`}
          >
            <Pencil className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            {op.isAvulsa && 'Editar'}
          </button>
          <button
            onClick={() => setDeletingOp(op)}
            className="w-10 xl:w-12 h-10 xl:h-12 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl xl:rounded-2xl transition-colors border border-zinc-200/60 bg-white"
          >
            <Trash2 className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
