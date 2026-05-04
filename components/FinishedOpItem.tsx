import React from 'react';
import { Clock, Pencil, RotateCcw, Trash2, Package } from 'lucide-react';

export const FinishedOpItem = React.memo(({ op, openEdit, setDeletingOp, setRevertingOp }: any) => {
  return (
    <div className="group bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xl transition-all shadow-sm relative overflow-hidden text-left flex flex-col gap-5 mb-4">
      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-400 group-hover:bg-emerald-500 transition-colors" />
      
      {/* Header Info */}
      <div className="flex flex-col gap-2 pl-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
             <span className="text-[10px] font-black tracking-widest text-emerald-700 uppercase bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60 shadow-sm">OP {op.opNumber}</span>
             <span className="text-[10px] font-bold text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200 shadow-sm">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200 shadow-sm shrink-0">
             <Clock className="w-3.5 h-3.5 text-zinc-400" />
             <span className="text-xs font-bold">{op.horaInicial} {op.horaFinal ? `- ${op.horaFinal}` : ''}</span>
          </div>
        </div>
        
        <div className="flex flex-col mt-1">
          <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-tight pr-2">{op.produto}</h3>
          {op.litragem && (
            <div className="flex items-center mt-2">
              <span className="text-xs text-zinc-500 font-mono font-bold bg-zinc-50 px-2 py-1 rounded-md border border-zinc-200">{op.litragem}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Board */}
      {op.quantidade && (
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="flex flex-col items-center justify-center p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-inner">
             <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1.5">Unidades</span>
             <span className="text-2xl font-black text-emerald-600 tracking-tighter leading-none">{parseInt(op.quantidade).toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-amber-50/30 border border-amber-100/60 rounded-2xl shadow-inner">
             <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest mb-1.5">Reprocesso</span>
             <span className="text-2xl font-black text-amber-600 tracking-tighter leading-none">{op.qntReprocesso && parseInt(op.qntReprocesso) > 0 ? parseInt(op.qntReprocesso).toLocaleString() : '0'}</span>
          </div>
        </div>
      )}
      
      {/* Paradas Block */}
      {op.paradas && op.paradas.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 shadow-sm mt-1">
          <p className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-3">Paradas Registradas ({op.paradas.length})</p>
          <div className="flex flex-col gap-2.5">
            {op.paradas.map((p: any, i: number) => (
               <div key={i} className="flex items-center justify-between gap-3 bg-white border border-zinc-200 px-3 py-2.5 rounded-xl shadow-sm">
                 <div className="flex flex-col min-w-0">
                   <span className="text-xs font-bold text-zinc-800 truncate leading-tight">{p.seq} - {p.tipologia}</span>
                 </div>
                 <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold text-zinc-500 whitespace-nowrap bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                   <Clock className="w-3 h-3 text-zinc-400" />
                   {p.horaInicio} às {p.horaFim}
                 </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-2 pt-5 border-t border-zinc-200/60">
        <button
          onClick={() => setRevertingOp(op)}
          title="Mover para Pendentes"
          className="col-span-4 sm:col-span-4 flex items-center justify-center h-14 text-sm sm:text-base font-black bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl shadow-xl shadow-zinc-900/10 transition-all focus-visible:ring-4 focus-visible:ring-zinc-900/20"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Reverter OP
        </button>
        <button
          onClick={() => openEdit(op)}
          title="Editar OP"
          className="col-span-2 sm:col-span-1 flex items-center justify-center w-full h-14 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 hover:border-zinc-300 rounded-xl transition-colors border-2 border-zinc-200/80 shadow-sm bg-white focus-visible:ring-2 focus-visible:ring-zinc-900/20 outline-none"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button
          onClick={() => setDeletingOp(op)}
          title="Excluir"
          className="col-span-2 sm:col-span-1 flex items-center justify-center w-full h-14 text-zinc-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl transition-colors border-2 border-zinc-200/80 shadow-sm bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 outline-none"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});
