import { useWallet } from '../WalletContext';
import { formatINR } from '../utils/format';

const shortTime = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function StatisticView() {
  const { profile, transactions } = useWallet();
  const myUpi = profile?.upiId;
  const settled = transactions.filter((t) => t.status === 'SUCCESS');
  const received = settled.filter((t) => t.receiverUpiId === myUpi).reduce((s, t) => s + t.amount, 0);
  const sent = settled.filter((t) => t.senderUpiId === myUpi).reduce((s, t) => s + t.amount, 0);
  const net = received - sent;

  const recent = settled.slice(0, 7).reverse();
  const maxAmt = Math.max(1, ...recent.map((t) => t.amount));
  const bars = recent.map((t) => ({
    label: shortTime(t.createdAt),
    height: 14 + (t.amount / maxAmt) * 86,
    received: t.receiverUpiId === myUpi,
  }));

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 bg-black text-white overflow-y-auto no-scrollbar pb-6 grain">
      <div className="px-6 pt-7 pb-5 animate-fade-up relative z-[3]">
        <h1 className="text-[22px] font-bold tracking-tight">Statistics</h1>
      </div>

      {/* Net flow hero */}
      <div className="px-6 animate-fade-up relative z-[3]" style={{ animationDelay: '60ms' }}>
        <div className="card grain p-6">
          <div className="flex items-center gap-2 text-[var(--text-2)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white">Net Flow</span>
          </div>
          <p className="tnum text-[42px] font-extrabold mt-2 leading-none tracking-tight text-sheen">{formatINR(net)}</p>
          <p className="text-[var(--text-3)] text-[12px] mt-2">{settled.length} settled transaction{settled.length === 1 ? '' : 's'}</p>

          {/* chart */}
          <div className="mt-6 h-28 flex items-end justify-between gap-1.5">
            {bars.length === 0 ? (
              <div className="w-full text-center text-[var(--text-3)] text-xs self-center">No settled transactions</div>
            ) : (
              bars.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full max-w-[16px] rounded-full transition-all duration-700"
                    style={{ height: `${b.height}%`, background: b.received ? '#ffffff' : 'rgba(255,255,255,0.2)' }}
                  />
                  <span className="text-[9px] text-[var(--text-3)]">{b.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Received / Sent */}
      <div className="px-6 mt-5 grid grid-cols-2 gap-3 animate-fade-up relative z-[3]" style={{ animationDelay: '130ms' }}>
        <div className="glass rounded-3xl p-5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white mb-4">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
          </div>
          <p className="text-[var(--text-2)] text-[12px]">Received</p>
          <p className="tnum text-[19px] font-bold mt-0.5 tracking-tight">{formatINR(received, 0)}</p>
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="w-9 h-9 rounded-full glass-2 flex items-center justify-center text-white mb-4">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
          </div>
          <p className="text-[var(--text-2)] text-[12px]">Sent</p>
          <p className="tnum text-[19px] font-bold mt-0.5 tracking-tight">{formatINR(sent, 0)}</p>
        </div>
      </div>
    </div>
  );
}
