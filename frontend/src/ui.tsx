import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeSlashIcon, UploadSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { Output } from "./lib/carriers";
import { paint, passwordStrength } from "./lib/analysis";
import { safeFilename } from "./lib/payload";

export const logo = import.meta.env.BASE_URL + "logo-transparent.png";
export function bytesLabel(bytes: number) { return bytes < 1024 ? bytes + " B" : bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + " KB" : (bytes / (1024 * 1024)).toFixed(1) + " MB"; }

export function PageHeading({ title, children }: { title: string; children: ReactNode }) {
  return <header className="page-heading"><h1>{title}</h1><p>{children}</p></header>;
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? <p className="error-message" role="alert"><WarningCircleIcon aria-hidden="true" weight="bold" /><span>{error}</span></p> : null;
}

export function FileDrop({ label, accept, file, onFile, disabled = false, hint, prompt = "Choose a file or drop it here" }: { label: string; accept?: string; file?: { name: string; size?: number }; onFile: (file: File) => void; disabled?: boolean; hint: string; prompt?: string }) {
  const id = useId(); const [drag, setDrag] = useState(false);
  return <div className="file-field">
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className={"dropzone" + (drag ? " dragging" : "") + (file ? " filled" : "")}
      onDragOver={event => { event.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={event => { event.preventDefault(); setDrag(false); if (!disabled && event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]); }}>
      <span className="dropzone-icon" aria-hidden="true"><UploadSimpleIcon weight="bold" /></span>
      <span className="dropzone-copy">
        <strong>{file?.name ?? prompt}</strong>
        <span>{file ? (file.size !== undefined ? bytesLabel(file.size) + " · " : "") + "Choose another file" : "or click to browse"}</span>
      </span>
      <input id={id} type="file" accept={accept} disabled={disabled} aria-describedby={id + "hint"} onChange={event => { const value = event.target.files?.[0]; if (value) onFile(value); event.target.value = ""; }} />
    </div>
    <span className="field-hint" id={id + "hint"}>{hint}</span>
  </div>;
}

export function Segmented<T extends string>({ label, value, options, onChange, hideLabel = false }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void; hideLabel?: boolean }) {
  const id = useId();
  return <div className="segmented-field">
    <span className={hideLabel ? "sr-only" : "field-label"} id={id}>{label}</span>
    <div className="segmented" role="group" aria-labelledby={id}>
      {options.map(([key, text]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>)}
    </div>
  </div>;
}

export function PasswordField({ label, value, onChange, autoComplete, meter = false, autoFocus = false }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; meter?: boolean; autoFocus?: boolean }) {
  const id = useId(); const [visible, setVisible] = useState(false);
  const strength = meter ? passwordStrength(value) : undefined;
  return <div className="field">
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className="password-input">
      <input id={id} type={visible ? "text" : "password"} value={value} autoComplete={autoComplete} spellCheck={false} autoFocus={autoFocus} onChange={event => onChange(event.target.value)} />
      <button type="button" className="reveal" aria-label={visible ? "Hide characters" : "Show characters"} aria-controls={id} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeSlashIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
      </button>
    </div>
    {strength && <div className={"strength s" + strength.score} aria-live="polite">
      <span className="strength-bars" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>{strength.label ? "Strength: " + strength.label : "Use a long, unique passphrase"}</span>
    </div>}
  </div>;
}

export function Download({ output, label = "Download", className = "button primary" }: { output: Output; label?: string; className?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const value = URL.createObjectURL(new Blob([new Uint8Array(output.bytes)], { type: output.mime })); setUrl(value); return () => URL.revokeObjectURL(value); }, [output]);
  return <a className={className} href={url || undefined} download={safeFilename(output.filename)}>{label}</a>;
}

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  useEffect(() => { if (state === "idle") return; const timer = setTimeout(() => setState("idle"), 1800); return () => clearTimeout(timer); }, [state]);
  return <button type="button" className="button ghost small" onClick={() => navigator.clipboard?.writeText(text).then(() => setState("done"), () => setState("failed")) ?? setState("failed")}>
    {state === "done" ? <CheckIcon aria-hidden="true" weight="bold" /> : <CopyIcon aria-hidden="true" />}
    <span aria-live="polite">{state === "done" ? "Copied" : state === "failed" ? "Copy blocked" : "Copy text"}</span>
  </button>;
}

export function ImageCanvas({ image, label, className = "" }: { image?: ImageData; label: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current && image) paint(ref.current, image); }, [image]);
  return <canvas ref={ref} className={"pixel-canvas " + className} role="img" aria-label={label} />;
}

/** Creates an object URL for previews and revokes it when the source changes. */
export function useObjectUrl(source?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => { if (!source) { setUrl(undefined); return; } const value = URL.createObjectURL(source); setUrl(value); return () => URL.revokeObjectURL(value); }, [source]);
  return url;
}
