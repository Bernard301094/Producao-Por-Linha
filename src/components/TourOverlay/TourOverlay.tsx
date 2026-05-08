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

interface CardPos {
  style: React.CSSProperties;
  placeAbove: boolean;
  centered: boolean;
}

interface TourOverlayProps {
  isDesktop: boolean;
  setMobileTab: (tab: 'pendentes' | 'concluidas') => void;
  onFinish: () => void;
}

const PAD     = 10;   // spotlight padding around the element
const MARGIN  = 16;   // min distance from any viewport edge (1rem)
const CARD_H  = 220;  // estimated card height for clamping

function buildSteps(isDesktop: boolean): TourStep[] {
  const common: TourStep[] = [
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
  ];

  if (isDesktop) {
    return [
      ...common,
      {
        id: 'nova-op',
        selector: '.tour-nova-op',
        title: 'Criar Nova OP',
        body: 'Neste painel você inicia uma nova Ordem de Produção: escolha o produto, a linha e o turno — depois confirme para começar.',
      },
      {
        id: 'concluidas',
        selector: '.tour-concluidas',
        title: 'OPs Concluídas',
        body: 'Quando uma OP é encerrada ela aparece aqui com quantidade produzida, reprocesso e paradas. Você pode editar ou reverter para pendente.',
      },
      {
        id: 'user-menu',
        selector: '.tour-user-menu',
        title: 'Painel de Usuário',
        body: 'No canto superior direito encontra a pílula de ações: altere sua senha ou faça logout com segurança. Pronto — agora você conhece tudo!',
      },
    ];
  }

  // Mobile flow: Welcome → Pendentes → Items → Concluídas → Barra inferior
  return [
    ...common,
    {
      id: 'concluidas',
      selector: '.tour-concluidas',
      title: 'OPs Concluídas',
      body: 'Quando uma OP é encerrada ela aparece aqui com quantidade produzida, reprocesso e paradas. Você pode editar ou reverter para pendente.',
      mobileTab: 'concluidas',
    },
    {
      id: 'tab-bar',
      selector: '.tour-tab-bar',
      title: 'Barra Inferior',
      body: 'Esta barra concentra tudo: veja o turno ativo à esquerda, crie uma Nova OP no centro e, à direita, altere sua senha ou saia da conta com segurança.',
    },
  ];
}

function measureElement(selector: string): SpotRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const r = el.getBoundingClientRect();
  return {
    top:    r.top    - PAD,
    left:   r.left   - PAD,
    right:  r.right  + PAD,
    bottom: r.bottom + PAD,
    width:  r.width  + PAD * 2,
    height: r.height + PAD * 2,
  };
}

/**
 * Computes where to anchor the tooltip card.
 * Uses only top/left/bottom/right (no CSS transform) so it never
 * conflicts with framer-motion's own transform pipeline.
 */
function computeCardPos(sr: SpotRect | null): CardPos {
  const W = typeof window !== 'undefined' ? window.innerWidth  : 400;
  const H = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Card width: fill screen minus two side margins, capped at 340 px
  const cardWidth = Math.min(340, W - MARGIN * 2);

  if (!sr) {
    // Centered welcome card — use absolute inside the fixed wrapper
    return {
      centered: true,
      placeAbove: false,
      style: {
        position: 'absolute',
        left:  Math.max(MARGIN, (W - cardWidth) / 2),
        width: cardWidth,
        top:   '50%',
        // We translate via framer-motion's y instead of CSS transform
      },
    };
  }

  // Horizontal: center card over the spotlight, clamped inside viewport
  const cx      = sr.left + sr.width / 2;
  const rawLeft = cx - cardWidth / 2;
  const left    = Math.max(MARGIN, Math.min(W - cardWidth - MARGIN, rawLeft));

  const spaceBelow = H - sr.bottom;
  const spaceAbove = sr.top;
  const placeAbove = spaceBelow < CARD_H && spaceAbove > spaceBelow;

  if (placeAbove) {
    // Anchor to bottom of card = top of spotlight - gap; clamp so card stays on screen
    const bottomAnchor = H - sr.top + 12;
    const clampedBottom = Math.min(bottomAnchor, H - CARD_H - MARGIN);
    return {
      centered: false,
      placeAbove: true,
      style: { position: 'fixed', bottom: Math.max(MARGIN, clampedBottom), left, width: cardWidth },
    };
  }

  // Anchor to top of card = bottom of spotlight + gap; clamp so card stays on screen
  const topAnchor = sr.bottom + 12;
  const clampedTop = Math.min(topAnchor, H - CARD_H - MARGIN);
  return {
    centered: false,
    placeAbove: false,
    style: { position: 'fixed', top: Math.max(MARGIN, clampedTop), left, width: cardWidth },
  };
}

