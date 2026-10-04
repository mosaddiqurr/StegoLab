import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ACCEPT_CARRIERS, FORMAT_DETAILS, availableBytes, embedCarrier, inspectCarrier, prepareCarrier, type Carrier, type Output } from "./lib/carriers";
import { messageFor } from "./lib/errors";
import { MAX_PAYLOAD, packedSize, safeFilename, safeMime, unpackPayload, type PayloadInput, type RecoveredPayload } from "./lib/payload";

const logo = import.meta.env.BASE_URL + "logo-transparent.png";
const nav = [["/", "Home", "home"], ["/embed", "Embed", "embed"], ["/extract", "Extract", "extract"]];
function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h5v-6h4v6h5V9" /></>,
    embed: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 7v10m-4-6 4-4 4 4" /></>,
    extract: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 7v10m-4-4 4 4 4-4" /></>,
    about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
    upload: <><path d="M4 16v5h16v-5M12 16V3m-5 5 5-5 5 5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Brand() { return <Link to="/" className="brand" aria-label="StegoLab home"><img src={logo} alt="" width="44" height="44" /><strong>StegoLab</strong></Link>; }

export default function App() {
  const location = useLocation();
  const title = location.pathname === "/about" ? "About" : nav.find(([path]) => path === location.pathname)?.[1] ?? "Home";
  useEffect(() => { document.title = title === "Home" ? "StegoLab" : title + " · StegoLab"; }, [title]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to content</a>
    <aside className="sidebar" aria-label="Navigation"><Brand /><nav aria-label="Primary">{nav.map(([path, label, icon]) => <NavLink key={path} to={path} end className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}><Icon name={icon} /><span>{label}</span></NavLink>)}</nav><nav className="secondary-nav" aria-label="Information"><NavLink to="/about" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}><Icon name="about" /><span>About</span></NavLink></nav></aside>
    <div className="workspace"><header className="topbar"><span className="breadcrumb">StegoLab <span aria-hidden="true">/</span> <strong>{title}</strong></span><span className="topbar-note">Files stay in your browser.</span></header><main id="main-content" className="main-content" tabIndex={-1} key={location.pathname}><Routes><Route path="/" element={<Home />} /><Route path="/embed" element={<Embed />} /><Route path="/extract" element={<Extract />} /><Route path="/about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main></div>
  </div>;
}
function Home() {
  return <section className="home"><div className="home-mark"><img src={logo} alt="" width="120" height="120" /></div><h1>StegoLab</h1><p className="home-description">Hide and recover data inside<br className="desktop-break" /> images and PDFs.</p><div className="home-actions"><Link to="/embed" className="button primary">Embed data <Icon name="arrow" /></Link><Link to="/extract" className="button secondary">Extract data <Icon name="arrow" /></Link></div><p className="home-privacy">Files are processed directly in your browser.</p></section>;
}
function Heading({ title, children }: { title: string; children: ReactNode }) { return <div className="page-heading"><h1>{title}</h1><p>{children}</p></div>; }
function bytesLabel(bytes: number) { return bytes < 1024 ? bytes + " B" : bytes < 1024 * 1024 ? (bytes / 1024).toFixed(1) + " KB" : (bytes / (1024 * 1024)).toFixed(1) + " MB"; }
function ErrorMessage({ error }: { error: string }) { return error ? <p className="error-message" role="alert">{error}</p> : null; }

function FileDrop({ label, accept, file, onFile, disabled = false, hint }: { label: string; accept?: string; file?: { name: string }; onFile: (file: File) => void; disabled?: boolean; hint: string }) {
  const id = useId(); const [drag, setDrag] = useState(false);
  return <div className="file-field"><label className="field-label" htmlFor={id}>{label}</label><div className={"file-input-wrap" + (drag ? " dragging" : "")} onDragOver={event => { event.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); if (!disabled && event.dataTransfer.files[0]) onFile(event.dataTransfer.files[0]); }}><Icon name="upload" /><span className="file-copy"><strong>{file?.name ?? (accept ? "Drop image or PDF here" : "Choose a file or drop it here")}</strong><span>{file ? "Choose another file" : "or click to browse"}</span></span><input id={id} type="file" accept={accept} disabled={disabled} aria-describedby={id + "hint"} onChange={event => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} /></div><span className="field-hint" id={id + "hint"}>{hint}</span></div>;
}
function FormatDetails({ carrier }: { carrier: Carrier }) { return <details className="details"><summary>Format details</summary><p>{FORMAT_DETAILS[carrier.format]}</p></details>; }
function Download({ output, label = "Download" }: { output: Output; label?: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const value = URL.createObjectURL(new Blob([new Uint8Array(output.bytes)], { type: output.mime })); setUrl(value); return () => URL.revokeObjectURL(value); }, [output]);
  return <a className="button primary" href={url || undefined} download={safeFilename(output.filename)}>{label}</a>;
}

