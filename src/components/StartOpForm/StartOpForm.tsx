import React, { useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Package, ChevronsUpDown, Check, CheckCircle2, Loader2, Search } from 'lucide-react';
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
    <Card className="panel-shell sm:rounded-2xl flex flex-col overflow-hidden lg:col-span-3 lg:order-1 border-none -mx-3 sm:mx-0 h-[calc(100dvh-130px)] lg:h-[calc(100vh-120px)] border-y border-slate-200/70 sm:border-y-0 w-full">
      <CardHeader className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-900 border-b border-slate-700/70 p-4 space-y-0 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-300" />
            <CardTitle className="text-xs font-bold text-zinc-100 uppercase tracking-widest">Nova Ordem de Produção</CardTitle>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-widest">Turno {currentTurnForView}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(handlePreStartOp, (errors: any) => {
          const errorMsg = Object.values(errors).map((e: any) => e.message).join(', ');
          if (errorMsg) toast.error('Faltam dados: ' + Object.keys(errors).join(', '));
        })} className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label htmlFor="opNumber" className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
              <Input id="opNumber" {...register('opNumber', { onChange: (e: any) => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); } })} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Ex: 48370" className="w-full h-12 md:h-11 px-3 bg-[#F9FAFB] border border-zinc-200/60 rounded-lg text-base md:text-sm font-mono text-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-400" />
              {errors.opNumber && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.opNumber.message as string}</p>}
            </div>
            <div>
              <Label htmlFor="horaInicial" className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
              <CustomTimePicker
                id="horaInicial"
                value={watch('horaInicial')}
                onChange={(v: string) => setValue('horaInicial', v, { shouldValidate: true })}
                clockIconClass="absolute left-3 w-4 md:w-4 h-4 md:h-4 text-zinc-400 pointer-events-none"
                wrapperClass="bg-[#F9FAFB] rounded-lg h-12 md:h-11"
                inputClass="pl-9 pr-3 text-base md:text-sm"
              />
              {errors.horaInicial && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.horaInicial.message as string}</p>}
            </div>
          </div>
          <div className="relative" ref={novaOpRef}>
            <Label htmlFor="produto" className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Produto</Label>
            <input id="produto" {...register('produto')} readOnly={!isTypingProduct} onClick={() => setShowProductSuggestions(true)} autoComplete="off" onFocus={() => setShowProductSuggestions(true)} placeholder="Ex: ALUMAX 5L" className="flex h-12 md:h-11 w-full rounded-lg border border-zinc-200/60 bg-[#F9FAFB] px-3 py-2 text-base md:text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400" />
            {showProductSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200/60 rounded-lg shadow-xl max-h-56 overflow-y-auto p-1 ring-1 ring-zinc-900/5">
                {!isTypingProduct && (
                  <div onClick={(e) => { e.preventDefault(); setIsTypingProduct(true); setTimeout(() => document.getElementById('produto')?.focus(), 50); }} className="cursor-pointer px-3 py-2.5 text-sm text-zinc-600 font-bold hover:bg-zinc-100 hover:text-zinc-900 rounded-md flex items-center justify-center gap-2 mb-1 border border-zinc-200/50 bg-zinc-50/50">
                    <Search className="w-4 h-4" /> Buscar ou digitar Produto...
                  </div>
                )}
                {filteredProducts.length > 0 ? filteredProducts.map(p => (
                  <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValue('produto', p.produto); setShowProductSuggestions(false); setIsTypingProduct(false); }} className="cursor-pointer px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-md flex items-center justify-between gap-2 font-medium">
                    <span>{p.produto}</span>
                    {p.litragem && <span className="text-[10px] text-zinc-400 font-mono tracking-tight shrink-0">{p.litragem}</span>}
                  </div>
                )) : watch('produto') ? (
                   <div className="px-3 py-2 text-sm text-zinc-500 font-medium cursor-pointer hover:bg-zinc-50 rounded-md" onClick={() => { setShowProductSuggestions(false); setIsTypingProduct(false); }}>
                      Adicionar novo produto "{watch('produto')}"
                   </div>
                ) : (
                   <div className="px-3 py-2 text-sm text-zinc-500 font-medium text-center">
                      Digite na busca acima...
                   </div>
                )}
              </div>
            )}
            {errors.produto && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.produto.message as string}</p>}
          </div>
          <div>
            <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Linha de Produção</Label>
            <input type="hidden" {...register('linha')} />
            <Popover open={openLineSelect} onOpenChange={setOpenLineSelect}>
              <PopoverTrigger type="button" role="combobox" aria-expanded={openLineSelect} className={cn("flex items-center justify-between w-full h-12 md:h-11 px-3 border border-zinc-200/60 bg-[#F9FAFB] transition-all duration-200 text-base md:text-sm font-semibold rounded-lg outline-none focus:ring-1 focus:ring-zinc-400", watch('linha') ? 'border-zinc-300 bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:border-zinc-300')}>
                {watch('linha') ? `Linha ${watch('linha')}` : 'Selecione a Linha'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl border-zinc-200/60 rounded-xl" align="start">
                <Command className="border-none" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                  <CommandInput placeholder="Buscar linha..." className="bg-transparent text-sm" value={searchLine} onValueChange={setSearchLine} />
                  <CommandList className="max-h-[250px] overflow-y-auto mt-1 p-1">
                    <CommandEmpty className="py-2 text-center text-xs text-zinc-500">
                      {searchLine ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start font-bold text-zinc-700"
                          onClick={() => {
                            const newLine = searchLine.trim().startsWith('Linha') ? searchLine.trim() : `Linha ${searchLine.trim()}`;
                            const val = newLine.replace('Linha ', '');
                            setCustomLinhas((prev: string[]) => [...prev, newLine]);
                            setValue('linha', val, { shouldValidate: true });
                            setOpenLineSelect(false);
                            setSearchLine('');
                          }}
                        >
                          Adicionar "{searchLine}"
                        </Button>
                      ) : (
                        "Nenhuma línea encontrada."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {allLinhas.map((linhaFull) => {
                        const lineVal = linhaFull.replace('Linha ', '');
                        return (
                          <CommandItem key={lineVal} value={linhaFull} onSelect={() => { setValue('linha', lineVal, { shouldValidate: true }); setOpenLineSelect(false); }} className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-md aria-selected:bg-zinc-900 aria-selected:text-white transition-colors">
                            <span className="font-bold tracking-tight">{linhaFull}</span>
                            <Check className={cn('h-4 w-4', watch('linha') === lineVal ? 'opacity-100' : 'opacity-0')} />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.linha && <p className="text-[10px] text-red-500 mt-1 font-bold">{errors.linha.message as string}</p>}
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
            <motion.div whileTap={{ scale: 0.95 }} className="pt-2">
              <Button type="submit" disabled={loadingNewOp} className="w-full h-16 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-700 text-white font-black text-lg rounded-xl shadow-lg shadow-slate-900/25 transition-all ring-1 ring-slate-900/10">
                {loadingNewOp ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Iniciar Produção</>}
              </Button>
            </motion.div>
            <DialogContent className="w-[calc(100%-2rem)] max-w-[360px] rounded-[28px] p-6 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0">
              <DialogHeader className="text-center space-y-2 mb-6">
                <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">Confirmar Início</DialogTitle>
                <DialogDescription className="text-zinc-500 font-medium text-[15px] leading-relaxed mx-auto max-w-[260px]">
                  Deseja iniciar a produção da seguinte OP?
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="flex flex-col items-center justify-center flex-1 h-24 bg-zinc-50/80 border border-zinc-200/50 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">OP</span>
                  <span className="text-2xl font-black text-zinc-900 tracking-tight">{startFormData?.opNumber}</span>
                </div>
                <div className="flex flex-col items-center justify-center flex-1 h-24 bg-zinc-50/80 border border-zinc-200/50 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Linha</span>
                  <span className="text-2xl font-black text-zinc-900 tracking-tight">
                    {startFormData?.linha?.replace('Linha ', '')?.trim()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Button type="button" onClick={() => startFormData && onStartOp(startFormData)} disabled={loadingNewOp} className="w-full h-[56px] sm:h-14 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-[16px] font-black shadow-lg shadow-zinc-900/20 ring-1 ring-zinc-900/10">
                  {loadingNewOp ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sim, Iniciar'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowConfirmStart(false)} className="w-full h-[52px] sm:h-12 rounded-2xl text-[15px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
                  Cancelar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </form>
      </CardContent>
    </Card>
  );
};
