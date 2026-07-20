import { useWallet } from '../WalletContext';
import { formatSignedINR } from '../utils/format';

interface NotificationViewProps {
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

export function NotificationView({ open, onClose }: NotificationViewProps) {
  const { profile, transactions } = useWallet();
  const myUpi = profile?.upiId;

  const notifications = transactions.slice(0, 15).map((tx) => {
    const received = tx.receiverUpiId === myUpi;
    const counterparty = received ? tx.senderUpiId : tx.receiverUpiId;
    return {
      id: tx._id,
      received,
      title: received ? 'Payment received' : 'Payment sent',
      detail: `${received ? 'From' : 'To'} ${counterparty}`,
      amount: tx.amount,
      time: timeAgo(tx.createdAt),
    };
  });

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
        <div className="flex items-center gap-2.5">
          <h2 className="text-[19px] font-bold text-white tracking-tight">Notifications</h2>
          {notifications.length > 0 && (
            <span className="tnum text-[10px] font-bold bg-white text-black rounded-full px-2 py-0.5">{notifications.length}</span>
          )}
        </div>
        <button onClick={onClose} className="press w-9 h-9 rounded-full glass flex items-center justify-center text-[var(--text-2)]" aria-label="Close">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-6 pb-8 space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center text-[var(--text-3)] text-sm py-20">Nothing here yet</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-3.5 rounded-2xl glass">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.received ? 'bg-white/10 text-white' : 'glass-2 text-white'}`}>
                {n.received
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[14px] text-white truncate tracking-tight">{n.title}</p>
                <p className="text-[var(--text-3)] text-[12px] truncate">{n.detail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`tnum font-semibold text-[14px] text-white`}>{formatSignedINR(n.amount, n.received)}</p>
                <p className="text-[var(--text-3)] text-[11px]">{n.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