// ─── Card content (shared between centered & positioned) ──────────────────────
function TourCard({
  step, steps, current, isLast, onFinish, handleNext,
}: {
  step: number;
  steps: TourStep[];
  current: TourStep;
  isLast: boolean;
  onFinish: () => void;
  handleNext: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-zinc-200/60 p-4 sm:p-5 flex flex-col gap-3 overflow-hidden">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 whitespace-nowrap">
            Passo {step + 1} de {steps.length}
          </p>
          <h3 className="text-sm sm:text-[15px] font-black text-zinc-950 leading-snug break-words">
            {current.title}
          </h3>
        </div>
        <button
          onClick={onFinish}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-zinc-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-zinc-950 rounded-full"
          initial={{ width: `${(step / steps.length) * 100}%` }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      {/* Body text */}
      <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed break-words whitespace-normal overflow-hidden">
        {current.body}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          onClick={onFinish}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors py-1 px-2 rounded-lg shrink-0"
        >
          Pular
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.97] text-white text-xs sm:text-sm font-black px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-zinc-950/20 shrink-0"
        >
          {isLast ? 'Concluir ✓' : 'Próximo'}
          {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TourOverlay({ isDesktop, setMobileTab, onFinish }: TourOverlayProps) {
  const [step, setStep] = useState(0);
  const [sr,   setSr]   = useState<SpotRect | null>(null);

  const steps   = buildSteps(isDesktop);
  const current = steps[step];
  const isLast  = step === steps.length - 1;

  const measure = useCallback(() => {
    if (!current.selector) { setSr(null); return; }
    setSr(measureElement(current.selector));
  }, [current.selector]);

  useEffect(() => {
    if (!isDesktop && current.mobileTab) setMobileTab(current.mobileTab);
    const delay = !isDesktop && current.mobileTab ? 400 : 80;
    const t = setTimeout(() => measure(), delay);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = () => measure();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [measure]);

  const handleNext = () => { if (isLast) onFinish(); else setStep(s => s + 1); };

  const { style, centered, placeAbove } = computeCardPos(sr);

  const cardProps = { step, steps, current, isLast, onFinish, handleNext };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">

      {/* ── Overlay / Spotlight ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!sr ? (
          <motion.div key="full"
            className="absolute inset-0 bg-black/65 backdrop-blur-[3px] pointer-events-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        ) : (
          <motion.div key="spot" className="absolute inset-0 pointer-events-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}>
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: 0, left: 0, right: 0, height: Math.max(0, sr.top) }} />
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: sr.bottom, left: 0, right: 0, bottom: 0 }} />
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: sr.top, left: 0, width: Math.max(0, sr.left), height: sr.height }} />
            <div className="absolute bg-black/65 backdrop-blur-[2px]"
              style={{ top: sr.top, left: sr.right, right: 0, height: sr.height }} />
            <div className="absolute rounded-2xl ring-2 ring-white/70 shadow-[0_0_0_5px_rgba(255,255,255,0.12)] pointer-events-none"
              style={{ top: sr.top, left: Math.max(0, sr.left), width: sr.width, height: sr.height }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tooltip card ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {centered ? (
          /* Welcome / no-selector: center vertically inside the fixed wrapper */
          <div key={`centered-${step}`}
            className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              className="w-full max-w-sm pointer-events-auto"
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <TourCard {...cardProps} />
            </motion.div>
          </div>
        ) : (
          /* Positioned: anchored to the spotlight element */
          <motion.div
            key={`card-${step}`}
            style={style}
            className="pointer-events-auto"
            initial={{ opacity: 0, scale: 0.93, y: placeAbove ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: placeAbove ? 6 : -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <TourCard {...cardProps} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
