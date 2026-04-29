import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'sonner';
import { Factory, LogOut, CalendarDays, Clock4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { saveAndSharePDF } from '../lib/pdfUtils';

interface SupervisorPanelProps {
   supervisorDate: string;
   setSupervisorDate: (d: string) => void;
   supervisorShift: string;
   setSupervisorShift: (s: string) => void;
   historyReports: any[];
   operations: any[];
   PROFILES: Record<string, string>;
   onLogout: () => void;
}

export function SupervisorPanel({ supervisorDate, setSupervisorDate, supervisorShift, setSupervisorShift, historyReports, operations, PROFILES, onLogout }: SupervisorPanelProps) {

  const generateSupervisorPDF = async () => {
     if (historyReports.length === 0) {
        toast.info('Nenhum registro no histórico para exportar.');
        return;
     }

     const doc = new jsPDF();
     const [y, m, d] = supervisorDate.split('-');
     const formattedDate = `${d}/${m}/${y}`;

     doc.setFontSize(16);
     doc.text('Histórico de Operações Concluídas', 14, 20);
     doc.setFontSize(12);
     doc.text(`Data: ${formattedDate} - Turno: ${supervisorShift}`, 14, 28);
     
     const tableColumn = ["OP", "Linha", "Turno", "Produto", "Litragem", "Qtd", "Início", "Fim"];
     const tableRows: any[] = [];

     historyReports.forEach(rowString => {
       const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal] = rowString.split('|');
       tableRows.push([opNumber, linha, supervisorShift, produto, litragem, quantidade, horaInicial, horaFinal]);
     });

     autoTable(doc, {
       head: [tableColumn],
       body: tableRows,
       startY: 35,
     });

     await saveAndSharePDF(doc, `historico_operacoes_${d}_${m}_${y}_turno_${supervisorShift}.pdf`);
  };

  const shiftColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    A: { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-300',  dot: 'bg-amber-400'  },
    B: { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-300',   dot: 'bg-blue-400'   },
    C: { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-300', dot: 'bg-violet-400' },
    D: { bg: 'bg-slate-50',   text: 'text-slate-700',  border: 'border-slate-300',  dot: 'bg-slate-400'  },
  };
  const shift = shiftColors[supervisorShift] ?? shiftColors['A'];

  return (
    <div className="w-full h-[100dvh] bg-slate-50 flex flex-col font-sans overflow-hidden">
       <Toaster position="top-right" richColors />
       <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-3 sm:px-8 shadow-sm z-10 shrink-0 relative">
         <div className="flex items-center gap-2 sm:gap-3">
           <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded flex items-center justify-center">
             <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
           </div>
           <h1 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight italic hidden sm:block">SheetBridge <span className="font-normal text-slate-400 not-italic">v2.1</span></h1>
         </div>
         <div className="flex items-center gap-2 sm:gap-6">
           <div className="flex items-center gap-2">
              <span className="absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0 text-[10px] sm:text-sm font-medium text-slate-600 font-mono tracking-wider text-center sm:text-right leading-tight">
                <span className="block sm:inline">{format(new Date(), 'dd/MM/yyyy')}</span>
                <span className="hidden sm:inline"> — </span>
                <span className="block sm:inline">Supervisor</span>
              </span>
           </div>
           <div className="flex items-center gap-1 sm:gap-2">
             <ChangePasswordDialog loginProfile="Supervisor" defaultProfiles={PROFILES} />
             <Button variant="ghost" size="sm" onClick={onLogout} className="px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50">
                <span className="hidden sm:inline">Sair</span> <LogOut className="w-4 h-4 sm:ml-2" />
             </Button>
           </div>
         </div>
       </header>
       <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full max-w-6xl mx-auto">
          {operations.length > 0 && (
             <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Operações em Andamento ({operations.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {operations.map((op: any) => (
                      <div key={op.id} className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm border-l-4 border-l-blue-500">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono text-slate-400">#{op.opNumber}</span>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">Turno {op.turno}</span>
                         </div>
                         <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-1">{op.produto}</h4>
                         <p className="text-[10px] text-slate-500 uppercase font-medium">Linha {op.linha} • Início: {op.horaInicial} • {op.litragem}</p>
                      </div>
                   ))}
                </div>
             </div>
          )}
          <div className="flex flex-col md:flex-row justify-between items-center md:items-center gap-4 mb-6 sm:mb-8 text-center md:text-left">
             <div>
                <nav className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1 sm:mb-2">Histórico de Produção</nav>
                <h2 className="text-2xl sm:text-3xl font-light text-slate-800 tracking-tight">Painel <span className="font-bold">Supervisor</span></h2>
             </div>
             <div className="flex flex-wrap justify-center md:justify-end gap-2 sm:gap-3 items-end w-full md:w-auto">

                {/* ── Selector de Fecha ── */}
                <div className="flex-1 sm:flex-none min-w-[148px] text-left">
                  <Label className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">
                    <CalendarDays className="w-3 h-3" /> Data
                  </Label>
                  <div className="relative">
                    <input
                      type="date"
                      value={supervisorDate}
                      onChange={e => setSupervisorDate(e.target.value)}
                      className="w-full h-10 pl-3 pr-3 rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold
                                 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                                 hover:border-blue-300 transition-all cursor-pointer
                                 [color-scheme:light]"
                    />
                  </div>
                </div>

                {/* ── Selector de Turno ── */}
                <div className="flex-none w-[120px] sm:w-auto text-left">
                  <Label className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">
                    <Clock4 className="w-3 h-3" /> Turno
                  </Label>
                  <Select value={supervisorShift} onValueChange={setSupervisorShift}>
                    <SelectTrigger
                      className={`w-full sm:w-32 h-10 border-2 font-bold text-sm transition-all
                        ${shift.bg} ${shift.text} ${shift.border}
                        hover:brightness-95 focus:ring-2 focus:ring-offset-0`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${shift.dot}`} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {(['A','B','C','D'] as const).map(t => (
                        <SelectItem key={t} value={t}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${shiftColors[t].dot}`} />
                            Turno {t}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={generateSupervisorPDF} className="h-10 bg-emerald-600 text-white hover:bg-emerald-700 font-bold uppercase tracking-wider text-xs px-4 sm:px-6 w-full sm:w-auto shrink-0">Gerar PDF</Button>
             </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
             <div className="hidden lg:block overflow-x-auto">
               <table className="w-full text-left text-sm text-slate-600 min-w-[700px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                     <tr>
                        <th className="p-4 border-b">OP</th>
                        <th className="p-4 border-b">Linha</th>
                        <th className="p-4 border-b">Turno</th>
                        <th className="p-4 border-b">Produto</th>
                        <th className="p-4 border-b">Litragem</th>
                        <th className="p-4 border-b text-right">Qtd</th>
                        <th className="p-4 border-b text-right">Início</th>
                        <th className="p-4 border-b text-right">Fim</th>
                     </tr>
                  </thead>
                  <tbody>
                     {historyReports.length === 0 ? (
                        <tr>
                           <td colSpan={8} className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado para esta data/turno na nuvem.</td>
                        </tr>
                     ) : (
                        historyReports.map((rowStr, i) => {
                           const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal] = rowStr.split('|');
                           return (
                              <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                                 <td className="p-4 font-mono text-slate-700">{opNumber}</td>
                                 <td className="p-4">{linha}</td>
                                 <td className="p-4">
                                   <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${shiftColors[supervisorShift]?.bg} ${shiftColors[supervisorShift]?.text} ${shiftColors[supervisorShift]?.border}`}>
                                     <span className={`w-1.5 h-1.5 rounded-full ${shiftColors[supervisorShift]?.dot}`} />
                                     {supervisorShift}
                                   </span>
                                 </td>
                                 <td className="p-4 font-semibold text-slate-800">{produto}</td>
                                 <td className="p-4">{litragem}</td>
                                 <td className="p-4 text-right font-mono font-bold text-emerald-600">{quantidade}</td>
                                 <td className="p-4 text-right font-mono">{horaInicial}</td>
                                 <td className="p-4 text-right font-mono">{horaFinal}</td>
                              </tr>
                           );
                        })
                     )}
                  </tbody>
               </table>
             </div>
             <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                {historyReports.length === 0 ? (
                   <div className="p-8 text-center text-sm text-slate-400 italic">
                      Nenhum registro encontrado para esta data/turno na nuvem.
                   </div>
                ) : (
                   historyReports.map((rowStr, i) => {
                      const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal] = rowStr.split('|');
                      return (
                         <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">OP {opNumber} • Linha {linha}</div>
                               <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${shiftColors[supervisorShift]?.bg} ${shiftColors[supervisorShift]?.text} ${shiftColors[supervisorShift]?.border}`}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${shiftColors[supervisorShift]?.dot}`} />
                                 Turno {supervisorShift}
                               </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800 leading-tight mb-2">{produto}</h3>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                               <div>Litragem: {litragem}</div>
                               <div className="font-mono">{horaInicial} - {horaFinal}</div>
                            </div>
                            <div className="text-right text-xs font-mono font-bold text-emerald-600 mt-1">{quantidade} un.</div>
                         </div>
                      );
                   })
                )}
             </div>
          </div>
       </main>
    </div>
  );
}
