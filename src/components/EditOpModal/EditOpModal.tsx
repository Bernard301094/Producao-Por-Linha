import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { Search, Loader2, Check, ChevronsUpDown, Clock, Plus } from 'lucide-react';
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
  loginProfile: string | null;
  loadingEdit: boolean;
  editParadas: ParadaRecord[];
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
  loginProfile,
  loadingEdit,
  editParadas,
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
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg rounded-[24px] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border-zinc-200/60 max-h-[90vh] overflow-y-auto scrollbar-none">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">Editar Operação</DialogTitle>
        </DialogHeader>
        {editingOp && (
          <form onSubmit={handleSubmitEdit(onEditOp)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Nº da OP</Label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" {...registerEdit('opNumber', { onChange: (e: any) => e.target.value = e.target.value.replace(/[^0-9]/g, '') })} className="w-full h-12 sm:h-10 px-3 py-2 bg-[#F9FAFB] border border-zinc-200/60 rounded-xl sm:rounded-lg text-base sm:text-sm font-mono text-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-400" />
              </div>
              <div>
                <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Hora Inicial</Label>
                <CustomTimePicker
                  value={watchEdit('horaInicial')}
                  onChange={(v: string) => setValueEdit('horaInicial', v, { shouldValidate: true })}
                  clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                  wrapperClass="bg-[#F9FAFB] h-12 sm:h-10 rounded-xl sm:rounded-lg"
                  inputClass="pl-9 pr-3 py-2 text-base sm:text-sm w-full bg-transparent outline-none flex-1"
                />
              </div>
            </div>
            <div className="relative" ref={editOpRef}>
              <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Produto</Label>
              <input id="edit-produto" {...registerEdit('produto')} readOnly={!isTypingEditProduct} onClick={() => setShowEditProductSuggestions(true)} autoComplete="off" onFocus={() => setShowEditProductSuggestions(true)} className="flex h-12 sm:h-10 w-full rounded-xl sm:rounded-lg border border-zinc-200/60 bg-white px-3 py-2 text-base sm:text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400" />
              {showEditProductSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200/60 rounded-xl sm:rounded-lg shadow-lg max-h-60 overflow-y-auto p-1">
                  {!isTypingEditProduct && (
                    <div onClick={(e) => { e.preventDefault(); setIsTypingEditProduct(true); setTimeout(() => document.getElementById('edit-produto')?.focus(), 50); }} className="cursor-pointer px-3 py-2.5 text-sm md:text-xs text-zinc-600 font-bold hover:bg-zinc-100 hover:text-zinc-900 rounded-lg sm:rounded-md flex items-center justify-center gap-2 mb-1 border border-zinc-200/50 bg-zinc-50/50">
                      <Search className="w-4 h-4" /> Buscar ou digitar Produto...
                    </div>
                  )}
                  {filteredEditProducts.length > 0 ? filteredEditProducts.map(p => (
                    <div key={`${p.produto}-${p.litragem}`} onClick={(e) => { e.preventDefault(); setValueEdit('produto', p.produto); setShowEditProductSuggestions(false); setIsTypingEditProduct(false); }} className="cursor-pointer px-3 py-3 sm:py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg sm:rounded-sm border-b sm:border-0 border-zinc-100/50 last:border-0">{p.produto}</div>
                  )) : watchEdit('produto') ? (
                       <div className="px-3 py-3 sm:py-2 text-sm text-zinc-500 font-medium cursor-pointer hover:bg-zinc-50 rounded-lg sm:rounded-md" onClick={() => { setShowEditProductSuggestions(false); setIsTypingEditProduct(false); }}>
                          Adicionar novo produto "{watchEdit('produto')}"
                       </div>
                  ) : (
                       <div className="px-3 py-3 sm:py-2 text-sm text-zinc-500 font-medium text-center">
                          Digite na busca acima...
                       </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Linha de Produção</Label>
              <input type="hidden" {...registerEdit('linha')} />
              <Popover open={openEditLineSelect} onOpenChange={setOpenEditLineSelect}>
                <PopoverTrigger type="button" role="combobox" aria-expanded={openEditLineSelect} className={cn("flex items-center justify-between w-full h-12 sm:h-10 px-3 border transition-all duration-200 text-base sm:text-sm font-semibold rounded-xl sm:rounded-lg outline-none focus:ring-1 focus:ring-zinc-400", watchEdit('linha') ? 'border-zinc-300 bg-white text-zinc-900 shadow-sm' : 'border-zinc-200/60 bg-[#F9FAFB] text-zinc-500 hover:border-zinc-300')}>
                  {watchEdit('linha') ? `Linha ${watchEdit('linha').replace(/^Linha\s*/i, '')}` : 'Selecione a Linha'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl rounded-xl border-zinc-200/60" align="start">
                  <Command className="border-none" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput placeholder="Buscar linha..." className="bg-transparent text-sm" value={searchEditLine} onValueChange={setSearchEditLine} />
                    <CommandList className="max-h-[250px] overflow-y-auto mt-1 p-1">
                      <CommandEmpty className="py-2 text-center text-xs text-zinc-500">
                          {searchEditLine ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full justify-start font-bold text-zinc-700"
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
                            <CommandItem key={lineVal} value={linhaFull} onSelect={() => { setValueEdit('linha', lineVal, { shouldValidate: true }); setOpenEditLineSelect(false); }} className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-md aria-selected:bg-zinc-900 aria-selected:text-white transition-colors">
                              <span className="font-bold tracking-tight">{linhaFull}</span>
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
            <div className="hidden">
              <input type="hidden" {...registerEdit('turno')} />
              <Select onValueChange={(v) => setValueEdit('turno', v)} value={watchEdit('turno') || ''} disabled={!!loginProfile}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {'quantidade' in editingOp && (
              <div className="space-y-4">
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
                <div>
                  <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-tighter mb-1.5">Hora Final</Label>
                  <CustomTimePicker
                    value={watchEdit('horaFinal')}
                    onChange={(v: string) => setValueEdit('horaFinal', v, { shouldValidate: true })}
                    clockIconClass="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
                    wrapperClass="bg-[#F9FAFB] h-12 sm:h-10 rounded-xl sm:rounded-lg"
                    inputClass="pl-9 pr-3 py-2 text-base sm:text-sm w-full bg-transparent outline-none flex-1"
                  />
                </div>

                {/* Paradas Edit Section */}
                <div className="mt-4 pt-4 border-t border-zinc-200/60">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[11px] font-black text-zinc-700 uppercase tracking-wider">Paradas Registradas</Label>
                    <div className="text-[10px] font-medium px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{editParadas.length}</div>
                  </div>
                  
                  <div className="space-y-2 max-h-[250px] overflow-y-auto mb-4 scrollbar-none pr-1">
                    {editParadas.map((parada, idx) => (
                      <div key={idx} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                        <div className="flex flex-col pl-2">
                          <span className="text-[13px] font-bold text-zinc-900 leading-tight mb-1">{parada.seq} - {parada.tipologia}</span>
                          <div className="flex items-center gap-1.5 align-middle">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span className="text-[11px] font-medium text-zinc-500">{parada.horaInicio} até {parada.horaFim}</span>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeEditParada(idx)} className="h-8 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-100 self-end sm:self-auto rounded-lg">
                          Remover
                        </Button>
                      </div>
                    ))}
                    {editParadas.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-4 bg-zinc-50/50 border border-zinc-200/50 border-dashed rounded-xl text-zinc-400 text-xs">
                        Nenhuma parada
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 sm:p-4 shadow-sm relative">
                    <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Adicionar Parada</p>
                    <div className="flex flex-col gap-3">
                      <Select value={editParadaSelectedCode} onValueChange={setEditParadaSelectedCode}>
                        <SelectTrigger className="h-auto min-h-14 sm:min-h-12 py-3 sm:py-2.5 text-sm sm:text-xs bg-white text-left font-medium text-zinc-700 shadow-sm border-zinc-200 whitespace-normal rounded-xl sm:rounded-lg">
                          <SelectValue placeholder="Selecione o motivo da parada">
                            {editParadaSelectedCode 
                              ? `${editParadaSelectedCode} - ${availableParadas.find((p: any) => p.seq.toString() === editParadaSelectedCode)?.tipologia || ''}`
                              : <span className="text-zinc-400">Selecione o motivo</span>}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px] rounded-xl">
                          {availableParadas.map((p: any) => (
                            <SelectItem key={p.seq} value={p.seq.toString()} className="text-[13px] sm:text-xs whitespace-normal py-2 border-b border-zinc-100 last:border-0 text-left">
                              {p.seq} - <span className="font-medium text-zinc-700">{p.tipologia}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="relative">
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10"><Clock className="w-4 h-4" /></div>
                           <CustomTimePicker value={editParadaStart} onChange={setEditParadaStart} placeholder="Início" wrapperClass="h-12 sm:h-10 bg-white shadow-sm border border-zinc-200 rounded-xl sm:rounded-lg" inputClass="pl-9 pr-3 text-center text-base sm:text-sm font-bold text-zinc-800 w-full outline-none flex-1 bg-transparent" />
                         </div>
                         <div className="relative">
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10"><Clock className="w-4 h-4" /></div>
                           <CustomTimePicker value={editParadaEnd} onChange={setEditParadaEnd} placeholder="Fim" wrapperClass="h-12 sm:h-10 bg-white shadow-sm border border-zinc-200 rounded-xl sm:rounded-lg" inputClass="pl-9 pr-3 text-center text-base sm:text-sm font-bold text-zinc-800 w-full outline-none flex-1 bg-transparent" />
                         </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addEditParada} className="w-full h-12 sm:h-10 mt-2 text-sm sm:text-xs font-bold border-dashed rounded-xl sm:rounded-lg bg-white">
                        <Plus className="w-4 h-4 mr-1.5" /> Adicionar à lista
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setEditingOp(null)} className="w-full sm:w-auto rounded-xl border-zinc-200/60 font-medium">Cancelar</Button>
              <Button type="submit" disabled={loadingEdit} className="bg-zinc-900 text-white w-full sm:w-auto rounded-xl shadow-sm hover:bg-zinc-800 font-semibold ring-1 ring-zinc-900/10">
                {loadingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Correção'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
