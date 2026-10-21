import { useEffect } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { GithubLogoIcon } from "@phosphor-icons/react";
import { About } from "./pages/About";
import { Embed } from "./pages/Embed";
import { Extract } from "./pages/Extract";
import { Home } from "./pages/Home";
import { Inspect } from "./pages/Inspect";
import { logo } from "./ui";

const nav = [["/embed", "Embed"], ["/extract", "Extract"], ["/inspect", "Inspect"]] as const;
const titles: Record<string, string> = { "/embed": "Embed", "/extract": "Extract", "/inspect": "Inspect", "/about": "About" };
const navClass = ({ isActive }: { isActive: boolean }) => "nav-item" + (isActive ? " active" : "");

export default function App() {
  const location = useLocation();
  const title = titles[location.pathname];
  useEffect(() => { document.title = title ? title + " · StegoLab" : "StegoLab · Hide data in images and PDFs"; window.scrollTo(0, 0); }, [title]);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="StegoLab home"><img src={logo} alt="" width="34" height="34" /><strong>StegoLab</strong></Link>
        <nav aria-label="Primary" className="primary-nav">{nav.map(([path, label]) => <NavLink key={path} to={path} className={navClass}>{label}</NavLink>)}</nav>
        <nav aria-label="Information" className="secondary-nav"><NavLink to="/about" className={navClass}>About</NavLink></nav>
      </div>
    </header>
    <main id="main-content" className="main-content" tabIndex={-1} key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home />} /><Route path="/embed" element={<Embed />} /><Route path="/extract" element={<Extract />} />
        <Route path="/inspect" element={<Inspect />} /><Route path="/about" element={<About />} /><Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    <footer className="site-footer">
      <div className="footer-inner">
        <span>Files stay in your browser. Nothing is uploaded.</span>
        <a href="https://github.com/mosaddiqurr/StegoLab" target="_blank" rel="noopener noreferrer"><GithubLogoIcon aria-hidden="true" />Source<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </footer>
  </div>;
}
