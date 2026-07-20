import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../WalletContext';
import { revealBalance } from '../utils/wallet';
import { formatINR } from '../utils/format';

interface HomeViewProps {
  onOpenNotifications?: () => void;
  onSend?: () => void;
}

const initials = (name?: string) =>
  (name || 'IP').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function HomeView({ onOpenNotifications, onSend }: HomeViewProps) {
  const { loading, error, profile, accounts } = useWallet();

  const [accIndex, setAccIndex] = useState(0);
  const account = accounts[accIndex] || accounts[0];

  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  const doReveal = async () => {
    if (!profile || !account || pin.length < 4) return;
    setBusy(true);
    setPinError(null);
    try {
      const bal = await revealBalance(profile._id, account._id, pin);
      setBalance(bal);
      setPinOpen(false);
      setPin('');
      setTimeout(() => setBalance(null), 15000);
    } catch (err: any) {
      setPinError(err?.response?.data?.error || 'Invalid UPI PIN');
    } finally {
      setBusy(false);
    }
  };

  const actions = [
    { label: 'Send', onClick: onSend, primary: true, icon: <path d="M12 19V5M5 12l7-7 7 7" /> },
    { label: 'Receive', onClick: () => setShowRequest(true), icon: <path d="M12 5v14M19 12l-7 7-7-7" /> },
  ];

  return (
    <div className="relative flex-1 w-full flex flex-col min-h-0 overflow-hidden">
      {/* Ambient aurora */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[420px] bg-[radial-gradient(circle,rgba(255,255,255,0.08)_0%,transparent_62%)] animate-aurora" />

      <div className="relative z-[1] flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar pb-6">
        {/* Status / top bar — generous breathing room from the top edge */}
        <div className="flex items-center justify-between px-6 pt-7 pb-6 reveal">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full glass flex items-center justify-center text-[13px] font-semibold">
              {initials(profile?.name)}
            </div>
            <div>
              <p className="text-[var(--text-3)] text-[12px] leading-none">{greeting()}</p>
              <p className="font-semibold text-[15px] leading-tight mt-1.5 tracking-tight">{profile?.name || '—'}</p>
            </div>
          </div>
          <button onClick={onOpenNotifications} className="press w-10 h-10 rounded-full glass flex items-center justify-center text-[var(--text-2)] relative">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-white" />
          </button>
        </div>

        {/* Detailed Account Card */}
        <div className="px-6 reveal" style={{ animationDelay: '70ms' }}>
          <div className="card grain overflow-hidden p-6 relative min-h-[220px] flex flex-col justify-between">
            {/* Top Row */}
            <div className="relative z-[3] flex items-center justify-between">
              <span className="text-[17px] font-bold italic tracking-wide text-white">InstaPay</span>
              <span className="text-[15px] font-bold text-white tracking-wide drop-shadow-md">{account?.bankName || 'No account'}</span>
            </div>

            {/* Account Number */}
            <div className="relative z-[3] mt-8 mb-6">
              <p className="text-[18px] font-semibold text-white tracking-[0.2em] drop-shadow-sm">
                {account ? String(account.accountNumber).replace(/(.{4})/g, '$1  ').trim() : 'XXXX  XXXX  XXXX'}
              </p>
            </div>

            {/* Bottom Row */}
            <div className="relative z-[3] flex items-end justify-between mt-auto">
              <div>
                <p className="text-[9px] font-semibold text-white/55 tracking-[0.15em] uppercase mb-1">Account Holder</p>
                <p className="text-[13px] font-bold text-white tracking-wide">
                  {account ? (account.accountHolderName || profile?.name || '—').toUpperCase() : '—'}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[9px] font-semibold text-white/55 tracking-[0.15em] uppercase mb-1">Balance</p>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
                  ) : error ? (
                    <span className="text-red-400 text-xs">{error}</span>
                  ) : balance !== null ? (
                    <span className="text-[16px] font-extrabold text-sheen animate-pop">{formatINR(balance)}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-bold text-white tracking-widest">XXXX</span>
                      {account && (
                        <button onClick={() => { setPinOpen(true); setPin(''); setPinError(null); }} className="press text-white/70 hover:text-white transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {accounts.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => { setAccIndex((i) => (i - 1 + accounts.length) % accounts.length); setBalance(null); }}
                className="press w-8 h-8 rounded-full glass-2 flex items-center justify-center text-white/70 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <div className="flex items-center gap-1.5">
                {accounts.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === accIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/30'}`} />
                ))}
              </div>
              <button
                onClick={() => { setAccIndex((i) => (i + 1) % accounts.length); setBalance(null); }}
                className="press w-8 h-8 rounded-full glass-2 flex items-center justify-center text-white/70 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 mt-6 grid grid-cols-2 gap-3 reveal" style={{ animationDelay: '140ms' }}>
          {actions.map((a) => (
            <button key={a.label} onClick={a.onClick} className="press flex flex-col items-center gap-2.5 py-4 rounded-2xl bg-[#1e1e1e]/60 backdrop-blur-xl border border-white/10 hover:bg-[#2a2a2a]/60 shadow-lg">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.primary ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-white/10 text-white shadow-sm'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{a.icon}</svg>
              </div>
              <span className="text-[13px] font-semibold text-white tracking-wide drop-shadow-md">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* UPI PIN reveal modal */}
      {pinOpen && (
        <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setPinOpen(false)}>
          <div className="w-full glass rounded-t-[28px] p-6 pb-7 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mb-5" />
            <h3 className="text-[17px] font-semibold tracking-tight mb-1">Enter UPI PIN</h3>
            <p className="text-[var(--text-2)] text-[13px] mb-5">Verify to view your balance</p>
            <input
              autoFocus type="password" inputMode="numeric" value={pin} maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-black/40 border border-[var(--line-strong)] rounded-2xl px-4 py-3.5 text-lg tracking-[0.5em] text-center outline-none focus:border-white/40 transition-colors"
              placeholder="••••"
            />
            {pinError && <p className="text-red-400 text-xs mt-2">{pinError}</p>}
            <button onClick={doReveal} disabled={busy || pin.length < 4} className="btn btn-white w-full mt-5 font-semibold py-3.5 rounded-2xl disabled:opacity-40"><span className="sheen" /><span className="relative">{busy ? 'Verifying…' : 'Reveal balance'}</span></button>
          </div>
        </div>
      )}

      {/* Request (receive) modal */}
      {showRequest && (
        <div className="absolute inset-0 z-[70] bg-black/65 backdrop-blur-md flex items-end animate-fade-in" onClick={() => setShowRequest(false)}>
          <div className="w-full glass rounded-t-[28px] p-6 pb-8 animate-slide-up flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full bg-white/20 mb-5" />
            <h3 className="text-[17px] font-semibold tracking-tight">Receive money</h3>
            <p className="text-[var(--text-2)] text-[13px] mb-5">Scan to pay {profile?.name}</p>
            <div className="p-4 bg-white rounded-[20px]">
              <QRCodeSVG value={`upi://pay?pa=${profile?.upiId}&pn=${encodeURIComponent(profile?.name || '')}&cu=INR`} size={168} fgColor="#050506" />
            </div>
            <p className="tnum text-[14px] font-medium mt-5 text-[var(--text-2)]">{profile?.upiId}</p>
          </div>
        </div>
      )}
    </div>
  );
}
