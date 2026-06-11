import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Search, Loader2, Check, ChevronsUpDown, Clock, Plus, Pencil, ChevronDown } from 'lucide-react';
import { CustomTimePicker } from '../../../components/CustomTimePicker';
import { QuickCounter } from '../../../components/QuickCounter';
import { cn } from '../../lib/utils';
import { Operation, FinishedOperation, ParadaRecord, Parada } from '../../api';

export interface EditOpModalProps {
  editingOp: Operation | FinishedOperation | null;
  setEditingOp: (op: Operation | FinishedOperation | null) => void;
  handleSubmitEdit: any;
  onEditOp: (data: any) => void;
  registerEdit: any;
  watchEdit: any;
  setValueEdit: any;
  isTypingEditProduct: boolean;
  setIsTypingEditProduct: React.Dispatch<React.SetStateAction<boolean>>;
  showEditProductSuggestions: boolean;
  setShowEditProductSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  filteredEditProducts: any[];
  openEditLineSelect: boolean;
  setOpenEditLineSelect: React.Dispatch<React.SetStateAction<boolean>>;
  searchEditLine: string;
  setSearchEditLine: React.Dispatch<React.SetStateAction<string>>;
  allLinhas: string[];
  setCustomLinhas: React.Dispatch<React.SetStateAction<string[]>>;
  loadingEdit: boolean;
  editParadas: ParadaRecord[];
  setEditParadas: React.Dispatch<React.SetStateAction<ParadaRecord[]>>;
  removeEditParada: (idx: number) => void;
  editParadaSelectedCode: string;
  setEditParadaSelectedCode: React.Dispatch<React.SetStateAction<string>>;
  availableParadas: Parada[];
  editParadaStart: string;
  setEditParadaStart: React.Dispatch<React.SetStateAction<string>>;
  editParadaEnd: string;
  setEditParadaEnd: React.Dispatch<React.SetStateAction<string>>;
  addEditParada: () => void;
}

