import { useEffect, useMemo, useRef, useState } from "react";
import { LockSimpleIcon, MagnifyingGlassIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { inspectCarrier, prepareCarrier } from "../lib/carriers";
import { bitPlane, decodeForView, type Channel } from "../lib/analysis";
import { messageFor } from "../lib/errors";
import { detectImage, IMAGE_MIME } from "../lib/images";
import { ErrorMessage, FileDrop, ImageCanvas, PageHeading, Segmented } from "../ui";

type Finding = { kind: "found"; encrypted: boolean } | { kind: "none" } | { kind: "unknown"; message: string };
const channels = [["rgb", "RGB"], ["r", "Red"], ["g", "Green"], ["b", "Blue"]] as const;

export function Inspect() {
  const [selected, setSelected] = useState<File>(); const [image, setImage] = useState<ImageData>(); const [finding, setFinding] = useState<Finding>();
  const [channel, setChannel] = useState<Channel>("rgb"); const [plane, setPlane] = useState(0); const [view, setView] = useState<"plane" | "original">("plane");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  async function choose(file: File) {
    const token = ++generation.current; setSelected(file); setImage(undefined); setFinding(undefined); setError(""); setLoading(true);
    try {
      if (file.size > 40 * 1024 * 1024) throw new Error("size");
      const bytes = new Uint8Array(await file.arrayBuffer()), format = detectImage(bytes);
      if (!format) { if (generation.current === token) setError("Choose a PNG, JPEG, BMP or WebP image."); return; }
      const decoded = await decodeForView(bytes, IMAGE_MIME[format]);
      let result: Finding;
      try { result = { kind: "found", ...await inspectCarrier(await prepareCarrier(file)) }; }
      catch (caught) { const message = messageFor(caught); result = message === "No StegoLab payload was found." ? { kind: "none" } : { kind: "unknown", message }; }
      if (generation.current === token) { setImage(decoded); setFinding(result); }
    } catch (caught) { if (generation.current === token) setError(caught instanceof Error && caught.message === "size" ? "Choose an image smaller than 40 MB." : messageFor(caught)); }
    finally { if (generation.current === token) setLoading(false); }
  }
  const rendered = useMemo(() => image && (view === "original" ? image : bitPlane(image, channel, plane)), [image, view, channel, plane]);

  return <div className="tool-page">
    <PageHeading title="Inspect an image">Look at an image one bit plane at a time. Hidden pixel data shows up as noise where the image should be smooth.</PageHeading>
    <div className="tool-grid inspect-grid">
      <div className="panel form-panel">
        <FileDrop label="Image to inspect" accept=".png,.jpg,.jpeg,.bmp,.webp,image/png,image/jpeg,image/bmp,image/webp" file={selected} onFile={choose} prompt="Drop any image" hint="PNG, JPEG, BMP or WebP. Nothing is uploaded." />
        {loading && <p className="quiet-note" role="status"><span className="spinner" aria-hidden="true" />Decoding</p>}
        <ErrorMessage error={error} />
        {finding && <p className={"found-note" + (finding.kind === "found" ? "" : " neutral")} role="status">
          {finding.kind === "found" ? (finding.encrypted ? <LockSimpleIcon aria-hidden="true" weight="bold" /> : <ShieldCheckIcon aria-hidden="true" weight="bold" />) : <MagnifyingGlassIcon aria-hidden="true" weight="bold" />}
          {finding.kind === "found" ? (finding.encrypted ? "StegoLab payload found. It is password protected." : "StegoLab payload found. Open Extract to recover it.")
            : finding.kind === "none" ? "No StegoLab payload found. Other tools may still have hidden data here." : finding.message}
        </p>}
        <div className="form-section inspect-controls">
          <Segmented label="View" value={view} options={[["plane", "Bit plane"], ["original", "Original"]] as const} onChange={setView} />
          <Segmented label="Channel" value={channel} options={channels} onChange={value => { setChannel(value); setView("plane"); }} />
          <div className="field">
            <label className="field-label" htmlFor="plane">Bit plane <output className="mono">{plane}</output><span className="field-aside">{plane === 0 ? "least significant" : plane === 7 ? "most significant" : ""}</span></label>
            <input id="plane" className="slider" type="range" min={0} max={7} step={1} value={plane} onChange={event => { setPlane(Number(event.target.value)); setView("plane"); }} />
          </div>
        </div>
      </div>
      <div className="panel viewer-panel">
        {rendered ? <ImageCanvas image={rendered} className="viewer" label={view === "original" ? "Original image" : `Bit plane ${plane} of the ${channel === "rgb" ? "red, green and blue channels" : channels.find(([key]) => key === channel)?.[1].toLowerCase() + " channel"}`} />
          : <div className="empty-state tall">
            <MagnifyingGlassIcon aria-hidden="true" />
            <p><strong>Nothing to inspect yet</strong>Plane 0 of a normal photo looks like fine grain. A StegoLab PNG shows a uniform band of noise where the payload starts.</p>
          </div>}
      </div>
    </div>
  </div>;
}
