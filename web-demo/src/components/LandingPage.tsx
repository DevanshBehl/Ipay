import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { setAuthToken } from '../utils/api';
import { createPairing, pollStatus, saveSession } from '../utils/session';
import { Zap, Lock, ArrowRight, Check } from 'lucide-react';

interface LandingPageProps {
  onSetupComplete: () => void;
}

const POLL_INTERVAL_MS = 2500;

export function LandingPage({ onSetupComplete }: LandingPageProps) {
  const [showQR, setShowQR] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionTokenRef = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const beginPairing = useCallback(async () => {
    setError(null);
    setPairingCode(null);
    try {
      const { sessionToken, pairingCode } = await createPairing();
      sessionTokenRef.current = sessionToken;
      setPairingCode(pairingCode);
    } catch {
      setError('Could not reach InstaPay. Is the backend running?');
    }
  }, []);

  useEffect(() => {
    if (!showQR) return;
    beginPairing();
    pollTimer.current = setInterval(async () => {
      const token = sessionTokenRef.current;
      if (!token) return;
      try {
        const res = await pollStatus(token);
        if (res.status === 'ACTIVE' && res.token) {
          stopPolling();
          saveSession({ sessionToken: token, jwt: res.token });
          setAuthToken(res.token);
          onSetupComplete();
        } else if (res.status === 'EXPIRED' || res.status === 'TERMINATED') {
          beginPairing();
        }
      } catch {
        setError('Lost connection while waiting. Retrying…');
      }
    }, POLL_INTERVAL_MS);
    return () => stopPolling();
  }, [showQR, beginPairing, stopPolling, onSetupComplete]);

  const qrValue = pairingCode ? `instapay://connect?code=${pairingCode}` : '';

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden grain bg-black text-white">
      {/* Ambient aurora */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[440px] bg-[radial-gradient(circle,rgba(255,255,255,0.10)_0%,transparent_60%)] animate-aurora" />
      <div className="pointer-events-none absolute bottom-[-6rem] right-[-4rem] w-[320px] h-[320px] bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_60%)] animate-aurora" style={{ animationDelay: '-6s' }} />

      {!showQR ? (
        <div className="relative z-[3] flex flex-col flex-1 px-6 pt-12 pb-8 items-center text-center">
          <div className="flex items-center gap-2 mb-4 reveal">
            <span className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center">
              <Zap className="w-5 h-5" fill="currentColor" />
            </span>
            <span className="text-[28px] font-black italic tracking-tighter">InstaPay</span>
          </div>

          <div className="flex-1 flex items-center justify-center w-full reveal" style={{ animationDelay: '100ms' }}>
            {/* Wrapper to prevent 560px width from stretching layout while scaled */}
            <div className="relative w-[308px] h-[320px]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform scale-[0.52] w-[560px] [perspective:2200px]">
                {/* Soft floor shadow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-10 bg-black rounded-[50%] blur-2xl opacity-80 pointer-events-none" />

                <div className="relative animate-float" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(8deg) rotateY(-8deg)' }}>
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
                          {/* Extension toolbar icon */}
                          <div className="w-[17px] h-[17px] rounded-md bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-900/20 shrink-0">
                            <Zap className="w-2.5 h-2.5 text-white" fill="currentColor" />
                          </div>
                        </div>

                        {/* Checkout page */}
                        <div className="flex-1 min-h-0 bg-[#f4f4f7] flex">
                          <div className="w-[52%] p-3.5 flex flex-col">
                            <div className="flex items-center gap-1.5 mb-3">
                              <div className="w-5 h-5 rounded-md bg-zinc-900 flex items-center justify-center text-white text-[10px] font-black">N</div>
                              <span className="text-[11px] font-semibold text-zinc-900 text-left">Nova Store</span>
                            </div>
                            <span className="text-[8px] text-zinc-500 mb-0.5 uppercase tracking-wide text-left">Order total</span>
                            <span className="text-[22px] font-bold text-zinc-900 leading-none mb-3 text-left">₹2,499.00</span>
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

                          <div className="flex-1 bg-white border-l border-black/5 p-3 flex flex-col">
                            <span className="text-[8px] font-medium text-zinc-400 uppercase tracking-wide mb-2 text-left">Pay with</span>
                            <div className="rounded-lg border-[1.5px] border-zinc-900 bg-zinc-50 p-1.5 flex items-center gap-1.5 mb-1.5">
                              <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center shrink-0">
                                <Zap className="w-3 h-3 text-white" fill="currentColor" />
                              </div>
                              <div className="flex flex-col min-w-0 text-left">
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

                        {/* ===== InstaPay extension popup ===== */}
                        <div className="absolute top-[32px] right-2.5 w-[46%] rounded-xl bg-[#0a0a0c] border border-white/12 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.8)] overflow-hidden z-20">
                          <div className="absolute -top-1 right-2 w-2 h-2 rotate-45 bg-[#0a0a0c] border-l border-t border-white/12" />
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-white/8">
                            <div className="w-3.5 h-3.5 rounded bg-white flex items-center justify-center">
                              <Zap className="w-2 h-2 text-black" fill="currentColor" />
                            </div>
                            <span className="text-[8px] font-black italic text-white">InstaPay</span>
                            <span className="ml-auto flex items-center gap-1 text-[6.5px] text-zinc-500">
                              <span className="w-1 h-1 rounded-full bg-white" /> Secure
                            </span>
                          </div>
                          <div className="px-3 py-2.5 flex flex-col items-center text-center">
                            <span className="text-[7.5px] text-zinc-500 mb-0.5">Approve payment to</span>
                            <span className="text-[9px] font-semibold text-white mb-2">Nova Store</span>
                            <span className="text-[19px] font-bold text-white leading-none mb-1">₹2,499.00</span>
                            <span className="text-[7px] text-zinc-500 mb-2.5">UPI · HDFC Bank ••5466</span>
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

                  {/* ===== Phone in front ===== */}
                  <div className="absolute -bottom-5 -right-1 w-[120px] rotate-[-4deg] z-40">
                    <div className="rounded-[26px] p-[6px] bg-gradient-to-b from-zinc-500 to-zinc-700 shadow-[0_24px_44px_-12px_rgba(0,0,0,0.95)]">
                      <div className="rounded-[22px] bg-black p-[2px]">
                        <div className="relative rounded-[20px] overflow-hidden bg-black aspect-[9/19.3] flex flex-col items-center justify-center px-3 text-center">
                          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-3 bg-black rounded-full ring-1 ring-white/5 z-10" />
                          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center mb-2.5 shadow-[0_0_24px_rgba(255,255,255,0.35)]">
                            <Check className="w-6 h-6 text-black" strokeWidth={3} />
                          </div>
                          <span className="text-[10px] font-semibold text-white">Payment Successful</span>
                          <span className="text-[17px] font-bold text-white leading-none mt-1.5">₹2,499.00</span>
                          <span className="text-[7.5px] text-zinc-500 mt-1.5">Paid to Nova Store</span>
                          <div className="mt-2.5 px-2 py-0.5 rounded-full bg-white/10 text-[6.5px] text-zinc-400">UPI Ref · 482093QK</div>
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full bg-white/40" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-7 w-full reveal" style={{ animationDelay: '200ms' }}>
            <button onClick={() => setShowQR(true)} className="btn-primary w-full font-semibold py-4 rounded-2xl text-[15.5px] bg-white text-black relative overflow-hidden flex items-center justify-center transition-transform active:scale-95">
              <span className="sheen" /><span className="relative z-10">Set up wallet</span>
            </button>
            <p className="text-center text-[var(--text-3)] text-[11px] mt-4 opacity-70">Simulated prototype · no real money</p>
          </div>
        </div>
      ) : (
        <div className="relative z-[3] flex flex-col flex-1 px-6 pt-16 pb-8 items-center text-center animate-slide-up">
          <button onClick={() => { stopPolling(); setShowQR(false); }} className="absolute top-6 left-6 press w-9 h-9 rounded-full glass flex items-center justify-center text-[var(--text-2)]">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          <h2 className="text-[24px] font-semibold tracking-tight mt-3">Scan to connect</h2>
          <p className="text-[var(--text-2)] text-[14px] mt-2.5 leading-relaxed max-w-[17rem]">
            Open InstaPay on your phone and scan this code to link this browser.
          </p>

          <div className="flex-1 flex items-center justify-center mt-6 mb-6">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-white/10 blur-2xl" />
              <div className="relative p-4 rounded-[26px] bg-white shadow-[0_30px_60px_-24px_rgba(255,255,255,0.35)]">
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={186} fgColor="#050506" />
                ) : (
                  <div className="w-[186px] h-[186px] flex items-center justify-center text-zinc-400 text-sm">{error ? 'Error' : 'Generating…'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2.5 h-6">
            {error ? (
              <span className="text-red-400 text-xs text-center">{error}</span>
            ) : (
              <>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-60 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
                </span>
                <span className="text-[var(--text-2)] text-[13px]">Waiting for scan…</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
