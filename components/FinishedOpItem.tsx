import React from 'react';
import { Clock, Pencil, RotateCcw, Trash2, Package, CloudOff, RefreshCw } from 'lucide-react';

export const FinishedOpItem = React.memo(({ op, openEdit, setDeletingOp, setRevertingOp, onSyncRetry }: any) => {
  return (
    <div className={`group bg-white sm:rounded-3xl rounded-2xl p-4 sm:p-5 border ${op.syncStatus === 'error' ? 'border-red-300 ring-2 ring-red-100' : 'border-zinc-200/80'} hover:border-zinc-300 hover:shadow-md transition-all shadow-sm relative overflow-hidden text-left flex flex-col gap-3 sm:gap-4 mb-3`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${op.syncStatus === 'error' ? 'bg-red-500' : 'bg-emerald-400 group-hover:bg-emerald-500'}`} />
      
      {/* Header Info */}
      <div className="flex flex-col gap-2 pl-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
             <span className="text-[10px] font-black tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 shadow-sm">OP {op.opNumber}</span>
             <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200/80">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
             {op.litragem && (
               <span className="text-[10px] font-bold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">{op.litragem}</span>
             )}
             {op.isAvulsa && (
               <span className="text-[10px] font-black tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 shadow-sm">PARADA AVULSA</span>
             )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold bg-white/50 border border-zinc-100 px-2 py-0.5 rounded shrink-0">
             <Clock className="w-3 h-3 text-zinc-400" />
             {op.horaInicial} {op.horaFinal ? `- ${op.horaFinal}` : ''}
          </div>
        </div>
        
        <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight leading-snug w-full line-clamp-2">{op.produto}</h3>
      </div>

      {/* Stats Board */}
      {op.quantidade && (
        <div className="grid grid-cols-2 gap-2 mt-0">
          <div className="flex flex-col items-center justify-center py-2 px-3 bg-emerald-50/50 border border-emerald-100 rounded-xl shadow-inner">
             <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Unidades</span>
             <span className="text-xl font-black text-emerald-600 tracking-tighter leading-none">{parseInt(op.quantidade).toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-3 bg-amber-50/30 border border-amber-100/60 rounded-xl shadow-inner">
             <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest mb-1">Reprocesso</span>
             <span className="text-xl font-black text-amber-600 tracking-tighter leading-none">{op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? parseInt(op.qntReprocesso).toLocaleString() : '0'}</span>
          </div>
        </div>
      )}
      
      {/* Paradas Block */}
      {op.paradas && op.paradas.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 shadow-sm mt-0">
          <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-2">Paradas ({op.paradas.length})</p>
          <div className="flex flex-col gap-2">
            {op.paradas.map((p: any, i: number) => (
               <div key={i} className="flex items-center justify-between gap-2 bg-white border border-zinc-200 px-3 py-2 rounded-lg shadow-sm">
                 <div className="flex flex-col min-w-0">
                   <span className="text-xs font-bold text-zinc-800 truncate leading-tight">{p.seq} - {p.tipologia}</span>
                 </div>
                 <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold text-zinc-500 whitespace-nowrap bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                   <Clock className="w-3 h-3 text-zinc-400" />
                   {p.horaInicio} - {p.horaFim}
                 </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Error Alert */}
      {op.syncStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 flex flex-col items-start gap-2 rounded-xl mt-1">
          <div className="flex items-center gap-2">
            <CloudOff className="w-4 h-4 shrink-0 text-red-500" />
            <h4 className="font-bold text-xs">Falha na Sincronização</h4>
          </div>
          <button
            onClick={() => onSyncRetry && onSyncRetry(op)}
            className="flex items-center justify-center w-full text-[11px] font-bold bg-white text-red-700 py-2 border border-red-200 shadow-sm rounded-lg hover:bg-red-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 mt-1 pt-3 border-t border-zinc-200/60">
        {!op.isAvulsa && (
          <button
            onClick={() => setRevertingOp(op)}
            title="Mover para Pendentes"
            className="flex-1 flex items-center justify-center h-12 text-xs sm:text-sm font-black bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl shadow-md transition-all focus-visible:ring-4 focus-visible:ring-zinc-900/20"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reverter OP
          </button>
        )}
        <button
          onClick={() => openEdit(op)}
          title="Editar OP"
          className={`flex items-center justify-center h-12 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 hover:border-zinc-300 rounded-xl transition-colors border-2 border-zinc-200/80 shadow-sm bg-white focus-visible:ring-2 focus-visible:ring-zinc-900/20 outline-none ${op.isAvulsa ? 'flex-1' : 'w-12 flex-shrink-0'}`}
        >
          <Pencil className="w-4 h-4" />
          {op.isAvulsa && <span className="ml-2 font-bold text-sm">Editar</span>}
        </button>
        <button
          onClick={() => setDeletingOp(op)}
          title="Excluir"
          className="flex-shrink-0 flex items-center justify-center w-12 h-12 text-zinc-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors border-2 border-zinc-200/80 shadow-sm bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 outline-none"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
