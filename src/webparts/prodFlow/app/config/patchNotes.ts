// Release notes are app metadata (not domain data), so they live in code alongside APP_CONFIG.
export interface IPatchNote {
  version: string;
  date: string; // ISO date
  highlights: string[];
}

export const PATCH_NOTES: IPatchNote[] = [
  {
    version: "0.0.1",
    date: "2026-09-03",
    highlights: [
      "Novo cabeçalho com busca rápida (Ctrl+K), notificações, configurações e menu de usuário.",
      "Novo rodapé com versão, patch notes, relógio e identidade Oceaneering.",
      "Sidebar, cabeçalho e rodapé fixos — apenas a área de conteúdo rola.",
      "Conteúdo das páginas passa a ocupar toda a largura disponível.",
      "Correção do status sobreposto pela lista de estratégia (make/buy) nas tabelas.",
    ],
  },
];
