import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Search, Pencil, Trash2, Check, X, Loader2, Package, AlertTriangle } from 'lucide-react';
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

  const filteredProducts = products.filter(p =>
    p.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[540px] rounded-t-[2rem] rounded-b-none sm:rounded-[2rem] p-0 border-0 gap-0 overflow-hidden bg-white shadow-[0_-16px_60px_-10px_rgba(0,0,0,0.22)] sm:shadow-2xl max-h-[92dvh] flex flex-col top-auto bottom-0 sm:top-1/2 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0"
      >
        <button type="button" autoFocus aria-hidden="true" className="sr-only" />

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>

        {/* Header */}
        <div className="bg-zinc-950 px-6 py-5 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:16px_16px]" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-black text-white tracking-tight leading-none mb-1">
                Gerenciar Produtos
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
              </DialogDescription>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl border-2 border-zinc-100 focus-visible:border-zinc-900 focus-visible:ring-0 bg-zinc-50 text-base font-semibold placeholder:font-medium placeholder:text-zinc-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-zinc-600" />
              </button>
            )}
          </div>
          {filteredProducts.length > 0 && searchTerm && (
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2 pl-1">
              {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-2 space-y-2 custom-scrollbar">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => (
              <div key={p.produto} className={cn(
                'rounded-2xl border transition-all overflow-hidden',
                editingProduct?.produto === p.produto
                  ? 'border-zinc-900 ring-1 ring-zinc-900/10 bg-white shadow-md'
                  : confirmDelete?.produto === p.produto
                  ? 'border-red-200 ring-1 ring-red-100 bg-red-50/40'
                  : 'border-zinc-200/70 bg-white hover:border-zinc-300 hover:shadow-sm'
              )}>
                {/* Row */}
                <div className="flex items-center gap-3 p-3.5">
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    confirmDelete?.produto === p.produto ? 'bg-red-100' : 'bg-zinc-100'
                  )}>
                    {confirmDelete?.produto === p.produto
                      ? <AlertTriangle className="w-4 h-4 text-red-500" />
                      : <Package className="w-4 h-4 text-zinc-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate leading-tight">{p.produto}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                      {p.litragem || '—'}
                    </p>
                  </div>
                  {editingProduct?.produto !== p.produto && confirmDelete?.produto !== p.produto && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEdit(p)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingProduct(null); setConfirmDelete(p); }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit panel */}
                {editingProduct?.produto === p.produto && (
                  <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-zinc-100 pt-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Nome</label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-11 text-base font-bold bg-zinc-50 border-2 border-zinc-200 focus-visible:border-zinc-900 focus-visible:ring-0 rounded-xl"
                        placeholder="Nome do produto"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingProduct(null); }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Litragem / Volume</label>
                      <Input
                        value={newLitragem}
                        onChange={(e) => setNewLitragem(e.target.value)}
                        className="h-10 text-sm font-bold bg-zinc-50 border-2 border-zinc-200 focus-visible:border-zinc-900 focus-visible:ring-0 rounded-xl"
                        placeholder="Ex: 500ML, 1L, 5KG"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingProduct(null); }}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 h-11 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-sm rounded-xl transition-all disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Salvar alterações</>}
                      </button>
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="w-11 h-11 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete confirmation panel */}
                {confirmDelete?.produto === p.produto && (
                  <div className="px-3.5 pb-3.5 border-t border-red-100 pt-3">
                    <p className="text-xs font-bold text-red-700 mb-3">
                      Remover este produto permanentemente? Esta ação não pode ser desfeita.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteConfirmed}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 h-11 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition-all disabled:opacity-60"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Sim, excluir</>}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 h-11 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-sm rounded-xl transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
                <Package className="w-7 h-7 text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-500">Nenhum produto encontrado</p>
                {searchTerm && <p className="text-xs text-zinc-400 mt-0.5">Tente outro termo de busca</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pt-3 pb-1 shrink-0 border-t border-zinc-100">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
