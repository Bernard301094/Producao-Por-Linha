<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="GHBanner" width="1200" height="475" />
</div>

# Apontamento de Produção por Linha (Vonixx)

Um aplicativo profissional para gestão, controle e apontamento produtivo industrial desenvolvido nativamente para atender às necessidades produtivas das linhas de produção da Vonixx. O aplicativo visa substituir controles manuais por uma interface digital dinâmica e em tempo real.

## 📝 Descrição do Projeto

Este sistema gerencia e otimiza o registro das Ordens de Produção (OPs) pelas equipes da fábrica. O fluxo principal contempla a inicialização das OPs, acompanhamento das operações pendentes e a conclusão da produção com informações detalhadas (quantidade produzida, reprocessos, horários, litros e referências de turno). Todo o controle se comunica de maneira nativa com o **Firebase** para persistência em nuvem e conta com uma robusta sincronização de controle via integração com **OneDrive/Spreadsheets**.

## 🚀 Principais Funcionalidades

- **Dashboard Produtivo:** Visão em tempo real das operações Pendentes e Concluídas com filtros de busca dinâmicos para a agilidade do operador.
- **Controle de Turnos e Segurança Estritos:** Gerenciamento, bloqueios e permissões de operações atrelados logicamente ao turno logado, garantindo compliance ao longo de processos que entram na madrugada.
- **Sincronização em Nuvem Dupla:** Os dados são persistidos no Firebase Firestore permitindo um ambiente multi-dispositivo seguro e em tempo real no chão de fábrica, possuindo também fluxos para APIs corporativas.
- **Relatórios Resumo:** Geração rápida e acompanhamento em interfaces dedicadas do total de unidades e litragem, filtrada por dia e turno.
- **Cross-Platform:** Construído estruturalmente para Web e adaptável de forma híbrida e otimizada para os tablets, smartphones e painéis.
- **UX/UI Industrial Embasada:** Interface desenhada seguindo as melhores práticas visuais (foco claro, fontes legíveis, contraste rígido) criada com React, Tailwind CSS e micro-animações, auxiliando em operação diária intensa.

## 🛠️ Tecnologias Utilizadas

**Frontend:**
- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/) (Arquitetura de componentes)
- [Lucide React](https://lucide.dev/) (Ícones vetorizados)
- [React Hook Form](https://react-hook-form.com/) (Para controle ágil de dados gerados)

**Backend e Dados:**
- [Node/Express](https://expressjs.com/) (Motor para API backend)
- [Firebase Firestore](https://firebase.google.com/docs/firestore) (Configuração Serverless com suporte offline para resiliência no piso de fábrica)
- [Google Web & APIs Azure Identity](https://github.com/Azure/azure-sdk-for-js) (Integrações para sync de nuvens corporativas)

## 📦 Instalação e Execução Local

**Pré-requisitos fundamentais:** Node.js v18 ou superior.

1. Baixe os arquivos fontes do projeto.
2. Instale as dependências usando NPM:
   ```bash
   npm install
   ```
3. Certifique-se de configurar ou solicitar as variáveis de ambiente necessárias (`.env.local` e definições do Firebase).
4. Inicie o modo de desenvolvimento:
   ```bash
   npm run dev
   ```

## 📜 Licença e Termos de Uso Exclusivo

O uso deste software está sob a norma da **Licença MIT (Modificada para Uso Privado)**.

- **Autor e Criador:** Bernard Eduardo De Freitas Castillo.
- **Uso Restrito Corporativo:** Este aplicativo é autorizado **exclusivamente e estritamente** para implantação, uso na produção e fluxos operacionais internos da empresa **Vonixx**.
- Sob os termos definidos, é legalmente proibido seu uso, adaptação comercial aberta, venda, ou distribuição por terceiros fora da Vonixx.
- Para verificar os termos completos de uso e termos de takesenção de danos de informação, consulte diretamente o arquivo [`LICENSE`](./LICENSE.md) documentado na raiz deste sistema.
