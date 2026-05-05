import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, FinishedOperation, Operation, getProducts, addProduct, removeFinishedOperation, getReportForDateAndShift, getAuthProfile, updateAuthProfile, moveFinishedToPending, updateFinishedOperation, updateOperation, subscribeToOperations, subscribeToFinishedOps, getParadas, Parada, ParadaRecord, getLinhas, getProfiles, syncFinishedOperation } from './api';

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
import { cn, useAutoIncrement } from './lib/utils';

// Lazy loading modals to improve initial load performance
const EditOpModal = React.lazy(() => import('./components/EditOpModal/EditOpModal').then(module => ({ default: module.EditOpModal })));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal/ChangePasswordModal').then(module => ({ default: module.ChangePasswordModal })));
import { toast, Toaster } from 'sonner';
import { Check, ChevronsUpDown, Package, ClipboardList, CheckCircle2, LogOut, Loader2, Trash2, Pencil, Eye, EyeOff, RotateCcw, Wifi, Clock, KeyRound, Plus, Minus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';

import { getServerTime, syncServerTime, getServerTimeISO } from './lib/time';
import { logAudit } from './lib/audit';

const SHIFT_TOLERANCE_MINUTES = 10;

function getActiveTurno(now: Date = getServerTime()): string {
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

function getLogicalDateStr(now: Date = getServerTime()): string {
  const logicalDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  return format(logicalDate, 'yyyy-MM-dd');
}

function getSuggestedShift(now: Date, horaInicial: string): string {
  return getActiveTurno(now).replace('Turno ', '');
}

export function getShiftCycleId(time: Date): string {
  const logicalDate = new Date(time.getTime() - 6 * 60 * 60 * 1000);
  const logicalDateStr = format(logicalDate, 'yyyy-MM-dd');
  const h = time.getHours();
  const isDayTime = h >= 6 && h < 18;
  return `${logicalDateStr}-${isDayTime ? 'DAY' : 'NIGHT'}`;
}

export type ShiftCheckResult = { 
  allowed: boolean; 
  reason?: string; 
  toleranceApplied?: boolean;
  activeTurno: string;
  shiftCycleId?: string;
};

export function isShiftAllowed(profile: string): ShiftCheckResult {
  const now = getServerTime();
  const activeTurno = getActiveTurno(now);
  
  if (profile === 'Supervisor' || profile === 'Turno Treinamento') {
      return { allowed: true, activeTurno, shiftCycleId: getShiftCycleId(now) };
  }

  if (profile === activeTurno) {
      return { allowed: true, activeTurno, shiftCycleId: getShiftCycleId(now) };
  }
  
  // Check Tolerance
  const pastToleranceTime = new Date(now.getTime() - SHIFT_TOLERANCE_MINUTES * 60000);
  const futureToleranceTime = new Date(now.getTime() + SHIFT_TOLERANCE_MINUTES * 60000);
  
  const activeInPast = getActiveTurno(pastToleranceTime);
  const activeInFuture = getActiveTurno(futureToleranceTime);
  
  if (profile === activeInPast) {
      return { allowed: true, toleranceApplied: true, activeTurno, shiftCycleId: getShiftCycleId(pastToleranceTime) };
  }
  
  if (profile === activeInFuture) {
      return { allowed: true, toleranceApplied: true, activeTurno, shiftCycleId: getShiftCycleId(futureToleranceTime) };
  }

  const outSince = format(now.getHours() >= 18 || now.getHours() < 6 ? new Date(now.setHours(18,0,0,0)) : new Date(now.setHours(6,0,0,0)), 'HH:mm');

  return { 
    allowed: false, 
    activeTurno,
    reason: `Fora do horário. O turno atual é o ${activeTurno}. Você está fora do horário do seu perfil desde ${outSince}. Se for uma emergência, contate o supervisor.`
  };
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

const matchesSearch = (op: { opNumber?: string; linha?: string; produto?: string }, q: string) => {
  if (!q.trim()) return true;
  const lower = q.toLowerCase();
  return (op.opNumber || '').toLowerCase().includes(lower) || 
         (op.linha || '').toLowerCase().includes(lower) || 
         (op.produto || '').toLowerCase().includes(lower);
};

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
  const [selectedLinhaPending, setSelectedLinhaPending] = useState('Todas');
  const [selectedLinhaFinished, setSelectedLinhaFinished] = useState('Todas');
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
  
  const [profiles, setProfiles] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('v-ops-profiles');
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['Turno A', 'Turno B', 'Turno C', 'Turno D'];
  });
  const [fetchedLinhas, setFetchedLinhas] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('v-ops-linhas');
      if (stored) return JSON.parse(stored);
    } catch {}
    return Array.from({ length: 16 }, (_, i) => `Linha ${String(i + 1).padStart(2, '0')}`);
  });

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

  const openEdit = useCallback((op: Operation | FinishedOperation) => {
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
  }, [resetEdit]);

  const onEditOp = async (data: any) => {
    const doEditOp = async () => {
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
        
        logAudit({
          userProfile: loginProfile || 'UNKNOWN',
          action: 'EDIT_OP',
          expectedShift: loginProfile || 'UNKNOWN',
          activeShift: isShiftAllowed(loginProfile || 'UNKNOWN').activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: isShiftAllowed(loginProfile || 'UNKNOWN').allowed ? (isShiftAllowed(loginProfile || 'UNKNOWN').toleranceApplied ? 'TOLERANCE' : 'ALLOWED') : 'OVERRIDE',
          opReference: data.opNumber,
          reason: overrideReason || undefined
        });

        setEditingOp(null);
      } catch (err: any) {
        toast.error('Erro ao editar: ' + err.message);
      } finally {
        setLoadingEdit(false);
      }
    };

    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        requireSupervisorOverride(() => doEditOp());
        return;
      }
    }
    
    doEditOp();
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
      localStorage.setItem('v-ops-linhas', JSON.stringify(linhas));
    } catch (e) {
      console.error("Error loading linhas:", e);
    }
  };

  const loadProfiles = async () => {
    try {
      const profls = await getProfiles();
      const names = profls.map(p => p.name);
      setProfiles(names);
      localStorage.setItem('v-ops-profiles', JSON.stringify(names));
    } catch (e) {
      console.error("Error loading profiles:", e);
    }
  };

  const checkAndClearProfileShift = async (profile: string) => {
    const shiftCheck = isShiftAllowed(profile);
    if (shiftCheck.allowed && shiftCheck.shiftCycleId) {
       const r = await import('./api');
       const profileData = await r.getAuthProfile(profile);
       if (profileData && profileData.lastClearedShiftId !== shiftCheck.shiftCycleId) {
          console.log(`Clearing records for ${profile} at cycle ${shiftCheck.shiftCycleId}`);
          await r.clearTurnoRecords(profile.replace('Turno ', ''));
          await r.updateAuthProfile(profile, { ...profileData, lastClearedShiftId: shiftCheck.shiftCycleId });
       }
    }
  };

  useEffect(() => {
    if (loginProfile) {
      checkAndClearProfileShift(loginProfile);
    }
  }, [loginProfile]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (loginProfile) {
        checkAndClearProfileShift(loginProfile);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [loginProfile]);

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
      const t0 = performance.now();
      await Promise.all([
        syncServerTime(),
        loadProducts(),
        loadParadas(),
        loadLinhas(),
        loadProfiles()
      ]);
      const t1 = performance.now();
      console.log(`[Performance] refreshData carregou em ${(t1 - t0).toFixed(2)}ms`);
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

  // Login
  const handleLogin = async () => {
    if (!selectedProfile) return;
    
    const shiftCheck = isShiftAllowed(selectedProfile);
    
    if (!shiftCheck.allowed) {
      logAudit({
        userProfile: selectedProfile,
        action: 'LOGIN',
        expectedShift: selectedProfile,
        activeShift: shiftCheck.activeTurno,
        serverTimestamp: getServerTimeISO(),
        result: 'BLOCKED',
        reason: shiftCheck.reason
      });
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
        logAudit({
          userProfile: selectedProfile,
          action: 'LOGIN',
          expectedShift: selectedProfile,
          activeShift: shiftCheck.activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: shiftCheck.toleranceApplied ? 'TOLERANCE' : 'ALLOWED'
        });
        localStorage.setItem('loginProfile', selectedProfile);
        setLoginProfile(selectedProfile);
        setValue('turno', selectedProfile.replace('Turno ', ''));
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
        logAudit({
          userProfile: loginProfile,
          action: 'LOGOUT',
          expectedShift: loginProfile,
          activeShift: shiftCheck.activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: 'ALLOWED'
        });
      } catch (e) {
        console.error("Failed to log logout", e);
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
        logAudit({
          userProfile: loginProfile,
          action: 'START_OP',
          expectedShift: loginProfile,
          activeShift: shiftCheck.activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: 'BLOCKED',
          reason: shiftCheck.reason,
          opReference: data.opNumber
        });
        toast.error('Seu turno já foi encerrado.');
        return;
      }
      
      logAudit({
        userProfile: loginProfile,
        action: 'START_OP',
        expectedShift: loginProfile,
        activeShift: shiftCheck.activeTurno,
        serverTimestamp: getServerTimeISO(),
        result: shiftCheck.toleranceApplied ? 'TOLERANCE' : 'ALLOWED',
        opReference: data.opNumber
      });
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
      await addOperation(newOp);
      addProduct(data.produto, derivedLitragem);
      toast.success('Operação iniciada!');
      reset({ opNumber: '', produto: '', linha: '', turno: data.turno, horaInicial: format(new Date(), 'HH:mm') });
      setShowConfirmStart(false);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setLoadingNewOp(false);
    }
  };

  const handleFinish = useCallback(async (op: Operation, qtd: string, time: string, reprocesso: string, paradas: ParadaRecord[], onSuccess: () => void) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      logAudit({
        userProfile: loginProfile,
        action: 'FINISH_OP',
        expectedShift: loginProfile,
        activeShift: shiftCheck.activeTurno,
        serverTimestamp: getServerTimeISO(),
        result: shiftCheck.allowed ? (shiftCheck.toleranceApplied ? 'TOLERANCE' : 'ALLOWED') : 'OVERRIDE',
        reason: shiftCheck.allowed ? undefined : 'Permitido fechamento de OP post-corte funcionalmente',
        opReference: op.opNumber
      });
    }

    if (!qtd || !time) { toast.error('Preencha a quantidade e hora final.'); return; }

    const paradasToSave: ParadaRecord[] = 
      paradas.length > 0 ? paradas : (op.paradas || []);

    try {
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
      toast.success('OP concluída!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    }
  }, [loginProfile]);

  const handleSyncRetry = async (op: FinishedOperation) => {
    try {
      toast.info(`Sincronizando OP ${op.opNumber}...`);
      await syncFinishedOperation(op.id);
      toast.success(`OP ${op.opNumber} sincronizada com sucesso!`);
    } catch (err: any) {
      toast.error(`Falha ao sincronizar: ${err.message}`);
    }
  };

  const confirmRevert = async () => {
    const doRevert = async () => {
      if (!revertingOp) return;

      setLoadingRevert(true);
      try {
        await moveFinishedToPending(revertingOp.id, revertingOp.turno || currentTurnForView);
        
        logAudit({
          userProfile: loginProfile || 'UNKNOWN',
          action: 'REVERT_OP',
          expectedShift: loginProfile || 'UNKNOWN',
          activeShift: isShiftAllowed(loginProfile || 'UNKNOWN').activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: isShiftAllowed(loginProfile || 'UNKNOWN').allowed ? (isShiftAllowed(loginProfile || 'UNKNOWN').toleranceApplied ? 'TOLERANCE' : 'ALLOWED') : 'OVERRIDE',
          opReference: revertingOp.opNumber,
          reason: overrideReason || undefined
        });

        toast.success('OP movida de volta para Pendentes.');
      } catch (err: any) {
        toast.error('Erro ao reverter: ' + err.message);
      } finally {
        setLoadingRevert(false);
        setRevertingOp(null);
      }
    };

    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        requireSupervisorOverride(() => doRevert());
        return;
      }
    }
    
    doRevert();
  };

  // Override Supervisor States
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overridePassword, setOverridePassword] = useState("");
  const [pendingOverrideAction, setPendingOverrideAction] = useState<(() => void) | null>(null);

  const requireSupervisorOverride = (action: () => void) => {
    setPendingOverrideAction(() => action);
    setOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim()) {
      toast.error('O motivo é obrigatório.');
      return;
    }
    if (!overridePassword.trim()) {
      toast.error('Senha do supervisor é obrigatória.');
      return;
    }
    
    try {
      const supervisorProfile = await getAuthProfile("Supervisor");
      const correctPw = supervisorProfile?.password || supervisorProfile?.senha || "admin123";
      if (overridePassword !== correctPw) {
        toast.error('Senha de supervisor incorreta!');
        return;
      }
      
      if (pendingOverrideAction) {
        pendingOverrideAction();
      }
      
      setOverrideModalOpen(false);
      setOverrideReason("");
      setOverridePassword("");
      setPendingOverrideAction(null);
    } catch(e) {
      console.error(e);
      toast.error("Erro ao validar supervisor.");
    }
  };

  const logicalToday = getLogicalDateStr(getServerTime());

  const myFinishedOps = useMemo(() => {
    return finishedOps.filter(op => {
      const sameTurn = op.turno === currentTurnForView;
      if (!op.carimboInicial) return sameTurn;
      return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
    });
  }, [finishedOps, currentTurnForView, logicalToday]);

  const myPendingOps = useMemo(() => {
    return operations.filter(op => {
      const sameTurn = op.turno === currentTurnForView;
      if (!op.carimboInicial) return sameTurn;
      return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
    });
  }, [operations, currentTurnForView, logicalToday]);

  const pendingLinhas = useMemo(() => {
    const lines = new Set(myPendingOps.map(op => op.linha));
    return ['Todas', ...Array.from(lines).sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      if (matchA && matchB) return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      return a.localeCompare(b);
    })];
  }, [myPendingOps]);

  const finishedLinhas = useMemo(() => {
    const lines = new Set(myFinishedOps.map(op => op.linha));
    return ['Todas', ...Array.from(lines).sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      if (matchA && matchB) return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      return a.localeCompare(b);
    })];
  }, [myFinishedOps]);

  const visiblePendingOps = useMemo(() => myPendingOps.filter(op => {
    if (selectedLinhaPending !== 'Todas' && op.linha !== selectedLinhaPending) return false;
    return matchesSearch(op, searchPending);
  }), [myPendingOps, searchPending, selectedLinhaPending]);

  const visibleFinishedOps = useMemo(() => myFinishedOps.filter(op => {
    if (selectedLinhaFinished !== 'Todas' && op.linha !== selectedLinhaFinished) return false;
    return matchesSearch(op, searchFinished);
  }), [myFinishedOps, searchFinished, selectedLinhaFinished]);

  const totalUnidades = myFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);
  const visibleTotalUnidades = visibleFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);

  const confirmDelete = async () => {
    const doDelete = async () => {
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
        
        logAudit({
          userProfile: loginProfile || 'UNKNOWN',
          action: 'DELETE_OP',
          expectedShift: loginProfile || 'UNKNOWN',
          activeShift: isShiftAllowed(loginProfile || 'UNKNOWN').activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: isShiftAllowed(loginProfile || 'UNKNOWN').allowed ? (isShiftAllowed(loginProfile || 'UNKNOWN').toleranceApplied ? 'TOLERANCE' : 'ALLOWED') : 'OVERRIDE',
          opReference: deletingOp.opNumber,
          reason: overrideReason || undefined
        });

      } catch (err: any) {
        toast.error('Erro ao remover: ' + err.message);
      } finally {
        setLoadingDelete(false);
        setDeletingOp(null);
      }
    };

    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        requireSupervisorOverride(() => doDelete());
        return;
      }
    }
    
    doDelete();
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

  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-[#F9FAFB]">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/80 shadow-sm sticky top-0 z-30">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 2xl:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
            {/* Logo & App Name */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-950 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-zinc-950/10 shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:8px_8px] opacity-20" />
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10" />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <h1 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight leading-none truncate mb-1.5">
                  Diário de Bordo
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] sm:text-xs font-black text-zinc-500 tracking-widest uppercase bg-zinc-100/80 px-2 py-0.5 rounded border border-zinc-200/80 shadow-sm leading-tight">
                    {today}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Block */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Profile Badge (Desktop only) */}
              <div className="hidden sm:flex items-center bg-zinc-50 border-2 border-zinc-200/80 rounded-xl px-3 h-10 max-w-[160px] truncate shadow-sm">
                <span className="text-xs font-black text-zinc-700 uppercase tracking-widest truncate">
                  {loginProfile}
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 bg-white border-2 border-zinc-200/80 rounded-xl sm:rounded-2xl p-1 shadow-sm tour-user-menu">
                <button 
                  onClick={() => setChangePasswordOpen(true)} 
                  className="group flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-950 px-3 h-10 sm:h-11 rounded-lg sm:rounded-xl hover:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-zinc-950/20 focus-visible:outline-none" 
                  title="Alterar Senha"
                >
                  <KeyRound className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="hidden sm:inline-block text-sm font-bold tracking-tight">Senha</span>
                </button>
                
                {/* Divider */}
                <div className="w-[2px] h-5 bg-zinc-200/80 rounded-full" />

                {/* Logout Button */}
                <button 
                  onClick={handleLogout} 
                  className="group flex items-center justify-center gap-2 text-zinc-500 hover:text-red-600 px-3 h-10 sm:h-11 rounded-lg sm:rounded-xl hover:bg-red-50 hover:border-red-100 border border-transparent transition-all focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:outline-none" 
                  title="Sair da Conta"
                >
                  <LogOut className="w-5 h-5 sm:w-4 sm:h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  <span className="hidden sm:inline-block text-sm font-bold tracking-tight">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden sticky top-16 z-20 bg-white border-b border-zinc-200/80 shadow-sm tour-tab-bar">
          <div className="flex">
            {(['pendentes', 'nova', 'concluidas'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  'flex-1 h-14 text-xs font-black uppercase tracking-wider transition-colors',
                  mobileTab === tab
                    ? 'text-zinc-950 border-b-2 border-zinc-950 bg-zinc-50'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50/50'
                )}
              >
                {tab === 'pendentes' ? `Pendentes (${visiblePendingOps.length})` : tab === 'nova' ? 'Nova OP' : `Concluídas (${visibleFinishedOps.length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[1920px] mx-auto px-0 sm:px-4 lg:px-6 2xl:px-8 py-0 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-6 lg:gap-8 items-start">

            {/* Pendentes */}
            <div className={cn('bg-white sm:rounded-[2rem] sm:shadow-xl sm:ring-1 ring-zinc-200/50 flex flex-col overflow-hidden lg:col-span-4 xl:col-span-4 2xl:col-span-4 lg:order-2 border-none h-[calc(100dvh-120px)] lg:h-[calc(100vh-10rem)] border-b border-zinc-200/80 sm:border-y-0 relative tour-pendentes', mobileTab !== 'pendentes' && 'hidden lg:flex')}>
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col gap-3 bg-zinc-950/5 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:14px_14px] opacity-50" />
                <div className="flex items-center justify-between gap-2 relative z-10 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm ring-1 ring-zinc-200/80 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-zinc-700" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black text-zinc-900 tracking-tight leading-none mb-1">Pendentes</span>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">{visiblePendingOps.length} {visiblePendingOps.length === 1 ? 'registro' : 'registros'}</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input type="text" value={searchPending} onChange={e => setSearchPending(e.target.value)} placeholder="Pesquisar produto, linha..." className="w-full h-10 pl-9 pr-3 bg-white border border-zinc-200/80 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm transition-all" />
                  </div>
                  
                  {pendingLinhas.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
                      {pendingLinhas.map(linha => (
                        <button
                          key={linha}
                          onClick={() => setSelectedLinhaPending(linha)}
                          className={cn(
                            "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border shadow-sm",
                            selectedLinhaPending === linha 
                              ? "bg-zinc-900 text-white border-zinc-900" 
                              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300"
                          )}
                        >
                          {linha}
                          {linha !== 'Todas' && (
                            <span className={cn(
                              "ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none",
                              selectedLinhaPending === linha ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"
                            )}>
                              {myPendingOps.filter(o => o.linha === linha).length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-zinc-50/50 tour-pendentes-items">
                {visiblePendingOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[250px] py-12 text-zinc-400 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                      <ClipboardList className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-600 mb-1">Nada por aqui</p>
                    <p className="text-xs font-medium text-zinc-500 max-w-[200px]">Não há OPs pendentes aguardando fechamento.</p>
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
            <div className={cn('flex flex-col lg:col-span-4 xl:col-span-3 2xl:col-span-3 lg:order-1 h-[calc(100dvh-120px)] lg:h-[calc(100vh-10rem)] tour-nova-op', mobileTab !== 'nova' && 'hidden lg:flex')}>
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
            <div className={cn('bg-white sm:rounded-[2rem] sm:shadow-xl sm:ring-1 ring-zinc-200/50 flex flex-col overflow-hidden lg:col-span-4 xl:col-span-5 2xl:col-span-5 lg:order-3 border-none h-[calc(100dvh-120px)] lg:h-[calc(100vh-10rem)] border-b border-zinc-200/80 sm:border-y-0 relative tour-concluidas', mobileTab !== 'concluidas' && 'hidden lg:flex')}>
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col gap-3 bg-emerald-950/5 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966910_1px,transparent_1px),linear-gradient(to_bottom,#05966910_1px,transparent_1px)] bg-[size:14px_14px] opacity-70" />
                <div className="flex items-center justify-between gap-2 relative z-10 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm ring-1 ring-emerald-200/80 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black text-zinc-900 tracking-tight leading-none mb-1">Concluídas</span>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">{visibleFinishedOps.length} {visibleFinishedOps.length === 1 ? 'registro' : 'registros'}</span>
                    </div>
                  </div>
                  <div className="text-right bg-white px-2 py-1.5 rounded-lg border border-emerald-100 shadow-sm shrink-0">
                    <p className="text-[9px] text-emerald-600/70 uppercase tracking-widest font-black mb-0.5">Total</p>
                    <p className="text-sm font-black text-emerald-700 tracking-tighter leading-none">{visibleTotalUnidades.toLocaleString()} UN</p>
                  </div>
                </div>
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input type="text" value={searchFinished} onChange={e => setSearchFinished(e.target.value)} placeholder="Pesquisar OP ou produto..." className="w-full h-10 pl-9 pr-3 bg-white border border-zinc-200/80 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm transition-all" />
                  </div>
                  
                  {finishedLinhas.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
                      {finishedLinhas.map(linha => (
                        <button
                          key={linha}
                          onClick={() => setSelectedLinhaFinished(linha)}
                          className={cn(
                            "whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border shadow-sm",
                            selectedLinhaFinished === linha 
                              ? "bg-emerald-600 text-white border-emerald-600" 
                              : "bg-white text-zinc-600 border-zinc-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                          )}
                        >
                          {linha}
                          {linha !== 'Todas' && (
                            <span className={cn(
                              "ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none",
                              selectedLinhaFinished === linha ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500"
                            )}>
                              {myFinishedOps.filter(o => o.linha === linha).length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-zinc-50/50">
                {visibleFinishedOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[250px] py-12 text-zinc-400 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-600 mb-1">Nada por aqui</p>
                    <p className="text-xs font-medium text-zinc-500 max-w-[200px]">Nenhuma operação foi concluída neste turno ainda.</p>
                  </div>
                ) : visibleFinishedOps.map((op) => (
                  <FinishedOpItem
                    key={op.id}
                    op={op} 
                    openEdit={openEdit} 
                    setDeletingOp={setDeletingOp} 
                    setRevertingOp={setRevertingOp} 
                    onSyncRetry={handleSyncRetry}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingOp} onOpenChange={(o: boolean) => { if (!o) setDeletingOp(null); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
          <DialogHeader className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 bg-red-100/50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200/50 shadow-sm">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-zinc-950 tracking-tight">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-base text-zinc-500 font-medium text-center mb-8 px-4">Tem certeza que deseja remover esta operação? <strong className="text-zinc-900">Esta ação não pode ser desfeita.</strong></p>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={confirmDelete} disabled={loadingDelete} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-base font-black shadow-xl shadow-red-500/20 focus-visible:ring-4 focus-visible:ring-red-500/20 transition-all">
              {loadingDelete ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sim, Remover Operação'}
            </Button>
            <Button variant="ghost" onClick={() => setDeletingOp(null)} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">
               Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert to Pending Confirmation Dialog */}
      <Dialog open={!!revertingOp} onOpenChange={(o: boolean) => { if (!o) setRevertingOp(null); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
          <DialogHeader className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 bg-amber-100/50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/50 shadow-sm">
              <RotateCcw className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-zinc-950 tracking-tight">Reverter OP</DialogTitle>
          </DialogHeader>
          <p className="text-base text-zinc-500 font-medium text-center mb-8">
            A OP <span className="font-bold text-zinc-900">{revertingOp?.opNumber}</span> será removida de Concluídas e voltará para a lista de Pendentes. O registro na planilha será removido.
          </p>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={confirmRevert} disabled={loadingRevert} className="w-full h-14 bg-zinc-950 hover:bg-zinc-800 text-white rounded-2xl text-base font-black shadow-xl shadow-zinc-900/20 focus-visible:ring-4 focus-visible:ring-zinc-900/20 transition-all">
              {loadingRevert ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirmar Reversão'}
            </Button>
            <Button variant="ghost" onClick={() => setRevertingOp(null)} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">
               Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Supervisor Dialog */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
          <DialogHeader className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 bg-red-100/50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200/50 shadow-sm">
              <KeyRound className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-zinc-950 tracking-tight">Autorização Necessária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mb-8">
             <p className="text-sm text-zinc-500 font-medium text-center">Seu turno já foi encerrado. Esta ação requer autorização do supervisor.</p>
             <div className="space-y-1.5 flex flex-col">
               <Label className="text-sm font-bold text-zinc-800">Senha do Supervisor</Label>
               <Input
                 type="password"
                 placeholder="Digite a senha"
                 className="h-14 px-4 bg-zinc-50 border-0 ring-1 ring-zinc-200/50 focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-xl"
                 value={overridePassword}
                 onChange={(e) => setOverridePassword(e.target.value)}
               />
             </div>
             <div className="space-y-1.5 flex flex-col mt-4">
               <Label className="text-sm font-bold text-zinc-800">Motivo da Exceção</Label>
               <Input
                 type="text"
                 placeholder="Ex: Correção de OP atrasada"
                 className="h-14 px-4 bg-zinc-50 border-0 ring-1 ring-zinc-200/50 focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-xl"
                 value={overrideReason}
                 onChange={(e) => setOverrideReason(e.target.value)}
               />
             </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-3">
            <Button onClick={handleOverrideSubmit} className="w-full h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-base font-black shadow-xl shadow-red-500/20 focus-visible:ring-4 focus-visible:ring-red-500/20 transition-all">
              Autorizar Ação
            </Button>
            <Button variant="ghost" onClick={() => { setOverrideModalOpen(false); setPendingOverrideAction(null); }} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">
               Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit OP Dialog */}
      <React.Suspense fallback={null}>
        {editingOp && (
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
        )}

        {/* Change Password Dialog */}
        {changePasswordOpen && (
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
        )}
      </React.Suspense>
    </>
  );
}
