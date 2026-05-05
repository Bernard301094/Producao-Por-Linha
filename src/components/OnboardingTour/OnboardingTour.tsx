// @ts-nocheck
import React, { useState } from 'react';
import { Joyride, STATUS, Step } from 'react-joyride';

interface Props {
  run: boolean;
  onFinish: () => void;
  onStepChange?: (data: any) => void;
}

export const OnboardingTour: React.FC<Props> = ({ run, onFinish, onStepChange }) => {
  const [steps] = useState<Step[]>([
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
      target: '.tour-nova-op-form',
      title: 'Dicas de Preenchimento (Nova OP)',
      content: 'O produto sugerido aparece conforme você digita. A "Litragem" é calculada automaticamente se estiver no nome do produto. Clicando em "Iniciar Operação", um modal de confirmação aparece.',
      placement: 'auto',
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
  ]);

  const handleJoyrideCallback = (data: any) => {
    const { status, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    onStepChange?.(data);

    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <Joyride
      steps={steps}
      run={run}
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

