import React, { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Package, ChevronsUpDown, Check, CheckCircle2, Loader2, Search, Play, Plus, Clock, History, Pencil, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { CustomTimePicker } from '../../../components/CustomTimePicker';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface StartOpFormProps {
  currentTurnForView: string;
  handleSubmit: any;
  handlePreStartOp: (data: any) => void;
  loadingNewOp: boolean;
  register: any;
  watch: any;
  setValue: any;
  errors: any;
  isTypingProduct: boolean;
  setIsTypingProduct: React.Dispatch<React.SetStateAction<boolean>>;
  showProductSuggestions: boolean;
  setShowProductSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  filteredProducts: any[];
  openLineSelect: boolean;
  setOpenLineSelect: React.Dispatch<React.SetStateAction<boolean>>;
  searchLine: string;
  setSearchLine: React.Dispatch<React.SetStateAction<string>>;
  allLinhas: string[];
  setCustomLinhas: React.Dispatch<React.SetStateAction<string[]>>;
  loginProfile: string | null;
  showConfirmStart: boolean;
  setShowConfirmStart: React.Dispatch<React.SetStateAction<boolean>>;
  startFormData: any;
  onStartOp: (data: any) => void;
  availableParadas: any[];
  setAvailableParadas: React.Dispatch<React.SetStateAction<any[]>>;
  onParadaOnly: (data: any, parada: any) => void;
  hideHeader?: boolean;
}

export const StartOpForm: React.FC<StartOpFormProps> = ({
  currentTurnForView,
  handleSubmit,
  handlePreStartOp,
  loadingNewOp,
  hideHeader = false,
  register,
  watch,
  setValue,
  errors,
  isTypingProduct,
  setIsTypingProduct,
  showProductSuggestions,
  setShowProductSuggestions,
  filteredProducts,
  openLineSelect,
  setOpenLineSelect,
  searchLine,
  setSearchLine,
  allLinhas,
  setCustomLinhas,
  loginProfile,
  showConfirmStart,
  setShowConfirmStart,
  startFormData,
  onStartOp,
  availableParadas,
  setAvailableParadas,
  onParadaOnly
}) => {
  const novaOpRef = useRef<HTMLDivElement>(null);
  const [showParadaModal, setShowParadaModal] = useState(false);
  const [openParadaSelect, setOpenParadaSelect] = useState(false);
  const [paradaSelectedCode, setParadaSelectedCode] = useState('');
  const [paradaStart, setParadaStart] = useState('');
  const [paradaEnd, setParadaEnd] = useState('');
  const [searchParadaText, setSearchParadaText] = useState('');
  const [addedParadas, setAddedParadas] = useState<any[]>([]);
  const [editingParadaIndex, setEditingParadaIndex] = useState<number | null>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (novaOpRef.current && !novaOpRef.current.contains(event.target as Node)) {
        setShowProductSuggestions(false);
        setIsTypingProduct(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [setIsTypingProduct, setShowProductSuggestions]);

  return (
    <Card className="bg-white sm:rounded-3xl shadow-lg sm:ring-1 ring-zinc-200/50 flex flex-col overflow-hidden border-none sm:border-y-0 w-full min-h-full lg:h-full relative">
      {!hideHeader && (
        <CardHeader className="bg-zinc-950 border-b border-zinc-900 p-5 sm:p-7 space-y-0 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-base sm:text-lg font-black text-white tracking-widest uppercase mb-1 leading-none">Nova OP</CardTitle>
                <p className="text-xs sm:text-sm font-medium text-zinc-400">Preencha os dados da ordem</p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Turno</span>
              <span className="text-base font-black text-zinc-100 uppercase tracking-tighter bg-white/10 px-3 py-1 rounded-xl border border-white/5 shadow-sm leading-none">{currentTurnForView}</span>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0 flex flex-col flex-1 min-h-0 bg-zinc-50/30">
        <form onSubmit={handleSubmit(handlePreStartOp, (errors: any) => {
          const errorMsg = Object.values(errors).map((e: any) => e.message).join(', ');
          if (errorMsg) toast.error('Faltam dados: ' + Object.keys(errors).join(', '));
        })} className="flex flex-col flex-1 min-h-0 tour-nova-op-form">
          
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 pb-28 lg:pb-7">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
               
               <div className="space-y-2.5 relative">
                <Label htmlFor="opNumber" className="block text-sm font-black text-zinc-600 uppercase tracking-widest pl-2">Número da OP</Label>
                <div className="relative">
                  <Input id="opNumber" {...register('opNumber', { onChange: (e: any) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }} onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, ''); const el = e.currentTarget; const s = el.selectionStart ?? 0; const en = el.selectionEnd ?? 0; const newVal = el.value.slice(0, s) + pasted + el.value.slice(en); setValue('opNumber', newVal, { shouldValidate: true }); }} className="w-full h-16 px-5 bg-white border-2 border-zinc-200/80 rounded-2xl text-lg sm:text-xl font-mono font-black text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-950 transition-all shadow-sm placeholder:font-medium placeholder:text-zinc-300" />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 font-black pointer-events-none text-2xl select-none">#</div>
                </div>
                {errors.opNumber && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.opNumber.message as string}</p>}
              </div>
              
              <div className="space-y-2.5">
                <Label htmlFor="horaInicial" className="block text-sm font-black text-zinc-600 uppercase tracking-widest pl-2">Hora de Início</Label>
                <CustomTimePicker
                  id="horaInicial"
                  value={watch('horaInicial')}
                  onChange={(v: string) => setValue('horaInicial', v, { shouldValidate: true })}
                  clockIconClass="absolute left-4 w-6 h-6 text-zinc-400 pointer-events-none"
                  wrapperClass="bg-white rounded-2xl h-16 border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-all shadow-sm"
                  inputClass="pl-12 pr-4 w-full text-lg sm:text-xl font-bold bg-transparent focus:ring-0 placeholder:font-medium placeholder:text-zinc-300"
                />
                {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.horaInicial.message as string}</p>}
              </div>

              <div className="relative space-y-2.5 sm:col-span-2" ref={novaOpRef}>
                <Label htmlFor="produto" className="block text-sm font-black text-zinc-600 uppercase tracking-widest pl-2">Produto Fabricado</Label>
                <input id="produto" {...register('produto')} readOnly={!isTypingProduct} onClick={() => setShowProductSuggestions(true)} autoComplete="off" onFocus={() => setShowProductSuggestions(true)} placeholder="Digite para buscar..." className="flex h-16 w-full rounded-2xl border-2 border-zinc-200/80 bg-white px-5 py-3 text-lg font-bold text-zinc-900 transition-all placeholder:text-zinc-400 placeholder:font-medium focus-visible:outline-none focus-visible:border-zinc-950 shadow-sm" />
                {showProductSuggestions && (
                  <div className="absolute z-[60] w-full mt-2 bg-white border border-zinc-200 rounded-[1.5rem] shadow-2xl max-h-[min(18rem,50dvh)] overflow-y-auto p-2 ring-1 ring-zinc-900/5" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                    {!isTypingProduct && (
                      <div onClick={(e) => { e.preventDefault(); setIsTypingProduct(true); setTimeout(() => document.getElementById('produto')?.focus(), 50); }} className="cursor-pointer px-4 py-3 text-sm text-zinc-600 font-bold hover:bg-zinc-100 hover:text-zinc-900 rounded-xl flex items-center gap-3 mb-2 border border-zinc-200/50 bg-zinc-50/50 transition-colors min-h-[64px]">
                        <div className="w-10 h-10 rounded-lg bg-white border border-zinc-200/60 flex items-center justify-center shadow-sm">
                          <Search className="w-5 h-5 text-zinc-400" />
                        </div>
                        Pesquisar produto pelo nome
                      </div>
                    )}
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValue('produto', p.produto); setShowProductSuggestions(false); setIsTypingProduct(false); }} className="group/item cursor-pointer px-5 py-3 mb-1 last:mb-0 min-h-[64px] text-base text-zinc-700 hover:bg-[#F9FAFB] hover:text-zinc-950 rounded-[1.25rem] flex items-center justify-between gap-4 font-bold transition-all border border-transparent hover:border-zinc-200/60">
                        <span className="truncate group-hover/item:text-black">{p.produto}</span>
                        {p.litragem && <span className="text-[10px] sm:text-xs text-zinc-500 font-mono font-black tracking-widest shrink-0 uppercase bg-zinc-100 border border-zinc-200/60 px-2 py-1 rounded-md">{p.litragem}</span>}
                      </div>
                    )) : watch('produto') ? (
                       <div className="px-5 py-3 min-h-[64px] text-base text-blue-600 font-bold cursor-pointer hover:bg-blue-50 rounded-[1.25rem] transition-colors flex items-center border border-transparent hover:border-blue-100" onClick={() => { setShowProductSuggestions(false); setIsTypingProduct(false); }}>
                          <Plus className="w-5 h-5 mr-2" />
                          Cadastrar como novo: "{watch('produto')}"
                       </div>
                    ) : (
                       <div className="px-5 text-base text-zinc-400 font-medium text-center min-h-[64px] flex items-center justify-center">
                          Nenhum produto correspondente.
                       </div>
                    )}
                  </div>
                )}
                {errors.produto && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.produto.message as string}</p>}
              </div>

              <div className="space-y-2.5 sm:col-span-2">
                <Label className="block text-sm font-black text-zinc-600 uppercase tracking-widest pl-2">Linha de Produção</Label>
                <input type="hidden" {...register('linha')} />
                
                <div className="flex flex-wrap gap-2 pt-1 pb-2">
                  {allLinhas.map((linhaFull: string) => {
                    const lineVal = linhaFull.replace('Linha ', '');
                    return (
                      <button
                        key={lineVal}
                        type="button"
                        onClick={() => setValue('linha', lineVal, { shouldValidate: true })}
                        className={cn(
                          "h-10 px-4 rounded-xl font-bold text-sm transition-all border-2",
                          watch('linha') === lineVal
                            ? "bg-zinc-950 text-white border-zinc-950 shadow-sm scale-[1.02]"
                            : "bg-white text-zinc-600 border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                        )}
                      >
                        {lineVal}
                      </button>
                    );
                  })}
                  
                  <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
                    <PopoverTrigger type="button" className={cn(
                        "h-10 px-3 rounded-xl font-bold text-sm transition-all border-2 border-dashed flex items-center gap-1.5",
                        watch('linha') && !allLinhas.some((l: string) => l.replace('Linha ', '') === watch('linha'))
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-sm scale-[1.02]"
                          : "bg-white text-zinc-400 border-zinc-200 hover:text-zinc-600 hover:border-zinc-300"
                      )}>
                      <Plus className="w-3.5 h-3.5" /> 
                      {(watch('linha') && !allLinhas.some((l: string) => l.replace('Linha ', '') === watch('linha'))) ? watch('linha') : 'Outra'}
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(16rem,calc(100vw-1.5rem))] p-2 shadow-2xl border-zinc-200/80 rounded-[1.25rem] z-[50]" align="start">
                      <div className="flex flex-col gap-1.5">
                        <input 
                          type="text"
                          placeholder="Nome da linha..."
                          className="bg-[#F9FAFB] text-base sm:text-sm h-10 rounded-lg px-3 border border-zinc-200/80 font-medium w-full focus:outline-none focus:border-zinc-400"
                          value={searchLine}
                          onChange={(e) => setSearchLine(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchLine.trim()) {
                              e.preventDefault();
                              const newLine = searchLine.trim().startsWith('Linha') ? searchLine.trim() : `Linha ${searchLine.trim()}`;
                              const val = newLine.replace('Linha ', '');
                              if (!allLinhas.includes(newLine)) {
                                setCustomLinhas((prev: string[]) => [...prev, newLine]);
                              }
                              setValue('linha', val, { shouldValidate: true });
                              setOpenLineSelect(false);
                              setSearchLine('');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!searchLine.trim()}
                          className="w-full justify-start font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-10 rounded-lg disabled:opacity-50"
                          onClick={() => {
                            if (!searchLine.trim()) return;
                            const newLine = searchLine.trim().startsWith('Linha') ? searchLine.trim() : `Linha ${searchLine.trim()}`;
                            const val = newLine.replace('Linha ', '');
                            if (!allLinhas.includes(newLine)) {
                              setCustomLinhas((prev: string[]) => [...prev, newLine]);
                            }
                            setValue('linha', val, { shouldValidate: true });
                            setOpenLineSelect(false);
                            setSearchLine('');
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Adicionar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {errors.linha && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.linha.message as string}</p>}
              </div>
            </div>

            <div className="hidden">
              <input type="hidden" {...register('turno')} />
              <Select onValueChange={(v) => setValue('turno', v)} value={watch('turno') || ''} disabled={!!loginProfile}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Dialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
              {/* ¡AQUÍ ESTABA EL FIX PRINCIPAL (w-full en vez de anchos calculados) para este contenedor sticky! */}
              <div className="mt-auto sm:mt-6 pt-4 sm:pt-6 bg-zinc-50/95 lg:bg-transparent backdrop-blur lg:backdrop-filter-none border-t border-zinc-200/80 lg:border-none sticky bottom-0 lg:static z-10 w-full flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={loadingNewOp} className="w-full h-14 bg-zinc-950 hover:bg-zinc-900 text-white font-black text-xl tracking-tight rounded-2xl shadow-[0_8px_30px_rgb(24_24_27_/_12%)] transition-all focus-visible:ring-4 focus-visible:ring-zinc-900/20 focus-visible:outline-none disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]">
                    {loadingNewOp ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Play className="w-6 h-6 mr-3 fill-current" /> Iniciar Ordem</>}
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={loadingNewOp} 
                    onClick={() => {
                      const data = watch();
                      if (!data.opNumber || !data.produto || !data.linha) {
                        toast.error('Preencha os dados da OP primeiro (Número, Produto, Linha).');
                        return;
                      }
                      setShowParadaModal(true);
                    }}
                    className="w-full h-12 bg-white hover:bg-zinc-50 border-2 border-zinc-200/80 text-zinc-700 font-bold text-base rounded-xl transition-all focus-visible:ring-4 focus-visible:ring-zinc-900/20 disabled:opacity-50"
                  >
                    <History className="w-5 h-5 mr-2 opacity-60" /> Lançar Apenas Parada
                  </Button>
                </motion.div>
              </div>

              <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0 top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
                <DialogHeader className="text-center space-y-3 mb-8">
                  <div className="w-16 h-16 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-zinc-200 shadow-sm">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">Iniciar OP?</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-medium text-base leading-relaxed mx-auto max-w-[300px]">
                    Confirme os dados antes de iniciar o registro de apontamentos.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="flex flex-col items-center justify-center min-w-0 h-28 sm:h-32 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-[1.5rem] shadow-inner p-3 sm:p-4 text-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">OP Selecionada</span>
                    <span className="text-3xl font-black text-zinc-950 tracking-tighter w-full truncate" title={startFormData?.opNumber}>{startFormData?.opNumber}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center min-w-0 h-28 sm:h-32 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-[1.5rem] shadow-inner p-3 sm:p-4 text-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Linha Atribuída</span>
                    <span className="text-3xl font-black text-zinc-950 tracking-tighter w-full truncate" title={startFormData?.linha}>
                      {startFormData?.linha?.replace('Linha ', '')?.trim()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button type="button" onClick={() => startFormData && onStartOp(startFormData)} disabled={loadingNewOp} className="w-full h-[4.5rem] bg-zinc-950 hover:bg-zinc-800 text-white rounded-[1.5rem] text-xl font-black tracking-tight shadow-xl shadow-zinc-950/20 focus-visible:ring-4 focus-visible:ring-zinc-900/20 disabled:shadow-none transition-all">
                    {loadingNewOp ? <Loader2 className="w-7 h-7 animate-spin" /> : 'Confirmar Início'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowConfirmStart(false)} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">
                    Revisar Dados
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showParadaModal} onOpenChange={(open) => { 
              setShowParadaModal(open); 
              if (!open) {
                setAddedParadas([]);
                setEditingParadaIndex(null);
                setParadaSelectedCode('');
                setParadaStart('');
                setParadaEnd('');
              } 
            }}>
              <DialogContent className="w-full max-w-full rounded-t-[2rem] p-0 border-0 gap-0 top-auto bottom-0 translate-y-0 max-h-[94dvh] overflow-hidden flex flex-col bg-white shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.25)]">
                <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-pointer" onClick={() => setShowParadaModal(false)}>
                  <div className="w-10 h-1 rounded-full bg-zinc-200" />
                </div>

                <div className="bg-zinc-950 mx-4 rounded-2xl p-4 shrink-0 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff06_0%,transparent_60%)]" />
                  <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Lançar Paradas Avulsas</span>
                      <span className="text-xl font-black text-white leading-none">OP {watch('opNumber')}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-zinc-500">{watch('linha')}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <History className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  <DialogTitle className="sr-only">Lançar Paradas Avulsas</DialogTitle>
                  <DialogDescription className="sr-only">Registrar paradas para a OP {watch('opNumber')}</DialogDescription>

                  <div className="bg-zinc-50/80 border border-zinc-200/60 rounded-2xl p-3 space-y-3">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      {editingParadaIndex !== null
                        ? 'Editando parada'
                        : paradaSelectedCode
                          ? `Motivo — ${availableParadas.find(p => p.seq.toString() === paradaSelectedCode)?.tipologia}`
                          : 'Selecione o motivo'}
                    </p>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar motivo..."
                        value={searchParadaText}
                        onChange={e => setSearchParadaText(e.target.value)}
                        className="w-full h-11 pl-9 pr-4 bg-white border-2 border-zinc-200/80 rounded-xl text-sm font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 transition-colors"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {availableParadas
                        .filter(p => p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText))
                        .map(p => (
                          <button
                            key={p.seq}
                            type="button"
                            onClick={() => setParadaSelectedCode(p.seq.toString())}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95",
                              paradaSelectedCode === p.seq.toString()
                                ? "bg-zinc-950 text-white border-zinc-950 shadow-md"
                                : "bg-white text-zinc-700 border-zinc-200/80 hover:border-zinc-400"
                            )}
                          >
                            <span className="text-[9px] font-black tabular-nums text-zinc-400">{p.seq}</span>
                            {p.tipologia}
                          </button>
                        ))}
                      {availableParadas.filter(p =>
                        p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText)
                      ).length === 0 && searchParadaText.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextSeq = availableParadas.length > 0 ? Math.max(...availableParadas.map(p => p.seq)) + 1 : 900;
                            const newParada = { seq: nextSeq, tipologia: searchParadaText.trim() };
                            setAvailableParadas(prev => [...prev, newParada]);
                            setParadaSelectedCode(nextSeq.toString());
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400 transition-all"
                        >
                          <Plus className="w-3 h-3" /> Adicionar "{searchParadaText}"
                        </button>
                      )}
                      {availableParadas.filter(p =>
                        p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText)
                      ).length === 0 && !searchParadaText.trim() && (
                        <p className="text-sm text-zinc-400 font-medium py-2 w-full text-center">Nenhum motivo encontrado</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Início</label>
                        <CustomTimePicker
                          value={paradaStart}
                          onChange={setParadaStart}
                          placeholder="00:00"
                          clockIconClass="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                          wrapperClass="h-12 bg-white rounded-xl border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                          inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 bg-transparent focus:ring-0 w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pl-0.5">Término</label>
                        <CustomTimePicker
                          value={paradaEnd}
                          onChange={setParadaEnd}
                          placeholder="00:00"
                          clockIconClass="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                          wrapperClass="h-12 bg-white rounded-xl border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-colors shadow-sm"
                          inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 bg-transparent focus:ring-0 w-full"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        disabled={!paradaSelectedCode || !paradaStart || !paradaEnd}
                        onClick={() => {
                          if (!paradaSelectedCode || !paradaStart || !paradaEnd) {
                            toast.error('Preencha motivo e horários.');
                            return;
                          }
                          const pBase = availableParadas.find(p => p.seq.toString() === paradaSelectedCode) || { seq: Number(paradaSelectedCode), tipologia: paradaSelectedCode };
                          if (editingParadaIndex !== null) {
                            setAddedParadas(prev => {
                              const next = [...prev];
                              next[editingParadaIndex] = { ...pBase, horaInicio: paradaStart, horaFim: paradaEnd };
                              return next;
                            });
                            setEditingParadaIndex(null);
                            toast.success('Parada atualizada.');
                          } else {
                            setAddedParadas(prev => [...prev, { ...pBase, horaInicio: paradaStart, horaFim: paradaEnd }]);
                          }
                          setParadaSelectedCode('');
                          setParadaStart('');
                          setParadaEnd('');
                        }}
                        className={cn(
                          "flex-1 h-12 font-black text-sm rounded-xl shadow-sm transition-all disabled:bg-zinc-200 disabled:text-zinc-400",
                          editingParadaIndex !== null ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-zinc-950 hover:bg-zinc-800 text-white"
                        )}
                      >
                        {editingParadaIndex !== null ? <><Check className="w-4 h-4 mr-1.5" />Atualizar</> : <><Plus className="w-4 h-4 mr-1.5" />Incluir na Lista</>}
                      </Button>
                      {editingParadaIndex !== null && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { setEditingParadaIndex(null); setParadaSelectedCode(''); setParadaStart(''); setParadaEnd(''); }}
                          className="w-12 h-12 p-0 rounded-xl border-2 border-zinc-200"
                        >
                          <X className="w-4 h-4 text-zinc-500" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Paradas incluídas ({addedParadas.length})</span>
                      {addedParadas.length > 0 && (
                        <button type="button" onClick={() => setAddedParadas([])} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors">Limpar tudo</button>
                      )}
                    </div>
                    {addedParadas.length > 0 ? addedParadas.map((p, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative flex items-center gap-3 bg-amber-50/60 border border-amber-200/50 rounded-xl px-3 py-2.5 overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-200/60 px-1.5 py-0.5 rounded-md shrink-0 ml-1">{p.seq}</span>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-semibold text-zinc-800 truncate">{p.tipologia}</span>
                          <span className="text-[10px] font-black text-zinc-500 tabular-nums">{p.horaInicio}–{p.horaFim}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setEditingParadaIndex(idx); setParadaSelectedCode(p.seq.toString()); setParadaStart(p.horaInicio); setParadaEnd(p.horaFim); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAddedParadas(prev => prev.filter((_, i) => i !== idx)); if (editingParadaIndex === idx) setEditingParadaIndex(null); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )) : (
                      <div className="py-6 text-center bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-200/60">
                        <p className="text-xs font-bold text-zinc-400">Nenhuma parada adicionada ainda.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 border-t border-zinc-100 shrink-0 space-y-2 bg-white">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      type="button"
                      disabled={loadingNewOp || addedParadas.length === 0}
                      onClick={() => { onParadaOnly(watch(), addedParadas); setShowParadaModal(false); setAddedParadas([]); }}
                      className="w-full h-16 bg-zinc-950 hover:bg-zinc-800 text-white rounded-2xl text-lg font-black shadow-xl shadow-zinc-950/20 disabled:opacity-50 transition-all"
                    >
                      {loadingNewOp ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" />Registrar Todas ({addedParadas.length})</>}
                    </Button>
                  </motion.div>
                  <Button type="button" variant="ghost" onClick={() => setShowParadaModal(false)} className="w-full h-11 rounded-xl text-sm font-bold text-zinc-400 hover:bg-zinc-100 transition-colors">
                    Cancelar e Voltar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </form>
      </CardContent>
    </Card>
  );
};