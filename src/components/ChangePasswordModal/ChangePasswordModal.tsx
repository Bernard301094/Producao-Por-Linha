import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export interface ChangePasswordModalProps {
  changePasswordOpen: boolean;
  setChangePasswordOpen: (v: boolean) => void;
  loginProfile: string | null;
  changerOldPassword: string;
  setChangerOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;
  showChangerPassword: boolean;
  setShowChangerPassword: React.Dispatch<React.SetStateAction<boolean>>;
  changingPasswordLoading: boolean;
  handleChangePassword: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  changePasswordOpen,
  setChangePasswordOpen,
  loginProfile,
  changerOldPassword,
  setChangerOldPassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showChangerPassword,
  setShowChangerPassword,
  changingPasswordLoading,
  handleChangePassword
}) => {
  return (
    <Dialog open={changePasswordOpen} onOpenChange={(o) => { if (!o) setChangePasswordOpen(false); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-2xl shadow-xl border-zinc-200/60 flex flex-col pt-8">
        <DialogHeader>
          <DialogTitle className="text-base font-black text-zinc-900 text-center">Mudar Senha - {loginProfile}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1 relative">
            <Label className="text-xs font-bold text-zinc-700">Senha Atual</Label>
            <Input 
              type={showChangerPassword ? "text" : "password"} 
              className="rounded-xl" 
              value={changerOldPassword} 
              onChange={e => setChangerOldPassword(e.target.value)} 
            />
            <button
              type="button"
              onClick={() => setShowChangerPassword(v => !v)}
              className="absolute right-3 top-[26px] w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"
              title="Mostrar Senha"
            >
              {showChangerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-700">Nova Senha</Label>
            <Input 
              type={showChangerPassword ? "text" : "password"} 
              className="rounded-xl" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-700">Confirmar Nova Senha</Label>
            <Input 
              type={showChangerPassword ? "text" : "password"} 
              className="rounded-xl" 
              value={confirmNewPassword} 
              onChange={e => setConfirmNewPassword(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 font-medium">A senha só pode ser alterada a cada 30 dias. Utilize a mesma senha nos demais dispositivos caso seja alterada.</p>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" type="button" onClick={() => setChangePasswordOpen(false)} className="rounded-xl border-zinc-200/60 font-medium w-full">Cancelar</Button>
          <Button onClick={handleChangePassword} disabled={changingPasswordLoading || !changerOldPassword || !newPassword || !confirmNewPassword} className="bg-zinc-900 text-white rounded-xl shadow-sm hover:bg-zinc-800 font-semibold ring-1 ring-zinc-900/10 w-full">
            {changingPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mudar Senha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
