import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ShieldCheck, Zap,
  Smartphone, Fingerprint, ArrowUpRight, Check, Lock,
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

          {/* Device composition: MacBook (checkout + extension) + phone (result) */}
          <div
            data-reveal
            style={{ transitionDelay: '200ms' }}
            className="relative mx-auto w-full max-w-[560px] [perspective:2200px]"
          >
            {/* Soft floor shadow */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-10 bg-black rounded-[50%] blur-2xl opacity-80 pointer-events-none" />

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
              <div className="absolute -inset-8 rounded-[40px] blur-3xl opacity-20 conic-ring animate-spin-slow pointer-events-none" />

              {/* ============================= MacBook ============================= */}
              <div className="relative">
                {/* Lid / screen */}
                <div className="relative mx-auto w-[92%] rounded-t-[20px] rounded-b-[5px] bg-gradient-to-b from-zinc-700 to-zinc-800 p-[10px] pb-[12px] shadow-[0_36px_70px_-28px_rgba(0,0,0,0.95)]">
                  {/* Camera */}
                  <div className="absolute top-[4px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-600 ring-1 ring-black/40" />

                  {/* Screen */}
                  <div className="relative rounded-[7px] overflow-hidden bg-white aspect-[16/10] flex flex-col">
                    {/* Browser chrome */}
                    <div className="h-[26px] bg-[#dcdce1] flex items-center gap-2 px-2.5 shrink-0 border-b border-black/10">
                      <div className="flex gap-1.5">
                        <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]" />
                        <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e]" />
                        <span className="w-[9px] h-[9px] rounded-full bg-[#28c840]" />
                      </div>
                      <div className="flex-1 mx-1.5 h-[15px] rounded-full bg-white/95 border border-black/10 flex items-center gap-1 px-2">
                        <Lock className="w-2 h-2 text-zinc-500" />
                        <span className="text-[8px] text-zinc-500 truncate">checkout.novastore.in/pay</span>
                      </div>
                      {/* Extension toolbar icon (highlighted / active) */}
                      <div className="w-[17px] h-[17px] rounded-md bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-900/20 shrink-0">
                        <Zap className="w-2.5 h-2.5 text-white" fill="currentColor" />
                      </div>
                    </div>

                    {/* Checkout page */}
                    <div className="flex-1 min-h-0 bg-[#f4f4f7] flex">
                      {/* Left: order summary */}
                      <div className="w-[52%] p-3.5 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-3">
                          <div className="w-5 h-5 rounded-md bg-zinc-900 flex items-center justify-center text-white text-[10px] font-black">N</div>
                          <span className="text-[11px] font-semibold text-zinc-900">Nova Store</span>
                        </div>
                        <span className="text-[8px] text-zinc-500 mb-0.5 uppercase tracking-wide">Order total</span>
                        <span className="text-[22px] font-bold text-zinc-900 leading-none mb-3">₹2,499.00</span>
                        <div className="space-y-1.5">
                          {[['Wireless Earbuds', '₹1,999'], ['Express Shipping', '₹500']].map(([label, price]) => (
                            <div key={label} className="flex items-center justify-between text-[8.5px]">
                              <span className="text-zinc-500">{label}</span>
                              <span className="text-zinc-700 font-medium">{price}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center gap-1 text-[7.5px] text-zinc-400">
                          <Lock className="w-2 h-2" /> Secured by InstaPay
                        </div>
                      </div>

                      {/* Right: payment method */}
                      <div className="flex-1 bg-white border-l border-black/5 p-3 flex flex-col">
                        <span className="text-[8px] font-medium text-zinc-400 uppercase tracking-wide mb-2">Pay with</span>
                        <div className="rounded-lg border-[1.5px] border-zinc-900 bg-zinc-50 p-1.5 flex items-center gap-1.5 mb-1.5">
                          <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center shrink-0">
                            <Zap className="w-3 h-3 text-white" fill="currentColor" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[8.5px] font-semibold text-zinc-900 leading-tight">InstaPay UPI</span>
                            <span className="text-[7px] text-zinc-500 truncate">sajibur@okinstapay</span>
                          </div>
                          <div className="ml-auto w-3 h-3 rounded-full border-[1.5px] border-zinc-900 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                          </div>
                        </div>
                        <div className="rounded-lg border border-black/10 p-1.5 flex items-center gap-1.5 mb-1.5 opacity-45">
                          <div className="w-5 h-5 rounded bg-zinc-200 shrink-0" />
                          <span className="text-[8.5px] font-medium text-zinc-600">Credit / Debit Card</span>
                        </div>
                        <button className="mt-auto w-full py-1.5 rounded-lg bg-zinc-900 text-white text-[9.5px] font-semibold">
                          Pay ₹2,499.00
                        </button>
                      </div>
                    </div>

                    {/* ===== InstaPay extension popup (signing the transaction) ===== */}
                    <div className="absolute top-[32px] right-2.5 w-[46%] rounded-xl bg-[#0a0a0c] border border-white/12 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-20 animate-float">
                      {/* little pointer to the toolbar icon */}
                      <div className="absolute -top-1 right-2 w-2 h-2 rotate-45 bg-[#0a0a0c] border-l border-t border-white/12" />
                      {/* Header */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/8">
                        <div className="w-3.5 h-3.5 rounded bg-white flex items-center justify-center">
                          <Zap className="w-2 h-2 text-black" fill="currentColor" />
                        </div>
                        <span className="text-[8px] font-black italic text-white">InstaPay</span>
                        <span className="ml-auto flex items-center gap-1 text-[6.5px] text-zinc-500">
                          <span className="w-1 h-1 rounded-full bg-white" /> Secure
                        </span>
                      </div>
                      {/* Body */}
                      <div className="px-3 py-2.5 flex flex-col items-center text-center">
                        <span className="text-[7.5px] text-zinc-500 mb-0.5">Approve payment to</span>
                        <span className="text-[9px] font-semibold text-white mb-2">Nova Store</span>
                        <span className="text-[19px] font-bold text-white leading-none mb-1">₹2,499.00</span>
                        <span className="text-[7px] text-zinc-500 mb-2.5">UPI · HDFC Bank ••5466</span>
                        {/* slide to approve */}
                        <div className="w-full h-6 rounded-full bg-white/[0.07] border border-white/12 relative flex items-center px-0.5">
                          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow">
                            <ArrowRight className="w-3 h-3 text-black" />
                          </div>
                          <span className="flex-1 text-center text-[7.5px] text-zinc-300 font-medium">Slide to approve</span>
                        </div>
                      </div>
                    </div>

                    {/* Screen glare */}
                    <div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
                  </div>
                </div>

                {/* Base / deck */}
                <div className="relative mx-auto w-full h-[11px] bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-700 rounded-b-[10px] rounded-t-[2px]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[15%] h-[4px] bg-zinc-600 rounded-b-md" />
                </div>
                {/* Front lip shadow */}
                <div className="mx-auto w-[72%] h-[3px] bg-black/50 blur-[2px] rounded-b-full" />
              </div>

              {/* ===== Phone in front (transaction result) ===== */}
              <div className="absolute -bottom-5 -right-1 w-[120px] rotate-[-4deg] z-40">
                <div className="rounded-[26px] p-[6px] bg-gradient-to-b from-zinc-500 to-zinc-700 shadow-[0_24px_44px_-12px_rgba(0,0,0,0.95)]">
                  <div className="rounded-[22px] bg-black p-[2px]">
                    <div className="relative rounded-[20px] overflow-hidden bg-black aspect-[9/19.3] flex flex-col items-center justify-center px-3 text-center">
                      {/* Dynamic island */}
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-3 bg-black rounded-full ring-1 ring-white/5 z-10" />
                      {/* Success glow */}
                      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center mb-2.5 shadow-[0_0_24px_rgba(255,255,255,0.35)]">
                        <Check className="w-6 h-6 text-black" strokeWidth={3} />
                      </div>
                      <span className="text-[10px] font-semibold text-white">Payment Successful</span>
                      <span className="text-[17px] font-bold text-white leading-none mt-1.5">₹2,499.00</span>
                      <span className="text-[7.5px] text-zinc-500 mt-1.5">Paid to Nova Store</span>
                      <div className="mt-2.5 px-2 py-0.5 rounded-full bg-white/10 text-[6.5px] text-zinc-400">UPI Ref · 482093QK</div>
                      {/* Home indicator */}
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full bg-white/40" />
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
