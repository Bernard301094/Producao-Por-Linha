import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { getOperations, addOperation, removeOperation, markOperationFinished, FinishedOperation, Operation, getProducts, addProduct, updateProduct, removeProduct, removeFinishedOperation, getReportForDateAndShift, getAuthProfile, updateAuthProfile, moveFinishedToPending, updateFinishedOperation, updateOperation, subscribeToOperations, subscribeToFinishedOps, getParadas, Parada, ParadaRecord, getLinhas, getProfiles, syncFinishedOperation, invalidateCaches } from './api';

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
import { cn, useAutoIncrement, hashPassword } from './lib/utils';

// Lazy loading modals to improve initial load performance
const EditOpModal = React.lazy(() => import('./components/EditOpModal/EditOpModal').then(module => ({ default: module.EditOpModal })));
const ChangePasswordModal = React.lazy(() => import('./components/ChangePasswordModal/ChangePasswordModal').then(module => ({ default: module.ChangePasswordModal })));
const ProductManagerModal = React.lazy(() => import('./components/ProductManagerModal/ProductManagerModal').then(module => ({ default: module.ProductManagerModal })));
import { toast, Toaster } from 'sonner';
import { Check, ChevronsUpDown, Package, ClipboardList, CheckCircle2, LogOut, Loader2, Trash2, Pencil, Eye, EyeOff, RotateCcw, Wifi, Clock, KeyRound, Plus, Minus, Search, ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { TourOverlay } from './components/TourOverlay/TourOverlay';

import { getServerTime, syncServerTime, getServerTimeISO, isTimeSynced } from './lib/time';
import { logAudit } from './lib/audit';


const SHIFT_TOLERANCE_MINUTES = 30;

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
  toleranceExpiresAt?: number;
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
      const h = now.getHours();
      const expirationDate = new Date(now.getTime());
      if (h >= 18 || h < 6) {
          expirationDate.setHours(18, SHIFT_TOLERANCE_MINUTES, 0, 0);
      } else {
          expirationDate.setHours(6, SHIFT_TOLERANCE_MINUTES, 0, 0);
      }
      return { allowed: true, toleranceApplied: true, activeTurno, shiftCycleId: getShiftCycleId(pastToleranceTime), toleranceExpiresAt: expirationDate.getTime() };
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

function ToleranceCountdown({ profile, onExpire }: { profile: string | null; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setTimeLeft(null);
      return;
    }

    const checkTime = () => {
      const shiftCheck = isShiftAllowed(profile);
      if (shiftCheck.allowed && shiftCheck.toleranceApplied && shiftCheck.toleranceExpiresAt) {
        const remaining = shiftCheck.toleranceExpiresAt - getServerTime().getTime();
        if (remaining <= 0) {
          setTimeLeft(null);
          onExpire();
        } else {
          const m = Math.floor(remaining / 60000);
          const s = Math.floor((remaining % 60000) / 1000);
          setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      } else {
        setTimeLeft(null);
      }
    };

    checkTime();
    const timer = setInterval(checkTime, 1000);
    return () => clearInterval(timer);
  }, [profile, onExpire]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-2 sm:px-3 h-10 rounded-xl shadow-sm animate-pulse">
      <Clock className="w-4 h-4" />
      <span className="text-xs font-black tracking-widest">{timeLeft}</span>
    </div>
  );
}

