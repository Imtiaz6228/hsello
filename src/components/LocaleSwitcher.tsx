import { useState } from "react";
import { Check, ChevronRight, Coins, Globe2, X } from "lucide-react";
import { currencies, languages, useLocale, type CurrencyCode, type LocaleCode } from "../i18n/LocaleContext";

export function LocaleSwitcher() {
  const { locale, currency, setLocale, setCurrency, t } = useLocale();
  const [open, setOpen] = useState(false);
  return <>
    <button className="locale-trigger" type="button" onClick={() => setOpen(true)} aria-label="Language and currency"><Globe2 size={16} /><span>{languages.find((item) => item.code === locale)?.flag}</span><b>{currency}</b></button>
    {open ? <div className="locale-overlay" onClick={() => setOpen(false)}><aside className="locale-drawer" onClick={(event) => event.stopPropagation()}>
      <header><div><span className="section-index">GLOBAL MARKETPLACE</span><h2>Language & currency</h2></div><button onClick={() => setOpen(false)}><X /></button></header>
      <section><h3><Globe2 /> {t("language")}</h3><div className="locale-options">{languages.map((item) => <button className={locale === item.code ? "active" : ""} key={item.code} onClick={() => setLocale(item.code as LocaleCode)}><span>{item.flag}</span><div><strong>{item.native}</strong><small>{item.label}</small></div>{locale === item.code ? <Check /> : <ChevronRight />}</button>)}</div></section>
      <section><h3><Coins /> {t("currency")}</h3><div className="currency-options">{currencies.map((item) => <button className={currency === item.code ? "active" : ""} key={item.code} onClick={() => setCurrency(item.code as CurrencyCode)}><span>{item.symbol}</span><div><strong>{item.code}</strong><small>{item.label}</small></div>{currency === item.code ? <Check /> : null}</button>)}</div></section>
      <button className="locale-apply" onClick={() => setOpen(false)}>{t("save")}</button>
    </aside></div> : null}
  </>;
}
