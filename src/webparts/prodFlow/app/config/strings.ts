export type Locale = "pt-BR" | "en";

// Shared UI strings. Screens are pt-BR first; keys are added as screens get localized.
const STRINGS: Record<Locale, { [key: string]: string }> = {
  "pt-BR": {
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.remove": "Remover",
    "common.edit": "Editar",
    "common.add": "Adicionar",
    "common.close": "Fechar",
    "common.search": "Buscar...",
    "common.loading": "Carregando...",
    "common.empty": "Nada por aqui",
    "common.all": "Todos",
    "common.error": "Algo deu errado",
    "common.retry": "Tentar novamente",
    "common.download": "Baixar",
    "nav.dashboard": "Dashboard",
    "nav.notifications": "Notificações",
    "nav.requests": "Requests (FIDs)",
    "nav.configuration": "Configuration",
    "nav.members": "Members Management",
    "fid.overview": "Visão Geral",
    "fid.subItems": "Sub-itens",
    "fid.budget": "Orçamento",
    "fid.approval": "Aprovação",
    "fid.production": "Produção",
    "fid.quality": "Qualidade",
    "fid.attachments": "Anexos",
  },
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.remove": "Remove",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.close": "Close",
    "common.search": "Search...",
    "common.loading": "Loading...",
    "common.empty": "Nothing here",
    "common.all": "All",
    "common.error": "Something went wrong",
    "common.retry": "Try again",
    "common.download": "Download",
    "nav.dashboard": "Dashboard",
    "nav.notifications": "Notifications",
    "nav.requests": "Requests (FIDs)",
    "nav.configuration": "Configuration",
    "nav.members": "Members Management",
    "fid.overview": "Overview",
    "fid.subItems": "Sub-items",
    "fid.budget": "Budget",
    "fid.approval": "Approval",
    "fid.production": "Production",
    "fid.quality": "Quality",
    "fid.attachments": "Attachments",
  },
};

export const DEFAULT_LOCALE: Locale = "pt-BR";

export function translate(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return STRINGS[locale]?.[key] ?? STRINGS[DEFAULT_LOCALE][key] ?? key;
}
