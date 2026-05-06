import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Search, Pencil, Trash2, Check, X, Loader2, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [loading, setLoading] = useState(false);

  const filteredProducts = products.filter(p => 
    p.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewName(product.produto);
    setNewLitragem(product.litragem);
  };

  const handleSave = async () => {
    if (!editingProduct) return;
    if (!newName.trim()) {
      toast.error('Nome do produto não puede ser vazio');
      return;
    }

    setLoading(true);
    try {
      await updateProduct(editingProduct.produto, newName.trim().toUpperCase(), newLitragem.trim());
      toast.success('Produto atualizado com sucesso');
      setEditingProduct(null);
      onRefresh();
    } catch (error: any) {
      toast.error('Erro ao atualizar produto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) return;

    setLoading(true);
    try {
      await removeProduct(productName);
      toast.success('Produto excluído');
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
        className="w-[calc(100%-2rem)] max-w-[500px] rounded-[2rem] p-0 shadow-2xl border-0 ring-1 ring-zinc-200/50 gap-0 overflow-hidden bg-white max-h-[90vh] flex flex-col"
      >
        <button type="button" autoFocus aria-hidden="true" className="sr-only" />
        <div className="bg-zinc-950 p-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_14px] opacity-20" />
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10 shadow-inner">
            <Package className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-black text-white tracking-tight">Gerenciar Produtos</DialogTitle>
          <DialogDescription className="text-zinc-400 font-medium text-[10px] mt-0.5 uppercase tracking-widest">
            Edite ou remova produtos cadastrados
          </DialogDescription>
        </div>

        <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col min-h-0">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Buscar produto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-xl border-2 border-zinc-100 focus:border-zinc-900 bg-zinc-50/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <div
                  key={p.produto}
                  className="group bg-white border border-zinc-200/80 p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-zinc-300 hover:shadow-sm transition-all"
                >
                  {editingProduct?.produto === p.produto ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <Input 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-10 text-sm font-bold bg-white border-2 border-blue-200 focus:border-blue-500 rounded-xl"
                        placeholder="Nome do produto"
                        autoFocus
                      />
                      <Input 
                        value={newLitragem}
                        onChange={(e) => setNewLitragem(e.target.value)}
                        className="h-9 text-[11px] font-bold bg-white border-zinc-200 rounded-lg"
                        placeholder="Litragem (ex: 500ml)"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleSave} 
                          disabled={loading}
                          className="bg-zinc-900 hover:bg-black text-white h-8 rounded-lg flex-1"
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Salvar</>}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingProduct(null)}
                          className="h-8 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-zinc-900 truncate tracking-tight">{p.produto}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{p.litragem || 'Sem litragem'}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(p)}
                          className="w-9 h-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-zinc-400"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(p.produto)}
                          className="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-600 text-zinc-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-200/60">
                <p className="text-sm font-bold text-zinc-400">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
          
          <div className="pt-2 shrink-0">
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold text-zinc-700 bg-zinc-100/50 hover:bg-zinc-200/50 border-2 border-zinc-200 shadow-sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
