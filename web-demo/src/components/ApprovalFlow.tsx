import { useEffect, useState } from 'react';
import { setAuthToken } from '../utils/api';
import { loadSession, getMe, type Me } from '../utils/session';
import { getAccounts, sendPayment, getOrder, payOrder, type Account, type GatewayOrder } from '../utils/wallet';
import { formatINR } from '../utils/format';

type Mode = 'connect' | 'approve';

interface PendingReq {
  method: string;
  params: any;
  origin: string;
  rid: string;
}

// Read rid + mode from the approval window URL (#/connect?rid=... or #/approve?rid=...).
function parseHash(): { mode: Mode; rid: string } | null {
  const hash = window.location.hash; // e.g. #/approve?rid=abc
  const m = hash.match(/^#\/(connect|approve)\?rid=([^&]+)/);
  if (!m) return null;
  return { mode: m[1] as Mode, rid: decodeURIComponent(m[2]) };
}

const resolveRequest = (rid: string, payload: Record<string, unknown>) =>
  chrome.runtime.sendMessage({ type: 'resolveRequest', rid, ...payload });

export function ApprovalFlow() {
  const route = parseHash();
  const [req, setReq] = useState<PendingReq | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [order, setOrder] = useState<GatewayOrder | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'nosession' | 'error'>('loading');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!route) {
      setStatus('error');
      return;
    }
    const stored = loadSession();
    if (!stored) {
      setStatus('nosession');
      return;
    }
    setAuthToken(stored.jwt);

    (async () => {
      try {
        const pendingReq = (await chrome.runtime.sendMessage({ type: 'getRequest', rid: route.rid })) as PendingReq | null;
        if (!pendingReq) {
          setStatus('error');
          return;
        }
        setReq(pendingReq);
        const profile = await getMe();
        setMe(profile);
        if (route.mode === 'approve') {
          const accs = await getAccounts(profile._id);
          setAccount(accs[0] ?? null);
          // Gateway order: fetch the server-verified amount/payee (anti-tamper).
          if (pendingReq.params?.orderId) {
            setOrder(await getOrder(pendingReq.params.orderId));
          }
        }
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reject = async (code = 'user_rejected', message = 'Request rejected') => {
    if (route) await resolveRequest(route.rid, { approved: false, error: { code, message } });
    window.close();
  };

  const approveConnect = async () => {
    if (!route || !me) return;
    await resolveRequest(route.rid, { approved: true, account: { upiId: me.upiId, name: me.name } });
    window.close();
  };

  const approvePay = async () => {
    if (!route || !me || !account) return;
    setBusy(true);
    setError(null);
    try {
      let txn: { status: string; txnId?: string };
      if (order) {
        // Gateway order: pay by orderId; the backend charges the order's amount.
        const res = await payOrder(order.orderId, account._id, pin);
        txn = { status: res.status, txnId: res.paymentTxnId };
      } else {
        // Direct dApp pay (Phase 3): page-supplied amount/payee.
        txn = await sendPayment({
          senderUserId: me._id,
          senderBankAccountId: account._id,
          receiverUpiId: req!.params.payeeUpiId,
          amount: Number(req!.params.amount),
          upiPin: pin,
        });
      }
      await resolveRequest(route.rid, { approved: true, txn });
      window.close();
    } catch (e: any) {
      const backend = e?.response?.data?.error || '';
      const s = e?.response?.status;
      if (s === 401 && /session/i.test(backend)) {
        // Genuine session revocation mid-flow — tell the page and bail.
        await resolveRequest(route.rid, { approved: false, error: { code: 'session_terminated', message: 'Session terminated' } });
        window.close();
        return;
      }
      if (s === 409) {
        // Order already processed — not retryable.
        await resolveRequest(route.rid, { approved: false, error: { code: 'internal', message: 'Order already processed' } });
        window.close();
        return;
      }
      // Other errors (e.g. wrong UPI PIN → 401 "Invalid UPI PIN") stay retryable here.
      setError(backend || 'Payment failed');
      setBusy(false);
    }
  };

  // ---- render states ----
  if (status === 'loading') {
    return <Shell><p className="text-zinc-400 text-sm">Loading request…</p></Shell>;
  }
  if (status === 'nosession') {
    return (
      <Shell>
        <p className="text-white font-semibold mb-2">Wallet not set up</p>
        <p className="text-zinc-400 text-sm mb-6">Open the InstaPay extension and pair your mobile first.</p>
        <RejectBtn onClick={() => reject('not_setup', 'Wallet not set up')} label="Close" />
      </Shell>
    );
  }
  if (status === 'error' || !req) {
    return (
      <Shell>
        <p className="text-white font-semibold mb-2">Request unavailable</p>
        <p className="text-zinc-400 text-sm mb-6">This request has expired or is invalid.</p>
        <RejectBtn onClick={() => reject()} label="Close" />
      </Shell>
    );
  }

  const originHost = (() => {
    try {
      return new URL(req.origin).host;
    } catch {
      return req.origin;
    }
  })();

  if (route!.mode === 'connect') {
    return (
      <Shell>
        <OriginBadge host={originHost} />
        <h1 className="text-xl font-bold mt-4 mb-1 tracking-tight">Connect wallet</h1>
        <p className="text-[var(--text-2)] text-[13.5px] mb-6 text-center">
          <span className="text-white font-medium">{originHost}</span> wants to see your UPI ID.
        </p>
        <div className="w-full glass rounded-2xl p-4 mb-8">
          <p className="text-[var(--text-3)] text-xs">Account</p>
          <p className="text-white font-semibold tracking-tight">{me?.name}</p>
          <p className="text-[var(--text-2)] text-[13px] font-mono mt-0.5">{me?.upiId}</p>
        </div>
        <div className="w-full flex gap-3 mt-auto">
          <RejectBtn onClick={() => reject()} label="Reject" />
          <button onClick={approveConnect} className="btn btn-white press flex-1 font-bold py-3.5 rounded-2xl text-[14.5px]">
            <span className="sheen" /><span className="relative">Connect</span>
          </button>
        </div>
      </Shell>
    );
  }

  // approve (pay) — a gateway order takes its amount/payee/merchant from the
  // server-fetched order, never the page-supplied params.
  const amount = order ? order.amount : Number(req.params.amount);
  const payee = order ? order.payeeUpiId : String(req.params.payeeUpiId);
  const note = order ? order.note : req.params.note;

  return (
    <Shell>
      <OriginBadge host={originHost} />
      <h1 className="text-xl font-bold mt-4 mb-1 tracking-tight">Approve payment</h1>
      {order ? (
        <div className="flex items-center gap-1.5 mb-3 text-white text-[12px] font-medium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="10"></circle></svg>
          Verified order · {order.merchantName}
        </div>
      ) : (
        <p className="text-[var(--text-3)] text-[12px] mb-4">Requested by {originHost}</p>
      )}

      <div className="text-[42px] font-extrabold tracking-tight mb-1 text-sheen">{formatINR(amount)}</div>
      <p className="text-[var(--text-2)] text-[13px] mb-6">to <span className="font-mono text-white">{payee}</span></p>

      <div className="w-full glass rounded-2xl p-4 mb-4 space-y-2">
        {note && (
          <Row label="Note" value={String(note)} />
        )}
        {order && <Row label="Order" value={order.orderId} mono />}
        <Row label="From" value={account ? `${account.bankName} ****${account.accountNumber.slice(-4)}` : '—'} />
        <Row label="Payee" value={payee} mono />
      </div>

      <input
        autoFocus
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        placeholder="Enter UPI PIN"
        className="w-full bg-black border border-[var(--line-strong)] rounded-2xl px-4 py-3.5 text-lg tracking-[0.4em] text-center outline-none focus:border-white/40 transition-colors mb-2"
      />
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      <div className="w-full flex gap-3 mt-auto pt-4">
        <RejectBtn onClick={() => reject()} label="Reject" />
        <button
          onClick={approvePay}
          disabled={busy || pin.length < 4 || !account}
          className="btn btn-white press flex-1 font-bold py-3.5 rounded-2xl disabled:opacity-40 text-[14.5px]"
        >
          <span className="sheen" /><span className="relative">{busy ? 'Paying…' : 'Approve'}</span>
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center h-full w-full bg-black text-white px-7 pt-9 pb-7 overflow-y-auto no-scrollbar animate-fade-in grain">
      <div className="relative z-[3] w-full h-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

function OriginBadge({ host }: { host: string }) {
  return (
    <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
      <span className="text-[var(--text-2)] text-[12px] font-medium">{host}</span>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-3)] text-[13px]">{label}</span>
      <span className={`text-white text-[13px] text-right ${mono ? 'font-mono' : ''} truncate tracking-tight`}>{value}</span>
    </div>
  );
}

function RejectBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="press flex-1 bg-transparent text-[var(--text-2)] font-semibold py-3.5 rounded-2xl border border-[var(--line-strong)] hover:bg-white/5 transition-colors text-[14.5px]">
      {label}
    </button>
  );
}
