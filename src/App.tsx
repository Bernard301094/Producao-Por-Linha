import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, FinishedOperation, Operation, getProducts, addProduct, removeFinishedOperation, getReportForDateAndShift, getAuthProfile, updateAuthProfile, moveFinishedToPending, updateFinishedOperation, updateOperation, subscribeToOperations, subscribeToFinishedOps, getParadas, Parada, ParadaRecord, getLinhas, getProfiles } from './api';

// Componentes UI e Ícones
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { CustomTimePicker } from '../components/CustomTimePicker';
import { QuickCounter } from '../components/QuickCounter';
import { PendingOpItem } from '../components/PendingOpItem';
import { FinishedOpItem } from '../components/FinishedOpItem';
import { LoginScreen } from './components/LoginScreen/LoginScreen';
import { StartOpForm } from './components/StartOpForm/StartOpForm';
import { EditOpModal } from './components/EditOpModal/EditOpModal';
import { ChangePasswordModal } from './components/ChangePasswordModal/ChangePasswordModal';
import { cn, useAutoIncrement } from './lib/utils';
import { toast, Toaster } from 'sonner';
import { Check, ChevronsUpDown, Package, ClipboardList, CheckCircle2, LogOut, Loader2, Trash2, Pencil, Eye, EyeOff, RotateCcw, Wifi, Clock, KeyRound, Plus, Minus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';

function getActiveTurno(now: Date = new Date()): string {
  const logicalDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const logicalTimeZeroed = Date.UTC(logicalDate.getFullYear(), logicalDate.getMonth(), logicalDate.getDate());
  
  // Ref date is April 29th, 2026. This was an A/B day.
  const refDate = Date.UTC(2026, 3, 29); 
  const diffDays = Math.floor((logicalTimeZeroed - refDate) / (1000 * 60 * 60 * 24));
  
  const isABDay = Math.abs(diffDays) % 2 === 0;
  
  const h = now.getHours();
  const isDayTime = h >= 6 && h < 18;

  if (isABDay) {
      return isDayTime ? 'Turno A' : 'Turno B';
  } else {
      return isDayTime ? 'Turno C' : 'Turno D';
  }
}

function getLogicalDateStr(now: Date = new Date()): string {
  const logicalDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return format(logicalDate, 'yyyy-MM-dd');
}

function getSuggestedShift(now: Date, horaInicial: string): string {
  return getActiveTurno(now).replace('Turno ', '');
}

function isShiftAllowed(profile: string): { allowed: boolean, reason?: string } {
  const activeTurno = getActiveTurno();
  if (profile === activeTurno) {
      return { allowed: true };
  } else {
      return { allowed: false, reason: `Fora do horário. O turno atual é o ${activeTurno}` };
  }
}

// Parsea un string compacto "opNumber|linha|produto|litragem|quantidade|horaInicial|horaFinal|qntReprocesso"
function parseReportString(s: string, turno: string): FinishedOperation {
  if (typeof s !== 'string') {
    return {
      id: String(s),
      opNumber: '', linha: '', produto: '', litragem: '', quantidade: '', horaInicial: '', horaFinal: '',
      turno, carimboInicial: '', reportString: ''
    };
  }
  const [opNumber, linha, produto, litragem, quantidade, horaInicial, horaFinal, qntReprocesso] = s.split('|');
  return {
    id: s,
    opNumber: opNumber || '',
    linha: linha || '',
    produto: produto || '',
    litragem: litragem || '',
    quantidade: quantidade || '',
    horaInicial: horaInicial || '',
    horaFinal: horaFinal || '',
    qntReprocesso: qntReprocesso || '',
    turno,
    carimboInicial: '',
    reportString: s,
  };
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
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Change Password States
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changerOldPassword, setChangerOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPasswordLoading, setChangingPasswordLoading] = useState(false);
  const [showChangerPassword, setShowChangerPassword] = useState(false);

  const [mobileTab, setMobileTab] = useState<'pendentes' | 'nova' | 'concluidas'>('nova');
  const [openLineSelect, setOpenLineSelect] = useState(false);
  const [openEditLineSelect, setOpenEditLineSelect] = useState(false);
  const [searchPending, setSearchPending] = useState('');
  const [searchFinished, setSearchFinished] = useState('');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [finishedOps, setFinishedOps] = useState<FinishedOperation[]>([]);
  const [loadingNewOp, setLoadingNewOp] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingRevert, setLoadingRevert] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<{produto: string, litragem: string}[]>([]);
  const [availableParadas, setAvailableParadas] = useState<Parada[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [isTypingProduct, setIsTypingProduct] = useState(false);
  const [finishQtd, setFinishQtd] = useState('');
  const [finishQtdReprocesso, setFinishQtdReprocesso] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [finishParadas, setFinishParadas] = useState<ParadaRecord[]>([]);
  const [finishParadaSelectedCode, setFinishParadaSelectedCode] = useState('');
  const [finishParadaStart, setFinishParadaStart] = useState('');
  const [finishParadaEnd, setFinishParadaEnd] = useState('');
  
  const [profiles, setProfiles] = useState<string[]>([]);
  const [fetchedLinhas, setFetchedLinhas] = useState<string[]>([]);

  const [searchLine, setSearchLine] = useState('');
  const [searchEditLine, setSearchEditLine] = useState('');
  const [customLinhas, setCustomLinhas] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('customLinhas');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('customLinhas', JSON.stringify(customLinhas));
  }, [customLinhas]);

  const allLinhas = useMemo(() => Array.from(new Set([...fetchedLinhas, ...customLinhas])), [fetchedLinhas, customLinhas]);

  const [editingOp, setEditingOp] = useState<Operation | FinishedOperation | null>(null);
  const [editParadas, setEditParadas] = useState<ParadaRecord[]>([]);
  const [editParadaSelectedCode, setEditParadaSelectedCode] = useState('');
  const [editParadaStart, setEditParadaStart] = useState('');
  const [editParadaEnd, setEditParadaEnd] = useState('');
  const [deletingOp, setDeletingOp] = useState<Operation | FinishedOperation | null>(null);
  const [revertingOp, setRevertingOp] = React.useState<FinishedOperation | null>(null);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [startFormData, setStartFormData] = useState<StartOpFormValues | null>(null);
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit } = useForm<StartOpFormValues & { quantidade?: string; horaFinal?: string; qntReprocesso?: string }>({});
  const watchEditProduto = watchEdit('produto');

  const novaOpRef = useRef<HTMLDivElement>(null);
  const editOpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (novaOpRef.current && !novaOpRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
        setIsTypingProduct(false);
      }
      if (editOpRef.current && !editOpRef.current.contains(event.target as Node)) {
        setShowEditProductSuggestions(false);
        setIsTypingEditProduct(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const openEdit = (op: Operation | FinishedOperation) => {
    setEditingOp(op);
    setEditParadas(op.paradas || []);
    setEditParadaSelectedCode('');
    setEditParadaStart('');
    setEditParadaEnd('');
    resetEdit({
      opNumber: op.opNumber,
      produto: op.produto,
      linha: op.linha,
      turno: op.turno,
      horaInicial: op.horaInicial,
      quantidade: (op as FinishedOperation).quantidade || '',
      horaFinal: (op as FinishedOperation).horaFinal || '',
      qntReprocesso: (op as FinishedOperation).qntReprocesso || ''
    });
  };

  const onEditOp = async (data: any) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!editingOp) return;
    setLoadingEdit(true);
    try {
      const matchedProduct = availableProducts.find(
        p => (p.produto || '').trim().toUpperCase() === (data.produto || '').trim().toUpperCase()
      );
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto || '');

      const normalizeTime = (t: string) =>
        t && t.length === 5 ? `${t}:00` : t;

      const linhaRaw = data.linha || '';
      const formattedLinha = linhaRaw
        ? isNaN(Number(linhaRaw)) ? linhaRaw : `Linha ${linhaRaw}`
        : editingOp.linha;

      if ('quantidade' in editingOp) {
        const turno = editingOp.turno || currentTurnForView;
        await updateFinishedOperation(
          editingOp.id,
          {
            opNumber: data.opNumber,
            produto: data.produto,
            litragem: derivedLitragem,
            linha: formattedLinha,
            turno: data.turno || turno,
            horaInicial: normalizeTime(data.horaInicial),
            quantidade: data.quantidade,
            horaFinal: normalizeTime(data.horaFinal),
            qntReprocesso: data.qntReprocesso,
            paradas: editParadas,
          },
          turno
        );
        toast.success('OP concluída actualizada.');
      } else {
        await updateOperation(editingOp.id, {
          opNumber: data.opNumber,
          produto: data.produto,
          litragem: derivedLitragem,
          linha: formattedLinha,
          turno: data.turno,
          horaInicial: normalizeTime(data.horaInicial),
          paradas: editParadas,
        });
        toast.success('OP actualizada.');
      }
      setEditingOp(null);
    } catch (err: any) {
      toast.error('Erro ao editar: ' + err.message);
    } finally {
      setLoadingEdit(false);
    }
  };

  const addEditParada = () => {
    if (!editParadaSelectedCode || !editParadaStart || !editParadaEnd) {
      toast.error('Preencha o motivo da parada e os horários de início e término.');
      return;
    }
    const selected = availableParadas.find((p: any) => p.seq.toString() === editParadaSelectedCode);
    if (!selected) return;
    const newParada: ParadaRecord = {
      seq: selected.seq,
      tipologia: selected.tipologia,
      horaInicio: editParadaStart,
      horaFim: editParadaEnd,
    };
    setEditParadas([...editParadas, newParada]);
    setEditParadaSelectedCode('');
    setEditParadaStart('');
    setEditParadaEnd('');
  };

  const removeEditParada = (index: number) => {
    setEditParadas(editParadas.filter((_, i) => i !== index));
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StartOpFormValues>({
    resolver: zodResolver(startOpSchema),
    defaultValues: { opNumber: '', produto: '', linha: '', turno: '', horaInicial: '' }
  });

  const loadProducts = async () => {
    const prods = await getProducts();
    setAvailableProducts(prods);
  };

  const loadParadas = async () => {
    try {
      const paradas = await getParadas();
      setAvailableParadas(paradas);
    } catch (e) {
      console.error("Error loading paradas:", e);
    }
  };

  const loadLinhas = async () => {
    try {
      const linhas = await getLinhas();
      setFetchedLinhas(linhas);
    } catch (e) {
      console.error("Error loading linhas:", e);
    }
  };

  const loadProfiles = async () => {
    try {
      const profls = await getProfiles();
      setProfiles(profls.map(p => p.name));
    } catch (e) {
      console.error("Error loading profiles:", e);
    }
  };

  const watchHoraInicial = watch('horaInicial');
  const watchProduto = watch('produto');

  const filteredProducts = useMemo(() => {
    if (!watchProduto) return availableProducts;
    return availableProducts.filter(p => (p.produto || '').toLowerCase().includes((watchProduto || '').toLowerCase()));
  }, [watchProduto, availableProducts]);

  const [showEditProductSuggestions, setShowEditProductSuggestions] = useState(false);
  const [isTypingEditProduct, setIsTypingEditProduct] = useState(false);
  const filteredEditProducts = useMemo(() => {
    if (!watchEditProduto) return availableProducts;
    return availableProducts.filter(p => (p.produto || '').toLowerCase().includes((watchEditProduto || '').toLowerCase()));
  }, [watchEditProduto, availableProducts]);

  useEffect(() => {
    if (watchHoraInicial) {
      if (!loginProfile) {
        setValue('turno', getSuggestedShift(new Date(), watchHoraInicial));
      } else {
        setValue('turno', loginProfile.replace('Turno ', ''));
      }
    }
  }, [watchHoraInicial, setValue, loginProfile]);

  const currentTurnForView = loginProfile
    ? loginProfile.replace('Turno ', '')
    : getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));

  const refreshData = async () => {
    try {
      await loadProducts();
      await loadParadas();
      await loadLinhas();
      await loadProfiles();
    } catch (e) {
      console.error("Error loading data:", e);
    }
  };

  useEffect(() => {
    const unsubOps = subscribeToOperations((ops) => {
      setOperations(ops);
    });
    
    const unsubFinished = subscribeToFinishedOps((ops) => {
      setFinishedOps(ops);
    });

    return () => {
      unsubOps();
      unsubFinished();
    };
  }, []);

  useEffect(() => {
    refreshData();
    setValue('horaInicial', format(new Date(), 'HH:mm'));

    const storedProfile = localStorage.getItem('loginProfile');
    if (storedProfile) {
      setLoginProfile(storedProfile);
      setValue('turno', storedProfile.replace('Turno ', ''));
    }
  }, [setValue]);

  useEffect(() => {
    refreshData();
  }, [loginProfile]);

  // Login
  const handleLogin = async () => {
    if (!selectedProfile) return;
    
    const shiftCheck = isShiftAllowed(selectedProfile);
    if (!shiftCheck.allowed) {
      toast.error(shiftCheck.reason);
      return;
    }

    setLoginLoading(true);

    try {
      const profileData = await getAuthProfile(selectedProfile);
      const correctPassword = profileData?.password || profileData?.senha;
      
      if (!correctPassword) {
         toast.error('Perfil não configurado adequadamente.');
         setLoginLoading(false);
         return;
      }

      if (passwordInput.trim() === correctPassword) {
        localStorage.setItem('loginProfile', selectedProfile);
        setLoginProfile(selectedProfile);
        if (selectedProfile !== 'Supervisor') setValue('turno', selectedProfile.replace('Turno ', ''));
        setPasswordInput('');
        setSelectedProfile(null);
      } else {
        toast.error('Senha incorreta. Tente novamente.');
      }
    } catch (err: any) {
      console.error("Login fetch error:", err);
      toast.error('Erro ao verificar senha.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!loginProfile) return;
    if (newPassword !== confirmNewPassword) {
      toast.error('As novas senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setChangingPasswordLoading(true);
    try {
      const profileData = await getAuthProfile(loginProfile);
      const correctPassword = profileData?.password || profileData?.senha;
      
      if (!correctPassword || changerOldPassword !== correctPassword) {
        toast.error('Senha atual incorreta.');
        setChangingPasswordLoading(false);
        return;
      }

      await updateAuthProfile(loginProfile, newPassword);
      toast.success('Senha alterada com sucesso!');
      setChangePasswordOpen(false);
      setChangerOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar a senha.');
    } finally {
      setChangingPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    if (loginProfile) {
      try {
        const shiftCheck = isShiftAllowed(loginProfile);
        if (!shiftCheck.allowed) {
          const turno = loginProfile.replace('Turno ', '');
          const r = await import('./api');
          await r.clearTurnoRecords(turno);
        }
      } catch (e) {
        console.error("Failed to clear turno records", e);
      }
    }
    localStorage.removeItem('loginProfile');
    setLoginProfile(null);
    setSelectedProfile(null);
    setPasswordInput('');
  };

  const handlePreStartOp = (data: StartOpFormValues) => {
    setStartFormData(data);
    setShowConfirmStart(true);
  };

  const onStartOp = async (data: StartOpFormValues) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (operations.some(op => op.opNumber === data.opNumber)) {
      toast.error('Essa OP já está listada como pendente.');
      return;
    }

    setLoadingNewOp(true);
    try {
      const matchedProduct = availableProducts.find(p => (p.produto || '').trim().toUpperCase() === (data.produto || '').trim().toUpperCase());
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto || '');
      const newOpId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2);

      const newOp: Operation = {
        id: newOpId, carimboInicial: new Date().toISOString(), ...data,
        horaInicial: data.horaInicial.length === 5 ? `${data.horaInicial}:00` : data.horaInicial,
        litragem: derivedLitragem,
        turno: loginProfile ? loginProfile.replace('Turno ', '') : data.turno
      };
      // addOperation writes locally first (offline cache) — onSnapshot reacts instantly
      await addOperation(newOp);
      addProduct(data.produto, derivedLitragem); // fire and forget
      toast.success('Operação iniciada!');
      reset({ opNumber: '', produto: '', linha: '', turno: data.turno, horaInicial: format(new Date(), 'HH:mm') });
      setShowConfirmStart(false);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setLoadingNewOp(false);
    }
  };

  const handleFinish = async (id: string, qtd: string, time: string, reprocesso: string, paradas: ParadaRecord[], onSuccess: () => void) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!qtd || !time) { toast.error('Preencha a quantidade e hora final.'); return; }

    const op = operations.find(o => o.id === id);
    if (!op) { toast.error('Operação não encontrada.'); return; }

    const paradasToSave: ParadaRecord[] = 
      paradas.length > 0 ? paradas : (op.paradas || []);

    try {
      // Firebase write is instant (offline cache) — UI updates immediately via onSnapshot
      await markOperationFinished(
        op,
        qtd,
        time.length === 5 ? `${time}:00` : time,
        reprocesso,
        paradasToSave,
        (success, error) => {
          if (success) {
            toast.success('Sincronizado com a planilha!');
          } else {
            toast.warning(`OP salva, mas erro ao sincronizar planilha: ${error}`);
          }
        }
      );
      // onSuccess is called right after Firebase write — before OneDrive finishes
      toast.success('OP concluída!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    }
  };

  const confirmRevert = async () => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!revertingOp) return;
    setLoadingRevert(true);
    try {
      await moveFinishedToPending(revertingOp.id, revertingOp.turno || currentTurnForView);
      toast.success('OP movida de volta para Pendentes.');
    } catch (err: any) {
      toast.error('Erro ao reverter: ' + err.message);
    } finally {
      setLoadingRevert(false);
      setRevertingOp(null);
    }
  };

  const logicalToday = getLogicalDateStr(new Date());

  const myFinishedOps = useMemo(() => finishedOps.filter(op => {
    const sameTurn = op.turno === currentTurnForView;
    if (!op.carimboInicial) return sameTurn;
    return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
  }), [finishedOps, currentTurnForView, logicalToday]);

  const myPendingOps = useMemo(() => operations.filter(op => {
    const sameTurn = op.turno === currentTurnForView;
    if (!op.carimboInicial) return sameTurn;
    return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
  }), [operations, currentTurnForView, logicalToday]);

  const matchesSearch = (op: { opNumber?: string; linha?: string; produto?: string }, q: string) => {
    if (!q.trim()) return true;
    const lower = q.toLowerCase();
    return (op.opNumber || '').toLowerCase().includes(lower) || 
           (op.linha || '').toLowerCase().includes(lower) || 
           (op.produto || '').toLowerCase().includes(lower);
  };

  const visiblePendingOps = useMemo(() => myPendingOps.filter(op => matchesSearch(op, searchPending)), [myPendingOps, searchPending]);
  const visibleFinishedOps = useMemo(() => myFinishedOps.filter(op => matchesSearch(op, searchFinished)), [myFinishedOps, searchFinished]);
  const totalUnidades = myFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);
  const visibleTotalUnidades = visibleFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);

  const confirmDelete = async () => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        toast.error('Seu turno já foi encerrado.');
        return;
      }
    }

    if (!deletingOp) return;
    setLoadingDelete(true);
    try {
      if ('quantidade' in deletingOp) {
        await removeFinishedOperation(deletingOp.id, deletingOp.turno || currentTurnForView);
        toast.success('Registro removido.');
      } else {
        await removeOperation(deletingOp.id);
        toast.message('Operação removida.');
      }
    } catch (err: any) {
      toast.error('Erro ao remover: ' + err.message);
    } finally {
      setLoadingDelete(false);
      setDeletingOp(null);
    }
  };

  // ─── Tela de Login ────────────────────────────────────────────────────────
  if (!loginProfile) {
    return (
      <>
        <Toaster position="top-center" />
        <LoginScreen 
          profiles={profiles}
          selectedProfile={selectedProfile}
          setSelectedProfile={setSelectedProfile}
          passwordInput={passwordInput}
          setPasswordInput={setPasswordInput}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          loginLoading={loginLoading}
          handleLogin={handleLogin}
        />
      </>
    );
  }

  // Deleted Painel Supervisor

  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200/60 shadow-sm sticky top-0 z-30 pt-1 sm:pt-2">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-zinc-900 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0 shrink">
                <h1 className="text-sm md:text-base font-black text-zinc-900 tracking-tight leading-none truncate">Produção</h1>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5 truncate">{today}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-zinc-100/80 border border-zinc-200/60 rounded-md sm:rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 max-w-[100px] md:max-w-none overflow-hidden shrink border-dashed">
                <span className="text-[9px] sm:text-[11px] font-black text-zinc-700 uppercase tracking-wider truncate">{loginProfile}</span>
              </div>
              <div className="flex items-center shrink-0">
                <button onClick={() => setChangePasswordOpen(true)} className="flex items-center justify-center text-zinc-400 hover:text-zinc-800 w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-zinc-100 transition-colors shrink-0" title="Mudar Senha">
                  <KeyRound className="w-4 h-4 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline-block text-xs font-semibold">Senha</span>
                </button>
                <button onClick={handleLogout} className="flex items-center justify-center text-zinc-400 hover:text-red-600 w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0" title="Sair">
                  <LogOut className="w-4 h-4 sm:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline-block text-xs font-semibold">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden sticky top-[57px] z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200/60 shadow-sm">
          <div className="flex">
            {(['pendentes', 'nova', 'concluidas'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  'flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors',
                  mobileTab === tab
                    ? 'text-zinc-900 border-b-2 border-zinc-900 bg-zinc-50/50'
                    : 'text-zinc-400 hover:text-zinc-600'
                )}
              >
                {tab === 'pendentes' ? `Pendentes (${visiblePendingOps.length})` : tab === 'nova' ? 'Nova OP' : `Concluídas (${visibleFinishedOps.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-0 sm:py-4 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-4 md:gap-6 items-start">

            {/* Pendentes */}
            <div className={cn('bg-white sm:rounded-2xl shadow-sm sm:ring-1 ring-zinc-200/60 flex flex-col overflow-hidden lg:col-span-4 lg:order-2 -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-auto lg:max-h-[calc(100vh-120px)] border-y border-zinc-200/60 sm:border-y-0', mobileTab !== 'pendentes' && 'hidden lg:flex')}>
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-zinc-100 shadow-sm ring-1 ring-zinc-200/50 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                  <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Pendentes</span>
                  <span className="bg-zinc-100/80 text-zinc-600 ring-1 ring-zinc-200/60 text-[10px] font-black px-2 py-0.5 rounded-full">{visiblePendingOps.length}</span>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-zinc-100">
                <input type="text" value={searchPending} onChange={e => setSearchPending(e.target.value)} placeholder="Buscar OP, produto, linha..." className="w-full h-10 sm:h-9 px-3 bg-[#F9FAFB] border border-zinc-200/60 rounded-lg text-[13px] sm:text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-shadow" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visiblePendingOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
                    <ClipboardList className="w-10 h-10 mb-2" />
                    <p className="text-xs font-semibold text-zinc-400">Nenhuma OP pendente</p>
                  </div>
                ) : visiblePendingOps.map(op => (
                  <PendingOpItem 
                    key={op.id} 
                    op={op} 
                    handleFinish={handleFinish} 
                    openEdit={openEdit} 
                    setDeletingOp={setDeletingOp} 
                    availableParadas={availableParadas}
                  />
                ))}
              </div>
            </div>

            {/* Nova OP */}
            <div className={cn('flex flex-col lg:col-span-3 lg:order-1 -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-auto lg:max-h-[calc(100vh-120px)]', mobileTab !== 'nova' && 'hidden lg:flex')}>
              <StartOpForm
                currentTurnForView={currentTurnForView}
                handleSubmit={handleSubmit}
                handlePreStartOp={handlePreStartOp}
                loadingNewOp={loadingNewOp}
                register={register}
                watch={watch}
                setValue={setValue}
                errors={errors}
                isTypingProduct={isTypingProduct}
                setIsTypingProduct={setIsTypingProduct}
                showProductSuggestions={showProductSuggestions}
                setShowProductSuggestions={setShowProductSuggestions}
                filteredProducts={filteredProducts}
                openLineSelect={openLineSelect}
                setOpenLineSelect={setOpenLineSelect}
                searchLine={searchLine}
                setSearchLine={setSearchLine}
                allLinhas={allLinhas}
                setCustomLinhas={setCustomLinhas}
                loginProfile={loginProfile}
                showConfirmStart={showConfirmStart}
                setShowConfirmStart={setShowConfirmStart}
                startFormData={startFormData}
                onStartOp={onStartOp}
              />
            </div>

            {/* Concluídas */}
            <div className={cn('bg-white sm:rounded-2xl shadow-sm sm:ring-1 ring-zinc-200/60 flex flex-col overflow-hidden lg:col-span-5 lg:order-3 -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-auto lg:max-h-[calc(100vh-120px)] border-y border-zinc-200/60 sm:border-y-0', mobileTab !== 'concluidas' && 'hidden lg:flex')}>
              <div className="p-4 border-b border-zinc-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-black text-zinc-900 uppercase tracking-wider">Concluídas</span>
                    <span className="bg-zinc-100/80 ring-1 ring-zinc-200/60 text-zinc-600 text-[10px] font-black px-2 py-0.5 rounded-full">{visibleFinishedOps.length}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Total Produzido</p>
                    <p className="text-sm font-black text-zinc-900 font-mono tracking-tight">{visibleTotalUnidades.toLocaleString()} UN</p>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-b border-zinc-100">
                <input type="text" value={searchFinished} onChange={e => setSearchFinished(e.target.value)} placeholder="Buscar OP, produto, linha..." className="w-full h-10 sm:h-9 px-3 bg-[#F9FAFB] border border-zinc-200/60 rounded-lg text-[13px] sm:text-xs text-zinc-600 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {visibleFinishedOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
                    <CheckCircle2 className="w-10 h-10 mb-2" />
                    <p className="text-xs font-semibold text-zinc-400">Nenhuma OP concluída</p>
                  </div>
                ) : visibleFinishedOps.map((op) => (
                  <FinishedOpItem
                    key={op.id}
                    op={op} 
                    openEdit={openEdit} 
                    setDeletingOp={setDeletingOp} 
                    setRevertingOp={setRevertingOp} 
                  />
                ))}
              </div>
              <div className="p-3 border-t border-zinc-100 lg:hidden">
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingOp} onOpenChange={(o: boolean) => { if (!o) setDeletingOp(null); }}>
        <DialogContent className="max-w-sm rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-900">Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">Tem certeza que deseja remover esta operação? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingOp(null)} className="rounded-xl border-zinc-200/60">Cancelar</Button>
            <Button onClick={confirmDelete} disabled={loadingDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm">
              {loadingDelete ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to Pending Confirmation Dialog */}
      <Dialog open={!!revertingOp} onOpenChange={(o: boolean) => { if (!o) setRevertingOp(null); }}>
        <DialogContent className="max-w-sm rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-900">Voltar para Pendentes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            A OP <span className="font-bold text-zinc-900">{revertingOp?.opNumber}</span> será removida de Concluídas e voltará para a lista de Pendentes. O registro na planilha também será removido.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevertingOp(null)} className="rounded-xl border-zinc-200/60">Cancelar</Button>
            <Button onClick={confirmRevert} disabled={loadingRevert} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm">
              {loadingRevert ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit OP Dialog */}
      <EditOpModal
        editingOp={editingOp}
        setEditingOp={setEditingOp}
        handleSubmitEdit={handleSubmitEdit}
        onEditOp={onEditOp}
        registerEdit={registerEdit}
        watchEdit={watchEdit}
        setValueEdit={setValueEdit}
        isTypingEditProduct={isTypingEditProduct}
        setIsTypingEditProduct={setIsTypingEditProduct}
        showEditProductSuggestions={showEditProductSuggestions}
        setShowEditProductSuggestions={setShowEditProductSuggestions}
        filteredEditProducts={filteredEditProducts}
        openEditLineSelect={openEditLineSelect}
        setOpenEditLineSelect={setOpenEditLineSelect}
        searchEditLine={searchEditLine}
        setSearchEditLine={setSearchEditLine}
        allLinhas={allLinhas}
        setCustomLinhas={setCustomLinhas}
        loginProfile={loginProfile}
        editParadas={editParadas}
        setEditParadas={setEditParadas}
        addEditParada={addEditParada}
        removeEditParada={removeEditParada}
        loadingEdit={loadingEdit}
        editParadaSelectedCode={editParadaSelectedCode}
        setEditParadaSelectedCode={setEditParadaSelectedCode}
        editParadaStart={editParadaStart}
        setEditParadaStart={setEditParadaStart}
        editParadaEnd={editParadaEnd}
        setEditParadaEnd={setEditParadaEnd}
        availableParadas={availableParadas}
      />

      {/* Change Password Dialog */}
      <ChangePasswordModal
        changePasswordOpen={changePasswordOpen}
        setChangePasswordOpen={setChangePasswordOpen}
        loginProfile={loginProfile!}
        showChangerPassword={showChangerPassword}
        setShowChangerPassword={setShowChangerPassword}
        changerOldPassword={changerOldPassword}
        setChangerOldPassword={setChangerOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        handleChangePassword={handleChangePassword}
        changingPasswordLoading={changingPasswordLoading}
      />
    </>
  );
}
