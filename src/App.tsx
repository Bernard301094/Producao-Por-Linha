import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, getFinishedOperations, FinishedOperation, Operation, getProducts, addProduct, removeFinishedOperation, getReportForDateAndShift } from './api';
import { auth, db } from './firebase'; // Removido googleProvider caso não esteja usando neste arquivo
import { collection, query, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Componentes UI e Ícones
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { cn } from './lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import { Check, ChevronsUpDown, Package, ClipboardList, CheckCircle2, LogOut, Loader2, Trash2, Pencil, FileDown, Shield } from 'lucide-react';

// Utilitários e Componentes Locais
import { saveAndSharePDF } from './lib/pdfUtils';
import SupervisorPanel from './components/SupervisorPanel';

const PROFILES: Record<string, string> = {
  'Turno A': 'TurnoA@Vonixx2026',
  'Turno B': 'TurnoB@Vonixx2026',
  'Turno C': 'TurnoC@Vonixx2026',
  'Turno D': 'TurnoD@Vonixx2026',
  'Supervisor': 'PCP@Vonixx2026'
};

function getSuggestedShift(now: Date, horaInicial: string): string {
  const [h] = horaInicial.split(':').map(Number);
  if (h >= 6 && h < 14) return 'A';
  if (h >= 14 && h < 22) return 'B';
  return 'C';
}

const startOpSchema = z.object({
  opNumber: z.string().min(1, 'Obrigatório'),
  produto: z.string().min(1, 'Obrigatório'),
  linha: z.string().min(1, 'Obrigatório'),
  turno: z.string().min(1, 'Obrigatório'),
  horaInicial: z.string().min(1, 'Obrigatório'),
});

type StartOpFormValues = z.infer<typeof startOpSchema>;

export default function App() {
  function extractLitragem(produto: string): string {
    const upper = (produto || '').toUpperCase();
    if (upper.includes(' IBC')) return 'IBC';
    const match = produto.match(/(\d+(?:,\d+)?)\s*(L|ML|G|KG)\b/i);
    if (match) {
      const unit = match[2].toUpperCase();
      const num = match[1];
      if (unit === 'L') return num === '1' ? '1 Litro' : `${num} Litros`;
      if (unit === 'ML') return `${num}ml`;
      if (unit === 'G') return `${num}g`;
      if (unit === 'KG') return `${num}Kg`;
    }
    return '';
  }

  const [loginProfile, setLoginProfile] = useState<string | null>(null);
  const [supervisorDate, setSupervisorDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supervisorShift, setSupervisorShift] = useState('A');
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [mobileTab, setMobileTab] = useState<'pendentes' | 'nova' | 'concluidas'>('nova');
  const [openLineSelect, setOpenLineSelect] = useState(false);
  const [searchPending, setSearchPending] = useState('');
  const [searchFinished, setSearchFinished] = useState('');
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
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit } = useForm<StartOpFormValues & { quantidade?: string; horaFinal?: string }>({});
  const watchEditProduto = watchEdit('produto');

  const openEdit = (op: Operation | FinishedOperation) => {
    setEditingOp(op);
    resetEdit({
      opNumber: op.opNumber, produto: op.produto, linha: op.linha, turno: op.turno,
      horaInicial: op.horaInicial,
      quantidade: (op as FinishedOperation).quantidade || '',
      horaFinal: (op as FinishedOperation).horaFinal || ''
    });
  };

  const onEditOp = async (data: any) => {
    if (!editingOp) return;
    setLoading(true);
    try {
      const matchedProduct = availableProducts.find(p => p.produto.trim().toUpperCase() === data.produto.trim().toUpperCase());
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto);
      if ('quantidade' in editingOp) {
        import('./api').then(api => api.updateFinishedOperation(editingOp.id, {
          opNumber: data.opNumber, produto: data.produto, litragem: derivedLitragem,
          linha: data.linha, turno: data.turno,
          horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial,
          quantidade: data.quantidade,
          horaFinal: data.horaFinal.length === 5 ? `${data.horaFinal}:00` : data.horaFinal
        }).then(() => loadOps()));
        toast.success('Editado (Local)');
      } else {
        import('./api').then(api => api.updateOperation(editingOp.id, {
          opNumber: data.opNumber, produto: data.produto, litragem: derivedLitragem,
          linha: data.linha, turno: data.turno,
          horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial
        }).then(() => loadOps()));
        toast.success('OP Atualizada');
      }
      setEditingOp(null);
    } catch (err: any) {
      toast.error('Erro ao editar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StartOpFormValues>({
    resolver: zodResolver(startOpSchema),
    defaultValues: { opNumber: '', produto: '', linha: '', turno: '', horaInicial: '' }
  });

  const loadOps = async () => {
    const ops = await getOperations(); setOperations(ops);
    const fOps = await getFinishedOperations(); setFinishedOps(fOps);
    const prods = await getProducts(); setAvailableProducts(prods);
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
    if (watchHoraInicial) setValue('turno', getSuggestedShift(new Date(), watchHoraInicial));
  }, [watchHoraInicial, setValue]);

  useEffect(() => {
    const q = query(collection(db, 'pendingOperations'));
    const unsub = onSnapshot(q, (snapshot) => {
      setOperations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation)));
    });
    loadOps();
    setValue('horaInicial', format(new Date(), 'HH:mm'));
    const storedProfile = localStorage.getItem('loginProfile');
    if (storedProfile) {
      setLoginProfile(storedProfile);
      if (storedProfile !== 'Supervisor') setValue('turno', storedProfile.replace('Turno ', ''));
    }
    return () => unsub();
  }, [setValue]);

  const loadHistory = async () => {
    try {
      const ops = await getReportForDateAndShift(supervisorDate, supervisorShift);
      setHistoryReports(ops);
    } catch (e: any) {
      toast.error('Erro ao carregar o histórico.');
    }
  };

  useEffect(() => {
    if (loginProfile === 'Supervisor') loadHistory();
  }, [supervisorDate, supervisorShift, loginProfile]);

  const onStartOp = async (data: StartOpFormValues) => {
    setLoading(true);
    try {
      const matchedProduct = availableProducts.find(p => p.produto.trim().toUpperCase() === data.produto.trim().toUpperCase());
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto);
      const newOp: Operation = {
        id: crypto.randomUUID(), carimboInicial: new Date().toISOString(), ...data,
        horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial,
        litragem: derivedLitragem
      };
      await addOperation(newOp);
      await addProduct(data.produto, derivedLitragem);
      setAvailableProducts(await getProducts());
      toast.success('Operação iniciada!');
      reset({ ...data, opNumber: '', produto: '' });
      setValue('horaInicial', format(new Date(), 'HH:mm'));
      loadOps();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (id: string) => {
    if (!finishQtd || !finishTime) { toast.error('Preencha a quantidade e hora final.'); return; }
    setLoading(true);
    try {
      await markOperationFinished(id, finishQtd, finishTime.length === 5 ? `${finishTime}:00` : finishTime);
      toast.success('Salvo na planilha com sucesso!');
      setFinishingId(null); setFinishQtd('');
      loadOps();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja cancelar esta operação?')) {
      await removeOperation(id); toast.info('Operação removida.'); loadOps();
    }
  };

  const currentTurnForView = loginProfile && loginProfile !== 'Supervisor'
    ? loginProfile.replace('Turno ', '')
    : getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));

  const myPendingOps = operations.filter(op => op.turno === currentTurnForView);
  const myFinishedOps = finishedOps.filter(op => op.turno === currentTurnForView);

  const matchesSearch = (op: { opNumber: string; linha: string; produto: string }, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return op.opNumber.toLowerCase().includes(lower) || op.linha.toLowerCase().includes(lower) || op.produto.toLowerCase().includes(lower);
  };

  const visiblePendingOps = useMemo(() => myPendingOps.filter(op => matchesSearch(op, searchPending)), [myPendingOps, searchPending]);
  const visibleFinishedOps = useMemo(() => myFinishedOps.filter(op => matchesSearch(op, searchFinished)), [myFinishedOps, searchFinished]);
  const totalUnidades = myFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);
  const visibleTotalUnidades = visibleFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);

  const confirmDelete = async () => {
    if (!deletingOp) return;
    setLoading(true);
    try {
      if ('quantidade' in deletingOp) {
        await import('./api').then(api => api.removeFinishedOperation(deletingOp.id));
        toast.success('Registro removido.');
      } else {
        await removeOperation(deletingOp.id);
        toast.info('Operação removida.');
      }
      loadOps();
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    } finally {
      setLoading(false);
      setDeletingOp(null);
    }
  };

  if (!loginProfile) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Produção por Linha</h1>
              <p className="text-slate-400 text-sm mt-1">Vonixx — Controle de OPs</p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700">
              <div className="space-y-4">
                {Object.entries(PROFILES).map(([profile, password]) => (
                  <button
                    key={profile}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const emailMap: Record<string, string> = {
                          'Turno A': 'turnoa@vonixx.com',
                          'Turno B': 'turnob@vonixx.com',
                          'Turno C': 'turnoc@vonixx.com',
                          'Turno D': 'turnod@vonixx.com',
                          'Supervisor': 'supervisor@vonixx.com'
                        };
                        await signInWithEmailAndPassword(auth, emailMap[profile], password);
                        localStorage.setItem('loginProfile', profile);
                        setLoginProfile(profile);
                        if (profile !== 'Supervisor') setValue('turno', profile.replace('Turno ', ''));
                      } catch {
                        toast.error('Erro ao entrar.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className={cn(
                      'w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200',
                      profile === 'Supervisor'
                        ? 'bg-amber-500 hover:bg-amber-400 text-amber-950'
                        : 'bg-slate-700 hover:bg-blue-600 text-white hover:shadow-lg'
                    )}
                  >
                    {profile === 'Supervisor' ? <span className="flex items-center justify-center gap-2"><Shield className="w-4 h-4" />{profile}</span> : profile}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loginProfile === 'Supervisor') {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-slate-50">
          <SupervisorPanel
            supervisorDate={supervisorDate}
            setSupervisorDate={setSupervisorDate}
            supervisorShift={supervisorShift}
            setSupervisorShift={setSupervisorShift}
            historyReports={historyReports}
            loadHistory={loadHistory}
            onLogout={() => {
              signOut(auth);
              localStorage.removeItem('loginProfile');
              setLoginProfile(null);
            }}
          />
        </div>
      </>
    );
  }

  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-black text-slate-800 tracking-tight leading-none">Produção por Linha</h1>
                <p className="text-[10px] text-slate-400 font-mono">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">{loginProfile}</span>
              </div>
              <button
                onClick={async () => {
                  const r = await import('./lib/pdfUtils');
                  r.saveAndSharePDF(myFinishedOps, loginProfile || '', today);
                }}
                className="hidden md:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                Exportar PDF
              </button>
              <button onClick={() => { signOut(auth); localStorage.removeItem('loginProfile'); setLoginProfile(null); }} className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 text-xs font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="md:hidden sticky top-[57px] z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex">
            {(['pendentes', 'nova', 'concluidas'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors',
                  mobileTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {tab === 'pendentes' ? `Pendentes (${visiblePendingOps.length})` : tab === 'nova' ? 'Nova OP' : `Concluídas (${visibleFinishedOps.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

            {/* Pendentes */}
            <div className={cn('bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden', mobileTab !== 'pendentes' && 'hidden md:flex')}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Pendentes</span>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{visiblePendingOps.length}</span>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-slate-100">
                <input
                  type="text"
                  value={searchPending}
                  onChange={e => setSearchPending(e.target.value)}
                  placeholder="Buscar OP, produto, linha..."
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visiblePendingOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <ClipboardList className="w-10 h-10 mb-2" />
                    <p className="text-xs font-semibold">Nenhuma OP pendente</p>
                  </div>
                ) : visiblePendingOps.map(op => (
                  <div key={op.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">OP {op.opNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">L{op.linha}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate">{op.produto}</p>
                        {op.litragem && <p className="text-[10px] text-slate-400 font-mono">{op.litragem}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">Início: {op.horaInicial}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openEdit(op)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeletingOp(op)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {finishingId === op.id ? (
                      <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Qtd (UN)</label>
                            <Input type="number" value={finishQtd} onChange={e => setFinishQtd(e.target.value)} placeholder="Ex: 1200" className="h-8 text-xs mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Hora Final</label>
                            <Input type="time" value={finishTime} onChange={e => setFinishTime(e.target.value)} className="h-8 text-xs mt-0.5" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleFinish(op.id)} disabled={loading} className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setFinishingId(null); setFinishQtd(''); setFinishTime(''); }} className="h-8 text-xs">Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => { setFinishingId(op.id); setFinishQtd(''); setFinishTime(''); }} className="w-full mt-2 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Nova OP */}
            <div className={cn('bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden', mobileTab !== 'nova' && 'hidden md:flex')}>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
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
                    <Input id="opNumber" {...register('opNumber', { onChange: (e) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500" />
                    {errors.opNumber && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.opNumber.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="horaInicial" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                    <Input id="horaInicial" type="time" {...register('horaInicial')} className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500" />
                    {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.horaInicial.message}</p>}
                  </div>
                </div>
                <div className="relative">
                  <Label htmlFor="produto" className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Produto</Label>
                  <input id="produto" {...register('produto')} autoComplete="off" onFocus={() => setShowProductSuggestions(true)} onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)} placeholder="Ex: ALUMAX 5L" className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
                  {showProductSuggestions && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto p-1">
                      {filteredProducts.map(p => (
                        <div key={p.produto} onMouseDown={(e) => { e.preventDefault(); setValue('produto', p.produto); setShowProductSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center justify-between gap-2">
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
                    <PopoverTrigger type="button" role="combobox" aria-expanded={openLineSelect} className={cn("flex items-center justify-between w-full h-11 px-3 border-2 transition-all duration-200 text-sm font-semibold rounded-lg outline-none focus:ring-2 focus:ring-blue-500", watch('linha') ? 'border-blue-500 bg-blue-50/50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300')}>
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
                                <CommandItem key={lineVal} value={`Linha ${lineVal}`} onSelect={() => { setValue('linha', lineVal, { shouldValidate: true }); setOpenLineSelect(false); }} className="flex items-center justify-between py-2.5 px-3 cursor-pointer aria-selected:bg-blue-600 aria-selected:text-white">
                                  <span className="font-bold uppercase tracking-tight">Linha {lineVal}</span>
                                  <Check className={cn('h-4 w-4', watch('linha') === lineVal ? 'opacity-100' : 'opacity-0')} />
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
                <div className="hidden">
                  <Select onValueChange={(v) => setValue('turno', v)} value={watch('turno') || ''} disabled={!!loginProfile && loginProfile !== 'Supervisor'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-sm transition-all">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Package className="w-4 h-4 mr-2" />Iniciar OP</>}
                </Button>
              </form>
            </div>

            {/* Concluídas */}
            <div className={cn('bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden', mobileTab !== 'concluidas' && 'hidden md:flex')}>
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Concluídas</span>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">{visibleFinishedOps.length}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="text-sm font-black text-slate-700 font-mono">{visibleTotalUnidades.toLocaleString()} UN</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-slate-100">
                <input
                  type="text"
                  value={searchFinished}
                  onChange={e => setSearchFinished(e.target.value)}
                  placeholder="Buscar OP, produto, linha..."
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visibleFinishedOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <CheckCircle2 className="w-10 h-10 mb-2" />
                    <p className="text-xs font-semibold">Nenhuma OP concluída</p>
                  </div>
                ) : visibleFinishedOps.map(op => (
                  <div key={op.id} className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">OP {op.opNumber}</span>
                          <span className="text-[10px] text-slate-400 font-mono">L{op.linha}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate">{op.produto}</p>
                        {op.litragem && <p className="text-[10px] text-slate-400 font-mono">{op.litragem}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-500">Início: {op.horaInicial}</span>
                          {(op as FinishedOperation).horaFinal && <span className="text-[10px] text-slate-500">Fim: {(op as FinishedOperation).horaFinal}</span>}
                        </div>
                        {(op as FinishedOperation).quantidade && (
                          <p className="text-xs font-black text-emerald-600 mt-1">{parseInt((op as FinishedOperation).quantidade).toLocaleString()} UN</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openEdit(op)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeletingOp(op)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 md:hidden">
                <button
                  onClick={async () => {
                    const r = await import('./lib/pdfUtils');
                    r.saveAndSharePDF(myFinishedOps, loginProfile || '', today);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Exportar Relatório PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingOp} onOpenChange={(o) => { if (!o) setDeletingOp(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-800">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Tem certeza que deseja remover esta operação? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingOp(null)}>Cancelar</Button>
            <Button onClick={confirmDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingOp} onOpenChange={(o) => { if (!o) setEditingOp(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-800">Editar Operação</DialogTitle>
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
                  <input {...registerEdit('produto')} autoComplete="off" onFocus={() => setShowEditProductSuggestions(true)} onBlur={() => setTimeout(() => setShowEditProductSuggestions(false), 200)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
                  {showEditProductSuggestions && filteredEditProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto p-1">
                      {filteredEditProducts.map(p => (
                        <div key={p.produto} onMouseDown={(e) => { e.preventDefault(); setValueEdit('produto', p.produto); setShowEditProductSuggestions(false); }} className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-sm">{p.produto}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden">
                <Select onValueChange={(v) => setValueEdit('turno', v)} value={watchEdit('turno') || ''} disabled={!!loginProfile && loginProfile !== 'Supervisor'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {'quantidade' in editingOp && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Quantidade (UN)</Label>
                    <Input type="number" {...registerEdit('quantidade')} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700" />
                  </div>
                  <div>
                    <Label className="block text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1.5">Hora Final</Label>
                    <Input type="time" {...registerEdit('horaFinal')} className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-700" />
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setEditingOp(null)} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-emerald-600 text-white w-full sm:w-auto">Salvar Correção</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
