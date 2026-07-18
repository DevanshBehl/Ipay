import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ShieldCheck, Zap,
  Smartphone, Wallet, Send, PieChart,
  Fingerprint, ArrowUpRight, Check,
} from 'lucide-react';

/* Reveal-on-scroll: adds `.reveal-in` to every [data-reveal] as it enters view. */
function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* Small helper so cards can host a cursor-following spotlight. */
function useSpotlight() {
  return (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
}

function App() {
  useScrollReveal();
  const onSpot = useSpotlight();

  // Parallax tilt for the hero phone mockup.
  const phoneRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = phoneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 8, ry: px * 10 });
  };

  return (
    <div className="min-h-screen bg-black text-white grain relative">
      {/* ---------------------------------------------------------------- */}
      {/* Navbar                                                            */}
      {/* ---------------------------------------------------------------- */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? 'glass border-b border-white/10 py-0' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#top" className="group flex items-center gap-2.5">
            <span className="relative w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:rotate-[18deg]">
              <Zap className="w-5 h-5" fill="currentColor" />
            </span>
            <span className="text-2xl font-black italic tracking-tighter">InstaPay</span>
          </a>

          <div className="hidden md:flex items-center gap-9 text-sm font-medium text-zinc-400">
            {['Features', 'Security', 'Company'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="relative py-1 transition-colors hover:text-white after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
              >
                {label}
              </a>
            ))}
          </div>

          <button className="btn-primary group relative overflow-hidden px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm transition-transform duration-300 active:scale-95 hover:shadow-[0_0_28px_rgba(255,255,255,0.28)]">
            <span className="sheen" />
            <span className="relative z-10">Get the App</span>
          </button>
        </div>
      </nav>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="top"
        onMouseMove={handleHeroMove}
        className="relative pt-40 pb-24 overflow-hidden min-h-screen flex items-center"
      >
        {/* Aurora glows — monochrome */}
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[70rem] h-[70rem] bg-[radial-gradient(circle,_rgba(255,255,255,0.10)_0%,_transparent_60%)] animate-aurora pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[36rem] h-[36rem] bg-[radial-gradient(circle,_rgba(255,255,255,0.06)_0%,_transparent_60%)] animate-aurora pointer-events-none" style={{ animationDelay: '-6s' }} />
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

        <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Copy */}
          <div className="flex flex-col items-start text-left">
            <div
              data-reveal
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-zinc-200 text-xs font-medium mb-7"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              The future of UPI is here
            </div>

            <h1
              data-reveal
              style={{ transitionDelay: '80ms' }}
              className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] mb-6"
            >
              Payments,
              <br />
              refined to
              <br />
              <span className="text-sheen">pure motion.</span>
            </h1>

            <p
              data-reveal
              style={{ transitionDelay: '160ms' }}
              className="text-lg text-zinc-400 mb-10 max-w-lg leading-relaxed"
            >
              Send money, track spending, and manage every account from one
              impossibly fast wallet — wrapped in bank-grade security.
            </p>

            <div data-reveal style={{ transitionDelay: '240ms' }} className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button className="btn-primary group relative overflow-hidden w-full sm:w-auto px-7 py-4 rounded-full bg-white text-black font-semibold text-[15px] flex items-center justify-center gap-2 transition-transform duration-300 active:scale-95 hover:shadow-[0_0_36px_rgba(255,255,255,0.3)]">
                <span className="sheen" />
                <span className="relative z-10 flex items-center gap-2">
                  Download Now
                  <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
              <button className="group w-full sm:w-auto px-7 py-4 rounded-full border border-white/15 bg-white/[0.02] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 hover:bg-white/[0.06] hover:border-white/30">
                View Web Wallet
                <ArrowUpRight className="w-4.5 h-4.5 text-zinc-400 transition-all duration-300 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>

            <div data-reveal style={{ transitionDelay: '320ms' }} className="flex items-center gap-3 mt-9 text-sm text-zinc-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className="w-7 h-7 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 border border-black" />
                ))}
              </div>
              <span>Trusted by <span className="text-white font-medium">2M+</span> people</span>
            </div>
          </div>

          {/* Phone mockup with parallax tilt */}
          <div
            data-reveal
            style={{ transitionDelay: '200ms' }}
            className="relative mx-auto lg:justify-self-end w-[300px] shrink-0 [perspective:1600px]"
          >
            {/* Soft floor shadow */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-black rounded-[50%] blur-2xl opacity-80 pointer-events-none" />

            <div
              ref={phoneRef}
              className="relative animate-float"
              style={{
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.3s ease-out',
              }}
            >
              {/* Rotating conic halo */}
              <div className="absolute -inset-3 rounded-[58px] blur-2xl opacity-25 conic-ring animate-spin-slow pointer-events-none" />

              {/* Titanium outer frame */}
              <div className="relative rounded-[52px] p-[10px] bg-gradient-to-b from-zinc-500/90 via-zinc-800 to-zinc-600/90 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
                {/* Side buttons */}
                <div className="absolute -left-[2px] top-[112px] w-[3px] h-7 bg-zinc-700 rounded-l-sm" />
                <div className="absolute -left-[2px] top-[150px] w-[3px] h-12 bg-zinc-700 rounded-l-sm" />
                <div className="absolute -left-[2px] top-[196px] w-[3px] h-12 bg-zinc-700 rounded-l-sm" />
                <div className="absolute -right-[2px] top-[168px] w-[3px] h-16 bg-zinc-700 rounded-r-sm" />

                {/* Inner black bezel */}
                <div className="rounded-[44px] bg-black p-[3px]">
                  {/* Screen */}
                  <div className="relative rounded-[42px] overflow-hidden bg-black aspect-[9/19.3] flex flex-col">
                    {/* Dynamic island */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[86px] h-[26px] bg-black rounded-full z-30 flex items-center justify-end pr-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    </div>
                    {/* Screen glare */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-br from-white/[0.07] via-transparent to-transparent" />
                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/40 z-30" />

                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-3.5 pb-1 text-white relative z-10">
                      <span className="text-[11px] font-semibold tracking-wide">9:41</span>
                      <div className="flex items-center gap-1.5">
                        <svg width="15" height="11" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
                        <svg width="14" height="11" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.4-1.5A11 11 0 0 0 8 .5 11 11 0 0 0 .6 3.4L2 4.9A8.6 8.6 0 0 1 8 2.5Zm0 4c1.2 0 2.3.5 3.1 1.3l1.4-1.5A6.6 6.6 0 0 0 8 4.5a6.6 6.6 0 0 0-4.5 1.8l1.4 1.5A4.6 4.6 0 0 1 8 6.5Zm0 4 2-2.1A2.7 2.7 0 0 0 8 8.5c-.8 0-1.5.3-2 .9L8 10.5Z"/></svg>
                        <div className="flex items-center gap-0.5">
                          <div className="w-[18px] h-[10px] rounded-[3px] border border-white/70 p-[1.5px]"><div className="w-full h-full bg-white rounded-[1px]" /></div>
                          <div className="w-[1.5px] h-[4px] bg-white/70 rounded-r-sm" />
                        </div>
                      </div>
                    </div>

                    {/* App content */}
                    <div className="flex-1 min-h-0 flex flex-col px-4 pt-3 pb-6 bg-black">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-b from-zinc-600 to-zinc-800" />
                        <div className="flex flex-col">
                          <span className="text-zinc-500 text-[10px]">Good Morning</span>
                          <span className="font-semibold text-[13px]">Sajibur Rahman</span>
                        </div>
                        <div className="ml-auto w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-white" />
                        </div>
                      </div>

                      {/* Silver monochrome card */}
                      <div
                        className="w-full p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between shadow-lg shrink-0"
                        style={{ height: '158px', background: 'linear-gradient(135deg, #f0f0f2 0%, #ccccd2 45%, #9a9aa0 100%)' }}
                      >
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/60 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center justify-between z-10">
                          <div className="text-lg font-black italic tracking-tighter text-zinc-900">VISA</div>
                          <div className="w-8 h-6 rounded-md border border-black/15 bg-gradient-to-br from-white/70 to-white/10" />
                        </div>
                        <div className="flex items-center gap-2 z-10 text-black/70 font-mono text-[11px] tracking-widest">
                          <span>••••</span><span>••••</span><span>••••</span><span className="font-bold text-black">5466</span>
                        </div>
                        <div className="flex flex-col z-10">
                          <span className="text-black/50 text-[9px] font-medium mb-0.5">Balance</span>
                          <span className="text-lg font-bold text-black tracking-tight leading-none">$7,868,986.00</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 my-4 shrink-0">
                        {[Wallet, Send, Zap, PieChart].map((Icon, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/60 flex items-center justify-center text-zinc-100 shadow-md">
                              <Icon className="w-[18px] h-[18px]" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 min-h-0 bg-[#131316] rounded-2xl p-3.5 border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[13px] font-medium">Transactions</span>
                          <span className="text-[10px] text-zinc-500">See all</span>
                        </div>
                        <div className="space-y-3">
                          {[['Henry James', '+$450.00'], ['Chris Michael', '+$250.00'], ['Ava Patel', '+$120.00']].map(([n, a], i) => (
                            <div key={i} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-b from-zinc-700 to-zinc-800" />
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-medium">{n}</span>
                                  <span className="text-[9px] text-zinc-500">10:30 AM</span>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold">{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Marquee trust strip                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative border-y border-white/10 py-8 overflow-hidden">
        <div className="flex w-max animate-marquee gap-16 pr-16 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center gap-16 pr-16 shrink-0">
              {['VISA', 'Mastercard', 'RuPay', 'UPI', 'PayNow', 'SWIFT'].map((brand) => (
                <span key={brand} className="text-2xl font-black italic tracking-tighter text-zinc-600 hover:text-white transition-colors">
                  {brand}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="features" className="py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span data-reveal className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Features</span>
            <h2 data-reveal style={{ transitionDelay: '80ms' }} className="text-4xl md:text-5xl font-semibold tracking-tight mt-3 mb-4">
              Everything you need.<br />Nothing you don't.
            </h2>
            <p data-reveal style={{ transitionDelay: '160ms' }} className="text-zinc-400 text-lg leading-relaxed">
              Every account, card, and transaction in one beautifully designed,
              lightning-fast surface.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: 'Instant UPI', desc: 'Scan, pay, and transfer in milliseconds — no spinners, no waiting.', icon: Zap },
              { title: 'Bank-Grade Security', desc: 'End-to-end encryption and biometric locks guard every rupee.', icon: ShieldCheck },
              { title: 'Anywhere Access', desc: 'Your funds and history, perfectly in sync across every device.', icon: Smartphone },
            ].map((feat, i) => (
              <div
                key={i}
                data-reveal
                style={{ transitionDelay: `${i * 100}ms` }}
                onMouseMove={onSpot}
                className="spotlight-card group glass rounded-3xl p-8 border-white/8 transition-all duration-500 hover:-translate-y-1.5 hover:border-white/20"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/10 text-white flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-white group-hover:text-black">
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feat.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Security split + stats                                             */}
      {/* ---------------------------------------------------------------- */}
      <section id="security" className="py-28 relative border-t border-white/10">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[30rem] h-[30rem] bg-[radial-gradient(circle,_rgba(255,255,255,0.05)_0%,_transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <span data-reveal className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Security</span>
            <h2 data-reveal style={{ transitionDelay: '80ms' }} className="text-4xl md:text-5xl font-semibold tracking-tight mt-3 mb-6">
              Built like a vault.<br />Feels like nothing.
            </h2>
            <p data-reveal style={{ transitionDelay: '160ms' }} className="text-zinc-400 text-lg leading-relaxed mb-8">
              Protection runs silently in the background so you never think about
              it — until the moment you need it.
            </p>
            <ul className="space-y-4">
              {[
                'AES-256 end-to-end encryption on every transfer',
                'Biometric & device-bound authentication',
                'Real-time fraud detection, on-device',
              ].map((item, i) => (
                <li
                  key={i}
                  data-reveal
                  style={{ transitionDelay: `${200 + i * 90}ms` }}
                  className="flex items-center gap-3 text-zinc-200"
                >
                  <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Security emblem */}
          <div data-reveal style={{ transitionDelay: '160ms' }} className="relative mx-auto">
            <div className="relative w-64 h-64 mx-auto">
              <div className="absolute inset-0 rounded-full border border-white/10" />
              <div className="absolute inset-6 rounded-full border border-white/10 animate-spin-slow" />
              <div className="absolute inset-0 rounded-full blur-2xl conic-ring animate-spin-slow opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 rounded-3xl bg-white text-black flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.25)]">
                  <Fingerprint className="w-14 h-14" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats band */}
        <div className="max-w-7xl mx-auto px-6 mt-24">
          <div className="hairline mb-12" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              ['2M+', 'Active users'],
              ['$4.8B', 'Processed monthly'],
              ['99.99%', 'Uptime'],
              ['0.2s', 'Avg. transfer'],
            ].map(([value, label], i) => (
              <div key={i} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="text-center md:text-left">
                <div className="text-4xl md:text-5xl font-semibold tracking-tight">{value}</div>
                <div className="text-zinc-500 text-sm mt-2">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Final CTA                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div
            data-reveal
            onMouseMove={onSpot}
            className="spotlight-card relative overflow-hidden rounded-[36px] border border-white/12 bg-gradient-to-b from-white/[0.06] to-transparent px-8 py-16 md:p-20 text-center"
          >
            <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-[radial-gradient(circle,_rgba(255,255,255,0.08)_0%,_transparent_60%)] pointer-events-none" />
            <h2 className="relative z-10 text-4xl md:text-6xl font-semibold tracking-tight mb-6">
              Move money like it's<br /><span className="text-sheen">weightless.</span>
            </h2>
            <p className="relative z-10 text-zinc-400 text-lg max-w-xl mx-auto mb-10">
              Join millions who've made the switch to the fastest wallet on the planet.
            </p>
            <button className="btn-primary group relative overflow-hidden z-10 px-8 py-4 rounded-full bg-white text-black font-semibold text-[15px] inline-flex items-center gap-2 transition-transform duration-300 active:scale-95 hover:shadow-[0_0_40px_rgba(255,255,255,0.35)]">
              <span className="sheen" />
              <span className="relative z-10 flex items-center gap-2">
                Get InstaPay Free
                <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                            */}
      {/* ---------------------------------------------------------------- */}
      <footer id="company" className="py-12 border-t border-white/10 bg-black relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
              <Zap className="w-4 h-4" fill="currentColor" />
            </span>
            <span className="text-xl font-black italic tracking-tighter">InstaPay</span>
          </div>
          <div className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} InstaPay. All rights reserved.
          </div>
          <div className="flex gap-7 text-sm font-medium text-zinc-400">
            {['Privacy', 'Terms', 'Contact'].map((l) => (
              <a key={l} href="#" className="transition-colors hover:text-white">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
