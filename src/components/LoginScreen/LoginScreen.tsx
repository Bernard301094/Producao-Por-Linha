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
    <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10 flex items-center justify-center">
      <section className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] rounded-[28px] lg:rounded-[32px] overflow-hidden border border-slate-200/70 shadow-[0_24px_80px_rgba(15,23,42,0.14)] bg-white/95">
        <aside className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-10 xl:p-12 text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.8),transparent_45%)]" />
          <div className="absolute inset-0 opacity-25 bg-[linear-gradient(to_right,#ffffff1c_1px,transparent_1px),linear-gradient(to_bottom,#ffffff16_1px,transparent_1px)] bg-[size:18px_18px]" />
          <div className="relative z-10 space-y-8">
            <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-[44px] font-black tracking-tight leading-[1.05]">Produção por Linha</h1>
              <p className="text-slate-300 text-base leading-relaxed max-w-md">
                Plataforma para controle de OPs com registro de paradas e acompanhamento operacional em tempo real.
              </p>
            </div>
          </div>
          <p className="relative z-10 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-400">Vonixx • Painel Industrial</p>
        </aside>

        <div className="relative bg-white px-4 py-6 sm:p-8 md:p-10 lg:p-12 xl:p-14">
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-indigo-100 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative z-10 mx-auto w-full max-w-xl">
            <div className="lg:hidden mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 tracking-tight">Produção por Linha</h2>
                <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Vonixx</p>
              </div>
            </div>

            <header className="mb-8 text-center lg:text-left">
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Acesse sua conta</h3>
              <p className="text-sm sm:text-base text-slate-500 mt-2">Selecione seu turno e entre no painel operacional.</p>
            </header>

            {!selectedProfile ? (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.16em]">Selecione seu perfil</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profiles.length === 0 && (
                    <p className="text-sm text-slate-400 font-medium col-span-full">Nenhum perfil encontrado.</p>
                  )}
                  {profiles.map((profile) => (
                    <button
                      key={profile}
                      onClick={() => { setSelectedProfile(profile); setPasswordInput(''); setShowPassword(false); }}
                      className={cn(
                        'w-full p-4 rounded-2xl border text-left transition-all duration-200 group flex items-center justify-between gap-3',
                        'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                      )}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-200">
                          <Package className="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                        </span>
                        <span className="font-bold text-slate-800 truncate">{profile.replace('Turno ', 'Turno ')}</span>
                      </span>
                      <ChevronsUpDown className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={() => { setSelectedProfile(null); setPasswordInput(''); }}
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-700"
                >
                  ← Mudar perfil
                </button>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <Package className="w-5 h-5 text-slate-700" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Perfil selecionado</p>
                    <p className="font-black text-slate-900 text-lg leading-tight">{selectedProfile}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-widest font-black text-slate-500">Senha de acesso</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
                      placeholder="Digite a senha..."
                      autoFocus
                      className="h-12 sm:h-13 rounded-xl border-2 border-slate-200 pr-12 bg-white text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleLogin}
                  disabled={loginLoading || !passwordInput}
                  className="w-full h-12 sm:h-14 rounded-xl text-base font-black bg-gradient-to-r from-indigo-700 to-slate-900 hover:from-indigo-600 hover:to-slate-800 shadow-lg shadow-indigo-900/20"
                >
                  {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Entrar no Painel'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};
