import React from 'react';
import { Clock, Pencil, RotateCcw, Trash2 } from 'lucide-react';

export const FinishedOpItem = React.memo(({ op, openEdit, setDeletingOp, setRevertingOp }: any) => {
  return (
    <div className="group bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md transition-all shadow-sm relative overflow-hidden flex flex-col mt-2 mb-2">
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/80 group-hover:bg-emerald-500 transition-colors" />
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black tracking-widest text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 shadow-sm">OP {op.opNumber}</span>
        <span className="text-[11px] font-bold text-zinc-400 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
      </div>

      <div className="text-center w-full my-2">
        <h3 className="text-[17px] sm:text-[19px] font-black text-zinc-900 tracking-tight leading-snug line-clamp-2 px-2">{op.produto}</h3>
        {op.litragem && (
          <span className="inline-block mt-2 text-[11px] text-zinc-500 font-mono font-bold bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-200">{op.litragem}</span>
        )}
      </div>

      {op.quantidade && (
        <div className="flex justify-center mt-2 mb-4">
          <div className="inline-flex items-center divide-x divide-emerald-200/50 bg-emerald-50/50 border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2 text-center bg-white">
              <span className="block text-[8px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">UNIDADES</span>
              <span className="block text-xl font-black text-emerald-600 tracking-tighter leading-none">{parseInt(op.quantidade).toLocaleString()}</span>
            </div>
            {op.qntReprocesso && parseInt(op.qntReprocesso) > 0 && (
              <div className="px-4 py-2 text-center bg-amber-50/30">
                <span className="block text-[8px] font-black text-amber-500/80 uppercase tracking-widest mb-0.5">REPROCESSO</span>
                <span className="block text-lg font-black text-amber-600 tracking-tighter leading-none">{parseInt(op.qntReprocesso).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-zinc-50/80 rounded-xl p-3 border border-zinc-100/80 mt-1">
        <div className="flex items-center justify-around text-center divide-x divide-zinc-200/60">
          <div className="flex-1">
            <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 pointer-events-none">Início</span>
            <span className="block text-[12px] font-black text-zinc-700">{op.horaInicial}</span>
          </div>
          {op.horaFinal && (
            <div className="flex-1">
              <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 pointer-events-none">Fim</span>
              <span className="block text-[12px] font-black text-zinc-700">{op.horaFinal}</span>
            </div>
          )}
        </div>
      </div>

        {op.paradas && op.paradas.length > 0 && (
          <div className="mt-3">
            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Paradas Registradas ({op.paradas.length})</p>
            <div className="flex flex-col gap-1.5">
              {op.paradas.map((p: any, i: number) => (
                 <div key={i} className="flex items-center gap-2 bg-white border border-zinc-200/80 px-2 py-1.5 rounded-lg shadow-sm">
                   <div className="flex flex-col flex-1 min-w-0">
                     <span className="text-[10px] font-bold text-zinc-700 truncate">{p.seq} - {p.tipologia}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 whitespace-nowrap bg-zinc-50 px-1.5 py-0.5 rounded">
                     <Clock className="w-2.5 h-2.5" />
                     {p.horaInicio} às {p.horaFim}
                   </div>
                 </div>
              ))}
            </div>
          </div>
        )}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 overflow-x-auto scrollbar-none">
        <button
          onClick={() => openEdit(op)}
          title="Editar"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 bg-white border border-zinc-200 text-xs text-zinc-600 font-bold hover:text-zinc-900 hover:bg-zinc-100 rounded-xl sm:rounded-lg transition-colors shadow-sm uppercase tracking-wider whitespace-nowrap shrink-0"
        >
          <Pencil className="w-4 h-4" /> Editar
        </button>
        <button
          onClick={() => setRevertingOp(op)}
          title="Voltar para Pendentes"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 sm:h-10 px-3 bg-white border border-zinc-200 text-xs text-zinc-600 font-bold hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 rounded-xl sm:rounded-lg transition-colors shadow-sm uppercase tracking-wider whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4" /> Pendentes
        </button>
        <button
          onClick={() => setDeletingOp(op)}
          title="Excluir"
          className="flex items-center justify-center shrink-0 w-11 h-11 sm:min-w-10 sm:w-10 sm:h-10 bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl sm:rounded-lg transition-colors shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});
