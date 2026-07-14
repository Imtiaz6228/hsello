import { createContext, type FormEvent, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type PromptOptions = { title: string; label: string; description?: string; confirmLabel?: string; initialValue?: string; minLength?: number; maxLength?: number; multiline?: boolean; required?: boolean; tone?: "default" | "danger" };
type ConfirmOptions = Pick<PromptOptions, "title" | "description" | "confirmLabel" | "tone">;
type DialogState = ({ kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void } | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void });
type ActionPromptValue = { requestText: (options: PromptOptions) => Promise<string | null>; confirmAction: (options: ConfirmOptions) => Promise<boolean> };

const ActionPromptContext = createContext<ActionPromptValue | null>(null);

export function ActionPromptProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>();
  const [value, setValue] = useState("");
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback((result: string | boolean | null) => {
    setDialog((current) => {
      if (!current) return undefined;
      if (current.kind === "prompt") current.resolve(typeof result === "string" ? result : null);
      else current.resolve(result === true);
      return undefined;
    });
    window.requestAnimationFrame(() => opener.current?.focus());
  }, []);

  const requestText = useCallback((options: PromptOptions) => new Promise<string | null>((resolve) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setValue(options.initialValue ?? ""); setDialog({ kind: "prompt", options, resolve });
  }), []);
  const confirmAction = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog({ kind: "confirm", options, resolve });
  }), []);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(dialog.kind === "prompt" ? null : false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, dialog]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dialog) return;
    close(dialog.kind === "prompt" ? value.trim() : true);
  }

  return <ActionPromptContext.Provider value={{ requestText, confirmAction }}>{children}{dialog ? <div className="action-dialog-backdrop" role="presentation"><form className={`action-dialog ${dialog.options.tone === "danger" ? "danger" : ""}`} role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" onSubmit={submit}><button type="button" className="action-dialog-close" onClick={() => close(dialog.kind === "prompt" ? null : false)} aria-label="Cancel"><X /></button>{dialog.options.tone === "danger" ? <AlertTriangle aria-hidden="true" /> : null}<h2 id="action-dialog-title">{dialog.options.title}</h2>{dialog.options.description ? <p>{dialog.options.description}</p> : null}{dialog.kind === "prompt" ? <label><span>{dialog.options.label}</span>{dialog.options.multiline !== false ? <textarea autoFocus required={dialog.options.required !== false} minLength={dialog.options.minLength} maxLength={dialog.options.maxLength ?? 4000} rows={5} value={value} onChange={(event) => setValue(event.target.value)} /> : <input autoFocus required={dialog.options.required !== false} minLength={dialog.options.minLength} maxLength={dialog.options.maxLength ?? 4000} value={value} onChange={(event) => setValue(event.target.value)} />}</label> : null}<div className="action-dialog-actions"><button type="button" onClick={() => close(dialog.kind === "prompt" ? null : false)}>Cancel</button><button type="submit" className={dialog.options.tone === "danger" ? "danger" : "primary"} disabled={dialog.kind === "prompt" && dialog.options.required !== false && value.trim().length < (dialog.options.minLength ?? 1)}>{dialog.options.confirmLabel ?? "Continue"}</button></div></form></div> : null}</ActionPromptContext.Provider>;
}

export function useActionPrompt() {
  const value = useContext(ActionPromptContext);
  if (!value) throw new Error("useActionPrompt must be used inside ActionPromptProvider");
  return value;
}
