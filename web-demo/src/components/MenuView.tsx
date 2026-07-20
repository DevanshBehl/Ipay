import { useState } from 'react';
import { useWallet } from '../WalletContext';
import { setLoginPin } from '../utils/session';

interface MenuViewProps {
  onDisconnect: () => void;
  onLock?: () => void;
}

const initials = (name?: string) =>
  (name || 'IP').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

type ViewState = 'main' | 'accounts' | 'pin';

export function MenuView({ onDisconnect, onLock }: MenuViewProps) {
  const { profile, accounts } = useWallet();
  const [view, setView] = useState<ViewState>('main');

  const [newPin, setNewPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const handleSetPin = async () => {
    if (newPin.length !== 4) return;
    setBusy(true);
    setPinError(null);
    try {
      await setLoginPin(newPin);
      setPinSuccess(true);
      setNewPin('');
      setTimeout(() => { setPinSuccess(false); setView('main'); }, 2000);
    } catch (err: any) {
      setPinError('Failed to update PIN');
    } finally {
      setBusy(false);
    }
  };

  const Header = ({ title, back }: { title: string; back?: () => void }) => (
    <div className="flex items-center gap-4 px-6 pt-7 pb-4 relative z-[3] animate-fade-up">
      {back && (
        <button onClick={back} className="press w-10 h-10 rounded-full glass flex items-center justify-center text-[var(--text-2)] -ml-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      )}
      <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
    </div>
  );

  if (view === 'accounts') {
    return (
      <div className="flex-1 w-full flex flex-col min-h-0 bg-black text-white overflow-y-auto no-scrollbar pb-6 grain animate-slide-up">
        <Header title="Linked accounts" back={() => setView('main')} />
        <div className="px-6 mt-2 relative z-[3]">
          {accounts.map((acc, i) => (
            <div key={i} className="flex flex-col gap-1.5 p-5 rounded-2xl glass mb-3">
              <span className="text-[15px] font-bold tracking-tight text-white">{acc.bankName}</span>
              <span className="text-[13px] font-mono text-[var(--text-3)]">
                {String(acc.accountNumber).replace(/(.{4})/g, '$1 ').trim()}
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-white/50 uppercase mt-2">{acc.accountHolderName || profile?.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'pin') {
    return (
      <div className="flex-1 w-full flex flex-col min-h-0 bg-black text-white overflow-y-auto no-scrollbar pb-6 grain animate-slide-up">
        <Header title="Login PIN" back={() => setView('main')} />
        <div className="px-6 mt-4 relative z-[3]">
          <p className="text-[13.5px] text-[var(--text-2)] mb-6">Enter a new 4-digit PIN to secure this browser wallet.</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full bg-black/40 border border-[var(--line-strong)] rounded-2xl px-4 py-4 text-xl tracking-[0.5em] text-center outline-none focus:border-white/40 transition-colors mb-4"
          />
          {pinError && <p className="text-red-400 text-xs mb-4 text-center">{pinError}</p>}
          {pinSuccess && <p className="text-green-400 text-xs mb-4 text-center">PIN successfully updated!</p>}
          <button
            onClick={handleSetPin}
            disabled={busy || newPin.length !== 4 || pinSuccess}
            className="btn btn-white press w-full font-bold py-4 rounded-2xl disabled:opacity-40 text-[15.5px]"
          >
            <span className="sheen" /><span className="relative">{busy ? 'Updating…' : 'Update PIN'}</span>
          </button>
        </div>
      </div>
    );
  }

  const items: { label: string; sub: string; icon: React.ReactNode; onClick?: () => void }[] = [
    {
      label: 'Accounts', sub: `${accounts.length} bank account${accounts.length === 1 ? '' : 's'}`, onClick: () => setView('accounts'),
      icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><line x1="2" y1="10" x2="22" y2="10" /></svg>,
    },
    {
      label: 'Login PIN', sub: 'Change browser unlock PIN', onClick: () => setView('pin'),
      icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    },
    {
      label: 'Help & support', sub: 'FAQ and contact',
      icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
  ];

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 bg-black text-white overflow-y-auto no-scrollbar pb-6 grain">
      <Header title="Wallet" />

      <div className="px-6 animate-fade-up relative z-[3]" style={{ animationDelay: '60ms' }}>
        <div className="card grain p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center font-bold text-[17px] shadow-[0_0_24px_rgba(255,255,255,0.2)]">{initials(profile?.name)}</div>
          <div className="min-w-0">
            <p className="font-semibold text-[16px] truncate tracking-tight">{profile?.name || '—'}</p>
            <p className="text-[var(--text-3)] text-[13px] font-mono truncate">{profile?.upiId}</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-5 animate-fade-up relative z-[3]" style={{ animationDelay: '110ms' }}>
        <div className="flex items-center gap-2.5 glass rounded-2xl px-4 py-3">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-60 animate-ping"></span>
            <span className="relative inline-flex w-2 h-2 rounded-full bg-white"></span>
          </span>
          <span className="text-[13px] font-medium tracking-tight">Paired &amp; active</span>
          <span className="text-[var(--text-3)] text-[12px] ml-auto">this browser</span>
        </div>
      </div>

      <div className="px-6 mt-4 space-y-2 animate-fade-up relative z-[3]" style={{ animationDelay: '160ms' }}>
        {items.map((item, i) => (
          <button key={i} onClick={item.onClick} className="press w-full flex items-center gap-3.5 p-4 rounded-2xl glass text-left">
            <div className="w-10 h-10 rounded-full glass-2 flex items-center justify-center text-[var(--text-2)]">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[14px] tracking-tight">{item.label}</p>
              <p className="text-[var(--text-3)] text-[12px]">{item.sub}</p>
            </div>
            {item.onClick && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
          </button>
        ))}
      </div>

      <div className="px-6 mt-6 mb-4 relative z-[3] flex flex-col gap-3">
        {onLock && (
          <button onClick={onLock} className="press w-full py-4 rounded-2xl glass text-white font-semibold text-[14px]">
            Lock wallet
          </button>
        )}
        <button onClick={onDisconnect} className="press w-full py-4 rounded-2xl border border-red-500/25 text-red-400 font-semibold text-[14px] hover:bg-red-500/10 transition-colors">
          Disconnect wallet
        </button>
      </div>
    </div>
  );
}
