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
import { Factory, LogIn, LogOut, Trash2, Eye, EyeOff, FileDown, Check, ChevronsUpDown, Search } from 'lucide-react';
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
    // Real-time operations
    const q = query(collection(db, 'pendingOperations'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
      setOperations(docs);
    });
    
    loadOps();
    
    // Default current time to "HH:mm"
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
    
    // Refresh products list just in case
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
    <div className="w-full h-[100dvh] bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Toaster position="top-right" richColors />
      
      {/* Top Navigation Bar */}
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
               <span className="block sm:inline">{loginProfile}</span>
             </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ChangePasswordDialog loginProfile={loginProfile!} defaultProfiles={PROFILES} />
            <Button variant="ghost" size="sm" onClick={() => {
               setLoginProfile(null);
               localStorage.removeItem('loginProfile');
            }} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-3">
               <span className="hidden sm:inline">Sair</span> <LogOut className="w-4 h-4 sm:ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:grid xl:grid-cols-12 gap-0 overflow-hidden relative">
        
        {/* Mobile / Tablet Tabs */}
        <div className="xl:hidden flex bg-white border-b border-slate-200 shrink-0 z-20">
           <button onClick={() => setMobileTab('pendentes')} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 ${mobileTab === 'pendentes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Pendentes ({operations.length})
           </button>
           <button onClick={() => setMobileTab('nova')} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 ${mobileTab === 'nova' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Nova OP
           </button>
           <button onClick={() => setMobileTab('concluidas')} className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 ${mobileTab === 'concluidas' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Concluídas ({finishedOps.filter(op => op.turno === currentTurnForView).length})
           </button>
        </div>

        {/* Left Sidebar: Open Sessions -> OPs em Andamento */}
        <aside className={`${mobileTab !== 'pendentes' ? 'hidden xl:flex' : 'flex'} flex-col xl:col-span-3 bg-white xl:h-full overflow-hidden flex-1 xl:flex-none border-b xl:border-b-0 xl:border-r border-slate-200 z-10 shrink-0 shadow-sm xl:shadow-none`}>
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Linhas Pendentes</h2>
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{myPendingOps.length} Ativas</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {myPendingOps.length === 0 ? (
               <div className="p-8 text-center">
                 <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Nenhuma linha ativa no momento</p>
               </div>
            ) : (
               myPendingOps.map(op => (
                 <div key={op.id} className="p-4 border-b border-slate-100 transition-colors bg-blue-50/30 border-l-4 border-l-blue-600 cursor-default">
                   <div className="flex justify-between mb-1">
                     <span className="text-xs font-mono text-slate-400">#{op.opNumber}</span>
                     <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Iniciada - Turno {op.turno}</span>
                   </div>
                   <p className="text-sm font-semibold text-slate-800">{op.produto}</p>
                   <p className="text-xs text-slate-500 mt-1 italic uppercase">Início: {op.horaInicial} | Linha {op.linha}</p>
                   
                   <div className="mt-3 flex gap-2">
                     <button onClick={() => openEdit(op)} className="flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                       Editar
                     </button>
                     <button onClick={() => setDeletingOp(op)} className="flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
                       <Trash2 className="w-3 h-3" />
                     </button>
                     <Dialog open={finishingId === op.id} onOpenChange={(open) => {
                       if(open) {
                         setFinishingId(op.id);
                         setFinishTime(format(new Date(), 'HH:mm'));
                       } else {
                         setFinishingId(null);
                       }
                     }}>
                       <DialogTrigger render={<button className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-colors">Finalizar</button>} />
                       {/* Removed extra button */}
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
                     
                     <button onClick={() => handleDelete(op.id)} className="flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                       Cancelar
                     </button>
                   </div>
                 </div>
               ))
            )}
          </div>
        </aside>

        {/* Main Data Entry Area -> Nova OP */}
        <section className={`${mobileTab === 'pendentes' ? 'hidden xl:flex' : 'flex'} flex-col xl:col-span-9 p-4 md:p-8 gap-6 bg-slate-50 xl:h-full overflow-y-auto w-full flex-auto`}>
          <div className={`${mobileTab !== 'nova' ? 'hidden xl:flex' : 'flex'} justify-between items-end`}>
            <div>
              <nav className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Coleta de Dados / Registro Ativo</nav>
              <h2 className="text-2xl sm:text-3xl font-light text-slate-800 tracking-tight">Iniciar <span className="font-bold">Nova OP</span></h2>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Planilha Destino</p>
              <p className="text-sm font-mono text-slate-600">gid: 1992525527</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4 flex-1 items-start">
            {/* Entry Form Container */}
            <div className={`${mobileTab !== 'nova' ? 'hidden xl:block' : 'block'} bg-white p-6 md:p-8 border border-slate-200 rounded-lg shadow-sm w-full`}>
              <form onSubmit={handleSubmit(onStartOp)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opNumber" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
                    <Input id="opNumber" {...register('opNumber', { onChange: (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500" />
                    {errors.opNumber && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold">{errors.opNumber.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="horaInicial" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                    <Input id="horaInicial" type="time" {...register('horaInicial')} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500" />
                    {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold">{errors.horaInicial.message}</p>}
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
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
                  />
                  {showProductSuggestions && filteredProducts.length > 0 && (
                     <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-1">
                        {filteredProducts.map(p => (
                           <div 
                              key={p.produto} 
                              onMouseDown={(e) => {
                                 e.preventDefault();
                                 setValue('produto', p.produto);
                                 setShowProductSuggestions(false);
                              }}
                              className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-sm"
                           >
                              {p.produto}
                           </div>
                        ))}
                     </div>
                  )}
                  {errors.produto && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold">{errors.produto.message}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="linha" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Linha de Produção</Label>
                    <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
                      <PopoverTrigger
                        type="button"
                        role="combobox"
                        aria-expanded={openLineSelect}
                        className={cn(
                          "flex items-center justify-between w-full h-12 px-3 border-2 transition-all duration-200 text-sm font-semibold rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-blue-500",
                          watch('linha') 
                            ? 'border-blue-500 bg-blue-50/30 text-blue-700 ring-2 ring-blue-100' 
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {watch('linha') ? `Linha ${watch('linha')}` : "Selecione a Linha"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-slate-200" align="start">
                        <Command className="border-none">
                          <CommandInput 
                            placeholder="Buscar linha..." 
                            className="bg-transparent text-sm"
                          />
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
                                    className="flex items-center justify-between py-2.5 px-3 cursor-pointer aria-selected:bg-blue-600 aria-selected:text-white group"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold uppercase tracking-tight">Linha {lineVal}</span>
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4",
                                        watch('linha') === lineVal ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors.linha && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold">{errors.linha.message}</p>}
                  </div>
                </div>
                
                <div className="hidden">
                  <Label htmlFor="turno" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Turno</Label>
                  <Select onValueChange={(v) => setValue('turno', v)} value={watch('turno') || ""} disabled={!!loginProfile && loginProfile !== 'Supervisor'}>
                    <SelectTrigger className="w-full h-10 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-75 disabled:bg-slate-50 disabled:text-slate-500">
                      <SelectValue placeholder="Selecione o Turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Turno A</SelectItem>
                      <SelectItem value="B">Turno B</SelectItem>
                      <SelectItem value="C">Turno C</SelectItem>
                      <SelectItem value="D">Turno D</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.turno && <p className="text-[10px] text-red-500 mt-1 uppercase font-bold">{errors.turno.message}</p>}
                </div>

                <div className="pt-4 border-t border-slate-100 flex">
                  <Button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded text-xs font-bold uppercase tracking-wider shadow-md hover:bg-emerald-700 h-auto">
                    Iniciar Produção
                  </Button>
                </div>
              </form>
            </div>

            {/* Status Panel */}
            <div className={`${mobileTab !== 'concluidas' ? 'hidden xl:flex' : 'flex'} flex-col gap-4 w-full`}>
              <div className="bg-slate-800 rounded-lg p-4 sm:p-6 text-white shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Status da Sessão</p>
                  <p className="text-2xl font-light">{myPendingOps.length} <span className="text-xs text-slate-500">{myPendingOps.length === 1 ? 'linha em aberto' : 'linhas em aberto'}</span></p>
                </div>
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <Factory className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              {/* Finished Today */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col gap-4 mt-0 xl:mt-2 shadow-sm flex-1 xl:max-h-[400px] overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Concluídas Hoje</h3>
                  <div className="flex gap-3 items-center">
                    <button onClick={generatePDF} className="hidden xl:block px-3 py-1 bg-slate-50 text-slate-600 rounded text-[10px] border border-slate-200 hover:bg-slate-100 font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                       Gerar PDF
                    </button>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter whitespace-nowrap">{myFinishedOps.length} Registros</span>
                  </div>
                </div>
                
                {/* Floating Button for Mobile PDF Generation */}
                {mobileTab === 'concluidas' && (
                  <button 
                    onClick={generatePDF}
                    className="xl:hidden fixed bottom-24 right-6 w-14 h-14 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl z-50 active:scale-95 transition-transform border-4 border-white"
                    title="Gerar PDF"
                  >
                    <FileDown className="w-6 h-6" />
                  </button>
                )}
                
                <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                  {myFinishedOps.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum registro concluído na sessão atual.</p>
                  ) : (
                    <div className="space-y-3">
                      {myFinishedOps.map((op, i) => (
                        <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-md p-3 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">OP {op.opNumber} • L{op.linha}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                 <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm whitespace-nowrap">{op.quantidade} un.</span>
                                 <span className="text-[10px] text-slate-500 font-mono tracking-tighter whitespace-nowrap">{op.horaInicial} - {op.horaFinal}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                               <button onClick={() => openEdit(op)} className="p-2 sm:p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white hover:text-blue-600 transition-colors bg-white shadow-sm" title="Editar">
                                 <Eye className="w-3.5 h-3.5" />
                               </button>
                               <button onClick={() => setDeletingOp(op)} className="p-2 sm:p-1.5 rounded border border-red-100 text-red-500 hover:bg-white hover:text-red-600 transition-colors bg-white shadow-sm" title="Excluir">
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 leading-tight break-words" title={op.produto}>{op.produto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

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
                 <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Turno</Label>
                 <Select onValueChange={(v) => setValueEdit('turno', v)} value={watchEdit('turno') || ""} disabled={!!loginProfile && loginProfile !== 'Supervisor'}>
                    <SelectTrigger className="w-full h-10 bg-white border border-slate-200 rounded-md text-sm text-slate-700 disabled:opacity-75 disabled:bg-slate-50 disabled:text-slate-500">
                       <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
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
                  <Select onValueChange={(v) => setValueEdit('linha', v)} value={watchEdit('linha') || ""}>
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

