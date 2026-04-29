import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, getFinishedOperations, FinishedOperation, Operation, getProducts, addProduct, removeFinishedOperation, getReportForDateAndShift } from './api';
import { auth, googleProvider, db } from './firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

const PROFILES: Record<string, string> = {
  'Turno A': 'TurnoA@Vonixx2026',
  'Turno B': 'TurnoB@Vonixx2026',
  'Turno C': 'TurnoC@Vonixx2026',
  'Turno D': 'TurnoD@Vonixx2026',
  'Supervisor': 'PCP@Vonixx2026'
};

export function getSuggestedShift(dateObj: Date, horaStr: string) {
  if (!horaStr) return '';
  const [h] = horaStr.split(':').map(Number);
  
  let logicalDate = new Date(dateObj);
  if (h < 6) {
      logicalDate.setDate(logicalDate.getDate() - 1);
  }
  
  const baseDate = new Date(2026, 3, 28);
  const diffTime = Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate()) 
        - Date.UTC(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const isDayCycle0 = Math.abs(diffDays % 2) === 0;

  if (h >= 6 && h < 18) {
      return isDayCycle0 ? 'C' : 'A';
  } else {
      return isDayCycle0 ? 'D' : 'B';
  }
}
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { onAuthStateChanged, signInWithPopup, User, signOut } from 'firebase/auth';
import { SupervisorPanel } from './components/SupervisorPanel';
import { LoginModule } from './components/LoginModule';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { Toaster, toast } from 'sonner';
import { Factory, LogIn, LogOut, Trash2, Eye, EyeOff, FileDown, Check, ChevronsUpDown, Search, Clock, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const startOpSchema = z.object({
  opNumber: z.string().min(1, 'Obrigatório'),
  produto: z.string().min(1, 'Obrigatório'),
  linha: z.string().min(1, 'Obrigatório'),
  turno: z.string().min(1, 'Obrigatório'),
  horaInicial: z.string().min(1, 'Obrigatório'),
});

type StartOpFormValues = z.infer<typeof startOpSchema>;

import { saveAndSharePDF } from './lib/pdfUtils';

export default function App() {
  function extractLitragem(produto: string): string {
     const upper = (produto || '').toUpperCase();
     if (upper.includes(' IBC')) return 'IBC';
     const match = produto.match(/(\d+(?:,\d+)?)\s*(L|ML|G|KG)\b/i);
     if (match) {
        const unit = match[2].toUpperCase();
        const num = match[1];
        if (unit === 'L') {
           if (num === '1') return '1 Litro';
           return `${num} Litros`;
        }
        if (unit === 'ML') return `${num}ml`;
        if (unit === 'G') return `${num}g`;
        if (unit === 'KG') return `${num}Kg`;
     }
     return "";
  }

  const [loginProfile, setLoginProfile] = useState<string | null>(null);
  
  const [supervisorDate, setSupervisorDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supervisorShift, setSupervisorShift] = useState('A');
  const [historyReports, setHistoryReports] = useState<any[]>([]);

  const [mobileTab, setMobileTab] = useState<'pendentes' | 'nova' | 'concluidas'>('nova');
  const [openLineSelect, setOpenLineSelect] = useState(false);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [finishedOps, setFinishedOps] = useState<FinishedOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<{produto: string, litragem: string}[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  const [finishQtd, setFinishQtd] = useState('');
  const [finishTime, setFinishTime] = useState('');

  const [editingOp, setEditingOp] = useState<Operation | FinishedOperation | null>(null);
  const [deletingOp, setDeletingOp] = useState<Operation | FinishedOperation | null>(null);
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit, formState: { errors: editErrors } } = useForm<StartOpFormValues & { quantidade?: string; horaFinal?: string }>({});

  const watchEditProduto = watchEdit('produto');

  const openEdit = (op: Operation | FinishedOperation) => {
    setEditingOp(op);
    resetEdit({
       opNumber: op.opNumber,
       produto: op.produto,
       linha: op.linha,
       turno: op.turno,
       horaInicial: op.horaInicial,
       quantidade: (op as FinishedOperation).quantidade || '',
       horaFinal: (op as FinishedOperation).horaFinal || ''
    });
  };

  const onEditOp = async (data: any) => {
    if(!editingOp) return;
    setLoading(true);
    try {
        const matchedProduct = availableProducts.find(p => p.produto.trim().toUpperCase() === data.produto.trim().toUpperCase());
        const derivedLitragem = matchedProduct && matchedProduct.litragem ? matchedProduct.litragem : extractLitragem(data.produto);

        if('quantidade' in editingOp) {
             import('./api').then(api => api.updateFinishedOperation(editingOp.id, {
                 opNumber: data.opNumber,
                 produto: data.produto,
                 litragem: derivedLitragem,
                 linha: data.linha,
                 turno: data.turno,
                 horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial,
                 quantidade: data.quantidade,
                 horaFinal: data.horaFinal.length === 5 ? `${data.horaFinal}:00` : data.horaFinal
             }).then(() => loadOps()));
             toast.success('Editado (Local)');
        } else {
             import('./api').then(api => api.updateOperation(editingOp.id, {
                 opNumber: data.opNumber,
                 produto: data.produto,
                 litragem: derivedLitragem,
                 linha: data.linha,
                 turno: data.turno,
                 horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial
             }).then(() => loadOps()));
             toast.success('OP Atualizada');
        }
        setEditingOp(null);
    } catch(err: any) {
        toast.error('Erro ao editar: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StartOpFormValues>({
    resolver: zodResolver(startOpSchema),
    defaultValues: {
      opNumber: '',
      produto: '',
      linha: '',
      turno: '',
      horaInicial: ''
    }
  });

  const loadOps = async () => {
    const ops = await getOperations();
    setOperations(ops);
    const fOps = await getFinishedOperations();
    setFinishedOps(fOps);
    const prods = await getProducts();
    setAvailableProducts(prods);
  };

  const watchHoraInicial = watch('horaInicial');
  const watchProduto = watch('produto');

  const filteredProducts = useMemo(() => {
     if (!watchProduto) return availableProducts;
     return availableProducts.filter(p => p.produto.toLowerCase().includes(watchProduto.toLowerCase()));
  }, [watchProduto, availableProducts]);

  const [showEditProductSuggestions, setShowEditProductSuggestions] = useState(false);
  const filteredEditProducts = useMemo(() => {
     if (!watchEditProduto) return availableProducts;
     return availableProducts.filter(p => p.produto.toLowerCase().includes(watchEditProduto.toLowerCase()));
  }, [watchEditProduto, availableProducts]);

  useEffect(() => {
    if (watchHoraInicial) {
       const suggested = getSuggestedShift(new Date(), watchHoraInicial);
       setValue('turno', suggested);
    }
  }, [watchHoraInicial, setValue]);

  useEffect(() => {
    const q = query(collection(db, 'pendingOperations'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
      setOperations(docs);
    });
    
    loadOps();
    setValue('horaInicial', format(new Date(), 'HH:mm'));

    const storedProfile = localStorage.getItem('loginProfile');
    if (storedProfile) {
       setLoginProfile(storedProfile);
       if (storedProfile !== 'Supervisor') {
          setValue('turno', storedProfile.replace('Turno ', ''));
       }
    }

    return () => unsub();
  }, [setValue]);

  const loadHistory = async () => {
     try {
         const ops = await getReportForDateAndShift(supervisorDate, supervisorShift);
         setHistoryReports(ops);
     } catch(e: any) {
         console.error('Error loading history:', e);
         toast.error('Erro ao carregar o histórico.');
     }
  };

  useEffect(() => {
     if (loginProfile === 'Supervisor') {
        loadHistory();
     }
  }, [loginProfile, supervisorDate, supervisorShift]);

  const onStartOp = async (data: StartOpFormValues) => {
    if (operations.some(op => op.opNumber === data.opNumber) || finishedOps.some(op => op.opNumber === data.opNumber)) {
      toast.error('Número de OP já cadastrado!');
      return;
    }
    const matchedProduct = availableProducts.find(p => p.produto.trim().toUpperCase() === data.produto.trim().toUpperCase());
    const derivedLitragem = matchedProduct && matchedProduct.litragem ? matchedProduct.litragem : extractLitragem(data.produto);

    const newOp: Operation = {
      id: crypto.randomUUID(),
      carimboInicial: new Date().toISOString(),
      ...data,
      horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial,
      litragem: derivedLitragem
    };
    await addOperation(newOp);
    await addProduct(data.produto, derivedLitragem);
    
    const prods = await getProducts();
    setAvailableProducts(prods);

    toast.success('Operação iniciada!');
    reset({
        ...data,
        opNumber: '',
        produto: '',
    });
    setValue('horaInicial', format(new Date(), 'HH:mm'));
    loadOps();
  };

  const handleFinish = async (id: string) => {
    if (!finishQtd || !finishTime) {
      toast.error('Preencha a quantidade e hora final.');
      return;
    }
    setLoading(true);
    try {
      const finalTimeFormatted = finishTime.length === 5 ? `${finishTime}:00` : finishTime;
      await markOperationFinished(id, finishQtd, finalTimeFormatted);
      toast.success('Salvo na planilha com sucesso!');
      setFinishingId(null);
      setFinishQtd('');
      loadOps();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar. Verifique se o backend tem as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
     if(confirm('Tem certeza que deseja cancelar esta operação?')) {
        await removeOperation(id);
        toast.info('Operação removida.');
        loadOps();
     }
  };

  const currentTurnForView = loginProfile && loginProfile !== 'Supervisor' ? loginProfile.replace('Turno ', '') : getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));
  
  const myPendingOps = operations.filter(op => op.turno === currentTurnForView);
  const myFinishedOps = finishedOps.filter(op => op.turno === currentTurnForView);

  const totalUnidades = myFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);

  const confirmDelete = async () => {
    if (!deletingOp) return;
    setLoading(true);
    try {
       if ('quantidade' in deletingOp) {
          await removeFinishedOperation(deletingOp.id);
          toast.success('Registro concluído excluído');
       } else {
          await removeOperation(deletingOp.id);
          toast.success('Operação pendente excluída');
       }
       loadOps();
    } catch (e: any) {
       toast.error('Erro ao excluir: ' + e.message);
    } finally {
       setLoading(false);
       setDeletingOp(null);
    }
  };

  const generatePDF = async () => {
     if (myFinishedOps.length === 0) {
        toast.info('Nenhum registro para exportar.');
        return;
     }

     const doc = new jsPDF();
     const currentDateStr = format(new Date(), 'dd/MM/yyyy');

     doc.setFontSize(16);
     doc.text('Relatório de Operações Concluídas', 14, 20);
     doc.setFontSize(12);
     doc.text(`Data: ${currentDateStr} - Turno: ${currentTurnForView}`, 14, 28);
     
     const tableColumn = ["OP", "Linha", "Turno", "Produto", "Litragem", "Qtd", "Início", "Fim"];
     const tableRows: any[] = [];

     myFinishedOps.forEach(op => {
       const rowData = [
         op.opNumber,
         op.linha,
         op.turno,
         op.produto,
         op.litragem,
         op.quantidade,
         op.horaInicial,
         op.horaFinal
       ];
       tableRows.push(rowData);
     });

     autoTable(doc, {
       head: [tableColumn],
       body: tableRows,
       startY: 35,
     });

     await saveAndSharePDF(doc, `operacoes_concluidas_${format(new Date(), 'dd_MM_yyyy')}_turno_${currentTurnForView}.pdf`);
  };

  if (!loginProfile) {
     return (
       <LoginModule
          PROFILES={PROFILES}
          getSuggestedShift={getSuggestedShift}
          onLogin={(role) => {
             setLoginProfile(role);
             localStorage.setItem('loginProfile', role);
          }}
       />
     );
  }

  if (loginProfile === 'Supervisor') {
     return (
        <SupervisorPanel
           supervisorDate={supervisorDate}
           setSupervisorDate={setSupervisorDate}
           supervisorShift={supervisorShift}
           setSupervisorShift={setSupervisorShift}
           historyReports={historyReports}
           operations={operations}
           PROFILES={PROFILES}
           onLogout={() => {
              setLoginProfile(null);
              localStorage.removeItem('loginProfile');
           }}
        />
     );
  }

  return (
    <div className="w-full h-[100dvh] bg-slate-100 flex flex-col font-sans overflow-hidden">
      <Toaster position="top-right" richColors />
      
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-3 sm:px-6 shadow-sm z-10 shrink-0 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shadow-sm">
            <Factory className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold text-slate-800 tracking-tight italic">SheetBridge</span>
            <span className="text-[10px] text-slate-400 font-medium">v2.1</span>
          </div>
        </div>

        {/* Center: turno badge */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {loginProfile} — {format(new Date(), 'dd/MM/yyyy')}
          </span>
          <span className="sm:hidden text-xs font-bold text-slate-600">{loginProfile}</span>
        </div>

        <div className="flex items-center gap-1">
          <ChangePasswordDialog loginProfile={loginProfile!} defaultProfiles={PROFILES} />
          <Button variant="ghost" size="sm" onClick={() => {
             setLoginProfile(null);
             localStorage.removeItem('loginProfile');
          }} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-3">
             <span className="hidden sm:inline text-xs">Sair</span> <LogOut className="w-4 h-4 sm:ml-1.5" />
          </Button>
        </div>
      </header>

      {/* ── MOBILE TABS — only shown below md (768px) ── */}
      <div className="md:hidden flex bg-white border-b border-slate-200 shrink-0 z-20">
         <button onClick={() => setMobileTab('pendentes')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
           mobileTab === 'pendentes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
         }`}>
            Pendentes ({myPendingOps.length})
         </button>
         <button onClick={() => setMobileTab('nova')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
           mobileTab === 'nova' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
         }`}>
            Nova OP
         </button>
         <button onClick={() => setMobileTab('concluidas')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
           mobileTab === 'concluidas' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'
         }`}>
            Concluídas ({myFinishedOps.length})
         </button>
      </div>

      {/* ── MAIN: 3 columns from md (768px) ── */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* ══ COL 1: LINHAS PENDENTES ══ */}
        <aside className={`${
          mobileTab !== 'pendentes' ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-[240px] md:min-w-[240px] md:max-w-[240px] lg:w-[260px] lg:min-w-[260px] lg:max-w-[260px] xl:w-[280px] xl:min-w-[280px] xl:max-w-[280px] bg-white border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden`}>
          
          {/* Col header */}
          <div className="px-3 md:px-4 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-blue-500"></div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Em Andamento</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                myPendingOps.length > 0
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {myPendingOps.length} {myPendingOps.length === 1 ? 'ativa' : 'ativas'}
              </span>
            </div>
          </div>

          {/* Cards list */}
          <div className="flex-1 overflow-y-auto">
            {myPendingOps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Nenhuma linha ativa no momento</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myPendingOps.map(op => (
                  <div key={op.id} className="p-3 md:p-4 hover:bg-blue-50/40 transition-colors group">
                    {/* Line number badge + OP */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-md bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                          L{op.linha}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 font-bold">#{op.opNumber}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold">
                        <Clock className="w-3 h-3" />
                        {op.horaInicial}
                      </div>
                    </div>

                    {/* Product name */}
                    <p className="text-xs md:text-sm font-semibold text-slate-800 leading-tight mb-3 line-clamp-2">{op.produto}</p>
                    {op.litragem && (
                      <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mb-3">
                        {op.litragem}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEdit(op)}
                        className="flex-none px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeletingOp(op)}
                        className="flex-none p-1.5 rounded-md border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Dialog open={finishingId === op.id} onOpenChange={(open) => {
                        if(open) {
                          setFinishingId(op.id);
                          setFinishTime(format(new Date(), 'HH:mm'));
                        } else {
                          setFinishingId(null);
                        }
                      }}>
                        <DialogTrigger render={
                          <button className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">
                            Finalizar
                          </button>
                        } />
                        <DialogContent className="max-w-md w-[95vw] sm:w-full">
                          <DialogHeader>
                            <DialogTitle>Finalizar OP {op.opNumber}</DialogTitle>
                            <DialogDescription>
                              Informe a quantidade apontada e o horário de término.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                             <div>
                               <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Quantidade Apontada (Unidades)</Label>
                               <Input 
                                 type="text" 
                                 inputMode="numeric"
                                 pattern="[0-9]*"
                                 value={finishQtd} 
                                 onChange={e => setFinishQtd(e.target.value.replace(/[^0-9]/g, ''))} 
                                 placeholder="Ex: 599"
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                               />
                             </div>
                             <div>
                               <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Final</Label>
                               <Input 
                                 type="time" 
                                 value={finishTime} 
                                 onChange={e => setFinishTime(e.target.value)} 
                                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-slate-700"
                               />
                             </div>
                          </div>
                          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
                            <Button variant="outline" onClick={() => setFinishingId(null)} className="w-full sm:w-auto">Cancelar</Button>
                            <Button onClick={() => handleFinish(op.id)} disabled={loading} className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700">
                              {loading ? 'Enviando...' : 'Salvar na Planilha'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ══ COL 2: NOVA OP (centro, flex-1) ══ */}
        <section className={`${
          mobileTab === 'pendentes' ? 'hidden md:flex' : mobileTab === 'concluidas' ? 'hidden md:flex' : 'flex'
        } flex-col flex-1 bg-slate-100 overflow-y-auto`}>
          
          {/* Section header */}
          <div className="px-4 md:px-6 xl:px-8 pt-5 md:pt-6 pb-4 shrink-0">
            <nav className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5">Coleta de Dados / Registro Ativo</nav>
            <h2 className="text-xl md:text-2xl font-light text-slate-700 tracking-tight">
              Iniciar <span className="font-bold text-slate-900">Nova OP</span>
            </h2>
          </div>

          {/* Form card */}
          <div className="flex-1 flex items-start justify-center px-4 md:px-6 xl:px-8 pb-8">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              
              {/* Form header strip */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Nova Ordem de Produção</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Turno {currentTurnForView}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onStartOp)} className="p-4 md:p-6 space-y-4 md:space-y-5">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="opNumber" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
                    <Input
                      id="opNumber"
                      {...register('opNumber', { onChange: (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Ex: 48370"
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    {errors.opNumber && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.opNumber.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="horaInicial" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                    <Input
                      id="horaInicial"
                      type="time"
                      {...register('horaInicial')}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.horaInicial.message}</p>}
                  </div>
                </div>

                <div className="relative">
                  <Label htmlFor="produto" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Produto</Label>
                  <input
                    id="produto"
                    {...register('produto')}
                    autoComplete="off"
                    onFocus={() => setShowProductSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                    placeholder="Ex: ALUMAX 5L"
                    className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  {showProductSuggestions && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto p-1">
                      {filteredProducts.map(p => (
                        <div
                          key={p.produto}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setValue('produto', p.produto);
                            setShowProductSuggestions(false);
                          }}
                          className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center justify-between gap-2"
                        >
                          <span>{p.produto}</span>
                          {p.litragem && <span className="text-[10px] text-slate-400 font-mono shrink-0">{p.litragem}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.produto && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.produto.message}</p>}
                </div>

                <div>
                  <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Linha de Produção</Label>
                  <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
                    <PopoverTrigger
                      type="button"
                      role="combobox"
                      aria-expanded={openLineSelect}
                      className={cn(
                        "flex items-center justify-between w-full h-11 px-3 border-2 transition-all duration-200 text-sm font-semibold rounded-lg outline-none focus:ring-2 focus:ring-blue-500",
                        watch('linha')
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                      )}
                    >
                      {watch('linha') ? `Linha ${watch('linha')}` : 'Selecione a Linha'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-slate-200" align="start">
                      <Command className="border-none">
                        <CommandInput placeholder="Buscar linha..." className="bg-transparent text-sm" />
                        <CommandList className="max-h-[250px] overflow-y-auto mt-1">
                          <CommandEmpty className="py-6 text-center text-xs text-slate-500">Nenhuma linha encontrada.</CommandEmpty>
                          <CommandGroup>
                            {Array.from({ length: 16 }, (_, i) => {
                              const lineVal = String(i + 1);
                              return (
                                <CommandItem
                                  key={lineVal}
                                  value={`Linha ${lineVal}`}
                                  onSelect={() => {
                                    setValue('linha', lineVal, { shouldValidate: true });
                                    setOpenLineSelect(false);
                                  }}
                                  className="flex items-center justify-between py-2.5 px-3 cursor-pointer aria-selected:bg-blue-600 aria-selected:text-white"
                                >
                                  <span className="font-bold uppercase tracking-tight">Linha {lineVal}</span>
                                  <Check className={cn("h-4 w-4", watch('linha') === lineVal ? 'opacity-100' : 'opacity-0')} />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.linha && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.linha.message}</p>}
                </div>

                {/* Hidden turno */}
                <div className="hidden">
                  <Select onValueChange={(v) => setValue('turno', v)} value={watch('turno') || ''} disabled={!!loginProfile && loginProfile !== 'Supervisor'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Turno A</SelectItem>
                      <SelectItem value="B">Turno B</SelectItem>
                      <SelectItem value="C">Turno C</SelectItem>
                      <SelectItem value="D">Turno D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-md transition-all active:scale-[0.99]"
                  >
                    Iniciar Produção
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ══ COL 3: CONCLUÍDAS + KPIs ══ */}
        <aside className={`${
          mobileTab !== 'concluidas' ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-[240px] md:min-w-[240px] md:max-w-[240px] lg:w-[290px] lg:min-w-[290px] lg:max-w-[290px] xl:w-[320px] xl:min-w-[320px] xl:max-w-[320px] bg-white border-t md:border-t-0 md:border-l border-slate-200 overflow-hidden`}>

          {/* KPI header */}
          <div className="bg-slate-900 text-white px-4 md:px-5 py-4 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">Concluídas Hoje</span>
              </div>
              <button
                onClick={generatePDF}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider transition-colors border border-white/10"
                title="Gerar PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>

            {/* KPIs row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-lg px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Registros</p>
                <p className="text-2xl font-black text-white tabular-nums">{myFinishedOps.length}</p>
              </div>
              <div className="bg-emerald-500/20 rounded-lg px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-0.5">Total Un.</p>
                <p className="text-2xl font-black text-emerald-300 tabular-nums">{totalUnidades.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {myFinishedOps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Nenhum registro concluído na sessão atual</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myFinishedOps.map((op, i) => (
                  <div key={i} className="px-3 md:px-4 py-3.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">L{op.linha}</span>
                          <span className="text-[10px] font-mono text-slate-400">#{op.opNumber}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2 mb-1.5">{op.produto}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {parseInt(op.quantidade).toLocaleString('pt-BR')} un.
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {op.horaInicial.slice(0,5)} → {op.horaFinal.slice(0,5)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(op)}
                          className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-colors bg-white shadow-sm"
                          title="Editar"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingOp(op)}
                          className="p-1.5 rounded border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors bg-white shadow-sm"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile PDF FAB — only on small screens */}
          {mobileTab === 'concluidas' && (
            <button
              onClick={generatePDF}
              className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl z-50 active:scale-95 transition-transform border-4 border-white"
              title="Gerar PDF"
            >
              <FileDown className="w-6 h-6" />
            </button>
          )}
        </aside>

      </main>

      {/* ── DIALOGS ── */}
      <Dialog open={!!deletingOp} onOpenChange={(open) => !open && setDeletingOp(null)}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Excluir Registro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta operação? Esta ação não pode ser desfeita.
              {deletingOp && 'quantidade' in deletingOp && (
                 <strong className="block mt-2 text-red-500">Nota: O registro também será removido da nuvem.</strong>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeletingOp(null)} className="w-full sm:w-auto">Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingOp} onOpenChange={(open) => { !open && setEditingOp(null) }}>
        <DialogContent className="max-w-xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar {editingOp && 'quantidade' in editingOp ? 'OP Concluída' : 'OP em Andamento'}</DialogTitle>
          </DialogHeader>
          {editingOp && (
          <form onSubmit={handleSubmitEdit(onEditOp)} className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" {...registerEdit('opNumber', { onChange: (e) => e.target.value = e.target.value.replace(/[^0-9]/g, '') })} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700" />
                </div>
                <div>
                  <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                  <Input type="time" {...registerEdit('horaInicial')} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700" />
                </div>
             </div>
             <div>
                <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Produto</Label>
                <div className="relative">
                   <input
                      {...registerEdit('produto')}
                      autoComplete="off"
                      onFocus={() => setShowEditProductSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowEditProductSuggestions(false), 200)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                   />
                   {showEditProductSuggestions && filteredEditProducts.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-1">
                         {filteredEditProducts.map(p => (
                            <div
                               key={p.produto}
                               onMouseDown={(e) => {
                                  e.preventDefault();
                                  setValueEdit('produto', p.produto);
                                  setShowEditProductSuggestions(false);
                               }}
                               className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-sm"
                            >
                               {p.produto}
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
             <div className="hidden">
                 <Select onValueChange={(v) => setValueEdit('turno', v)} value={watchEdit('turno') || ''} disabled={!!loginProfile && loginProfile !== 'Supervisor'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="A">A</SelectItem>
                       <SelectItem value="B">B</SelectItem>
                       <SelectItem value="C">C</SelectItem>
                       <SelectItem value="D">D</SelectItem>
                    </SelectContent>
                 </Select>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Linha</Label>
                  <Select onValueChange={(v) => setValueEdit('linha', v)} value={watchEdit('linha') || ''}>
                     <SelectTrigger className="w-full h-10 bg-white border border-slate-200 rounded-md text-sm text-slate-700">
                        <SelectValue placeholder="Selecione..." />
                     </SelectTrigger>
                     <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => (
                           <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                </div>
             </div>
             {'quantidade' in editingOp && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 mt-4">
                    <div>
                      <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Quantidade</Label>
                      <Input type="text" inputMode="numeric" pattern="[0-9]*" {...registerEdit('quantidade', { onChange: (e) => e.target.value = e.target.value.replace(/[^0-9]/g, '') })} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div>
                      <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Final</Label>
                      <Input type="time" {...registerEdit('horaFinal')} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700" />
                    </div>
                 </div>
             )}
             <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingOp(null)} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 text-white w-full sm:w-auto">Salvar Correção</Button>
             </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