function Embed() {
  const [carrier, setCarrier] = useState<Carrier>(); const [selected, setSelected] = useState<File>();
  const [type, setType] = useState<"text" | "file">("text"); const [text, setText] = useState(""); const [file, setFile] = useState<File>();
  const [protect, setProtect] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [output, setOutput] = useState<Output>();
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const invalidate = () => { setOutput(undefined); setError(""); };
  async function chooseCarrier(file: File) {
    const token = ++generation.current; invalidate(); setCarrier(undefined); setSelected(file); setLoading(true);
    try { const value = await prepareCarrier(file); if (generation.current === token) setCarrier(value); }
    catch (error) { if (generation.current === token) setError(messageFor(error)); }
    finally { if (generation.current === token) setLoading(false); }
  }
  const filename = type === "text" ? "message.txt" : safeFilename(file?.name ?? "recovered.bin");
  const mime = type === "text" ? "text/plain" : safeMime(file?.type ?? "");
  const length = type === "text" ? new TextEncoder().encode(text).length : file?.size ?? 0;
  const tooLarge = length > MAX_PAYLOAD || Boolean(carrier && packedSize(length, filename, mime, protect) > carrier.capacity);
  const available = carrier ? availableBytes(carrier, filename, mime, protect) : 0;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setOutput(undefined);
    if (!carrier) { setError("Choose an image or PDF."); return; }
    if (type === "file" && !file) { setError("Choose a payload file."); return; }
    if (type === "text" && !text.length) { setError("Enter some text to embed."); return; }
    if (protect && !password) { setError("Enter a password."); return; }
    if (protect && password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true); const token = generation.current;
    try {
      const input: PayloadInput = { type, data: type === "text" ? new TextEncoder().encode(text) : new Uint8Array(await file!.arrayBuffer()), filename, mime };
      const value = await embedCarrier(carrier, input, protect ? password : undefined);
      if (generation.current === token) setOutput(value);
    } catch (error) { if (generation.current === token) setError(messageFor(error)); }
    finally { if (generation.current === token) { setBusy(false); setPassword(""); setConfirm(""); } }
  }
  return <div className="workflow"><Heading title="Embed data">Hide text or a file inside an image or PDF.</Heading><form className="form-panel" onSubmit={submit}><fieldset disabled={busy}>
    <FileDrop label="Carrier" accept={ACCEPT_CARRIERS} file={selected} onFile={chooseCarrier} disabled={busy} hint="PNG, JPEG, BMP, WebP or PDF · up to 40 MB" />
    {loading && <p className="quiet-note" role="status">Checking file…</p>}{carrier && <FormatDetails carrier={carrier} />}
    <div className="form-section"><span className="field-label" id="payload-label">Payload</span><div className="payload-tabs" role="group" aria-labelledby="payload-label">{(["text", "file"] as const).map(value => <button key={value} type="button" aria-pressed={type === value} className={type === value ? "selected" : ""} onClick={() => { setType(value); invalidate(); }}>{value === "text" ? "Text" : "File"}</button>)}</div>
    {type === "text" ? <label className="field"><span className="sr-only">Text to hide</span><textarea aria-label="Text to hide" rows={5} placeholder="Write the text you want to hide…" value={text} maxLength={MAX_PAYLOAD} onChange={event => { setText(event.target.value); invalidate(); }} /></label> : <FileDrop label="File to hide" file={file} disabled={busy} onFile={value => { setFile(value); invalidate(); }} hint="Any file type · up to 8 MB, within carrier capacity" />}
    {carrier && <p className={"capacity-note" + (tooLarge ? " exceeded" : "")} role="status">{tooLarge ? "The payload is too large for this carrier." : "Available: " + bytesLabel(available) + (length ? " · Payload fits" : "")}</p>}</div>
    <div className="form-section protection"><label className="toggle-label"><span>Protect with password</span><input type="checkbox" role="switch" checked={protect} onChange={event => { setProtect(event.target.checked); setPassword(""); setConfirm(""); invalidate(); }} /><span className="switch-track" aria-hidden="true" /></label>{protect && <div className="password-grid"><label className="field"><span className="field-label">Password</span><input type="password" value={password} autoComplete="new-password" onChange={event => { setPassword(event.target.value); invalidate(); }} /></label><label className="field"><span className="field-label">Confirm password</span><input type="password" value={confirm} autoComplete="new-password" onChange={event => { setConfirm(event.target.value); invalidate(); }} /></label></div>}</div>
    <ErrorMessage error={error} /><div className="form-actions"><button className="button primary" type="submit" disabled={busy || loading || !carrier || tooLarge}>{busy ? "Embedding…" : "Embed data"}</button></div>
    </fieldset></form>{output && <section className="result-panel" aria-label="Embed result" role="status"><span className="result-label">Ready</span><h2>{output.filename}</h2><p>{bytesLabel(output.bytes.length)}</p><Download output={output} /></section>}</div>;
}

