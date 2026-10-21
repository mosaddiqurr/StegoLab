import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowCounterClockwiseIcon, FilePdfIcon, ImageSquareIcon } from "@phosphor-icons/react";
import { ACCEPT_CARRIERS, FORMAT_DETAILS, METHOD, PIXEL_FORMATS, availableBytes, embedCarrier, hasNoCapacity, prepareCarrier, type Carrier, type Output } from "../lib/carriers";
import { bitPlane, decodeForView } from "../lib/analysis";
import { messageFor } from "../lib/errors";
import { MAX_PAYLOAD, packedSize, safeFilename, safeMime, type PayloadInput } from "../lib/payload";
import { Download, ErrorMessage, FileDrop, ImageCanvas, PageHeading, PasswordField, Segmented, bytesLabel, useObjectUrl } from "../ui";

export function Embed() {
  const [carrier, setCarrier] = useState<Carrier>(); const [selected, setSelected] = useState<File>();
  const [type, setType] = useState<"text" | "file">("text"); const [text, setText] = useState(""); const [file, setFile] = useState<File>();
  const [protect, setProtect] = useState(false); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [output, setOutput] = useState<Output>();
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const invalidate = () => { setOutput(undefined); setError(""); };
  async function chooseCarrier(value: File) {
    const token = ++generation.current; invalidate(); setCarrier(undefined); setSelected(value); setLoading(true);
    try { const prepared = await prepareCarrier(value); if (generation.current === token) setCarrier(prepared); }
    catch (caught) { if (generation.current === token) setError(messageFor(caught)); }
    finally { if (generation.current === token) setLoading(false); }
  }
  function reset() {
    generation.current++;
    setCarrier(undefined); setSelected(undefined); setType("text"); setText(""); setFile(undefined);
    setProtect(false); setPassword(""); setConfirm(""); setLoading(false); setBusy(false); setError(""); setOutput(undefined);
  }
  const filename = type === "text" ? "message.txt" : safeFilename(file?.name ?? "recovered.bin");
  const mime = type === "text" ? "text/plain" : safeMime(file?.type ?? "");
  const length = type === "text" ? new TextEncoder().encode(text).length : file?.size ?? 0;
  const empty = Boolean(carrier && hasNoCapacity(carrier));
  const tooLarge = length > MAX_PAYLOAD || Boolean(carrier && !empty && length > 0 && packedSize(length, filename, mime, protect) > carrier.capacity);
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
      // Passwords are cleared once they have been used successfully; after an error they stay so the user can correct them.
      if (generation.current === token) { setOutput(value); setPassword(""); setConfirm(""); }
    } catch (caught) { if (generation.current === token) setError(messageFor(caught)); }
    finally { if (generation.current === token) setBusy(false); }
  }
  const capacityNote = !carrier ? "" : empty ? "This image has no fully opaque pixels to hold data. Choose another carrier."
    : tooLarge ? "The payload is too large for this carrier." : bytesLabel(available) + " available" + (length ? " · " + bytesLabel(length) + " payload fits" : "");

  return <div className="tool-page">
    <PageHeading title="Embed data">Hide text or a file inside an image or PDF.</PageHeading>
    <div className="tool-grid">
      <form className="panel form-panel" onSubmit={submit} noValidate><fieldset disabled={busy}>
        <FileDrop label="Carrier" accept={ACCEPT_CARRIERS} file={selected} onFile={chooseCarrier} disabled={busy} prompt="Drop an image or PDF" hint="PNG, JPEG, BMP, WebP or PDF, up to 40 MB" />
        <div className="form-section">
          <Segmented label="Payload" value={type} options={[["text", "Text"], ["file", "File"]] as const} onChange={value => { setType(value); invalidate(); }} />
          {type === "text"
            ? <label className="field"><span className="sr-only">Text to hide</span><textarea aria-label="Text to hide" rows={6} placeholder="Write the text you want to hide" value={text} maxLength={MAX_PAYLOAD} onChange={event => { setText(event.target.value); invalidate(); }} /></label>
            : <FileDrop label="File to hide" file={file} disabled={busy} onFile={value => { setFile(value); invalidate(); }} hint="Any file type, up to 8 MB and within the carrier's capacity" />}
          {carrier && <p className={"capacity-note" + (tooLarge || empty ? " exceeded" : "")} role="status">{capacityNote}</p>}
        </div>
        <div className="form-section">
          <label className="toggle">
            <span className="toggle-copy"><strong>Protect with password</strong><span id="protect-hint">AES-256-GCM. Without the password nobody can read it, including you.</span></span>
            <input type="checkbox" role="switch" aria-label="Protect with password" aria-describedby="protect-hint" checked={protect} onChange={event => { setProtect(event.target.checked); setPassword(""); setConfirm(""); invalidate(); }} />
            <span className="switch-track" aria-hidden="true" />
          </label>
          {protect && <div className="password-grid">
            <PasswordField label="Password" value={password} autoComplete="new-password" meter onChange={value => { setPassword(value); invalidate(); }} />
            <PasswordField label="Confirm password" value={confirm} autoComplete="new-password" onChange={value => { setConfirm(value); invalidate(); }} />
          </div>}
        </div>
        <ErrorMessage error={error} />
        <div className="form-actions">
          <button className="button primary large block" type="submit" disabled={busy || loading || !carrier || tooLarge || empty}>{busy ? <><span className="spinner" aria-hidden="true" />Embedding and verifying</> : "Embed data"}</button>
        </div>
      </fieldset></form>
      <aside className="panel side-panel" aria-label={output ? undefined : "Carrier preview"}>
        {output && carrier ? <EmbedResult output={output} carrier={carrier} onReset={reset} />
          : <CarrierPreview carrier={carrier} file={selected} loading={loading} available={available} used={carrier && length && !empty ? packedSize(length, filename, mime, protect) : 0} />}
      </aside>
    </div>
  </div>;
}

