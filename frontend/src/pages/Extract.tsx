import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowCounterClockwiseIcon, LockSimpleIcon, ShieldCheckIcon, TrayArrowDownIcon } from "@phosphor-icons/react";
import { ACCEPT_CARRIERS, inspectCarrier, prepareCarrier, type CarrierFormat, type Output } from "../lib/carriers";
import { messageFor } from "../lib/errors";
import { unpackPayload, type RecoveredPayload } from "../lib/payload";
import { CopyButton, Download, ErrorMessage, FileDrop, PageHeading, PasswordField, bytesLabel } from "../ui";

export function Extract() {
  const [selected, setSelected] = useState<File>(); const [container, setContainer] = useState<Uint8Array>(); const [encrypted, setEncrypted] = useState(false);
  const [format, setFormat] = useState<CarrierFormat>();
  const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); const [result, setResult] = useState<RecoveredPayload>(); const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  async function choose(file: File) {
    const token = ++generation.current; setSelected(file); setContainer(undefined); setFormat(undefined); setResult(undefined); setPassword(""); setEncrypted(false); setError(""); setLoading(true);
    try {
      const carrier = await prepareCarrier(file); const value = await inspectCarrier(carrier);
      if (generation.current === token) { setContainer(value.container); setEncrypted(value.encrypted); setFormat(carrier.format); }
    } catch (caught) { if (generation.current === token) setError(messageFor(caught)); }
    finally { if (generation.current === token) setLoading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!container) return;
    setError(""); setResult(undefined); setBusy(true); const token = generation.current;
    try { const value = await unpackPayload(container, encrypted ? password : undefined); if (generation.current === token) { setResult(value); setPassword(""); } }
    catch (caught) { if (generation.current === token) setError(messageFor(caught)); }
    finally { if (generation.current === token) setBusy(false); }
  }
  function reset() { generation.current++; setSelected(undefined); setContainer(undefined); setFormat(undefined); setEncrypted(false); setPassword(""); setBusy(false); setLoading(false); setError(""); setResult(undefined); }
  const output: Output | undefined = result ? { bytes: result.data, filename: result.filename, mime: "application/octet-stream" } : undefined;

  return <div className="tool-page">
    <PageHeading title="Extract data">Recover the text or file hidden in a StegoLab image or PDF.</PageHeading>
    <div className="tool-grid">
      <form className="panel form-panel" onSubmit={submit}><fieldset disabled={busy}>
        <FileDrop label="StegoLab file" accept={ACCEPT_CARRIERS} file={selected} disabled={busy} onFile={choose} prompt="Drop a StegoLab image or PDF" hint="Use the exact file downloaded from StegoLab" />
        {loading && <p className="quiet-note" role="status"><span className="spinner" aria-hidden="true" />Looking for hidden data</p>}
        {container && <p className="found-note" role="status">
          {encrypted ? <LockSimpleIcon aria-hidden="true" weight="bold" /> : <ShieldCheckIcon aria-hidden="true" weight="bold" />}
          {encrypted ? `Password-protected payload found in this ${format}.` : `Payload found in this ${format}.`}
        </p>}
        {encrypted && !result && <div className="form-section"><PasswordField label="Password" value={password} autoComplete="off" autoFocus onChange={value => { setPassword(value); setError(""); setResult(undefined); }} /></div>}
        <ErrorMessage error={error} />
        <div className="form-actions">
          <button className="button primary large block" type="submit" disabled={!container || busy || loading || (encrypted && !password)}>{busy ? <><span className="spinner" aria-hidden="true" />Extracting</> : "Extract data"}</button>
        </div>
      </fieldset></form>
      <aside className="panel side-panel" aria-label={result ? undefined : "Recovered content"}>
        {result && output ? <section className="result" aria-label="Extract result">
          <span className="result-label">Recovered</span>
          <h2>{result.type === "text" ? "Hidden text" : "Recovered file"}</h2>
          {result.type === "text"
            ? <pre className="recovered-text">{new TextDecoder().decode(result.data)}</pre>
            : <div className="file-card"><span className="recovered-name">{result.filename}</span><span>{bytesLabel(result.data.length)} · {result.mime}</span></div>}
          <div className="result-actions">
            {result.type === "text" && <CopyButton text={new TextDecoder().decode(result.data)} />}
            <Download output={output} label={result.type === "file" ? "Download file" : "Download text"} className={result.type === "file" ? "button primary large" : "button secondary small"} />
            <button type="button" className="button ghost small" onClick={reset}><ArrowCounterClockwiseIcon aria-hidden="true" />Start over</button>
          </div>
          <dl className="meta-list">
            <div><dt>Protection</dt><dd>{result.encrypted ? "Password protected, authenticated" : "Unencrypted"}</dd></div>
            <div><dt>Integrity</dt><dd>Verified</dd></div>
            <div><dt>SHA-256</dt><dd className="hash">{result.sha256}</dd></div>
          </dl>
        </section> : <div className="empty-state">
          <TrayArrowDownIcon aria-hidden="true" />
          <p><strong>Nothing recovered yet</strong>Choose a file made by StegoLab. Hidden text shows here; files are offered as a download.</p>
        </div>}
      </aside>
    </div>
  </div>;
}