function Extract() {
  const [selected, setSelected] = useState<File>(); const [container, setContainer] = useState<Uint8Array>(); const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [result, setResult] = useState<RecoveredPayload>(); const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  async function choose(file: File) {
    const token = ++generation.current; setSelected(file); setContainer(undefined); setResult(undefined); setPassword(""); setEncrypted(false); setError(""); setLoading(true);
    try { const value = await inspectCarrier(await prepareCarrier(file)); if (generation.current === token) { setContainer(value.container); setEncrypted(value.encrypted); } }
    catch (error) { if (generation.current === token) setError(messageFor(error)); }
    finally { if (generation.current === token) setLoading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!container) return;
    setError(""); setResult(undefined); setBusy(true); const token = generation.current;
    try { const value = await unpackPayload(container, encrypted ? password : undefined); if (generation.current === token) setResult(value); }
    catch (error) { if (generation.current === token) setError(messageFor(error)); }
    finally { if (generation.current === token) { setBusy(false); setPassword(""); } }
  }
  const output: Output | undefined = result ? { bytes: result.data, filename: result.filename, mime: "application/octet-stream" } : undefined;
  return <div className="workflow"><Heading title="Extract data">Recover content from a StegoLab file.</Heading><form className="form-panel" onSubmit={submit}><fieldset disabled={busy}><FileDrop label="StegoLab file" accept={ACCEPT_CARRIERS} file={selected} disabled={busy} onFile={choose} hint="Upload the original file downloaded from StegoLab" />{loading && <p className="quiet-note" role="status">Checking file…</p>}{encrypted && <label className="field extract-password"><span className="field-label">Password</span><input type="password" autoComplete="off" value={password} onChange={event => { setPassword(event.target.value); setError(""); setResult(undefined); }} autoFocus /></label>}<ErrorMessage error={error} /><div className="form-actions"><button className="button primary" type="submit" disabled={!container || busy || loading || (encrypted && !password)}>{busy ? "Extracting…" : "Extract data"}</button></div></fieldset></form>{result && <section className="result-panel" aria-label="Extract result"><span className="result-label">Recovered</span><h2>{result.type === "text" ? "Hidden text" : "Recovered file"}</h2>{result.type === "text" ? <pre className="recovered-text">{new TextDecoder().decode(result.data)}</pre> : <><p className="recovered-name">{result.filename}</p><p>{bytesLabel(result.data.length)} · {result.mime}</p></>}<Download output={output!} label={result.type === "file" ? "Download file" : "Download text"} /><details className="details"><summary>Details</summary><dl><dt>Protection</dt><dd>{result.encrypted ? "Password protected · authenticated" : "Unencrypted"}</dd><dt>Integrity</dt><dd>Verified</dd><dt>SHA-256</dt><dd className="hash">{result.sha256}</dd></dl></details></section>}</div>;
}

function About() {
  return <article className="about"><div className="about-brand"><img src={logo} alt="" width="64" height="64" /><h1>StegoLab</h1></div><p className="about-intro">A simple way to hide and recover text or files inside images and PDFs, with optional password protection.</p><section><h2>Supported carriers</h2><p>Images: PNG, JPEG / JPG, BMP and WebP.<br />PDF documents.</p><details className="details"><summary>Format details</summary>{Object.entries(FORMAT_DETAILS).map(([format, description]) => <p key={format}><strong>{format}</strong><br />{description}</p>)}</details></section><section><h2>Privacy</h2><p>Files are processed directly in your browser and are not uploaded to StegoLab.</p><p>Files, payloads and passwords stay in memory while you use the page. Refreshing clears application state. Downloads remain wherever you save them. Your hosting provider receives normal site requests.</p></section><section><h2>Protection &amp; limitations</h2><p>Password protection uses AES-256-GCM. Use a strong, unique password and keep it safe; StegoLab cannot recover it.</p><p>Keep generated carriers unchanged. Editing, resizing, recompression or removing metadata can destroy their data. Container data may be discoverable by inspection tools. PDF payloads use an embedded-data container and may be visible to PDF attachment or forensic tools.</p><p>Carriers are limited to 40 MB; payloads to 8 MB and the carrier’s available capacity. Static images only; PDFs up to 200 pages. Files from the earlier desktop application use a different payload format.</p></section><footer className="creator-credit"><span>Designed and built by</span><a href="https://www.linkedin.com/in/mosaddiqur/" target="_blank" rel="noopener noreferrer">Mosaddiqur Rahman <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></footer></article>;
}


