import React, { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Package, ChevronsUpDown, Check, CheckCircle2, Loader2, Search, Play, Plus } from 'lucide-react';
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
}

export const StartOpForm: React.FC<StartOpFormProps> = ({
  currentTurnForView,
  handleSubmit,
  handlePreStartOp,
  loadingNewOp,
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
  onStartOp
}) => {
  const novaOpRef = useRef<HTMLDivElement>(null);

  // Close suggestions if clicks outside
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
    <Card className="bg-white sm:rounded-3xl shadow-lg sm:ring-1 ring-zinc-200/50 flex flex-col overflow-hidden border-none sm:border-y-0 w-full h-full relative">
      <CardHeader className="bg-zinc-950 border-b border-zinc-900 p-6 sm:p-7 space-y-0 shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] opacity-20" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-[1.25rem] flex items-center justify-center border border-white/10 shadow-inner">
               <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-base sm:text-lg font-black text-white tracking-widest uppercase mb-1 leading-none">Nova OP</CardTitle>
              <p className="text-xs sm:text-sm font-medium text-zinc-400">Preencha os dados da ordem</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Turno</span>
             <span className="text-base font-black text-zinc-100 uppercase tracking-tighter bg-white/10 px-3 py-1 rounded-xl border border-white/5 shadow-sm leading-none">{currentTurnForView}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden bg-zinc-50/30">
        <form onSubmit={handleSubmit(handlePreStartOp, (errors: any) => {
          const errorMsg = Object.values(errors).map((e: any) => e.message).join(', ');
          if (errorMsg) toast.error('Faltam dados: ' + Object.keys(errors).join(', '));
        })} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
               
               <div className="space-y-2.5 relative">
                <Label htmlFor="opNumber" className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Número da OP</Label>
                <div className="relative">
                  <Input id="opNumber" {...register('opNumber', { onChange: (e: any) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" className="w-full h-14 pl-4 pr-12 bg-white border-2 border-zinc-200/80 rounded-2xl text-base sm:text-lg font-mono font-black text-zinc-900 focus-visible:ring-0 focus-visible:border-zinc-950 transition-all shadow-sm placeholder:font-medium placeholder:text-zinc-300" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 font-black pointer-events-none text-xl select-none">#</div>
                </div>
                {errors.opNumber && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.opNumber.message as string}</p>}
              </div>
              
              <div className="space-y-2.5">
                <Label htmlFor="horaInicial" className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Hora de Início</Label>
                <CustomTimePicker
                  id="horaInicial"
                  value={watch('horaInicial')}
                  onChange={(v: string) => setValue('horaInicial', v, { shouldValidate: true })}
                  clockIconClass="absolute left-3 w-5 h-5 text-zinc-400 pointer-events-none"
                  wrapperClass="bg-white rounded-2xl h-14 border-2 border-zinc-200/80 focus-within:border-zinc-950 transition-all shadow-sm"
                  inputClass="pl-9 pr-2 w-full text-base font-bold bg-transparent focus:ring-0 placeholder:font-medium placeholder:text-zinc-300"
                />
                {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.horaInicial.message as string}</p>}
              </div>

              <div className="relative space-y-2.5 sm:col-span-2" ref={novaOpRef}>
                <Label htmlFor="produto" className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Produto Fabricado</Label>
                <input id="produto" {...register('produto')} readOnly={!isTypingProduct} onClick={() => setShowProductSuggestions(true)} autoComplete="off" onFocus={() => setShowProductSuggestions(true)} placeholder="Digite para buscar..." className="flex h-14 w-full rounded-2xl border-2 border-zinc-200/80 bg-white px-4 py-2 text-base font-bold text-zinc-900 transition-all placeholder:text-zinc-400 placeholder:font-medium focus-visible:outline-none focus-visible:border-zinc-950 shadow-sm" />
                {showProductSuggestions && (
                  <div className="absolute z-[60] w-full mt-2 bg-white border border-zinc-200 rounded-[1.5rem] shadow-2xl max-h-72 overflow-y-auto p-2 ring-1 ring-zinc-900/5">
                    {!isTypingProduct && (
                      <div onClick={(e) => { e.preventDefault(); setIsTypingProduct(true); setTimeout(() => document.getElementById('produto')?.focus(), 50); }} className="cursor-pointer px-4 py-3 text-sm text-zinc-600 font-bold hover:bg-zinc-100 hover:text-zinc-900 rounded-xl flex items-center gap-3 mb-2 border border-zinc-200/50 bg-zinc-50/50 transition-colors min-h-[56px]">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/60 flex items-center justify-center shadow-sm">
                          <Search className="w-4 h-4 text-zinc-400" />
                        </div>
                        Pesquisar produto pelo nome
                      </div>
                    )}
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValue('produto', p.produto); setShowProductSuggestions(false); setIsTypingProduct(false); }} className="group/item cursor-pointer px-4 py-2 mb-1 last:mb-0 min-h-[56px] text-sm text-zinc-700 hover:bg-[#F9FAFB] hover:text-zinc-950 rounded-[1.25rem] flex items-center justify-between gap-4 font-bold transition-all border border-transparent hover:border-zinc-200/60">
                        <span className="truncate group-hover/item:text-black">{p.produto}</span>
                        {p.litragem && <span className="text-[10px] text-zinc-500 font-mono font-black tracking-widest shrink-0 uppercase bg-zinc-100 border border-zinc-200/60 px-2 py-1 rounded-md">{p.litragem}</span>}
                      </div>
                    )) : watch('produto') ? (
                       <div className="px-4 py-2 min-h-[56px] text-sm text-blue-600 font-bold cursor-pointer hover:bg-blue-50 rounded-[1.25rem] transition-colors flex items-center border border-transparent hover:border-blue-100" onClick={() => { setShowProductSuggestions(false); setIsTypingProduct(false); }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Cadastrar como novo: "{watch('produto')}"
                       </div>
                    ) : (
                       <div className="px-4 text-sm text-zinc-400 font-medium text-center min-h-[56px] flex items-center justify-center">
                          Nenhum produto correspondente.
                       </div>
                    )}
                  </div>
                )}
                {errors.produto && <p className="text-[10px] text-red-500 mt-1.5 pl-1 font-bold">{errors.produto.message as string}</p>}
              </div>

              <div className="space-y-2.5 sm:col-span-2">
                <Label className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Linha de Produção</Label>
                <input type="hidden" {...register('linha')} />
                <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
                  <PopoverTrigger type="button" role="combobox" aria-expanded={openLineSelect} className={cn("flex items-center justify-between w-full h-14 px-4 border-2 border-zinc-200/80 bg-white transition-all duration-200 text-base font-bold rounded-2xl outline-none focus:border-zinc-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-50", watch('linha') ? 'border-zinc-300 bg-white text-zinc-950' : 'text-zinc-400 hover:border-zinc-300')}>
                    {watch('linha') ? `Linha ${watch('linha')}` : 'Toque para selecionar...'}
                    <ChevronsUpDown className="ml-3 h-5 w-5 shrink-0 text-zinc-300" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-1.5 shadow-2xl border-zinc-200/80 rounded-[1.5rem] z-[50]" align="start">
                    <Command className="border-none" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                      <div className="px-2 pb-2 pt-1">
                        <CommandInput placeholder="Procurar ou adicionar..." className="bg-[#F9FAFB] text-sm h-12 rounded-xl px-3 border border-zinc-200/80 font-medium w-full mt-1" value={searchLine} onValueChange={setSearchLine} />
                      </div>
                      <CommandList className="max-h-[260px] overflow-y-auto p-1">
                        <CommandEmpty className="py-4 text-center text-sm text-zinc-500">
                          {searchLine ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full justify-start font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-12 rounded-xl"
                              onClick={() => {
                                const newLine = searchLine.trim().startsWith('Linha') ? searchLine.trim() : `Linha ${searchLine.trim()}`;
                                const val = newLine.replace('Linha ', '');
                                setCustomLinhas((prev: string[]) => [...prev, newLine]);
                                setValue('linha', val, { shouldValidate: true });
                                setOpenLineSelect(false);
                                setSearchLine('');
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" /> Adicionar "{searchLine}"
                            </Button>
                          ) : (
                            "Nenhuma linha encontrada."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {allLinhas.map((linhaFull) => {
                            const lineVal = linhaFull.replace('Linha ', '');
                            return (
                              <CommandItem key={lineVal} value={linhaFull} onSelect={() => { setValue('linha', lineVal, { shouldValidate: true }); setOpenLineSelect(false); }} className="flex items-center justify-between py-2 px-4 mb-1 last:mb-0 min-h-[48px] cursor-pointer rounded-xl aria-selected:bg-zinc-100 aria-selected:text-zinc-950 text-zinc-700 font-bold transition-colors">
                                <span className="tracking-tight text-sm">{linhaFull}</span>
                                <Check className={cn('h-5 w-5 text-zinc-950', watch('linha') === lineVal ? 'opacity-100' : 'opacity-0')} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
              {/* Contenedor del boton sticky abajo en móvil, normal en PC */}
              <div className="mt-8 pt-6 sm:pt-8 bg-zinc-50/30 border-t border-zinc-200/80 sticky bottom-0 -mx-5 px-5 sm:-mx-7 sm:px-7 pb-5 sm:pb-7 lg:pb-0 lg:border-t-0 lg:bg-transparent lg:static lg:mx-0 lg:px-0 z-10 w-[calc(100%+2.5rem)] sm:w-[calc(100%+3.5rem)] lg:w-full ml-[-1.25rem] sm:ml-[-1.75rem] lg:ml-0">
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={loadingNewOp} className="w-full h-[4.5rem] bg-zinc-950 hover:bg-zinc-900 text-white font-black text-xl tracking-tight rounded-[1.5rem] shadow-[0_8px_30px_rgb(24_24_27_/_12%)] transition-all focus-visible:ring-4 focus-visible:ring-zinc-900/20 focus-visible:outline-none disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]">
                    {loadingNewOp ? <Loader2 className="w-7 h-7 animate-spin" /> : <><Play className="w-6 h-6 mr-3 fill-current" /> Iniciar Ordem</>}
                  </Button>
                </motion.div>
              </div>

              <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
                <DialogHeader className="text-center space-y-3 mb-8">
                  <div className="w-16 h-16 bg-zinc-100 text-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-zinc-200 shadow-sm">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <DialogTitle className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">Iniciar OP?</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-medium text-base leading-relaxed mx-auto max-w-[300px]">
                    Confirme os dados antes de iniciar o registro de apontamentos.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="flex flex-col items-center justify-center flex-1 h-32 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-[1.5rem] shadow-inner p-4 text-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">OP Selecionada</span>
                    <span className="text-3xl font-black text-zinc-950 tracking-tighter w-full truncate" title={startFormData?.opNumber}>{startFormData?.opNumber}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center flex-1 h-32 bg-[#F9FAFB] border-2 border-zinc-200/80 rounded-[1.5rem] shadow-inner p-4 text-center">
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
