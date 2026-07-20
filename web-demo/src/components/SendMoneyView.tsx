import { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { getContacts, sendPayment, type Contact } from '../utils/wallet';
import { formatINR } from '../utils/format';

interface SendMoneyViewProps {
  onBack: () => void;
}

type Step = 'recipient' | 'amount' | 'pin' | 'success';

const initials = (s?: string) => (s || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function SendMoneyView({ onBack }: SendMoneyViewProps) {
  const { profile, accounts, refetch } = useWallet();
  const account = accounts[0];

  const [step, setStep] = useState<Step>('recipient');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<{ upiId: string; name?: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txnId, setTxnId] = useState<string | undefined>();

  useEffect(() => {
    if (profile?._id) getContacts(profile._id).then(setContacts).catch(() => {});
  }, [profile?._id]);

  const filtered = contacts.filter(
    (c) => c.name?.toLowerCase().includes(query.toLowerCase()) || c.upiId?.toLowerCase().includes(query.toLowerCase())
  );
  const queryIsUpi = /@/.test(query.trim());

  const pick = (upiId: string, name?: string) => {
    setRecipient({ upiId, name });
    setError(null);
    setStep('amount');
  };

  const amountNum = Number(amount) || 0;

  const pay = async () => {
    if (!profile || !account || !recipient || pin.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      const res = await sendPayment({
        senderUserId: profile._id,
        senderBankAccountId: account._id,
        receiverUpiId: recipient.upiId,
        amount: amountNum,
        upiPin: pin,
      });
      setTxnId(res.txnId);
      setStep('success');
      refetch();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  const Header = ({ title, back }: { title: string; back: () => void }) => (
    <div className="flex items-center gap-4 px-6 pt-7 pb-4">
      <button onClick={back} className="press w-10 h-10 rounded-full glass flex items-center justify-center text-[var(--text-2)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <h1 className="text-[17px] font-bold tracking-tight">{title}</h1>
    </div>
  );

  // ---- SUCCESS ----
  if (step === 'success') {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center bg-black text-white px-8 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.22)] animate-pop">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="animate-draw" d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-[var(--text-2)] text-[13px] mt-8">Paid to {recipient?.name || recipient?.upiId}</p>
        <p className="tnum text-[42px] font-extrabold mt-1 text-sheen">{formatINR(amountNum)}</p>
        {txnId && <p className="text-[var(--text-3)] text-[11px] mt-3 font-mono">ref {txnId.slice(-10)}</p>}
        <button onClick={onBack} className="btn btn-white press w-full max-w-[280px] mt-12 font-bold py-4 rounded-2xl text-[15px]">
          <span className="sheen" /><span className="relative">Done</span>
        </button>
      </div>
    );
  }

  // ---- PIN ----
  if (step === 'pin') {
    return (
      <div className="flex-1 w-full flex flex-col bg-black text-white animate-slide-up">
        <Header title="Confirm payment" back={() => { setPin(''); setError(null); setStep('amount'); }} />
        <div className="flex-1 flex flex-col items-center px-7 pt-4">
          <div className="w-14 h-14 rounded-full glass flex items-center justify-center font-bold text-[18px] text-white">{initials(recipient?.name || recipient?.upiId)}</div>
          <p className="tnum text-[42px] font-extrabold mt-4 tracking-tight">{formatINR(amountNum)}</p>
          <p className="text-[var(--text-2)] text-[13px] mt-1">to {recipient?.name || recipient?.upiId}</p>
          <p className="text-[var(--text-3)] text-[12px] mt-1">from {account?.bankName} ···· {account?.accountNumber.slice(-4)}</p>

          <input
            autoFocus type="password" inputMode="numeric" maxLength={6} value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter UPI PIN"
            className="w-full max-w-[260px] mt-9 bg-black border border-[var(--line-strong)] rounded-2xl px-4 py-3.5 text-lg tracking-[0.4em] text-center outline-none focus:border-white/40 transition-colors"
          />
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </div>
        <div className="px-6 pb-7">
          <button onClick={pay} disabled={busy || pin.length < 4} className="btn btn-white press w-full font-bold py-4 rounded-2xl disabled:opacity-40 text-[15.5px]">
            <span className="sheen" /><span className="relative">{busy ? 'Paying…' : `Pay ${formatINR(amountNum)}`}</span>
          </button>
        </div>
      </div>
    );
  }

  // ---- AMOUNT ----
  if (step === 'amount') {
    return (
      <div className="flex-1 w-full flex flex-col bg-black text-white animate-slide-up">
        <Header title="Enter amount" back={() => { setAmount(''); setStep('recipient'); }} />
        <div className="flex flex-col items-center px-7 pt-2">
          <div className="w-12 h-12 rounded-full glass flex items-center justify-center font-bold text-[14px] text-white">{initials(recipient?.name || recipient?.upiId)}</div>
          <p className="text-[14px] font-semibold mt-3">{recipient?.name || recipient?.upiId}</p>
          <p className="text-[var(--text-3)] text-[12px] font-mono mt-0.5">{recipient?.upiId}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="flex items-start">
            <span className="text-[28px] font-bold text-[var(--text-2)] mt-3 mr-1">₹</span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if (val.split('.').length > 2) return;
                if (val.includes('.') && val.split('.')[1].length > 2) return;
                setAmount(val);
              }}
              placeholder="0"
              className="bg-transparent text-[56px] font-extrabold tracking-tight outline-none w-full max-w-[200px] py-2"
              style={{ width: `${Math.max(1, amount.length) * 32}px`, lineHeight: '1.2' }}
            />
          </div>
        </div>

        <div className="px-6 pb-7 mt-auto">
          <button onClick={() => amountNum > 0 && setStep('pin')} disabled={amountNum <= 0} className="btn btn-white press w-full font-bold py-4 rounded-2xl disabled:opacity-40 text-[15.5px]">
            <span className="sheen" /><span className="relative">Continue</span>
          </button>
        </div>
      </div>
    );
  }

  // ---- RECIPIENT ----
  return (
    <div className="flex-1 w-full flex flex-col bg-black text-white animate-fade-in min-h-0 grain">
      <Header title="Send money" back={onBack} />
      <div className="px-6 relative z-[3]">
        <div className="flex items-center gap-2.5 glass rounded-2xl px-4 py-3.5 focus-within:border-white/20 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or UPI ID"
            className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--text-3)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 mt-5 pb-6 relative z-[3]">
        {queryIsUpi && !filtered.some((c) => c.upiId === query.trim()) && (
          <button onClick={() => pick(query.trim())} className="press w-full flex items-center gap-3.5 py-3">
            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
            </div>
            <div className="text-left">
              <p className="text-[14.5px] font-semibold tracking-tight">Pay this UPI ID</p>
              <p className="text-[var(--text-3)] text-[12px] font-mono mt-0.5">{query.trim()}</p>
            </div>
          </button>
        )}

        <p className="text-[12px] font-semibold text-[var(--text-3)] uppercase tracking-[0.1em] mt-3 mb-2">Contacts</p>
        {filtered.length === 0 ? (
          <p className="text-[var(--text-3)] text-[13px] py-6 text-center">No contacts found</p>
        ) : (
          filtered.map((c) => (
            <button key={c._id} onClick={() => pick(c.upiId!, c.name)} className="press w-full flex items-center gap-3.5 py-2.5">
              <div className="w-11 h-11 rounded-full glass flex items-center justify-center font-bold text-[13px] text-white">{initials(c.name)}</div>
              <div className="text-left min-w-0">
                <p className="text-[14.5px] font-medium truncate tracking-tight">{c.name}</p>
                <p className="text-[var(--text-3)] text-[12px] font-mono truncate mt-0.5">{c.upiId}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
