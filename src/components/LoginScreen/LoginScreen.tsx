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
    <div className="min-h-[100dvh] bg-[#F9FAFB] flex flex-col items-center justify-center px-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-6xl bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[100dvh] sm:min-h-[600px] lg:min-h-[700px] ring-0 sm:ring-1 ring-zinc-200/50">
        
        {/* Left Side: Branding / Background */}
        <div className="lg:w-[45%] p-8 lg:p-16 hidden lg:flex flex-col justify-between relative overflow-hidden bg-zinc-950">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
          
          <div className="relative z-10 flex flex-col gap-6 mt-12">
            <img src="/icon.svg" className="w-20 h-20 object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.6)] flex-shrink-0" alt="Icon" />
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.1] mb-6">
                Diário de<br />Bordo
              </h1>
              <p className="text-zinc-400 font-medium text-lg leading-relaxed max-w-md">
                Gerencie operações, registre paradas e acompanhe a produtividade da linha em tempo real.
              </p>
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold tracking-widest uppercase text-zinc-500 font-mono">Vs. 2.0 • Vonixx</p>
          </div>
        </div>

        {/* Right Side: Login Content */}
        <div className="flex-1 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6 md:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          
          <div className="w-full max-w-md mx-auto relative z-10 flex flex-col h-full lg:h-auto lg:h-full lg:justify-center">
            
            {/* Mobile/Tablet Branding */}
            <div className="lg:hidden flex flex-col items-center gap-4 mb-8 pt-4 text-center">
              <img src="/icon.svg" className="w-16 h-16 object-contain drop-shadow-md flex-shrink-0" alt="Icon" />
              <div>
                <h1 className="text-2xl font-black text-zinc-950 tracking-tight leading-none mb-1">Diário de Bordo</h1>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest font-bold">Vonixx</p>
              </div>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h3 className="text-3xl font-black text-zinc-950 tracking-tight mb-2">Bem-vindo(a)</h3>
              <p className="text-base text-zinc-500 font-medium">Acesse seu perfil para continuar.</p>
            </div>
            
            <div className="space-y-8 flex-1 flex flex-col">
              {!selectedProfile ? (
                 <div className="flex-1">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 text-center lg:text-left">Selecione seu perfil</p>
                  <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-4">
                    {profiles.length === 0 && (
                      <p className="text-sm text-zinc-400 font-medium col-span-2 text-center lg:text-left">
                        Nenhum perfil encontrado.
                      </p>
                    )}
                    {profiles.map((profile) => (
                      <button
                        key={profile}
                        onClick={() => { setSelectedProfile(profile); setPasswordInput(''); setShowPassword(false); }}
                        className={cn(
                          'w-full h-auto aspect-[2/1] p-3 sm:p-4 rounded-2xl font-black text-sm lg:text-base transition-all duration-200 border-2 text-center flex items-center justify-center group',
                          'bg-white border-zinc-200/60 text-zinc-700 hover:border-zinc-900 hover:bg-zinc-950 hover:text-white hover:shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/20'
                        )}
                      >
                        <span className="truncate">{profile}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button
                    onClick={() => { setSelectedProfile(null); setPasswordInput(''); }}
                    className="self-center lg:self-start flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-900 text-sm font-bold transition-colors uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 rounded-md px-2 py-1"
                  >
                    ← Mudar Perfil
                  </button>

                  <div className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-[#F9FAFB] rounded-[1.5rem] border border-zinc-200/80 shadow-inner">
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-black mb-1">Perfil Selecionado</p>
                      <p className="text-xl font-black text-zinc-950 truncate">{selectedProfile}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4">
                     <Label className="block text-xs font-black text-zinc-500 uppercase tracking-widest pl-1">Senha de Acesso</Label>
                     <div className="relative">
                       <Input
                         type={showPassword ? 'text' : 'password'}
                         value={passwordInput}
                         onChange={e => setPasswordInput(e.target.value)}
                         onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                         placeholder="Digite a senha..."
                         autoFocus
                         className="w-full h-16 bg-white border-2 border-zinc-200/80 text-zinc-950 placeholder:text-zinc-400 pr-14 pl-5 rounded-2xl focus-visible:ring-0 focus-visible:border-zinc-950 text-lg shadow-sm transition-colors"
                       />
                       <button
                         type="button"
                         onClick={() => setShowPassword(v => !v)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
                       >
                         {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                       </button>
                     </div>
                  </div>

                  <div className="pt-8 mt-auto">
                      <Button
                        onClick={handleLogin}
                        disabled={loginLoading || !passwordInput}
                        className={cn(
                          'w-full h-16 font-black text-lg rounded-2xl transition-all',
                          'bg-zinc-950 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-950/20 disabled:shadow-none disabled:bg-zinc-100 disabled:text-zinc-400 focus-visible:ring-4 focus-visible:ring-zinc-900/20 focus-visible:outline-none'
                        )}
                      >
                        {loginLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Acessar Painel'}
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
