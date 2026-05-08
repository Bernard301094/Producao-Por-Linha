import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight } from 'lucide-react';

interface TourStep {
  id: string;
  selector: string | null;
  title: string;
  body: string;
  mobileTab?: 'pendentes' | 'concluidas';
}

interface SpotRect {
  top: number; left: number; right: number; bottom: number;
  width: number; height: number;
}

interface TourOverlayProps {
  isDesktop: boolean;
  setMobileTab: (tab: 'pendentes' | 'concluidas') => void;
  onFinish: () => void;
}

const PAD = 10;

function buildSteps(isDesktop: boolean): TourStep[] {
  return [
    {
      id: 'welcome',
      selector: null,
      title: 'Bem-vindo ao Diário de Bordo! 👋',
      body: 'Este tour rápido vai te mostrar tudo que você precisa saber para usar a aplicação. Leva menos de 1 minuto.',
    },
    {
      id: 'pendentes',
      selector: '.tour-pendentes',
      title: 'OPs em Andamento',
      body: 'Aqui ficam as Ordens de Produção abertas. Cada card mostra a linha, o produto e o tempo decorrido — atualizado em tempo real.',
      mobileTab: 'pendentes',
    },
    {
      id: 'pendentes-items',
      selector: '.tour-pendentes-items',
      title: 'Interaja com cada OP',
      body: 'Toque em um card para expandir e ver as paradas, registrar uma nova parada ou finalizar a OP com quantidade produzida.',
      mobileTab: 'pendentes',
    },
    ...(isDesktop
      ? [{
          id: 'nova-op',
          selector: '.tour-nova-op',
          title: 'Criar Nova OP',
          body: 'Neste painel você inicia uma nova Ordem de Produção: escolha o produto, a linha e o turno — depois confirme para começar.',
        }]
      : [{
          id: 'tab-bar',
          selector: '.tour-tab-bar',
          title: 'Barra de Ações',
          body: 'O botão "Nova OP" abre o formulário para criar uma nova ordem. À esquerda aparece o turno ativo atual.',
        }]
    ),
    {
      id: 'concluidas',
      selector: '.tour-concluidas',
      title: 'OPs Concluídas',
      body: 'Quando uma OP é encerrada ela aparece aqui com quantidade produzida, reprocesso e paradas. Você pode editar ou reverter para pendente.',
      mobileTab: 'concluidas',
    },
    {
      id: 'user-menu',
      selector: '.tour-user-menu',
      title: 'Menu do Usuário',
      body: 'Aqui você altera sua senha e faz o logout com segurança. Pronto — agora você conhece tudo!',
    },
  ];
}

function measureElement(selector: string): SpotRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    right: r.right + PAD,
    bottom: r.bottom + PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

function useTooltipStyle(sr: SpotRect | null): React.CSSProperties {
  const W = typeof window !== 'undefined' ? window.innerWidth : 400;
  const H = typeof window !== 'undefined' ? window.innerHeight : 800;
  const TW = Math.min(320, W - 32);

  if (!sr) {
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TW };
  }

  const cx = sr.left + sr.width / 2;
  const left = Math.max(16, Math.min(W - TW - 16, cx - TW / 2));
  const spaceBelow = H - sr.bottom;
  const spaceAbove = sr.top;

  if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
    return { position: 'fixed', top: sr.bottom + 12, left, width: TW };
  }
  return { position: 'fixed', bottom: H - sr.top + 12, left, width: TW };
}

export function TourOverlay({ isDesktop, setMobileTab, onFinish }: TourOverlayProps) {
  const [step, setStep] = useState(0);
  const [sr, setSr] = useState<SpotRect | null>(null);

  const steps = buildSteps(isDesktop);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const measure = useCallback(() => {
    if (!current.selector) { setSr(null); return; }
    setSr(measureElement(current.selector));
  }, [current.selector]);

  useEffect(() => {
    if (!isDesktop && current.mobileTab) {
      setMobileTab(current.mobileTab);
    }
    const delay = !isDesktop && current.mobileTab ? 380 : 80;
    const t = setTimeout(() => measure(), delay);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  const handleNext = () => {
    if (isLast) onFinish();
    else setStep(s => s + 1);
  };

  const tooltipStyle = useTooltipStyle(sr);

  const motionY = sr
    ? (tooltipStyle.bottom !== undefined ? 8 : -8)
    : 0;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">

      {/* ── Overlay / Spotlight ── */}
      <AnimatePresence mode="wait">
        {!sr ? (
          <motion.div
            key="full"
            className="absolute inset-0 bg-black/65 backdrop-blur-[3px] pointer-events-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        ) : (
          <motion.div key="spot" className="absolute inset-0 pointer-events-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            {/* top */}
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: 0, left: 0, right: 0, height: sr.top }} />
            {/* bottom */}
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: sr.bottom, left: 0, right: 0, bottom: 0 }} />
            {/* left */}
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: sr.top, left: 0, width: sr.left, height: sr.height }} />
            {/* right */}
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: sr.top, left: sr.right, right: 0, height: sr.height }} />
            {/* highlight ring */}
            <div className="absolute rounded-2xl ring-2 ring-white/70 shadow-[0_0_0_5px_rgba(255,255,255,0.12)] pointer-events-none"
              style={{ top: sr.top, left: sr.left, width: sr.width, height: sr.height }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tooltip card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`card-${step}`}
          style={tooltipStyle}
          className="pointer-events-auto"
          initial={{ opacity: 0, y: motionY, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: motionY, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-zinc-200/60 p-5 flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                  Passo {step + 1} de {steps.length}
                </p>
                <h3 className="text-[15px] font-black text-zinc-950 leading-snug">{current.title}</h3>
              </div>
              <button
                onClick={onFinish}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="h-[3px] bg-zinc-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-zinc-950 rounded-full"
                initial={{ width: `${(step / steps.length) * 100}%` }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>

            <p className="text-sm text-zinc-600 font-medium leading-relaxed">{current.body}</p>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onFinish}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors py-1 px-2 rounded-lg"
              >
                Pular
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.97] text-white text-sm font-black px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-zinc-950/20"
              >
                {isLast ? 'Concluir ✓' : 'Próximo'}
                {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
