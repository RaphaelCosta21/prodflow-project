import * as React from "react";
import { DEFAULT_LOCALE, Locale, translate } from "../config/strings";
import { useSpfxContext } from "../config/SpfxContext";

export interface ITranslation {
  locale: Locale;
  t: (key: string) => string;
}

// Locale comes from the SharePoint page context; pt-BR is the primary language.
export function useTranslation(): ITranslation {
  const ctx = useSpfxContext();
  const locale: Locale = React.useMemo(() => {
    const cultureName =
      ctx.pageContext.cultureInfo?.currentUICultureName ?? DEFAULT_LOCALE;
    return cultureName.toLowerCase().indexOf("pt") === 0 ? "pt-BR" : "en";
  }, [ctx]);

  return React.useMemo(
    () => ({ locale, t: (key: string) => translate(key, locale) }),
    [locale],
  );
}

export default useTranslation;
