// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Joyride, STATUS, Step, EVENTS, ACTIONS } from 'react-joyride';

type MobileTab = 'pendentes' | 'nova' | 'concluidas';

interface Props {
  run: boolean;
  onFinish: () => void;
  onStepChange?: (data: any) => void;
  onSwitchTab?: (tab: MobileTab) => void;
}

// Map cada índice de passo à aba mobile correspondente.
// null = sem troca de aba necessária
const STEP_TAB_MAP: Record<number, MobileTab | null> = {
  0: null,           // body center – welcome
  1: null,           // .tour-user-menu – sempre visível no header
  2: 'nova',         // .tour-nova-op
  3: 'nova',         // .tour-nova-op-form (usa .tour-nova-op como target em mobile)
  4: 'pendentes',    // .tour-pendentes
  5: 'pendentes',    // .tour-pendentes-items
  6: 'concluidas',   // .tour-concluidas
  7: null,           // body center – visualizando concluidas
  8: null,           // body center – fim do turno
  9: null,           // .tour-tab-bar – sempre visível em mobile
};

const TAB_SWITCH_DELAY = 400;

export const OnboardingTour: React.FC<Props> = ({ run, onFinish, onStepChange, onSwitchTab }) => {
  const [joyrideRun, setJoyrideRun] = useState(run);

  // FIX 1: isNarrowScreen reativo — recalcula no resize
  const [isNarrowScreen, setIsNarrowScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  useEffect(() => {
    const handleResize = () => setIsNarrowScreen(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FIX 2: guard anti-loop — guarda qual step já teve a aba trocada
  const switchedForStepRef = useRef<number | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza joyrideRun com a prop run
  useEffect(() => {
    setJoyrideRun(run);
    if (!run) {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      switchedForStepRef.current = null;
    }
  }, [run]);

  // FIX 3: steps com target adaptado para mobile no passo 3
  // Em telas < 1024px o target .tour-nova-op-form fica dentro de overflow:hidden
  // então usamos .tour-nova-op (container pai já visível) para evitar tooltip cortado.
  // Os textos são IDÊNTICOS ao original — só o target e placement mudam em mobile.
  const getMobileAdjustedSteps = (narrow: boolean): Step[] => [
    {
      target: 'body',
      placement: 'center',
      title: 'Bem-vindo(a) ao Onboarding!',
      content: 'Vamos dar uma volta rápida pelo aplicativo. Este tutorial guiado mostrará detalhadamente todas as funcionalidades para que você esteja pronto para usar o sistema de OPs.',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: '.tour-user-menu',
      title: 'Menu do Perfil (Login/Logout)',
      content: 'Aqui você visualiza quem está logado. Pode clicar para fazer Logout ou Alterar a sua Senha (o ícone de chave). Caso troque sua senha, não passe a nova senha para outras pessoas!',
      placement: 'auto',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: '.tour-nova-op',
      title: 'Criando uma Nova OP',
      content: 'Este é o card onde toda operação começa. Você informa a Máquina/Linha, o Produto e o Horário Inicial. O turno será selecionado automaticamente (ou ajustado dependendo do seu perfil).',
      placement: 'auto',
      showProgress: true,
      showSkipButton: true,
    },
    {
      // Em mobile, .tour-nova-op-form está dentro de overflow:hidden — usa o pai como target
      target: narrow ? '.tour-nova-op' : '.tour-nova-op-form',
      placement: narrow ? 'bottom' : 'auto',
      title: 'Dicas de Preenchimento (Nova OP)',
      content: 'O produto sugerido aparece conforme você digita. A "Litragem" é calculada automaticamente se estiver no nome do produto. Clicando em "Iniciar Operação", um modal de confirmação aparece.',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: '.tour-pendentes',
      title: 'OPs Pendentes',
      content: 'Assim que iniciada, a OP vem para cá. Fica em andamento enquanto você trabalha nela.',
      placement: 'auto',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: '.tour-pendentes-items',
      title: 'Ações nas Pendentes',
      content: 'Expanda o card da Pendente para: Adicionar Paradas (registrando horários/motivos se a linha parou), Editar informações caso tenha digitado errado, ou Excluir a OP (na lixeirinha). Quando acabar o processo, clique em "Concluir OP" e preencha a Quantidade produzida, Reprocesso (se houver) e clique no ✓.',
      placement: 'auto',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: '.tour-concluidas',
      title: 'OPs Concluídas',
      content: 'Depois de finalizada, sua OP migra para esta coluna e fica salva automaticamente.',
      placement: 'auto',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: 'body',
      placement: 'center',
      title: 'Visualizando Concluídas',
      content: 'Em cada OP Concluída, você ainda pode visualizá-la, ou Reverter (ícone amarelo de "desfazer") se precisar mandar de volta aos Pendentes porque faltou lançar alguma coisa.',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: 'body',
      placement: 'center',
      title: 'Fim do Turno & Supervisor',
      content: 'Fique atento ao relógio: se você tentar criar, editar ou apagar uma OP fora do seu horário de Turno (ou na janela de tolerância de 5 minutos), o sistema exigirá a "Senha do Supervisor" num modal vermelho.',
      showProgress: true,
      showSkipButton: true,
    },
    {
      target: '.tour-tab-bar',
      title: 'Navegação no Celular',
      content: 'Por fim, se estiver usando pelo smartphone, esta barra na parte inferior é onde você troca as telas (Pendentes, Nova OP e Concluídas). E pronto, você é oficialmente um operador treinado e apto a utilizar a ferramenta! 🎉',
      placement: 'top',
      showProgress: true,
      showSkipButton: true,
    },
  ];

  const steps = getMobileAdjustedSteps(isNarrowScreen);

  const handleJoyrideCallback = (data: any) => {
    const { status, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Sempre encaminha o evento ao App
    onStepChange?.(data);

    if (finishedStatuses.includes(status)) {
      onFinish();
      return;
    }

    // Quando o usuário avança/volta, limpa o guard para o próximo step
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      switchedForStepRef.current = null;
      return;
    }

    // Intercepta STEP_BEFORE em telas estreitas
    // Guard: só age se ainda NÃO tratamos este step — evita loop infinito
    if (
      isNarrowScreen &&
      type === EVENTS.STEP_BEFORE &&
      onSwitchTab &&
      switchedForStepRef.current !== index
    ) {
      const targetTab = STEP_TAB_MAP[index] ?? null;

      if (targetTab !== null) {
        // Marca ANTES de pausar — impede re-entrada
        switchedForStepRef.current = index;

        setJoyrideRun(false);
        onSwitchTab(targetTab);

        pendingTimerRef.current = setTimeout(() => {
          pendingTimerRef.current = null;
          setJoyrideRun(true);
        }, TAB_SWITCH_DELAY);

        return;
      }

      // Sem troca necessária: marca como tratado
      switchedForStepRef.current = index;
    }
  };

  const isMobile = isNarrowScreen;

  return (
    <Joyride
      steps={steps}
      run={joyrideRun}
      continuous
      scrollToFirstStep
      disableScrolling={false}
      disableScrollParentFix={true}
      scrollOffset={isMobile ? 80 : 120}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#09090b',
          zIndex: 10000,
          backgroundColor: '#ffffff',
          textColor: '#27272a',
          arrowColor: '#ffffff',
        },
        tooltip: {
          borderRadius: 24,
          padding: isMobile ? 16 : 20,
          width: isMobile ? 'calc(100vw - 32px)' : 420,
          maxWidth: '100vw',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        },
        tooltipTitle: {
          fontSize: isMobile ? 18 : 22,
          fontWeight: 900,
          textAlign: 'left',
          marginBottom: 8,
          lineHeight: 1.2,
          letterSpacing: '-0.025em',
        },
        tooltipContent: {
          fontSize: isMobile ? 14 : 15,
          textAlign: 'left',
          padding: 0,
          lineHeight: 1.5,
          wordBreak: 'break-word',
        },
        buttonNext: {
          backgroundColor: '#09090b',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 800,
          padding: '10px 20px',
        },
        buttonBack: {
          marginRight: 10,
          color: '#71717a',
          fontSize: 14,
          fontWeight: 700,
        },
        buttonSkip: {
          color: '#71717a',
          fontSize: 14,
          fontWeight: 600,
        }
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
};
