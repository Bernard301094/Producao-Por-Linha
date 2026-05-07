import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Joyride, STATUS, EVENTS, CallBackProps, Step } from 'react-joyride';

// ─── Breakpoint ─────────────────────────────────────────────────────────────────
const isMobileOrTablet = () =>
  typeof window !== 'undefined' && window.innerWidth < 1024;

type PlacementType =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end'
  | 'auto' | 'center';

// ─── Shared portal state ─────────────────────────────────────────────────────────
type PortalState = {
  index: number;
  size: number;
  isLastStep: boolean;
  title: React.ReactNode;
  content: React.ReactNode;
  // Full Joyride prop objects so the portal buttons fire native Joyride actions
  backProps: React.HTMLAttributes<HTMLButtonElement>;
  primaryProps: React.HTMLAttributes<HTMLButtonElement>;
  closeProps: React.HTMLAttributes<HTMLButtonElement>;
} | null;

let _setPortalState: ((s: PortalState) => void) | null = null;

// ─── Portal — renders bottom-sheet directly in document.body ────────────────────
const PortalBottomSheet: React.FC = () => {
  const [state, setState] = useState<PortalState>(null);

  useEffect(() => {
    _setPortalState = setState;
    return () => { _setPortalState = null; };
  }, []);

  if (!state) return null;

  const { index, size, isLastStep, title, content, backProps, primaryProps, closeProps } = state;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10001,
      }}
      className="bg-white ring-1 ring-zinc-200/60 overflow-hidden rounded-t-[1.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
    >
      {/* Pill handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-zinc-300" />
      </div>

      {/* Header */}
      <div className="bg-zinc-950 relative overflow-hidden px-5 pt-3 pb-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:14px_14px] opacity-20" />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
            Passo {index + 1} de {size}
          </p>
          {title && (
            <h3 className="font-black text-white tracking-tight leading-tight text-base">
              {title}
            </h3>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-3 max-h-[38vh] overflow-y-auto">
        <div className="text-sm text-zinc-600 font-medium leading-relaxed">
          {content}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 py-2">
        {Array.from({ length: size }).map((_: unknown, i: number) => (
          <div
            key={i}
            className={`rounded-full transition-all ${
              i === index ? 'w-4 h-2 bg-zinc-950' : 'w-2 h-2 bg-zinc-200'
            }`}
          />
        ))}
      </div>

      {/* Footer — spread full Joyride props so onClick fires the real Joyride action */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-100"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          {...closeProps}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors uppercase tracking-widest focus:outline-none py-1"
        >
          Pular
        </button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="h-10 px-4 rounded-xl text-xs font-black text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors focus:outline-none"
            >
              ← Anterior
            </button>
          )}
          <button
            {...primaryProps}
            className="h-10 px-5 rounded-xl text-xs font-black text-white bg-zinc-950 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-950/20 focus:outline-none"
          >
            {isLastStep ? '✓ Entendido!' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── CustomTooltip — invisible on mobile (portal handles it), full card on desktop ──
const CustomTooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  size,
  isLastStep,
}: any) => {
  const isSmall = isMobileOrTablet();

  // Every render: push current props to the portal
  useEffect(() => {
    if (!_setPortalState) return;
    if (isSmall) {
      _setPortalState({
        index,
        size,
        isLastStep,
        title: step.title,
        content: step.content,
        backProps,
        primaryProps,
        closeProps,
      });
    } else {
      _setPortalState(null);
    }
  });

  // On mobile: 0-size invisible placeholder so Joyride stays happy
  if (isSmall) {
    return (
      <div
        {...tooltipProps}
        style={{ width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />
    );
  }

  // Desktop: full inline card
  return (
    <div
      {...tooltipProps}
      style={{ fontFamily: 'inherit', maxWidth: 380, width: 'min(calc(100vw - 2rem), 380px)' }}
      className="bg-white ring-1 ring-zinc-200/60 overflow-hidden rounded-2xl"
    >
      <div className="bg-zinc-950 relative overflow-hidden px-5 pt-5 pb-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:14px_14px] opacity-20" />
        <div className="relative z-10">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
            Passo {index + 1} de {size}
          </p>
          {step.title && (
            <h3 className="font-black text-white tracking-tight leading-tight text-lg">
              {step.title}
            </h3>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="text-sm text-zinc-600 font-medium leading-relaxed">
          {step.content}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 py-2">
        {Array.from({ length: size }).map((_: unknown, i: number) => (
          <div
            key={i}
            className={`rounded-full transition-all ${
              i === index ? 'w-4 h-2 bg-zinc-950' : 'w-2 h-2 bg-zinc-200'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-100">
        <button
          {...closeProps}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors uppercase tracking-widest focus:outline-none py-1"
        >
          Pular
        </button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="h-10 px-4 rounded-xl text-xs font-black text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors focus:outline-none"
            >
              ← Anterior
            </button>
          )}
          <button
            {...primaryProps}
            className="h-10 px-5 rounded-xl text-xs font-black text-white bg-zinc-950 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-950/20 focus:outline-none"
          >
            {isLastStep ? '✓ Entendido!' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Resolve target ──────────────────────────────────────────────────────────────
const resolveTarget = (selector: string): string => {
  if (selector === 'body') return 'body';
  if (typeof document === 'undefined') return 'body';
  return document.querySelector(selector) ? selector : 'body';
};

// ─── Step definitions ────────────────────────────────────────────────────────────
const STEP_DEFS = [
  {
    target: 'body',
    desktopPlacement: 'center' as PlacementType,
    title: '👋 Bem-vindo ao Diário de Bordo!',
    content: (
      <div className="space-y-3">
        <p>Este é o sistema de controle de produção da linha. Aqui você{' '}
          <strong className="text-zinc-900">registra, acompanha e encerra</strong> as Ordens de Produção (OPs) do seu turno.
        </p>
        <p className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-500">
          💡 Este tour rápido vai te mostrar como usar cada parte da tela. Leva menos de 2 minutos!
        </p>
      </div>
    ),
  },
  {
    target: 'header',
    desktopPlacement: 'bottom' as PlacementType,
    title: '🗓️ Cabeçalho — Data e Turno',
    content: (
      <div className="space-y-2">
        <p>O cabeçalho mostra o <strong className="text-zinc-900">nome do sistema</strong> e a{' '}
          <strong className="text-zinc-900">data de hoje</strong>. Ele fica fixo no topo.
        </p>
        <p>O botão{' '}
          <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">✏️ Produtos</span>{' '}
          permite cadastrar, editar ou remover produtos do sistema.
        </p>
      </div>
    ),
  },
  {
    target: '.tour-user-menu',
    desktopPlacement: 'bottom-end' as PlacementType,
    title: '🔑 Menu do Usuário',
    content: (
      <div className="space-y-2">
        <p>Aqui ficam as opções da sua conta:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="mt-0.5">🔐</span>
            <span><strong className="text-zinc-900">Senha:</strong> altere a senha do seu perfil de turno.</span>
          </li>
          <li className="flex items-start gap-2"><span className="mt-0.5">🚪</span>
            <span><strong className="text-zinc-900">Sair:</strong> encerra a sessão e volta ao login.</span>
          </li>
        </ul>
        <p className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-700">
          ⚠️ Ao sair, as OPs pendentes continuam salvas.
        </p>
      </div>
    ),
  },
  {
    target: '.tour-tab-bar',
    desktopPlacement: 'top' as PlacementType,
    title: '📱 Navegação — Três Abas',
    content: (
      <div className="space-y-2">
        <p>Na barra inferior você navega entre as seções:</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-sm shrink-0">📋</span>
            <span><strong className="text-zinc-900">Pendentes:</strong> OPs em produção agora.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-sm shrink-0">➕</span>
            <span><strong className="text-zinc-900">Nova OP:</strong> formulário para abrir uma nova Ordem de Produção.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center text-sm shrink-0">✅</span>
            <span><strong className="text-zinc-900">Concluídas:</strong> OPs já encerradas e enviadas à planilha.</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    target: '.tour-nova-op',
    desktopPlacement: 'right' as PlacementType,
    title: '➕ Nova OP — Abrir uma Produção',
    content: (
      <div className="space-y-2.5">
        <p>Use este painel para{' '}
          <strong className="text-zinc-900">registrar o início</strong> de uma nova Ordem de Produção.
        </p>
        <ul className="space-y-1.5 text-sm">
          <li>📄 <strong className="text-zinc-900">Nº da OP</strong> — número da ordem no sistema.</li>
          <li>📦 <strong className="text-zinc-900">Produto</strong> — busque ou adicione um novo.</li>
          <li>🏭 <strong className="text-zinc-900">Linha</strong> — linha de produção onde a OP roda.</li>
          <li>🕐 <strong className="text-zinc-900">Hora Inicial</strong> — quando a produção começou.</li>
        </ul>
        <p className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-zinc-500">
          💡 O turno é detectado automaticamente pelo horário de início.
        </p>
      </div>
    ),
  },
  {
    target: '.tour-nova-op-form',
    desktopPlacement: 'right' as PlacementType,
    title: '📝 Iniciar ou Registrar Paradas',
    content: (
      <div className="space-y-2.5">
        <p>Após preencher os campos, toque em{' '}
          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">▶ Iniciar OP</span>.
          Uma tela de confirmação mostrará os dados antes de salvar.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
          <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Parada Avulsa</p>
          <p className="text-xs text-blue-600">
            Se a linha parou sem produzir nada, use <strong>"Registrar Paradas"</strong> para apontar o motivo sem criar uma OP.
          </p>
        </div>
      </div>
    ),
  },
  {
    target: '.tour-pendentes',
    desktopPlacement: 'left' as PlacementType,
    title: '📋 Pendentes — OPs em Andamento',
    content: (
      <div className="space-y-2.5">
        <p>Aqui aparecem todas as OPs{' '}
          <strong className="text-zinc-900">em andamento</strong> do seu turno.
        </p>
        <p className="text-xs bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-zinc-500">
          🔍 Use a barra de pesquisa ou filtros de linha para encontrar uma OP rapidamente.
        </p>
      </div>
    ),
  },
  {
    target: '.tour-pendentes-items',
    desktopPlacement: 'left' as PlacementType,
    title: '👆 Como Encerrar uma OP',
    content: (
      <div className="space-y-2.5">
        <p>Em cada card de OP pendente você pode:</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2"><span className="mt-0.5 text-base">👉</span>
            <span><strong className="text-zinc-900">Arrastar para a direita</strong> — abre o painel de encerramento.</span>
          </li>
          <li className="flex items-start gap-2"><span className="mt-0.5 text-base">👈</span>
            <span><strong className="text-zinc-900">Arrastar para a esquerda</strong> — editar ✏️ ou excluir 🗑️.</span>
          </li>
          <li className="flex items-start gap-2"><span className="mt-0.5 text-base">🛑</span>
            <span>Dentro do card, registre <strong className="text-zinc-900">paradas</strong> com motivo e horário.</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    target: '.tour-concluidas',
    desktopPlacement: 'left' as PlacementType,
    title: '✅ Concluídas — Histórico do Turno',
    content: (
      <div className="space-y-2.5">
        <p>Aqui ficam as OPs já encerradas,{' '}
          <strong className="text-zinc-900">sincronizadas automaticamente</strong> com a planilha do OneDrive.
        </p>
        <ul className="space-y-1.5 text-sm">
          <li>✅ <strong className="text-zinc-900">Verde</strong> — sincronizada com sucesso.</li>
          <li>⏳ <strong className="text-zinc-900">Amarelo</strong> — aguardando sincronização.</li>
          <li>❌ <strong className="text-zinc-900">Vermelho</strong> — erro. Toque para tentar novamente.</li>
        </ul>
      </div>
    ),
  },
  {
    target: 'body',
    desktopPlacement: 'center' as PlacementType,
    title: '🎉 Pronto para Começar!',
    content: (
      <div className="space-y-3">
        <p>Agora você já sabe como usar o{' '}
          <strong className="text-zinc-900">Diário de Bordo</strong>. Qualquer dúvida, toque no
          ícone <strong className="text-zinc-900">?</strong> no cabeçalho para rever este tutorial.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: '➕', title: 'Nova OP', desc: 'Abre a produção' },
            { icon: '✅', title: 'Encerrar', desc: 'Arraste p/ direita' },
            { icon: '🛑', title: 'Paradas', desc: 'Motivo + Horário' },
            { icon: '📊', title: 'Planilha', desc: 'Sinc. automática' },
          ].map((item) => (
            <div key={item.title} className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-center">
              <p className="text-base mb-0.5">{item.icon}</p>
              <p className="font-black text-zinc-700 text-[11px]">{item.title}</p>
              <p className="text-zinc-400 text-[10px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// ─── Build Joyride steps ─────────────────────────────────────────────────────────────
const buildSteps = (): Step[] => {
  const small = isMobileOrTablet();
  return STEP_DEFS.map((def) => {
    const domTarget = resolveTarget(def.target);
    const placement: PlacementType =
      domTarget === 'body' && def.target !== 'body'
        ? 'center'
        : small
        ? 'bottom'
        : def.desktopPlacement;
    return {
      target: domTarget,
      placement,
      disableBeacon: true,
      title: def.title,
      content: def.content,
    };
  });
};

// ─── Joyride styles ─────────────────────────────────────────────────────────────
const joyrideStyles = {
  options: {
    arrowColor: '#18181b',
    backgroundColor: 'transparent',
    overlayColor: 'rgba(0,0,0,0.55)',
    zIndex: 9999,
  },
  spotlight: { borderRadius: 20 },
};

const TOUR_STORAGE_KEY = 'diario-bordo-tour-done-v1';

// ─── Main component ───────────────────────────────────────────────────────────────
interface OnboardingTourProps {
  forceRun?: boolean;
  onFinish?: () => void;
  onStepChange?: (index: number) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  forceRun = false,
  onFinish,
  onStepChange,
}) => {
  const [run, setRun] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const [steps, setSteps] = useState<Step[]>(() => buildSteps());

  const startTour = useCallback(() => {
    setSteps(buildSteps());
    setTourKey((prev) => prev + 1);
    setRun(true);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
      const t = setTimeout(startTour, 900);
      return () => clearTimeout(t);
    }
  }, [startTour]);

  useEffect(() => {
    if (forceRun) startTour();
  }, [forceRun, startTour]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, index, type } = data;
      if (type === EVENTS.STEP_AFTER) {
        onStepChange?.(index + 1);
      }
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        _setPortalState?.(null);
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
        setRun(false);
        onFinish?.();
      }
    },
    [onFinish, onStepChange]
  );

  return (
    <>
      <PortalBottomSheet />
      <Joyride
        key={tourKey}
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        scrollOffset={80}
        showProgress={false}
        showSkipButton={false}
        disableOverlayClose={false}
        disableScrollParentFix={false}
        spotlightClicks={false}
        tooltipComponent={CustomTooltip}
        styles={joyrideStyles}
        locale={{
          back: 'Anterior',
          close: 'Fechar',
          last: 'Entendido!',
          next: 'Próximo',
          open: 'Abrir',
          skip: 'Pular',
        }}
        callback={handleCallback}
      />
    </>
  );
};

export function resetTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}