// ── Tour mock data (injected only while the tour is active) ─────────────────
const TOUR_MOCK_OPS: Operation[] = [
  {
    id: '__tour_p1', opNumber: '47923', produto: 'V-FLOC 1.5L', linha: '05',
    turno: 'Turno B', horaInicial: '08:00',
    carimboInicial: new Date(Date.now() - 9840000).toISOString(), // ~2h 44m
    litragem: '1.5L', paradas: [], isAvulsa: false,
  },
  {
    id: '__tour_p2', opNumber: '47924', produto: 'LAVA AUTOS PREMIUM 2L', linha: '08',
    turno: 'Turno B', horaInicial: '10:15',
    carimboInicial: new Date(Date.now() - 3600000).toISOString(), // ~1h
    litragem: '2L', paradas: [], isAvulsa: false,
  },
  {
    id: '__tour_p3', opNumber: '47925', produto: 'SUPER CLEAN 5L', linha: '02',
    turno: 'Turno B', horaInicial: '09:00',
    carimboInicial: new Date(Date.now() - 5400000).toISOString(), // ~1h 30m
    litragem: '5L',
    paradas: [{ seq: 1, tipologia: 'Falta de Material', horaInicio: '09:45', horaFim: '10:10', detalhamento: 'Aguardando embalagem' }],
    isAvulsa: false,
  },
];
const TOUR_MOCK_FINISHED: FinishedOperation[] = [
  {
    id: '__tour_f1', opNumber: '47920', produto: 'V-FLOC 1.5L', linha: '05',
    turno: 'Turno B', horaInicial: '06:00', horaFinal: '08:00',
    quantidade: '850', qntReprocesso: '0',
    carimboInicial: new Date(Date.now() - 18000000).toISOString(),
    litragem: '1.5L', paradas: [], syncStatus: 'success', isAvulsa: false,
  },
  {
    id: '__tour_f2', opNumber: '47921', produto: 'CLEAN CAR 500ML', linha: '03',
    turno: 'Turno B', horaInicial: '06:15', horaFinal: '07:45',
    quantidade: '1200', qntReprocesso: '50',
    carimboInicial: new Date(Date.now() - 14400000).toISOString(),
    litragem: '500ML',
    paradas: [{ seq: 1, tipologia: 'Troca de Produto', horaInicio: '07:00', horaFim: '07:15' }],
    syncStatus: 'success', isAvulsa: false,
  },
  {
    id: '__tour_f3', opNumber: '47922', produto: 'DESENGRAXANTE IBC', linha: '01',
    turno: 'Turno B', horaInicial: '06:00', horaFinal: '09:30',
    quantidade: '2400', qntReprocesso: '120',
    carimboInicial: new Date(Date.now() - 21600000).toISOString(),
    litragem: 'IBC',
    paradas: [
      { seq: 1, tipologia: 'Manutenção Corretiva', horaInicio: '07:30', horaFim: '08:00', detalhamento: 'Vedação da bomba' },
      { seq: 2, tipologia: 'Troca de Produto', horaInicio: '08:45', horaFim: '09:00' },
    ],
    syncStatus: 'success', isAvulsa: false,
  },
];
// ─────────────────────────────────────────────────────────────────────────────

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

  const [mobileTab, setMobileTab] = useState<'pendentes' | 'concluidas'>('pendentes');
  const [tourActive, setTourActive] = useState(false);
  const [isNovaSheetOpen, setIsNovaSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const [openLineSelect, setOpenLineSelect] = useState(false);
  const [openEditLineSelect, setOpenEditLineSelect] = useState(false);
  const [openLineFilterPending, setOpenLineFilterPending] = useState(false);
  const [openLineFilterFinished, setOpenLineFilterFinished] = useState(false);
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
  const [showProductManager, setShowProductManager] = useState(false);
  
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
      
      // Run time sync in background — don't block UI data from loading
      syncServerTime().catch(e => console.warn('[TimeSync] Background sync failed', e));
      
      // Load UI data immediately without waiting for time sync
      await Promise.all([
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

  // Background Auto-Retry for Failed Syncs
  useEffect(() => {
    const interval = setInterval(async () => {
      const failedOps = finishedOps.filter(op => op.syncStatus === 'error');
      for (const op of failedOps) {
        try {
          console.log(`Auto-retrying sync for OP ${op.opNumber}...`);
          await syncFinishedOperation(op.id);
        } catch (e) {
          console.error(`Auto-retry failed for OP ${op.opNumber}`, e);
        }
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [finishedOps]);

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

      const inputHash = await hashPassword(passwordInput.trim());
      const isLegacyMatch = correctPassword.length !== 64 && passwordInput.trim() === correctPassword;
      const isHashMatch = inputHash === correctPassword;

      if (isLegacyMatch || isHashMatch) {
        if (isLegacyMatch) {
          // Upgrade to hash in the background
          updateAuthProfile(selectedProfile, inputHash).catch(console.error);
        }
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
      
      const inputHash = await hashPassword(changerOldPassword);
      const isLegacyMatch = correctPassword && correctPassword.length !== 64 && changerOldPassword === correctPassword;
      const isHashMatch = correctPassword && inputHash === correctPassword;
      
      if (!correctPassword || (!isLegacyMatch && !isHashMatch)) {
        toast.error('Senha atual incorreta.');
        setChangingPasswordLoading(false);
        return;
      }

      const newHash = await hashPassword(newPassword);
      await updateAuthProfile(loginProfile, newHash);
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
    invalidateCaches(); // clear master-data cache so next login fetches fresh data
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

    const sameTurn = loginProfile ? loginProfile.replace('Turno ', '') : data.turno;
    const logicalToday = getLogicalDateStr(getServerTime());

    if (operations.some(op => {
      if (op.opNumber !== data.opNumber) return false;
      const turnMatch = op.turno === sameTurn;
      if (!op.carimboInicial) return turnMatch;
      return turnMatch && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
    })) {
      toast.error('Essa OP já está listada como pendente para este turno e data.');
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

  const handleParadaOnly = async (data: StartOpFormValues, paradas: ParadaRecord[]) => {
    if (loginProfile) {
      const shiftCheck = isShiftAllowed(loginProfile);
      if (!shiftCheck.allowed) {
        logAudit({
          userProfile: loginProfile,
          action: 'FINISH_OP',
          expectedShift: loginProfile,
          activeShift: shiftCheck.activeTurno,
          serverTimestamp: getServerTimeISO(),
          result: 'BLOCKED',
          reason: shiftCheck.reason,
          opReference: data.opNumber
        });
        toast.error(shiftCheck.reason);
        return;
      }
    }

    if (paradas.length === 0) {
      toast.error('Adicione ao menos uma parada.');
      return;
    }

    setLoadingNewOp(true);
    try {
      const matchedProduct = availableProducts.find(p => (p.produto || '').trim().toUpperCase() === (data.produto || '').trim().toUpperCase());
      const derivedLitragem = matchedProduct?.litragem || extractLitragem(data.produto || '');
      const sameTurn = loginProfile ? loginProfile.replace('Turno ', '') : data.turno;

      // Sort paradas by time to find the latest end time
      const sortedParadas = [...paradas].sort((a, b) => a.horaFim.localeCompare(b.horaFim));
      const lastParadaEnd = sortedParadas[sortedParadas.length - 1].horaFim;

      // Synthetic OP (Direct to Finished)
      const syntheticOp: Operation = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        carimboInicial: new Date().toISOString(),
        ...data,
        horaInicial: sortedParadas[0].horaInicio.length === 5 ? `${sortedParadas[0].horaInicio}:00` : sortedParadas[0].horaInicio,
        litragem: derivedLitragem,
        turno: sameTurn,
        isAvulsa: true
      };

      await markOperationFinished(
        syntheticOp,
        '0',
        lastParadaEnd.length === 5 ? `${lastParadaEnd}:00` : lastParadaEnd,
        '0',
        paradas,
        (success, error) => {
          if (success) {
            toast.success('Paradas registradas e sincronizadas!');
          } else {
            toast.warning(`Paradas salvas no log, mas erro na planilha: ${error}`);
          }
        }
      );

      reset({ opNumber: '', produto: '', linha: '', turno: data.turno, horaInicial: format(new Date(), 'HH:mm') });
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
      const correctPw = supervisorProfile?.password || supervisorProfile?.senha;
      
      if (!correctPw) {
        toast.error('Perfil de supervisor não configurado.');
        return;
      }
      
      const inputHash = await hashPassword(overridePassword.trim());
      const isLegacyMatch = correctPw.length !== 64 && overridePassword.trim() === correctPw;
      const isHashMatch = inputHash === correctPw;
      
      if (!isLegacyMatch && !isHashMatch) {
        toast.error('Senha de supervisor incorreta!');
        return;
      }
      
      if (isLegacyMatch) {
         updateAuthProfile("Supervisor", inputHash).catch(console.error);
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
      if (op.isAvulsa) return false;
      const sameTurn = op.turno === currentTurnForView;
      if (!op.carimboInicial) return sameTurn;
      return sameTurn && getLogicalDateStr(new Date(op.carimboInicial)) === logicalToday;
    });
  }, [operations, currentTurnForView, logicalToday]);

  // Normalize linha names: 'Linha 05' and '05' both become '05'
  const normalizeLinha = (l: string) => {
    if (!l) return l;
    const match = l.trim().match(/\d+/);
    return match ? match[0] : l.trim();
  };

  const pendingLinhas = useMemo(() => {
    const lines = new Set(myPendingOps.map(op => normalizeLinha(op.linha)).filter(Boolean));
    return ['Todas', ...Array.from(lines).sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      if (matchA && matchB) return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      return a.localeCompare(b);
    })];
  }, [myPendingOps]);

  const finishedLinhas = useMemo(() => {
    const lines = new Set(myFinishedOps.map(op => normalizeLinha(op.linha)).filter(Boolean));
    return ['Todas', ...Array.from(lines).sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      if (matchA && matchB) return parseInt(matchA[0], 10) - parseInt(matchB[0], 10);
      return a.localeCompare(b);
    })];
  }, [myFinishedOps]);

  const visiblePendingOps = useMemo(() => myPendingOps.filter(op => {
    if (selectedLinhaPending !== 'Todas' && normalizeLinha(op.linha) !== selectedLinhaPending) return false;
    return matchesSearch(op, searchPending);
  }), [myPendingOps, searchPending, selectedLinhaPending]);

  const visibleFinishedOps = useMemo(() => myFinishedOps.filter(op => {
    if (selectedLinhaFinished !== 'Todas' && normalizeLinha(op.linha) !== selectedLinhaFinished) return false;
    return matchesSearch(op, searchFinished);
  }), [myFinishedOps, searchFinished, selectedLinhaFinished]);

  const totalUnidades = myFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);
  const visibleTotalUnidades = visibleFinishedOps.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0);

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const displayPendingOps = tourActive ? TOUR_MOCK_OPS : visiblePendingOps;
  const displayFinishedOps = tourActive ? TOUR_MOCK_FINISHED : visibleFinishedOps;
  const displayTotalUnidades = tourActive
    ? TOUR_MOCK_FINISHED.reduce((acc, op) => acc + (parseInt(op.quantidade) || 0), 0)
    : visibleTotalUnidades;

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

      <div className="min-h-screen bg-[#F9FAFB] overflow-x-hidden">
        {/* Header - Distribución Profesional */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-zinc-200/80 shadow-sm sticky top-0 z-30 pt-[max(0px,env(safe-area-inset-top))]">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 2xl:px-8 py-3 sm:py-0 min-h-[4.25rem] sm:h-20 flex items-center justify-between gap-3">
            
            {/* SECCIÓN IZQUIERDA: Logo y Contexto */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              {/* Contenedor del logo más estilizado */}
              <div className="bg-white p-1.5 rounded-xl shadow-sm border border-zinc-200/60 shrink-0 flex items-center justify-center">
                 <img src="/icon.svg" className="w-7 h-7 sm:w-10 sm:h-10 object-contain drop-shadow-sm" alt="Vonixx" />
              </div>
              
              {/* Textos y Etiquetas */}
              <div className="flex flex-col min-w-0 justify-center">
                <h1 className="text-[15px] sm:text-lg font-black text-zinc-950 tracking-tight leading-none truncate mb-1.5">
                  Diário de Bordo
                </h1>
                
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] sm:text-xs font-black text-zinc-500 tracking-widest uppercase bg-zinc-100/80 px-1.5 py-0.5 rounded border border-zinc-200/80 shadow-sm leading-tight shrink-0">
                    {today}
                  </span>
                  
                  <button 
                    onClick={() => setShowProductManager(true)}
                    className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition-colors uppercase tracking-widest shrink-0"
                  >
                    <Pencil className="w-2.5 h-2.5" /> 
                    <span>Produtos</span>
                  </button>
                  
                  <button 
                    onClick={() => setTourActive(true)}
                    className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded transition-colors uppercase tracking-widest shrink-0"
                  >
                    <HelpCircle className="w-2.5 h-2.5" /> 
                    <span>Tour</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECCIÓN DERECHA: Estado y Acciones de Usuario */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
              
              {/* Contador siempre visible y alineado a la derecha en móviles */}
              <ToleranceCountdown profile={loginProfile} onExpire={handleLogout} />
              
              {/* Menú de PC rediseñado como una píldora unificada */}
              <div className="hidden lg:flex items-center bg-zinc-50 border border-zinc-200/80 rounded-[1rem] p-1 pl-4 shadow-sm">
                <span className="text-xs font-black text-zinc-700 uppercase tracking-widest truncate max-w-[150px] mr-2">
                  {loginProfile}
                </span>
                
                <div className="w-[2px] h-4 bg-zinc-200/80 rounded-full mx-1" />

                <button 
                  onClick={() => setChangePasswordOpen(true)} 
                  className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-950 rounded-xl hover:bg-white border border-transparent hover:border-zinc-200 transition-all focus-visible:outline-none" 
                  title="Alterar Senha"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button 
                  onClick={handleLogout} 
                  className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-all focus-visible:outline-none ml-0.5" 
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* Mobile Bottom Bar — Floating Pill */}
        <div className="lg:hidden fixed bottom-0 left-0 w-full z-50 px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pointer-events-none tour-tab-bar">
          <div className="pointer-events-auto bg-zinc-950/95 backdrop-blur-xl rounded-full ring-1 ring-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.45)] flex items-center justify-between h-[60px] px-1.5">
            
            {/* Izquierda: Solo texto de Turno */}
            <div className="flex items-center pl-4 flex-1 min-w-0">
              <span className="text-[13px] sm:text-sm font-black text-white leading-none truncate">Turno {currentTurnForView?.slice(-1)}</span>
            </div>
            
            {/* Centro: Botón Nova OP */}
            <button
              onClick={() => setIsNovaSheetOpen(true)}
              className="flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-black text-[13px] tracking-tight px-4 sm:px-5 h-11 rounded-full shadow-lg active:scale-[0.97] transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova OP
            </button>
            
            {/* Derecha: Botones de Configuración y Salir */}
            <div className="flex-1 flex items-center justify-end pr-1 gap-1 min-w-0">
              <button 
                onClick={() => setChangePasswordOpen(true)} 
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Alterar Senha"
              >
                <KeyRound className="w-[18px] h-[18px]" />
              </button>
              
              <div className="w-px h-4 bg-white/20 shrink-0" />
              
              <button 
                onClick={handleLogout} 
                className="w-10 h-10 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors shrink-0"
                title="Sair da Conta"
              >
                <LogOut className="w-[18px] h-[18px]" />
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Nav Cards */}
        <div className="lg:hidden px-3 py-2.5 bg-[#F9FAFB] sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-20 border-b border-zinc-200/60">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMobileTab('pendentes')}
              className={cn(
                "relative rounded-2xl p-4 text-left transition-all active:scale-[0.98]",
                mobileTab === 'pendentes'
                  ? "bg-zinc-950 shadow-xl shadow-zinc-950/20"
                  : "bg-white border border-zinc-200/80 shadow-sm"
              )}
            >
              <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2 leading-none", mobileTab === 'pendentes' ? "text-zinc-400" : "text-zinc-400")}>Em andamento</p>
              <p className={cn("text-4xl font-black leading-none", mobileTab === 'pendentes' ? "text-white" : "text-zinc-900")}>{myPendingOps.length}</p>
              {mobileTab === 'pendentes' && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400" />}
            </button>
            <button
              onClick={() => setMobileTab('concluidas')}
              className={cn(
                "relative rounded-2xl p-4 text-left transition-all active:scale-[0.98]",
                mobileTab === 'concluidas'
                  ? "bg-emerald-600 shadow-xl shadow-emerald-500/25"
                  : "bg-white border border-zinc-200/80 shadow-sm"
              )}
            >
              <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2 leading-none", mobileTab === 'concluidas' ? "text-emerald-100/70" : "text-zinc-400")}>Concluídas</p>
              <p className={cn("text-4xl font-black leading-none", mobileTab === 'concluidas' ? "text-white" : "text-zinc-900")}>{myFinishedOps.length}</p>
              <p className={cn("text-[11px] font-bold mt-1.5 leading-none", mobileTab === 'concluidas' ? "text-emerald-100" : "text-emerald-600")}>{totalUnidades.toLocaleString()} UN</p>
            </button>
          </div>
        </div>

        {/* Desktop stats strip */}
        <div className="hidden lg:block bg-zinc-950 border-b border-zinc-800">
          <div className="w-full max-w-[1920px] mx-auto px-6 2xl:px-8 h-10 flex items-center gap-5 2xl:gap-7">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">{myPendingOps.length}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Em andamento</span>
            </div>
            <div className="h-3 w-px bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-400">{myFinishedOps.length}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Concluídas</span>
            </div>
            <div className="h-3 w-px bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-400">{totalUnidades.toLocaleString()} UN</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Produzido</span>
            </div>
            <div className="ml-auto text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="w-full max-w-[1920px] mx-auto px-0 sm:px-4 lg:px-6 2xl:px-8 py-0 sm:py-6 lg:py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-24 lg:pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-4 lg:gap-5 2xl:gap-7 items-start">

            {/* Pendentes */}
            <div className={cn('bg-white sm:rounded-[2rem] sm:shadow-xl sm:ring-1 ring-zinc-200/50 flex flex-col overflow-hidden lg:col-span-5 xl:col-span-5 2xl:col-span-5 lg:order-2 border-none min-h-[calc(100dvh-11.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-h-none lg:min-h-0 lg:h-[calc(100dvh-11rem)] border-b border-zinc-200/80 sm:border-y-0 relative tour-pendentes w-full', mobileTab !== 'pendentes' ? 'hidden lg:flex' : 'flex')}>
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col gap-3 bg-zinc-950/5 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:14px_14px] opacity-50" />
                <div className="flex items-center justify-between gap-2 relative z-10 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm ring-1 ring-zinc-200/80 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-zinc-700" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black text-zinc-900 tracking-tight leading-none mb-1">Pendentes</span>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">{displayPendingOps.length} {displayPendingOps.length === 1 ? 'registro' : 'registros'}</span>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input type="text" value={searchPending} onChange={e => setSearchPending(e.target.value)} placeholder="Pesquisar produto, linha..." className="w-full h-10 pl-9 pr-3 bg-white border border-zinc-200/80 rounded-xl text-base sm:text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm transition-all" />
                  </div>
                  
                  {pendingLinhas.length > 1 && (
                    <div className="relative">
                      <Popover open={openLineFilterPending} onOpenChange={setOpenLineFilterPending}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full h-11 justify-between px-4 rounded-xl text-sm font-bold border-2 transition-all shadow-sm focus:ring-2 focus:ring-zinc-900/20",
                              selectedLinhaPending !== 'Todas'
                                ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"
                                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="opacity-60">Linha:</span>
                              <span>{selectedLinhaPending}</span>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(var(--radix-popover-trigger-width),calc(100vw-1.5rem))] p-0 rounded-[1.25rem] shadow-2xl border-0 ring-1 ring-zinc-200/80 bg-white/95 backdrop-blur-xl z-50 overflow-hidden" align="start">
                          <Command className="bg-transparent">
                            <div className="p-2 border-b border-zinc-100">
                              <CommandInput placeholder="Filtrar linha..." className="h-9 border-0 focus:ring-0" />
                            </div>
                            <CommandList className="max-h-[min(300px,50dvh)] overflow-y-auto p-1 custom-scrollbar">
                              <CommandEmpty className="py-6 text-center text-xs text-zinc-400">Nenhuma linha.</CommandEmpty>
                              <CommandGroup>
                                {pendingLinhas.map((linha) => (
                                  <CommandItem
                                    key={linha}
                                    value={linha}
                                    onSelect={(currentValue) => {
                                      setSelectedLinhaPending(currentValue === selectedLinhaPending ? 'Todas' : currentValue);
                                      setOpenLineFilterPending(false);
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer aria-selected:bg-[#F9FAFB] aria-selected:text-zinc-950 transition-colors font-bold text-xs mb-0.5 last:mb-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", linha === 'Todas' ? "bg-zinc-300" : "bg-amber-400")} />
                                      {linha === 'Todas' ? 'Todas as Linhas' : `Linha ${linha}`}
                                    </div>
                                    {selectedLinhaPending === linha && <Check className="h-3 w-3 text-zinc-900" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 pb-[5.5rem] sm:p-5 bg-zinc-50/50 tour-pendentes-items">
                {displayPendingOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[250px] py-12 text-zinc-400 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                      <ClipboardList className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-600 mb-1">Nada por aqui</p>
                    <p className="text-xs font-medium text-zinc-500 max-w-[200px]">Não há OPs pendentes aguardando fechamento.</p>
                  </div>
                ) : displayPendingOps.map(op => (
                  <PendingOpItem 
                    key={op.id} 
                    op={op} 
                    handleFinish={handleFinish} 
                    openEdit={openEdit} 
                    setDeletingOp={setDeletingOp} 
                    availableParadas={availableParadas}
                    linhaHistory={[
                      ...finishedOps.filter(f => {
                        if (f.isAvulsa) return false;
                        const isSameLinha = normalizeLinha(f.linha) === normalizeLinha(op.linha);
                        const isSameTurno = f.turno === op.turno;
                        const isSameDate = (!f.carimboInicial || !op.carimboInicial) ? true : (f.carimboInicial.substring(0, 10) === op.carimboInicial.substring(0, 10));
                        return isSameLinha && isSameTurno && isSameDate;
                      }),
                      ...operations.filter(p => {
                        if (p.isAvulsa) return false;
                        const isSameLinha = normalizeLinha(p.linha) === normalizeLinha(op.linha);
                        const isSameTurno = p.turno === op.turno;
                        const isSameDate = (!p.carimboInicial || !op.carimboInicial) ? true : (p.carimboInicial.substring(0, 10) === op.carimboInicial.substring(0, 10));
                        return isSameLinha && isSameTurno && isSameDate;
                      })
                    ]}
                  />
                ))}
              </div>
            </div>

            {/* Nova OP */}
            <div className="hidden lg:flex flex-col lg:col-span-4 xl:col-span-3 2xl:col-span-3 lg:order-1 lg:h-[calc(100dvh-11rem)] tour-nova-op">
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
                availableParadas={availableParadas}
                setAvailableParadas={setAvailableParadas}
                onParadaOnly={handleParadaOnly}
              />
            </div>

            {/* Concluídas */}
            <div className={cn('bg-white sm:rounded-[2rem] sm:shadow-xl sm:ring-1 ring-zinc-200/50 flex flex-col overflow-hidden lg:col-span-3 xl:col-span-4 2xl:col-span-4 lg:order-3 border-none min-h-[calc(100dvh-11.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-h-none lg:min-h-0 lg:h-[calc(100dvh-11rem)] border-b border-zinc-200/80 sm:border-y-0 relative tour-concluidas', mobileTab !== 'concluidas' && 'hidden lg:flex')}>
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col gap-3 bg-emerald-950/5 relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966910_1px,transparent_1px),linear-gradient(to_bottom,#05966910_1px,transparent_1px)] bg-[size:14px_14px] opacity-70" />
                <div className="flex items-center justify-between gap-2 relative z-10 w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white shadow-sm ring-1 ring-emerald-200/80 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black text-zinc-900 tracking-tight leading-none mb-1">Concluídas</span>
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">{displayFinishedOps.length} {displayFinishedOps.length === 1 ? 'registro' : 'registros'}</span>
                    </div>
                  </div>
                  <div className="text-right bg-white px-2 py-1.5 rounded-lg border border-emerald-100 shadow-sm shrink-0">
                    <p className="text-[9px] text-emerald-600/70 uppercase tracking-widest font-black mb-0.5">Total</p>
                    <p className="text-sm font-black text-emerald-700 tracking-tighter leading-none">{displayTotalUnidades.toLocaleString()} UN</p>
                  </div>
                </div>
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input type="text" value={searchFinished} onChange={e => setSearchFinished(e.target.value)} placeholder="Pesquisar OP ou produto..." className="w-full h-10 pl-9 pr-3 bg-white border border-zinc-200/80 rounded-xl text-base sm:text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm transition-all" />
                  </div>
                  
                  {finishedLinhas.length > 1 && (
                    <div className="relative">
                      <Popover open={openLineFilterFinished} onOpenChange={setOpenLineFilterFinished}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full h-11 justify-between px-4 rounded-xl text-sm font-bold border-2 transition-all shadow-sm focus:ring-2 focus:ring-emerald-900/20",
                              selectedLinhaFinished !== 'Todas'
                                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="opacity-60">Linha:</span>
                              <span>{selectedLinhaFinished}</span>
                            </div>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(var(--radix-popover-trigger-width),calc(100vw-1.5rem))] p-0 rounded-[1.25rem] shadow-2xl border-0 ring-1 ring-zinc-200/80 bg-white/95 backdrop-blur-xl z-50 overflow-hidden" align="start">
                          <Command className="bg-transparent">
                            <div className="p-2 border-b border-zinc-100">
                              <CommandInput placeholder="Filtrar linha..." className="h-9 border-0 focus:ring-0" />
                            </div>
                            <CommandList className="max-h-[min(300px,50dvh)] overflow-y-auto p-1 custom-scrollbar">
                              <CommandEmpty className="py-6 text-center text-xs text-zinc-400">Nenhuma linha.</CommandEmpty>
                              <CommandGroup>
                                {finishedLinhas.map((linha) => (
                                  <CommandItem
                                    key={linha}
                                    value={linha}
                                    onSelect={(currentValue) => {
                                      setSelectedLinhaFinished(currentValue === selectedLinhaFinished ? 'Todas' : currentValue);
                                      setOpenLineFilterFinished(false);
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer aria-selected:bg-[#F9FAFB] aria-selected:text-zinc-950 transition-colors font-bold text-xs mb-0.5 last:mb-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-2 h-2 rounded-full", linha === 'Todas' ? "bg-zinc-300" : "bg-emerald-500")} />
                                      {linha === 'Todas' ? 'Todas as Linhas' : `Linha ${linha}`}
                                    </div>
                                    {selectedLinhaFinished === linha && <Check className="h-3 w-3 text-zinc-900" />}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 pb-[5.5rem] sm:p-5 bg-zinc-50/50">
                {displayFinishedOps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[250px] py-12 text-zinc-400 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-600 mb-1">Nada por aqui</p>
                    <p className="text-xs font-medium text-zinc-500 max-w-[200px]">Nenhuma operação foi concluída neste turno ainda.</p>
                  </div>
                ) : displayFinishedOps.map((op) => (
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

      <Dialog open={isNovaSheetOpen} onOpenChange={setIsNovaSheetOpen}>
        <DialogContent showCloseButton={false} className="w-full max-w-full rounded-t-[2rem] p-0 border-0 gap-0 top-auto bottom-0 translate-y-0 max-h-[94dvh] overflow-hidden flex flex-col bg-white shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.25)]">
          {/* Drag handle */}
          <div className="flex-shrink-0 flex flex-col items-center pt-3 pb-1 cursor-pointer" onClick={() => setIsNovaSheetOpen(false)}>
            <div className="w-10 h-1 rounded-full bg-zinc-200" />
          </div>
          {/* Sheet header */}
          <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center shadow-lg">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-base font-black text-zinc-950 leading-none">Nova Ordem de Produção</p>
                <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">Turno {currentTurnForView}</p>
              </div>
            </div>
            <button
              onClick={() => setIsNovaSheetOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-px bg-zinc-100 flex-shrink-0" />
          {/* Form — overflow scroll */}
          <div className="flex-1 overflow-y-auto">
          <StartOpForm
            hideHeader
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
            onStartOp={async (data: any) => {
              await onStartOp(data);
              setIsNovaSheetOpen(false);
              setMobileTab('pendentes');
            }}
            availableParadas={availableParadas}
            setAvailableParadas={setAvailableParadas}
            onParadaOnly={async (data: any, paradas: any) => {
              await handleParadaOnly(data, paradas);
              setIsNovaSheetOpen(false);
              setMobileTab('concluidas');
            }}
          />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingOp} onOpenChange={(o: boolean) => { if (!o) setDeletingOp(null); }}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] max-h-[92dvh] overflow-y-auto rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0 top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
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
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] max-h-[92dvh] overflow-y-auto rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0 top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
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
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-[400px] max-h-[92dvh] overflow-y-auto rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0 top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
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
                 className="h-14 px-4 bg-zinc-50 border-0 ring-1 ring-zinc-200/50 focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-xl text-base sm:text-sm"
                 value={overridePassword}
                 onChange={(e) => setOverridePassword(e.target.value)}
               />
             </div>
             <div className="space-y-1.5 flex flex-col mt-4">
               <Label className="text-sm font-bold text-zinc-800">Motivo da Exceção</Label>
               <Input
                 type="text"
                 placeholder="Ex: Correção de OP atrasada"
                 className="h-14 px-4 bg-zinc-50 border-0 ring-1 ring-zinc-200/50 focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-xl text-base sm:text-sm"
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
      <React.Suspense fallback={null}>
        {showProductManager && (
          <ProductManagerModal 
            open={showProductManager}
            onOpenChange={setShowProductManager}
            products={availableProducts}
            onRefresh={loadProducts}
          />
        )}
      </React.Suspense>

      {tourActive && (
        <TourOverlay
          isDesktop={isDesktop}
          setMobileTab={setMobileTab}
          onFinish={() => setTourActive(false)}
        />
      )}
    </>
  );
}
