import React, { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAuthProfile, updateAuthProfile } from '../api';

interface ChangePasswordDialogProps {
  loginProfile: string;
  defaultProfiles: Record<string, string>;
  trigger?: React.ReactNode;
}

export function ChangePasswordDialog({ loginProfile, defaultProfiles, trigger }: ChangePasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      toast.error('Preencha os dois campos.');
      return;
    }

    setLoading(true);
    try {
      const profileData = await getAuthProfile(loginProfile);
      let currentPass = defaultProfiles[loginProfile];
      let lastChange = '';

      if (profileData) {
        currentPass = profileData.password || defaultProfiles[loginProfile];
        lastChange = profileData.lastPasswordChange || '';
      }

      if (currentPass !== oldPassword.trim()) {
        toast.error('Senha atual incorreta.');
        setLoading(false);
        return;
      }

      if (lastChange) {
        const daysSinceLimit = differenceInDays(new Date(), new Date(lastChange));
        if (daysSinceLimit < 30) {
          toast.error(`Você só pode alterar a senha novamente em ${30 - daysSinceLimit} dia(s).`);
          setLoading(false);
          return;
        }
      }

      await updateAuthProfile(loginProfile, {
        password: newPassword.trim(),
        lastPasswordChange: new Date().toISOString()
      });

      toast.success('Senha atualizada com sucesso!');
      setIsOpen(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error('Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="px-2 sm:px-3 text-slate-500 hover:text-blue-600"
        onClick={() => setIsOpen(true)}
      >
        <KeyRound className="w-4 h-4 sm:mr-2" />
        <span className="hidden sm:inline">Alterar Senha</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2 font-light tracking-tight pb-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-blue-600" />
              </div>
              Mudar Senha - {loginProfile}
            </DialogTitle>
            <DialogDescription className="text-center">
              Escolha uma senha forte. Você só pode alterá-la <span className="font-bold text-slate-800">uma vez a cada 30 dias</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Senha Atual</Label>
              <div className="relative">
                <Input type={showOldPassword ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} disabled={loading} />
                <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="block text-[10px] uppercase font-bold text-slate-500 mb-2">Nova Senha</Label>
              <div className="relative">
                <Input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={loading} />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="sm:w-1/2" disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} className="sm:w-1/2 bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
