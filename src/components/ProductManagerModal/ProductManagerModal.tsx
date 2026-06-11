import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Search, Pencil, Trash2, Check, X, Loader2, Package, AlertTriangle, Box } from 'lucide-react';
import { updateProduct, removeProduct } from '../../api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface Product {
  produto: string;
  litragem: string;
}

interface ProductManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onRefresh: () => void;
}

export const ProductManagerModal = ({ open, onOpenChange, products, onRefresh }: ProductManagerModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newName, setNewName] = useState('');
  const [newLitragem, setNewLitragem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  // Performance: filter using useMemo
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowerSearch = searchTerm.toLowerCase();
    return products.filter(p => p.produto.toLowerCase().includes(lowerSearch));
  }, [products, searchTerm]);

  // Performance: reset infinite scroll when search changes
  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount(prev => prev + 20);
      }
    }
  }, [visibleCount, filteredProducts.length]);

  const handleEdit = (product: Product) => {
    setConfirmDelete(null);
    setEditingProduct(product);
    setNewName(product.produto);
    setNewLitragem(product.litragem);
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    if (!newName.trim()) {
      toast.error('Nome do produto não pode ser vazio');
      return;
    }
    setLoading(true);
    try {
      await updateProduct(editingProduct.produto, newName.trim().toUpperCase(), newLitragem.trim());
      toast.success('Produto atualizado com sucesso');
      setEditingProduct(null);
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      await removeProduct(confirmDelete.produto);
      toast.success('Produto excluído');
      setConfirmDelete(null);
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Close editing when modal closes
  useEffect(() => {
    if (!open) {
      setEditingProduct(null);
      setConfirmDelete(null);
      setSearchTerm('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[500px] rounded-[1.5rem] p-0 border-0 overflow-hidden bg-zinc-50 dark:bg-zinc-900/50/95 backdrop-blur-xl shadow-2xl flex flex-col sm:top-1/2 sm:-translate-y-1/2 bottom-0 top-auto translate-y-0 max-h-[92dvh]"
      >
        <button type="button" autoFocus aria-hidden="true" className="sr-only" />

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 bg-white dark:bg-zinc-950/50">
          <div className="w-10 h-1.5 rounded-full bg-zinc-300" />
        </div>

        {/* Premium Header */}
        <div className="bg-zinc-950 px-5 py-5 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/10 to-transparent opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
              <Box className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[17px] font-black text-white tracking-tight leading-none mb-1">
                Gerenciar Produtos
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
              </DialogDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white dark:bg-zinc-950/5 hover:bg-white dark:bg-zinc-950/15 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Actions Area */}
        <div className="px-5 pt-4 pb-2 bg-white dark:bg-zinc-950/50 shrink-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800/80 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10 bg-white dark:bg-zinc-950 shadow-sm text-sm font-semibold placeholder:font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* Product List */}
        <div 
          className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 space-y-1.5 custom-scrollbar"
          onScroll={handleScroll}
        >
          {filteredProducts.length > 0 ? (
            visibleProducts.map((p) => (
              <div key={p.produto} className={cn(
                'rounded-xl border transition-all duration-200 overflow-hidden',
                editingProduct?.produto === p.produto
                  ? 'border-blue-500 ring-4 ring-blue-500/10 bg-white dark:bg-zinc-950 shadow-md z-10 relative'
                  : confirmDelete?.produto === p.produto
                  ? 'border-red-300 ring-4 ring-red-500/10 bg-red-50 z-10 relative'
                  : 'border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 hover:border-zinc-300 hover:shadow-sm shadow-sm/50'
              )}>
                {/* Product Row */}
                <div className="flex items-center gap-3 p-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    editingProduct?.produto === p.produto ? 'bg-blue-100 text-blue-600'
                    : confirmDelete?.produto === p.produto ? 'bg-red-100 text-red-600' 
                    : 'bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400 border border-zinc-100 dark:border-zinc-800'
                  )}>
                    {confirmDelete?.produto === p.produto
                      ? <AlertTriangle className="w-4 h-4" />
                      : <Box className="w-4 h-4" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] sm:text-sm font-black text-zinc-800 dark:text-zinc-200 truncate leading-tight">{p.produto}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                      {p.litragem || '—'}
                    </p>
                  </div>
                  {editingProduct?.produto !== p.produto && confirmDelete?.produto !== p.produto && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(p)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditingProduct(null); setConfirmDelete(p); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Form */}
                {editingProduct?.produto === p.produto && (
                  <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50/50 pt-3">
                    <div className="grid grid-cols-[2fr,1fr] gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-0.5">Nome do Produto</label>
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="h-9 text-sm font-bold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-lg shadow-sm"
                          placeholder="Ex: V-MOL"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingProduct(null); }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-0.5">Volume</label>
                        <Input
                          value={newLitragem}
                          onChange={(e) => setNewLitragem(e.target.value)}
                          className="h-9 text-xs font-bold bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-lg shadow-sm"
                          placeholder="Ex: 1,5L"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingProduct(null); }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="px-3 h-8 flex items-center justify-center bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors shadow-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 h-8 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg transition-colors shadow-sm disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Salvar</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete Confirmation */}
                {confirmDelete?.produto === p.produto && (
                  <div className="px-3 pb-3 border-t border-red-100 bg-red-50/50 pt-3">
                    <p className="text-xs font-bold text-red-800 mb-3">
                      Excluir este produto permanentemente?
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 h-8 flex items-center justify-center bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors shadow-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteConfirmed}
                        disabled={loading}
                        className="px-4 h-8 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-lg transition-colors shadow-sm disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> Excluir</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center">
                <Box className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-[13px] font-black text-zinc-600 dark:text-zinc-400">Nenhum produto encontrado</p>
                {searchTerm && <p className="text-[11px] font-bold text-zinc-400 mt-0.5">Tente buscar de outra forma</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 shrink-0 bg-white dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-xl bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-700 dark:text-zinc-300 font-black text-xs transition-colors flex items-center justify-center"
          >
            Fechar janela
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