export const EditOpModal: React.FC<EditOpModalProps> = ({
  editingOp,
  setEditingOp,
  handleSubmitEdit,
  onEditOp,
  registerEdit,
  watchEdit,
  setValueEdit,
  isTypingEditProduct,
  setIsTypingEditProduct,
  showEditProductSuggestions,
  setShowEditProductSuggestions,
  filteredEditProducts,
  openEditLineSelect,
  setOpenEditLineSelect,
  searchEditLine,
  setSearchEditLine,
  allLinhas,
  setCustomLinhas,
  
  loadingEdit,
  editParadas,
  setEditParadas,
  removeEditParada,
  editParadaSelectedCode,
  setEditParadaSelectedCode,
  availableParadas,
  editParadaStart,
  setEditParadaStart,
  editParadaEnd,
  setEditParadaEnd,
  addEditParada
}) => {
  const editOpRef = useRef<HTMLDivElement>(null);
  const [searchParadaText, setSearchParadaText] = useState('');

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
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
  }, [setIsTypingEditProduct, setShowEditProductSuggestions]);

  return (
    <Dialog open={!!editingOp} onOpenChange={(o) => { if (!o) setEditingOp(null); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-xl rounded-b-none rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl border-0 ring-1 ring-zinc-200 dark:ring-zinc-800/50 max-h-[90dvh] overflow-y-auto scrollbar-none gap-0 top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-8">
        <DialogHeader className="mb-6 space-y-2">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center mb-2 shadow-sm border border-zinc-200 dark:border-zinc-800/60">
             <Pencil className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </div>
          <DialogTitle className="text-2xl font-black text-zinc-950 dark:text-zinc-50 tracking-tight">Editar Operação</DialogTitle>
        </DialogHeader>
        {editingOp && (
          <form onSubmit={handleSubmitEdit(onEditOp)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Nº da OP</Label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" {...registerEdit('opNumber', { onChange: (e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '') })} className="w-full h-14 px-4 bg-[#F9FAFB] dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800/80 rounded-2xl text-base font-mono text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:border-zinc-950 dark:focus-visible:border-zinc-700 transition-all shadow-sm focus:bg-white dark:focus:bg-zinc-950" />
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Hora Inicial</Label>
                <CustomTimePicker
                  value={watchEdit('horaInicial')}
                  onChange={(v: string) => setValueEdit('horaInicial', v, { shouldValidate: true })}
                  clockIconClass="absolute left-3 w-5 h-5 text-zinc-400 pointer-events-none"
                  wrapperClass="bg-[#F9FAFB] dark:bg-zinc-900 h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 dark:focus-within:border-zinc-700 transition-all shadow-sm focus-within:bg-white dark:focus-within:bg-zinc-950"
                  inputClass="pl-9 pr-2 text-base w-full bg-transparent outline-none flex-1 font-bold"
                />
              </div>
            </div>
            <div className="relative space-y-2" ref={editOpRef}>
              <Label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Produto</Label>
              <input id="edit-produto" {...registerEdit('produto')} onClick={() => { setShowEditProductSuggestions(true); setIsTypingEditProduct(true); }} autoComplete="off" onFocus={() => { setShowEditProductSuggestions(true); setIsTypingEditProduct(true); }} className="flex h-14 w-full rounded-2xl border-2 border-zinc-200 dark:border-zinc-800/80 bg-[#F9FAFB] dark:bg-zinc-900 px-4 py-2 text-base text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:border-zinc-950 dark:focus-visible:border-zinc-700 shadow-sm focus:bg-white dark:focus:bg-zinc-950" />
              {showEditProductSuggestions && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-2 ring-1 ring-zinc-900/5">
                  {!isTypingEditProduct && (
                    <div onClick={(e) => { e.preventDefault(); setIsTypingEditProduct(true); setTimeout(() => document.getElementById('edit-produto')?.focus(), 50); }} className="hidden">
                    </div>
                  )}
                  {filteredEditProducts.length > 0 ? filteredEditProducts.map(p => (
                    <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValueEdit('produto', p.produto); setShowEditProductSuggestions(false); setIsTypingEditProduct(false); }} className="cursor-pointer px-4 py-3 min-h-[48px] text-sm text-zinc-700 dark:text-zinc-300 hover:bg-[#F9FAFB] hover:text-zinc-950 dark:text-zinc-50 rounded-xl flex items-center justify-between gap-3 font-medium transition-colors">
                       <span className="truncate">{p.produto}</span>
                       {p.litragem && <span className="text-[10px] text-zinc-400 font-mono tracking-widest shrink-0 uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{p.litragem}</span>}
                    </div>
                  )) : watchEdit('produto') ? (
                       <div className="px-4 py-3 min-h-[48px] text-sm text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900/50 rounded-xl transition-colors flex items-center" onClick={() => { setShowEditProductSuggestions(false); setIsTypingEditProduct(false); }}>
                          Adicionar produto "{watchEdit('produto')}"
                       </div>
                  ) : (
                       <div className="px-4 py-3 text-sm text-zinc-400 font-medium text-center h-12 flex items-center justify-center">
                          Digite na busca...
                       </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Linha de Produção</Label>
              <input type="hidden" {...registerEdit('linha')} />
              <Popover open={openEditLineSelect} onOpenChange={setOpenEditLineSelect}>
                <PopoverTrigger type="button" role="combobox" aria-expanded={openEditLineSelect} className={cn("flex items-center justify-between w-full h-14 px-4 border-2 border-zinc-200 dark:border-zinc-800/80 bg-[#F9FAFB] dark:bg-zinc-900 transition-all duration-200 text-base font-semibold rounded-2xl outline-none focus:border-zinc-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-50", watchEdit('linha') ? 'border-zinc-300 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400 hover:border-zinc-300')}>
                  {watchEdit('linha') ? `Linha ${watchEdit('linha').replace(/^Linha\s*/i, '')}` : 'Selecione a Linha'}
                  <ChevronsUpDown className="ml-3 h-5 w-5 shrink-0 text-zinc-400" />
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-1.5 shadow-2xl border-zinc-200 dark:border-zinc-800 rounded-2xl z-[50]" align="start">
                  <Command className="border-none" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput placeholder="Buscar linha..." className="bg-transparent text-base sm:text-sm h-12" value={searchEditLine} onValueChange={setSearchEditLine} />
                    <CommandList className="max-h-[250px] overflow-y-auto mt-2 p-1">
                      <CommandEmpty className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                          {searchEditLine ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full justify-start font-bold text-zinc-700 dark:text-zinc-300 h-10 rounded-xl"
                              onClick={() => {
                                const newLine = searchEditLine.trim().startsWith('Linha') ? searchEditLine.trim() : `Linha ${searchEditLine.trim()}`;
                                const val = newLine.replace('Linha ', '');
                                setCustomLinhas((prev: string[]) => [...prev, newLine]);
                                setValueEdit('linha', val, { shouldValidate: true });
                                setOpenEditLineSelect(false);
                                setSearchEditLine('');
                              }}
                            >
                              Adicionar "{searchEditLine}"
                            </Button>
                          ) : (
                            "Nenhuma linha encontrada."
                          )}
                      </CommandEmpty>
                      <CommandGroup>
                        {allLinhas.map((linhaFull) => {
                          const lineVal = linhaFull.replace('Linha ', '');
                          return (
                            <CommandItem key={lineVal} value={linhaFull} onSelect={() => { setValueEdit('linha', lineVal, { shouldValidate: true }); setOpenEditLineSelect(false); }} className="flex items-center justify-between py-2 px-3 min-h-[44px] cursor-pointer rounded-xl aria-selected:bg-zinc-950 aria-selected:text-white transition-colors">
                              <span className="font-bold tracking-tight text-sm">{linhaFull}</span>
                              <Check className={cn('h-4 w-4', watchEdit('linha')?.replace(/^Linha\s*/i, '') === lineVal ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Turno</Label>
              <input type="hidden" {...registerEdit('turno')} />
              <Select onValueChange={(v) => setValueEdit('turno', v)} value={watchEdit('turno') || ''}>
                <SelectTrigger className="w-full h-14 border-2 border-zinc-200 dark:border-zinc-800/80 bg-[#F9FAFB] dark:bg-zinc-900 rounded-2xl px-4 text-base font-bold text-zinc-900 dark:text-zinc-100 focus:ring-0 focus:border-zinc-950 transition-all shadow-sm">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-zinc-200 dark:border-zinc-800/80 shadow-xl">
                  <SelectItem value="A" className="text-base font-bold py-2">A</SelectItem>
                  <SelectItem value="B" className="text-base font-bold py-2">B</SelectItem>
                  <SelectItem value="C" className="text-base font-bold py-2">C</SelectItem>
                  <SelectItem value="D" className="text-base font-bold py-2">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {'quantidade' in editingOp && (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 items-start">
                   <QuickCounter 
                     label="Quantidade (UN)"
                     value={watchEdit('quantidade') || ''}
                     onChange={(val: string) => setValueEdit('quantidade', val, { shouldValidate: true })}
                   />
                   <QuickCounter 
                     label="Reprocesso"
                     value={watchEdit('qntReprocesso') || ''}
                     onChange={(val: string) => setValueEdit('qntReprocesso', val, { shouldValidate: true })}
                   />
                   <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                     <Label className="block text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Hora Final</Label>
                     <CustomTimePicker
                       value={watchEdit('horaFinal')}
                       onChange={(v: string) => setValueEdit('horaFinal', v, { shouldValidate: true })}
                       clockIconClass="absolute left-3 w-5 h-5 text-zinc-400 pointer-events-none"
                       wrapperClass="bg-[#F9FAFB] dark:bg-zinc-900 h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-all shadow-sm focus-within:bg-white dark:focus-within:bg-zinc-950"
                       inputClass="pl-9 pr-2 text-base w-full bg-transparent outline-none flex-1 font-bold"
                     />
                   </div>
                </div>

                {/* Paradas Edit Section */}
                <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800/60">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <Label className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">Paradas Registradas</Label>
                    <div className="text-xs font-bold px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">{editParadas.length}</div>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto mb-5 scrollbar-none pr-1">
                    {editParadas.map((parada, idx) => (
                      <div key={idx} className="group/parada relative flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 opacity-80" />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pl-3 flex-1 min-w-[200px]">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight flex-1 break-words">{parada.seq} - {parada.tipologia}</span>
                          <div className="flex items-center gap-1.5 align-middle bg-zinc-50 dark:bg-zinc-900/50 self-start sm:self-auto px-2.5 py-1.5 rounded-md border border-zinc-100 dark:border-zinc-800 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{parada.horaInicio} até {parada.horaFim}</span>
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => removeEditParada(idx)} className="h-10 px-4 text-xs bg-red-50 dark:bg-red-950/30 hover:bg-red-50 dark:bg-red-950/30 text-red-600 font-bold border-red-100 rounded-xl shadow-sm self-start shrink-0 sm:self-auto w-full sm:w-auto pl-3 sm:pl-4">
                          Remover
                        </Button>
                      </div>
                    ))}
                    {editParadas.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 border-dashed rounded-2xl text-zinc-400">
                         <p className="text-sm font-medium">Nenhuma parada registrada</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <p className="text-xs font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-4">Adicionar Parada</p>
                    <div className="flex flex-col gap-4">
                      <Select value={editParadaSelectedCode} onValueChange={setEditParadaSelectedCode}>
                        <SelectTrigger className="min-h-[4.5rem] py-3 h-auto px-4 sm:px-5 bg-white dark:bg-zinc-950 w-full text-left font-semibold text-zinc-800 dark:text-zinc-200 shadow-sm border-2 border-zinc-200 dark:border-zinc-800/80 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-900/10 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal whitespace-normal rounded-[1.25rem] transition-all group hover:border-zinc-300 items-center">
                          <SelectValue placeholder="Selecione o motivo da parada">
                            {editParadaSelectedCode 
                              ? (
                                <div className="flex items-center gap-3 w-full pr-2">
                                  <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-sm border border-zinc-200 dark:border-zinc-800/80 shadow-inner">
                                    {editParadaSelectedCode}
                                  </span>
                                  <span className="font-bold text-sm sm:text-base text-zinc-950 dark:text-zinc-50 break-words leading-tight flex-1">
                                    {availableParadas.find((p: any) => p.seq.toString() === editParadaSelectedCode)?.tipologia || ''}
                                  </span>
                                </div>
                              )
                              : <span className="text-zinc-400 font-bold text-sm sm:text-base flex items-center pr-2"><ChevronDown className="w-5 h-5 mr-3 shrink-0 text-zinc-300" />Toque para selecionar...</span>}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[50dvh] w-[calc(100vw-3rem)] sm:w-[--radix-select-trigger-width] overflow-y-auto overflow-x-hidden rounded-[1.5rem] p-2 shadow-2xl border-0 ring-1 ring-zinc-200 dark:ring-zinc-800/80 bg-white dark:bg-zinc-950/95 backdrop-blur-xl z-50">
                          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 sticky top-0 bg-white dark:bg-zinc-950/95 backdrop-blur-xl z-[60] -m-2 mb-2">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <input 
                                type="text" 
                                placeholder="Buscar parada..." 
                                className="w-full h-10 pl-9 pr-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-400"
                                value={searchParadaText}
                                onChange={(e) => setSearchParadaText(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          {availableParadas.filter((p: any) => p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText)).map((p: any) => (
                            <SelectItem key={p.seq} value={p.seq.toString()} className="group outline-none py-3 px-3 rounded-2xl mb-1 last:mb-0 cursor-pointer focus:bg-[#F9FAFB] focus:text-zinc-950 dark:text-zinc-50 transition-all border border-transparent focus:border-zinc-200 dark:border-zinc-800/80 data-[state=checked]:bg-zinc-950 data-[state=checked]:text-white data-[state=checked]:focus:bg-zinc-950 data-[state=checked]:focus:text-white items-start sm:items-center">
                              <div className="flex items-center sm:items-center gap-3.5 pr-2 w-full flex-1">
                                <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-black text-xs group-focus:bg-white dark:bg-zinc-950 group-focus:text-zinc-950 dark:text-zinc-50 group-data-[state=checked]:bg-white dark:bg-zinc-950/20 group-data-[state=checked]:text-white group-focus:shadow-sm border border-zinc-200 dark:border-zinc-800/60 group-data-[state=checked]:border-white/10 transition-all">
                                  {p.seq}
                                </span>
                                <span className="font-bold text-sm sm:text-sm text-zinc-700 dark:text-zinc-300 group-focus:text-zinc-950 dark:text-zinc-50 group-data-[state=checked]:text-white whitespace-normal break-words [&]:line-clamp-none text-left flex-1 leading-snug pt-0.5 sm:pt-0">
                                  {p.tipologia}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                          {availableParadas.filter((p: any) => p.tipologia.toLowerCase().includes(searchParadaText.toLowerCase()) || p.seq.toString().includes(searchParadaText)).length === 0 && (
                            <div className="py-6 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              Nenhuma parada encontrada.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="relative">
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10"><Clock className="w-4 h-4" /></div>
                           <CustomTimePicker value={editParadaStart} onChange={setEditParadaStart} placeholder="Início" wrapperClass="h-14 bg-[#F9FAFB] dark:bg-zinc-900 rounded-xl shadow-sm border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors focus-within:bg-white dark:focus-within:bg-zinc-950" inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0 w-full" />
                         </div>
                         <div className="relative">
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10"><Clock className="w-4 h-4" /></div>
                           <CustomTimePicker value={editParadaEnd} onChange={setEditParadaEnd} placeholder="Fim" wrapperClass="h-14 bg-[#F9FAFB] dark:bg-zinc-900 rounded-xl shadow-sm border-2 border-zinc-200 dark:border-zinc-800/80 focus-within:border-zinc-950 transition-colors focus-within:bg-white dark:focus-within:bg-zinc-950" inputClass="pl-9 pr-2 text-sm text-center font-bold text-zinc-800 dark:text-zinc-200 bg-transparent focus:ring-0 w-full" />
                         </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addEditParada} className="w-full mt-2 h-14 text-sm font-bold border-dashed border-2 border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-zinc-900/20">
                        <Plus className="w-5 h-5 mr-2" /> Adicionar Parada
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-col gap-3 pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800 w-full">
              <Button type="submit" disabled={loadingEdit} className="w-full h-16 bg-zinc-950 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-2xl text-lg font-black shadow-xl shadow-zinc-900/20 focus-visible:ring-4 focus-visible:ring-zinc-900/20 transition-all">
                {loadingEdit ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Salvar Alterações'}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setEditingOp(null)} className="w-full h-14 rounded-2xl text-base font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 dark:bg-zinc-800 hover:text-zinc-900 dark:text-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900/20 transition-all">Cancelar</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
