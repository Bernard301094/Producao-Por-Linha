import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, MoveHorizontal } from 'lucide-react';

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
const CARD_H  = 280;  // estimated card height for clamping

function buildSteps(isDesktop: boolean): TourStep[] {
  const common: TourStep[] = [
    {
      id: 'welcome',
      selector: null,
      title: 'Bem-vindo ao Diário de Bordo! 👋',
      body: 'O Diário de Bordo é o centro de controle da sua linha de produção. Aqui você registra Ordens de Produção (OPs), acompanha o andamento em tempo real, documenta paradas e gera o relatório do turno automaticamente.\n\nEste tour vai guiar você pelos principais painéis da aplicação em menos de 1 minuto.',
    },
    {
      id: 'pendentes',
      selector: '.tour-pendentes',
      title: 'OPs em Andamento',
      body: 'Este painel exibe todas as Ordens de Produção abertas do seu turno. Cada card mostra o número da OP, o produto, a linha e um cronômetro ao vivo atualizado a cada segundo.\n\nVocê pode pesquisar por produto ou linha usando a barra de busca e filtrar por linha específica pelo botão de filtro.',
      mobileTab: 'pendentes',
    },
    {
      id: 'pendentes-items',
      selector: '.tour-pendentes-items',
      title: 'Interaja com cada OP',
      body: 'Toque em qualquer card para expandi-lo. Dentro do card expandido você pode:\n\n• Registrar uma Parada (tipo, horário e detalhe opcional)\n• Ver o histórico de paradas já registradas\n• Finalizar a OP informando quantidade produzida e reprocesso\n\nTodas as ações são sincronizadas com a nuvem em tempo real.',
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
        body: 'Neste painel lateral você inicia uma nova Ordem de Produção. Selecione o Produto da lista cadastrada, informe a Linha de Produção e confirme o Turno.\n\nA hora de início é preenchida automaticamente com o horário atual. Ao confirmar, a OP aparece imediatamente no painel Pendentes.',
      },
      {
        id: 'concluidas',
        selector: '.tour-concluidas',
        title: 'OPs Concluídas',
        body: 'Quando uma OP é finalizada, ela migra para este painel com todos os dados: quantidade produzida, reprocesso, duração total e histórico de paradas.\n\nVocê pode editar qualquer campo caso tenha inserido um dado errado, ou reverter a OP para Pendente se precisar corrigir alguma parada.',
      },
      {
        id: 'user-menu',
        selector: '.tour-user-menu',
        title: 'Painel de Usuário',
        body: 'Na pílula de ações no canto superior direito você encontra:\n\n• Botão de Chave — altera sua senha com segurança\n• Botão Sair — encerra a sessão atual\n\nPronto — agora você conhece todos os painéis do Diário de Bordo. Bom turno!',
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
      body: 'Quando uma OP é finalizada, ela migra para este painel com quantidade produzida, reprocesso, duração total e histórico de paradas.\n\nVocê pode editar qualquer campo ou reverter a OP de volta para Pendente caso precise fazer uma correção.',
      mobileTab: 'concluidas',
    },
    {
      id: 'tab-bar',
      selector: '.tour-tab-bar',
      title: 'Barra Inferior',
      body: 'Esta barra flutuante concentra tudo que você precisa:\n\n• Esquerda — exibe o seu Turno ativo\n• Centro — botão Nova OP para criar uma ordem\n• Direita — Alterar Senha e Sair da conta\n\nPronto — agora você conhece tudo! Bom turno!',
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
    <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-zinc-200/60 p-5 flex flex-col gap-4 overflow-hidden max-h-[85dvh]">

      {/* Header — shrink-0 so it never collapses */}
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 whitespace-nowrap">
            Passo {step + 1} de {steps.length}
          </p>
          <h3 className="text-sm sm:text-base font-black text-zinc-950 leading-snug break-words">
            {current.title}
          </h3>
        </div>
        <button
          onClick={onFinish}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar — shrink-0 */}
      <div className="h-1 bg-zinc-100 rounded-full overflow-hidden shrink-0">
        <motion.div
          className="h-full bg-zinc-950 rounded-full"
          initial={{ width: `${(step / steps.length) * 100}%` }}
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Body text — flex-1 + min-h-0 forces scroll BEFORE pushing buttons out */}
      <p className="flex-1 min-h-0 overflow-y-auto text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed break-words whitespace-pre-line pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200">
        {current.body}
      </p>

      {/* Actions — shrink-0 so buttons are always visible */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-100 shrink-0">
        <button
          onClick={onFinish}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors py-2 px-3 rounded-xl hover:bg-zinc-50 shrink-0"
        >
          Pular tour
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 active:scale-[0.97] text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-2xl transition-all shadow-lg shadow-zinc-950/25 shrink-0"
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

      {/* ── Swipe hint — pendentes-items step only ────────────────────── */}
      <AnimatePresence>
        {current.id === 'pendentes-items' && sr && (
          <motion.div
            key="swipe-hint"
            className="fixed pointer-events-none"
            style={{
              top:   (sr.top + sr.bottom) / 2 - 22,
              left:  sr.left,
              width: sr.width,
              zIndex: 10000,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.55, duration: 0.3 }}
          >
            {/* centering wrapper — no transform, uses flexbox */}
            <div className="flex justify-center">
              <motion.div
                className="flex items-center gap-2 bg-white/92 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-xl ring-1 ring-zinc-200/60"
                animate={{ x: [-38, 38, -38] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <MoveHorizontal className="w-5 h-5 text-zinc-700 shrink-0" />
                <span className="text-xs font-black text-zinc-700 whitespace-nowrap">Deslize o card</span>
              </motion.div>
            </div>
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
