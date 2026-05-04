import React from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Package, ChevronsUpDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoginScreenProps {
  profiles: string[];
  selectedProfile: string | null;
  setSelectedProfile: (p: string | null) => void;
  passwordInput: string;
  setPasswordInput: (v: string) => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  loginLoading: boolean;
  handleLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  profiles,
  selectedProfile,
  setSelectedProfile,
  passwordInput,
  setPasswordInput,
  showPassword,
  setShowPassword,
  loginLoading,
  handleLogin
}) => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[600px] ring-1 ring-zinc-200/50">
        
        {/* Left Side: Gradient Banner */}
        <div className="lg:w-2/5 p-8 sm:p-12 hidden lg:flex flex-col justify-between relative overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] opacity-20 mask-image:linear-gradient(to_bottom,white,transparent)]" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-xl mb-8">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-4">
              Sistema de<br />Produção
            </h1>
            <p className="text-zinc-400 font-medium leading-relaxed max-w-sm">
              Acesse o painel para gerenciar operações, registrar paradas e acompanhar a produtividade da linha em tempo real.
            </p>
          </div>
          <div className="relative z-10">
            <p className="text-[11px] font-bold tracking-widest uppercase text-zinc-500 font-mono">Vs. 2.0 • Vonixx</p>
          </div>
        </div>

        {/* Right Side: Login Content */}
        <div className="flex-1 p-6 sm:p-8 lg:p-12 xl:p-16 flex flex-col justify-center bg-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
          
          <div className="w-full max-w-md mx-auto relative z-10">
            
            {/* Mobile/Tablet Branding */}
            <div className="lg:hidden flex flex-col items-center gap-3 mb-8 pt-2 sm:pt-0 text-center">
              <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-900/20">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-zinc-950 tracking-tight leading-none">Produção por Linha</h1>
                <p className="text-[11px] text-zinc-500 font-mono mt-1.5 uppercase tracking-widest font-bold">Vonixx</p>
              </div>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">Bem-vindo(a)</h3>
              <p className="text-sm text-zinc-500 mt-2 font-medium">Acesse seu perfil para continuar.</p>
            </div>
            
            <div className="space-y-6">
              {!selectedProfile ? (
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 text-center lg:text-left">Selecione seu perfil</p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {profiles.length === 0 && (
                      <p className="text-xs text-zinc-400 font-medium col-span-2 text-center lg:text-left">
                        Nenhum perfil encontrado.
                      </p>
                    )}
                    {profiles.map((profile) => (
                      <button
                        key={profile}
                        onClick={() => { setSelectedProfile(profile); setPasswordInput(''); setShowPassword(false); }}
                        className={cn(
                          'w-full p-3 sm:p-4 rounded-2xl font-bold text-[13px] sm:text-sm transition-all duration-200 border-2 text-center lg:text-left flex flex-col md:flex-row items-center justify-center md:justify-between group gap-2 md:gap-0',
                          'bg-white border-zinc-200/80 text-zinc-700 hover:border-zinc-900 hover:text-zinc-950 hover:shadow-md'
                        )}
                      >
                        <span className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center border",
                            "bg-zinc-50 border-zinc-200/60 group-hover:bg-zinc-950 transition-colors"
                          )}>
                            <Package className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                          </div>
                          {profile.replace('Turno ', 'Turno ')}
                        </span>
                        <ChevronsUpDown className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0 hidden md:block" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <button
                    onClick={() => { setSelectedProfile(null); setPasswordInput(''); }}
                    className="flex items-center justify-center lg:justify-start gap-1 text-zinc-400 hover:text-zinc-900 text-xs font-bold transition-colors uppercase tracking-wider mx-auto lg:mx-0 w-full lg:w-auto text-center lg:text-left"
                  >
                    ← Mudar Perfil
                  </button>

                  <div className="flex flex-col lg:flex-row items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm text-center lg:text-left">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex flex-shrink-0 items-center justify-center border',
                      'bg-zinc-50 border-zinc-200'
                    )}>
                      <Package className="w-5 h-5 text-zinc-800" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Perfil Selecionado</p>
                      <p className="text-base font-black text-zinc-950">{selectedProfile}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                     <Label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center lg:text-left">Senha de Acesso</Label>
                     <div className="relative max-w-sm mx-auto lg:max-w-none">
                       <Input
                         type={showPassword ? 'text' : 'password'}
                         value={passwordInput}
                         onChange={e => setPasswordInput(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                         placeholder="Digite a senha..."
                         autoFocus
                         className="w-full h-12 bg-white border-2 border-zinc-200 text-zinc-950 placeholder:text-zinc-400 pr-12 rounded-xl focus-visible:ring-0 focus-visible:border-zinc-950 text-base shadow-sm transition-colors text-center lg:text-left"
                       />
                       <button
                         type="button"
                         onClick={() => setShowPassword(v => !v)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                       >
                         {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                       </button>
                     </div>
                  </div>

                  <div className="pt-4 max-w-sm mx-auto lg:max-w-none">
                      <Button
                        onClick={handleLogin}
                        disabled={loginLoading || !passwordInput}
                        className={cn(
                          'w-full h-12 font-black text-base rounded-xl transition-all',
                          'bg-zinc-950 hover:bg-zinc-800 text-white shadow-md shadow-zinc-950/20'
                        )}
                      >
                        {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Acessar Painel'}
                      </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
