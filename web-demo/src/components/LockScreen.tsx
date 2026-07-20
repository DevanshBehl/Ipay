import { useState, useEffect } from 'react';
import { getMe, setLoginPin, verifyLoginPin } from '../utils/session';

interface LockScreenProps {
  onUnlock: () => void;
  onDisconnect: () => void;
}

type Mode = 'loading' | 'create' | 'confirm' | 'enter' | 'error';

export function LockScreen({ onUnlock, onDisconnect }: LockScreenProps) {
  const [mode, setMode] = useState<Mode>('loading');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => { if (!cancelled) setMode(me.hasLoginPin ? 'enter' : 'create'); })
      .catch(() => { if (!cancelled) { setMode('error'); setError('Could not reach InstaPay.'); } });
    return () => { cancelled = true; };
  }, []);

  const fail = (msg: string) => { setError(msg); setShake(true); setPin(''); setTimeout(() => setShake(false), 420); };

  const submit = async (fullPin: string) => {
    if (mode === 'create') { setFirstPin(fullPin); setPin(''); setError(null); setMode('confirm'); return; }
    if (mode === 'confirm') {
      if (fullPin !== firstPin) { setFirstPin(''); setMode('create'); fail('PINs did not match. Try again.'); return; }
      setBusy(true);
      try { await setLoginPin(fullPin); onUnlock(); }
      catch { setMode('create'); setFirstPin(''); fail('Could not save PIN. Try again.'); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true);
    const res = await verifyLoginPin(fullPin);
    setBusy(false);
    if (res.success) onUnlock(); else fail(res.error || 'Invalid login PIN');
  };

  const heading = mode === 'create' ? 'Create a login PIN' : mode === 'confirm' ? 'Confirm your PIN'
    : mode === 'enter' ? 'Welcome back' : mode === 'error' ? 'Connection error' : 'Unlocking…';
  const subtitle = mode === 'create' ? 'Set a 4-digit PIN to secure this wallet' : mode === 'confirm' ? 'Re-enter it to confirm'
    : mode === 'enter' ? 'Enter your PIN to unlock' : '';

  return (
    <div className="relative flex flex-col items-center h-full w-full px-7 pt-14 pb-9 overflow-hidden grain">
      <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[520px] h-[380px] bg-[radial-gradient(circle,rgba(255,255,255,0.09)_0%,transparent_62%)] animate-aurora" />

      <div className="relative z-[3] flex flex-col items-center w-full flex-1">
        <div className="w-14 h-14 rounded-[18px] glass flex items-center justify-center text-white mb-7 animate-pop">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>

        <h2 className="text-[22px] font-semibold tracking-tight">{heading}</h2>
        <p className="text-[var(--text-2)] text-[13.5px] mt-1.5 h-5">{subtitle}</p>

        <div className={`relative mt-9 mb-3 ${shake ? 'animate-shake' : ''}`}>
          <div className="flex gap-4 relative z-10 pointer-events-none">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-full transition-all duration-200"
                style={i < pin.length ? { background: '#fff', boxShadow: '0 0 0 4px rgba(255,255,255,0.1)' } : { background: 'transparent', border: '1.5px solid var(--line-strong)' }} />
            ))}
          </div>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              setPin(val);
              if (val.length === 4) setTimeout(() => submit(val), 130);
            }}
            disabled={busy || mode === 'loading' || mode === 'error'}
            className="absolute inset-0 w-full h-full opacity-0 text-[1px] cursor-text"
          />
        </div>

        <div className="h-5 mt-4 mb-4">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          {mode === 'loading' && <span className="text-[var(--text-3)] text-xs">Loading…</span>}
        </div>

        <div className="mt-auto" />

        <button onClick={onDisconnect} className="press mt-6 text-[var(--text-3)] text-[13px] font-medium hover:text-white transition-colors">
          Not you? Disconnect
        </button>
      </div>
    </div>
  );
}
