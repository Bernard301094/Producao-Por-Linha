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
  showConfirmStart: boolean;
  setShowConfirmStart: React.Dispatch<React.SetStateAction<boolean>>;
  startFormData: any;
  onStartOp: (data: any) => void;
  availableParadas: any[];
  setAvailableParadas: React.Dispatch<React.SetStateAction<any[]>>;
  hideHeader?: boolean;
  operatingMode?: 'global' | 'dedicated';
  selectedLinha?: string;
}

export const StartOpForm: React.FC<StartOpFormProps> = ({
  currentTurnForView,
  handleSubmit,
  handlePreStartOp,
  loadingNewOp,
  hideHeader = false,
  operatingMode = 'global',
  selectedLinha = 'Todas',
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
  
  showConfirmStart,
  setShowConfirmStart,
  startFormData,
  onStartOp,
  availableParadas,
  setAvailableParadas
}) => {
  const novaOpRef = useRef<HTMLDivElement>(null);

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
    <Card className="bg-white dark:bg-zinc-950 sm:rounded-3xl shadow-lg sm:ring-1 ring-zinc-200 dark:ring-zinc-800/50 flex flex-col overflow-hidden border-none sm:border-y-0 w-full min-h-full lg:h-full relative">
      {!hideHeader && (
        <CardHeader className="bg-slate-900 border-b border-slate-800 p-5 sm:p-7 space-y-0 shrink-0 relative overflow-hidden shadow-inner">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-base sm:text-lg font-black text-white tracking-widest uppercase mb-1 leading-none">Nova OP</CardTitle>
                <p className="text-xs sm:text-sm font-medium text-slate-400">Preencha os dados da ordem</p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Turno</span>
              <span className="text-base font-black text-slate-100 uppercase tracking-tighter bg-white dark:bg-zinc-950/10 px-3 py-1 rounded-xl border border-white/5 shadow-sm leading-none">
                {watch('turno') || currentTurnForView.replace('Turno ', '')}
              </span>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0 flex flex-col flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-900/50">
        <form onSubmit={handleSubmit(handlePreStartOp, (errors: any) => {
          const errorMsg = Object.values(errors).map((e: any) => e.message).join(', ');
          if (errorMsg) toast.error('Faltam dados: ' + Object.keys(errors).join(', '));
        })} className="flex flex-col flex-1 min-h-0 tour-nova-op-form">
          
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 pb-28 lg:pb-7">

            <div className="flex bg-zinc-200/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setValue('isAvulsa', false, { shouldValidate: true })}
                className={cn(
                  "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all",
                  !watch('isAvulsa') ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                )}
              >
                OP Normal
              </button>
              <button
                type="button"
                onClick={() => setValue('isAvulsa', true, { shouldValidate: true })}
                className={cn(
                  "flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all",
                  watch('isAvulsa') ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 shadow-sm" : "text-zinc-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-500"
                )}
              >
                Parada Avulsa
              </button>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-5 sm:gap-6">

              {!watch('isAvulsa') && (
               <div className="space-y-2.5 relative animate-in fade-in zoom-in-95 duration-200">
                <Label htmlFor="opNumber" className="block text-sm font-bold text-slate-600 uppercase tracking-widest pl-2">Número da OP</Label>
                <div className="relative">
                  <Input id="opNumber" {...register('opNumber', { onChange: (e: any) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }} onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, ''); const el = e.currentTarget; const s = el.selectionStart ?? 0; const en = el.selectionEnd ?? 0; const newVal = el.value.slice(0, s) + pasted + el.value.slice(en); setValue('opNumber', newVal, { shouldValidate: true }); }} className="w-full h-16 px-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-lg sm:text-xl font-mono font-bold text-slate-900 dark:text-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all shadow-sm placeholder:font-medium placeholder:text-slate-300" />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 font-black pointer-events-none text-2xl select-none">#</div>
                </div>
                {errors.opNumber && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.opNumber.message as string}</p>}
              </div>
              )}

              <div className="space-y-2.5 relative">
                <Label htmlFor="operador" className="block text-sm font-bold text-slate-600 uppercase tracking-widest pl-2">Operador</Label>
                <Input id="operador" {...register('operador')} type="text" placeholder="Nome do operador" className="w-full h-16 px-5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-50 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all shadow-sm placeholder:font-medium placeholder:text-slate-300" />
                {errors.operador && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.operador.message as string}</p>}
              </div>

              <div className="space-y-2.5 md:col-span-2 lg:col-span-1 2xl:col-span-2">
                <Label htmlFor="horaInicial" className="block text-sm font-bold text-slate-600 uppercase tracking-widest pl-2">Hora de Início</Label>
                <input type="hidden" {...register('turno')} />
                <CustomTimePicker
                  id="horaInicial"
                  value={watch('horaInicial')}
                  onChange={(v: string) => setValue('horaInicial', v, { shouldValidate: true })}
                  clockIconClass="absolute left-4 w-6 h-6 text-slate-400 pointer-events-none"
                  wrapperClass="bg-white dark:bg-zinc-950 rounded-2xl h-16 border border-slate-200 dark:border-zinc-800 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-sm"
                  inputClass="pl-12 pr-4 w-full text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-50 bg-transparent focus:ring-0 placeholder:font-medium placeholder:text-slate-300"
                />
                {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.horaInicial.message as string}</p>}
              </div>

              {!watch('isAvulsa') && (
              <div className="relative space-y-2.5 md:col-span-2 lg:col-span-1 2xl:col-span-2 animate-in fade-in zoom-in-95 duration-200" ref={novaOpRef}>
                <Label htmlFor="produto" className="block text-sm font-bold text-slate-600 uppercase tracking-widest pl-2">Produto Fabricado</Label>
                <input id="produto" {...register('produto')} onPointerDown={() => { setShowProductSuggestions(true); setIsTypingProduct(true); }} onClick={() => { setShowProductSuggestions(true); setIsTypingProduct(true); }} autoComplete="off" onFocus={() => { setShowProductSuggestions(true); setIsTypingProduct(true); }} placeholder="Digite para buscar..." className="flex h-16 w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-3 text-lg font-bold text-slate-900 dark:text-zinc-50 transition-all placeholder:text-slate-400 placeholder:font-medium focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 shadow-sm" />
                {showProductSuggestions && (
                  <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] shadow-2xl max-h-[min(18rem,50dvh)] overflow-y-auto p-2 ring-1 ring-zinc-900/5">
                    {!isTypingProduct && (
                      <div onClick={(e) => { e.preventDefault(); setIsTypingProduct(true); setTimeout(() => document.getElementById('produto')?.focus(), 50); }} className="hidden">
                      </div>
                    )}
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValue('produto', p.produto); setShowProductSuggestions(false); setIsTypingProduct(false); }} className="group/item cursor-pointer px-5 py-3 mb-1 last:mb-0 min-h-[64px] text-base text-zinc-700 dark:text-zinc-300 hover:bg-[#F9FAFB] hover:text-zinc-950 dark:text-zinc-50 rounded-[1.25rem] flex items-center justify-between gap-4 font-bold transition-all border border-transparent hover:border-zinc-200 dark:border-zinc-800/60">
                        <span className="truncate group-hover/item:text-black">{p.produto}</span>
                        {p.litragem && <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-mono font-black tracking-widest shrink-0 uppercase bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/60 px-2 py-1 rounded-md">{p.litragem}</span>}
                      </div>
                    )) : watch('produto') ? (
                       <div className="px-5 py-3 min-h-[64px] text-base text-blue-600 font-bold cursor-pointer hover:bg-blue-50 dark:bg-blue-950/30 rounded-[1.25rem] transition-colors flex items-center border border-transparent hover:border-blue-100" onClick={() => { setShowProductSuggestions(false); setIsTypingProduct(false); }}>
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
              )}

              <div className="space-y-2.5 md:col-span-2 lg:col-span-1 2xl:col-span-2">
                <Label className="block text-sm font-bold text-slate-600 uppercase tracking-widest pl-2">Linha de Produção</Label>
                {operatingMode === 'dedicated' ? (
                  <>
                    <input type="hidden" {...register('linha')} />
                    {watch('linha') && watch('linha') !== 'Todas' ? (
                      <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950/10 flex items-center justify-center font-black text-base">
                            {watch('linha').replace(/\D/g, '') || watch('linha')}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm tracking-tight">Linha Dedicada</span>
                            <span className="text-xs text-zinc-400 font-bold">
                              {(() => {
                                const numStr = watch('linha').replace(/\D/g, '');
                                if (!numStr) return watch('linha');
                                const num = parseInt(numStr, 10);
                                return `Linha ${num < 10 ? '0' + num : num}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Configure a linha do tablet nas configurações (⚙️).</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative">
                    <Select value={watch('linha') || ''} onValueChange={(val) => {
                      if (val === 'custom_new_line') {
                         setOpenLineSelect(true);
                      } else {
                         setValue('linha', val, { shouldValidate: true });
                      }
                    }}>
                      <SelectTrigger className="w-full h-16 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm">
                        <SelectValue placeholder="Selecione a linha..." />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} sideOffset={8} className="max-h-[300px] rounded-[1.25rem] z-[100] min-w-[var(--anchor-width,100%)] w-[var(--anchor-width)]">
                        {allLinhas.map((linhaFull: string) => {
                          const lineVal = linhaFull.replace('Linha ', '');
                          return (
                            <SelectItem key={lineVal} value={lineVal} className="font-bold text-base py-3">
                              {linhaFull}
                            </SelectItem>
                          );
                        })}
                        <div className="h-px bg-slate-200 my-1"></div>
                        <SelectItem value="custom_new_line" className="font-bold text-base py-3 text-blue-600 focus:text-blue-700 dark:text-blue-400 focus:bg-blue-50 dark:bg-blue-950/30">
                          + Adicionar outra linha...
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
                       <PopoverTrigger className="hidden" />
                       <PopoverContent className="w-[min(16rem,calc(100vw-1.5rem))] p-0.5 shadow-2xl border-zinc-200 dark:border-zinc-800/80 rounded-[1.25rem] z-[105]" align="start">
                         <div className="flex flex-col gap-1.5 p-2">
                           <input 
                             type="text"
                             placeholder="Nome da linha..."
                             className="bg-[#F9FAFB] text-base sm:text-sm h-10 rounded-lg px-3 border border-zinc-200 dark:border-zinc-800/80 font-medium w-full focus:outline-none focus:border-zinc-400"
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
                             className="w-full justify-start font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-950/30 h-10 rounded-lg disabled:opacity-50"
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
                )}
                {errors.linha && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.linha.message as string}</p>}
              </div>

            </div>

            
            <Dialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
              {/* ¡AQUÍ ESTABA EL FIX PRINCIPAL (w-full en vez de anchos calculados) para este contenedor sticky! */}
              <div className="mt-auto sm:mt-6 pt-4 sm:pt-6 bg-slate-50 dark:bg-transparent lg:bg-transparent backdrop-blur dark:backdrop-filter-none lg:backdrop-filter-none border-t border-slate-200 dark:border-transparent lg:border-none sticky bottom-0 lg:static z-10 w-full flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0">
                  <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }}>
                    <Button type="submit" disabled={loadingNewOp} className="w-full h-14 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-xl tracking-tight rounded-2xl shadow-[0_8px_30px_rgb(15_23_42_/_20%)] transition-all focus-visible:ring-4 focus-visible:ring-slate-900/20 focus-visible:outline-none disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 dark:text-zinc-400 disabled:shadow-none">
                      {loadingNewOp ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Play className="w-6 h-6 mr-3 fill-current" /> Iniciar Ordem</>}
                    </Button>
                  </motion.div>
              </div>

              <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200 dark:ring-zinc-800/50 gap-0 top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
                <DialogHeader className="text-center space-y-3 mb-8">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Iniciar OP?</DialogTitle>
                  <DialogDescription className="text-zinc-500 dark:text-zinc-400 font-medium text-base leading-relaxed mx-auto max-w-[300px]">
                    Confirme os dados antes de iniciar o registro de apontamentos.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col items-center justify-center min-w-0 h-28 sm:h-32 bg-[#F9FAFB] dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-[1.5rem] shadow-inner p-3 sm:p-4 text-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">OP Selecionada</span>
                    <span className="text-3xl font-black text-zinc-950 dark:text-zinc-50 tracking-tighter w-full truncate" title={startFormData?.opNumber}>{startFormData?.opNumber}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center min-w-0 h-28 sm:h-32 bg-[#F9FAFB] dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-[1.5rem] shadow-inner p-3 sm:p-4 text-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Linha Atribuída</span>
                    <span className="text-3xl font-black text-zinc-950 dark:text-zinc-50 tracking-tighter w-full truncate" title={startFormData?.linha}>
                      {startFormData?.linha?.replace('Linha ', '')?.trim()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center min-w-0 h-20 bg-[#F9FAFB] dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-[1.5rem] shadow-inner p-3 text-center mb-8">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Turno</span>
                  <span className="text-xl font-black text-zinc-950 dark:text-zinc-50 tracking-tighter">
                    {startFormData?.turno ? `Turno ${startFormData.turno.replace('Turno ', '')}` : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <Button type="button" onClick={() => startFormData && onStartOp(startFormData)} disabled={loadingNewOp} className="w-full h-[4.5rem] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-[1.5rem] text-xl font-bold tracking-tight shadow-xl shadow-emerald-600/20 focus-visible:ring-4 focus-visible:ring-emerald-500/20 disabled:shadow-none transition-all">
                    {loadingNewOp ? <Loader2 className="w-7 h-7 animate-spin" /> : 'Confirmar Início'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowConfirmStart(false)} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 dark:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">
                    Revisar Dados
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {/* Removed showParadaModal Dialog */}

          </div>
        </form>
      </CardContent>
    </Card>
  );
};