function CarrierPreview({ carrier, file, loading, available, used }: { carrier?: Carrier; file?: File; loading: boolean; available: number; used: number }) {
  const url = useObjectUrl(carrier && carrier.format !== "PDF" ? file : undefined);
  if (loading) return <div className="preview-skeleton" role="status" aria-label="Checking file"><span className="sk-image" /><span className="sk-line" /><span className="sk-line short" /></div>;
  if (!carrier) return <div className="empty-state">
    <ImageSquareIcon aria-hidden="true" />
    <p><strong>No carrier yet</strong>Choose an image or PDF. Its preview, capacity and hiding method appear here.</p>
  </div>;
  const percent = carrier.capacity ? Math.min(100, (used / carrier.capacity) * 100) : 100;
  return <div className="carrier-preview">
    <div className="preview-frame">
      {url ? <img src={url} alt={"Preview of " + carrier.name} /> : <div className="pdf-glyph"><FilePdfIcon aria-hidden="true" /><span>{carrier.pages} page{carrier.pages === 1 ? "" : "s"}</span></div>}
    </div>
    <dl className="meta-list">
      <div><dt>Format</dt><dd>{carrier.format}</dd></div>
      <div><dt>{carrier.format === "PDF" ? "Pages" : "Dimensions"}</dt><dd>{carrier.format === "PDF" ? carrier.pages : `${carrier.width} × ${carrier.height}`}</dd></div>
      <div><dt>Method</dt><dd>{METHOD[carrier.format]}</dd></div>
      <div><dt>Capacity</dt><dd>{bytesLabel(available)}</dd></div>
    </dl>
    <div className="gauge" role="meter" aria-label="Carrier capacity used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <span style={{ width: percent + "%" }} className={percent >= 100 ? "full" : ""} />
    </div>
    <details className="details"><summary>Format details</summary><p>{FORMAT_DETAILS[carrier.format]}</p></details>
  </div>;
}

function EmbedResult({ output, carrier, onReset }: { output: Output; carrier: Carrier; onReset: () => void }) {
  const [planes, setPlanes] = useState<{ before: ImageData; after: ImageData; changed: number; total: number }>();
  const pixels = PIXEL_FORMATS.includes(carrier.format);
  useEffect(() => {
    if (!pixels) return;
    let live = true;
    const mime = carrier.format === "PNG" ? "image/png" : "image/bmp";
    Promise.all([carrier.pixels ?? decodeForView(carrier.bytes, mime), decodeForView(output.bytes, mime)])
      .then(([before, after]) => {
        let changed = 0;
        for (let i = 0; i < before.data.length; i++) if ((i & 3) !== 3 && before.data[i] !== after.data[i]) changed++;
        if (live) setPlanes({ before: bitPlane(before, "rgb", 0), after: bitPlane(after, "rgb", 0), changed, total: before.width * before.height * 3 });
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [carrier, output, pixels]);
  return <section className="result" aria-label="Embed result" role="status">
    <span className="result-label">Ready</span>
    <h2>{output.filename}</h2>
    <p className="result-meta">{bytesLabel(output.bytes.length)} · verified by re-reading the saved file</p>
    <div className="result-actions">
      <Download output={output} className="button primary large" />
      <button type="button" className="button secondary large" onClick={onReset}><ArrowCounterClockwiseIcon aria-hidden="true" />Start over</button>
    </div>
    {pixels ? <figure className="compare">
      <div><ImageCanvas image={planes?.before} label="Lowest bit plane before embedding" /><span>Before</span></div>
      <div><ImageCanvas image={planes?.after} label="Lowest bit plane after embedding" /><span>After</span></div>
      <figcaption>{planes ? `${planes.changed.toLocaleString()} of ${planes.total.toLocaleString()} colour values changed (${(planes.changed / planes.total * 100).toFixed(planes.changed / planes.total < 0.01 ? 3 : 1)}%), each by exactly 1 of 255, starting at the top row.` : "Comparing the lowest bit plane before and after."}</figcaption>
    </figure> : <p className="note">Pixels are untouched. The payload sits in {carrier.format === "PDF" ? "an embedded file stream" : carrier.format === "JPEG" ? "APP15 application segments" : "a separate RIFF chunk"}, so keep the file unchanged and avoid tools that strip metadata.</p>}
  </section>;
}
