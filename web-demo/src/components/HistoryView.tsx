import { useWallet } from '../WalletContext';
import { formatSignedINR } from '../utils/format';

interface HistoryViewProps {
  open: boolean;
  onClose: () => void;
}

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function HistoryView({ open, onClose }: HistoryViewProps) {
  const { profile, transactions } = useWallet();
  const myUpi = profile?.upiId;

  return (
    <div
      className={`absolute inset-0 z-[60] flex flex-col bg-[var(--surface-1)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-white/15"></div>
      </div>

      <div className="flex items-center justify-between px-6 pt-3 pb-4 shrink-0">
        <h2 className="text-[19px] font-bold text-white tracking-tight">Transactions</h2>
        <button onClick={onClose} className="press w-9 h-9 rounded-full glass flex items-center justify-center text-[var(--text-2)]" aria-label="Close">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-8">
        {transactions.length === 0 ? (
          <div className="text-center text-[var(--text-3)] text-sm py-20">No transactions yet</div>
        ) : (
          transactions.map((tx) => {
            const positive = tx.receiverUpiId === myUpi;
            const counterparty = positive ? tx.senderUpiId : tx.receiverUpiId;
            const failed = tx.status === 'FAILED';
            return (
              <div key={tx._id} className="flex items-center gap-3 py-3 border-b border-[var(--line)] last:border-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${positive ? 'bg-white/10 text-white' : 'glass-2 text-white'}`}>
                  {positive
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14.5px] text-white truncate tracking-tight">{counterparty}</p>
                  <p className="text-[var(--text-3)] text-[12px]">{failed ? 'Failed' : positive ? 'Received' : 'Sent'} · {timeAgo(tx.createdAt)}</p>
                </div>
                <span className={`tnum font-semibold text-[14.5px] ${failed ? 'text-[var(--text-3)] line-through' : 'text-white'}`}>
                  {formatSignedINR(tx.amount, positive)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
