import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Factory, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthProfile, updateAuthProfile } from '../api';

interface LoginModuleProps {
  PROFILES: Record<string, string>;
  getSuggestedShift: (dateObj: Date, horaStr: string) => string;
  onLogin: (profile: string) => void;
}

export function LoginModule({ PROFILES, getSuggestedShift, onLogin }: LoginModuleProps) {
  const [selectedRole, setSelectedRole] = useState('Turno A');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      if (selectedRole !== 'Supervisor') {
          const currentActiveShift = getSuggestedShift(new Date(), format(new Date(), 'HH:mm'));
          if (selectedRole.replace('Turno ', '') !== currentActiveShift) {
              toast.error(`Fora de horário! O turno atual é o ${currentActiveShift}.`);
              setLoading(false);
              return;
          }
      }

      try {
          const profileData = await getAuthProfile(selectedRole);
          let validPassword = PROFILES[selectedRole];

          if (profileData && profileData.password) {
              validPassword = profileData.password;
          }

          if (validPassword === passwordInput.trim()) {
              if (!profileData) {
                  // Initialize it in firestore if not exists
                  await updateAuthProfile(selectedRole, { password: validPassword, lastPasswordChange: "" });
              }
              onLogin(selectedRole);
          } else {
              toast.error('Senha incorreta!');
          }
      } catch (err: any) {
          toast.error('Erro de conexão. Tentando localmente...');
          if (PROFILES[selectedRole] === passwordInput.trim()) {
             onLogin(selectedRole);
          } else {
             toast.error('Senha incorreta!');
          }
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center font-sans p-3 sm:p-6 lg:p-8">
       <Toaster position="top-right" richColors />
       <div className="bg-white p-5 sm:p-8 md:p-10 lg:p-12 rounded-3xl shadow-xl border border-slate-200 w-full max-w-[95%] sm:max-w-md md:max-w-3xl lg:max-w-4xl transition-all">
          <div className="flex flex-col items-center gap-2 sm:gap-3 mb-6 sm:mb-8 lg:mb-10 justify-center">
              <div className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                <Factory className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight italic">SheetBridge</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6 md:space-y-8 lg:space-y-10">
             <div>
                <Label className="block text-xs md:text-sm lg:text-base uppercase font-bold text-slate-500 mb-3 md:mb-4 lg:mb-6 text-center tracking-widest">1. Selecione seu Perfil</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 lg:gap-6 mt-2">
                   {Object.keys(PROFILES).map((k) => (
                     <button
                        key={k}
                        type="button"
                        onClick={() => setSelectedRole(k)}
                        className={`col-span-1 ${k === 'Supervisor' ? 'col-span-2 sm:col-span-3 md:col-span-1' : ''} flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6 rounded-2xl border-2 transition-all duration-200 select-none ${
                           selectedRole === k
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg ring-4 ring-blue-600/20 transform scale-[1.02]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                     >
                       <span className="block text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold uppercase tracking-widest opacity-80 mb-0.5 lg:mb-1">{k.includes('Turno') ? 'Turno' : 'Painel'}</span>
                       <span className="text-base sm:text-lg lg:text-xl font-bold">{k.replace('Turno ', '')}</span>
                     </button>
                   ))}
                </div>
             </div>
             
             <div className="max-w-xs md:max-w-sm lg:max-w-md mx-auto w-full pt-2 lg:pt-6">
                <Label className="block text-xs lg:text-sm uppercase font-bold text-slate-500 mb-2 lg:mb-3 text-center tracking-widest">2. Informe a Senha</Label>
                <div className="relative">
                   <Input type={showPassword ? "text" : "password"} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} disabled={loading} className="h-12 md:h-14 lg:h-16 text-center text-xl md:text-2xl font-mono px-4 bg-slate-50/50 rounded-2xl" autoFocus />
                   <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-2">
                      {showPassword ? <EyeOff className="w-5 h-5 lg:w-6 lg:h-6" /> : <Eye className="w-5 h-5 lg:w-6 lg:h-6" />}
                   </button>
                </div>
             </div>
             
             <div className="max-w-xs md:max-w-sm lg:max-w-md mx-auto w-full pt-1 lg:pt-4">
                 <Button type="submit" disabled={loading} className="w-full h-12 md:h-14 lg:h-16 rounded-2xl text-base md:text-lg shadow-sm bg-blue-600 hover:bg-blue-700 transition-all font-bold tracking-wide">
                    {loading ? 'Validando Acesso...' : 'Acessar Sistema'}
                 </Button>
             </div>
          </form>
       </div>
    </div>
  );
}

