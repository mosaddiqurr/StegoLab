import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { LsbDemo } from "../components/LsbDemo";

const formats = [
  ["PNG", "Least-significant bit", "One bit per colour channel in fully opaque pixels. Saved losslessly, so every bit survives."],
  ["JPEG", "APP15 segments", "Ordered application segments. The compressed image data is never re-encoded."],
  ["BMP", "Least-significant bit", "Raw 24 and 32-bit pixels. Row padding and alpha bytes stay untouched."],
  ["WebP", "RIFF chunk", "A dedicated chunk beside the image data."],
  ["PDF", "Embedded file", "A standard embedded file stream referenced from the catalog."],
] as const;

const facts = [
  ["AES-256-GCM", "Authenticated encryption. A wrong password or a single flipped bit fails without partial output."],
  ["600,000", "PBKDF2-SHA-256 iterations turn your password into a key, with a fresh salt every time."],
  ["0", "Network connections the page is allowed to open. The content security policy sets connect-src to none."],
  ["SHA-256", "Every payload is hashed, and each output is re-read and verified before you can download it."],
] as const;

export function Home() {
  return <div className="home">
    <section className="hero">
      <div className="hero-copy">
        <h1>Hide data in plain sight.</h1>
        <p className="hero-sub">Embed text or files inside images and PDFs, with optional password encryption. Nothing leaves your browser.</p>
        <div className="hero-actions">
          <Link to="/embed" className="button primary large">Embed data <ArrowRightIcon aria-hidden="true" weight="bold" /></Link>
          <Link to="/extract" className="button secondary large">Extract data</Link>
        </div>
      </div>
      <LsbDemo />
    </section>

    <section className="formats" aria-labelledby="formats-title">
      <h2 id="formats-title">Five carriers, one honest method each.</h2>
      <p className="section-lead">StegoLab picks the technique that keeps your data intact for each format. No setting to get wrong.</p>
      <div className="format-grid">
        {formats.map(([name, method, text]) => <article key={name} className={"format-tile tile-" + name.toLowerCase()}>
          <span className="format-name">{name}</span>
          <h3>{method}</h3>
          <p>{text}</p>
        </article>)}
      </div>
    </section>

    <section className="assurance" aria-labelledby="assurance-title">
      <div className="assurance-copy">
        <h2 id="assurance-title">Your files never leave this page.</h2>
        <p>Carriers, payloads and passwords live in browser memory and disappear when you refresh. There is no server, no account and no upload.</p>
        <Link to="/about" className="text-link">Read the limitations <ArrowRightIcon aria-hidden="true" /></Link>
      </div>
      <dl className="fact-grid">
        {facts.map(([value, text]) => <div key={value}><dt>{value}</dt><dd>{text}</dd></div>)}
      </dl>
    </section>
  </div>;
}
