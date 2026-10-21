import { FORMAT_DETAILS } from "../lib/carriers";
import { logo } from "../ui";

export function About() {
  return <article className="about">
    <header className="about-head">
      <img src={logo} alt="" width="72" height="72" />
      <h1>StegoLab</h1>
      <p className="about-intro">A simple way to hide and recover text or files inside images and PDFs, with optional password protection. Everything runs in your browser.</p>
    </header>
    <section>
      <h2>Supported carriers</h2>
      <p>Images: PNG, JPEG / JPG, BMP and WebP. PDF documents.</p>
      <details className="details"><summary>Format details</summary>{Object.entries(FORMAT_DETAILS).map(([format, description]) => <p key={format}><strong>{format}</strong><br />{description}</p>)}</details>
    </section>
    <section>
      <h2>Privacy</h2>
      <p>Files are processed directly in your browser and are not uploaded to StegoLab.</p>
      <p>Files, payloads and passwords stay in memory while you use the page. Refreshing clears application state. Downloads remain wherever you save them. Your hosting provider receives normal site requests.</p>
    </section>
    <section>
      <h2>Protection</h2>
      <p>Password protection uses AES-256-GCM with a key derived by PBKDF2-HMAC-SHA-256 at 600,000 iterations, a fresh salt and a fresh nonce for every file. Use a strong, unique password and keep it safe; StegoLab cannot recover it.</p>
    </section>
    <section>
      <h2>Limitations</h2>
      <p>Keep generated carriers unchanged. Editing, resizing, recompression or removing metadata can destroy their data. Container data may be discoverable by inspection tools, and the Inspect page shows how pixel embedding looks to an analyst. PDF payloads use an embedded-data container and may be visible to PDF attachment or forensic tools.</p>
      <p>Carriers are limited to 40 MB; payloads to 8 MB and the carrier's available capacity. Static images only; PDFs up to 200 pages. Files from the earlier desktop application use a different payload format.</p>
    </section>
    <footer className="creator-credit">
      <span>Designed and built by</span>
      <a href="https://www.linkedin.com/in/mosaddiqur/" target="_blank" rel="noopener noreferrer">Mosaddiqur Rahman <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
    </footer>
  </article>;
}
