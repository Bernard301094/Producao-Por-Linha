import React from 'react';
import { Package, Shield, LogOut } from 'lucide-react';

export default function SupervisorPanel(props: any) {
  const {
    supervisorDate, setSupervisorDate,
    supervisorShift, setSupervisorShift,
    historyReports, loadHistory,
    onLogout
  } = props;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Painel do Supervisor</h1>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-red-600 font-medium hover:bg-red-50 p-2 rounded-lg">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex gap-4 mb-6">
          <input 
            type="date" 
            value={supervisorDate} 
            onChange={e => setSupervisorDate(e.target.value)}
            className="border border-slate-300 p-2 rounded-lg"
          />
          <select 
            value={supervisorShift} 
            onChange={e => setSupervisorShift(e.target.value)}
            className="border border-slate-300 p-2 rounded-lg"
          >
            <option value="A">Turno A</option>
            <option value="B">Turno B</option>
            <option value="C">Turno C</option>
            <option value="D">Turno D</option>
          </select>
          <button onClick={loadHistory} className="bg-blue-600 text-white px-4 rounded-lg font-bold">
            Buscar Histórico
          </button>
        </div>

        <div>
          {historyReports.length === 0 ? (
            <p className="text-slate-500">Nenhum relatório encontrado para a data e turno selecionados.</p>
          ) : (
            <div className="space-y-4">
              {historyReports.map((op: any, i: number) => (
                <div key={i} className="border p-4 rounded-lg bg-slate-50">
                  <div className="font-bold flex gap-4">
                    <span>OP {op.opNumber}</span>
                    <span>{op.linha.startsWith('Linha') ? op.linha : `L${op.linha}`}</span>
                    <span>{op.produto}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-2 flex gap-4">
                    <span>Qtd: {op.quantidade}</span>
                    <span>Início: {op.horaInicial}</span>
                    <span>Fim: {op.horaFinal}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
