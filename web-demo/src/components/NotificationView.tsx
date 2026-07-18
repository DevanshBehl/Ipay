import { notifications } from '../data/mock';
import { formatSignedINR } from '../utils/format';

interface NotificationViewProps {
  open: boolean;
  onClose: () => void;
}

function ReceivedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
  );
}

function SentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  );
}

export function NotificationView({ open, onClose }: NotificationViewProps) {
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div
      className={`absolute inset-0 z-[60] flex flex-col bg-[#0B0B0D] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      {/* Grab handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 rounded-full bg-zinc-700"></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-2 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="text-[10px] font-semibold bg-[#8fb400] text-black rounded-full px-2 py-0.5">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-300 transition-transform active:scale-95 hover:bg-[#1B1D22]"
          aria-label="Close notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Notification list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-8 space-y-3">
        {notifications.map((n, i) => {
          const received = n.kind === 'received';
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 rounded-2xl ${n.unread ? 'bg-[#1B1D22]' : 'bg-[#141518]'}`}
            >
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  received ? 'bg-[#8fb400]/15 text-[#8fb400]' : 'bg-zinc-700/30 text-zinc-300'
                }`}
              >
                {received ? <ReceivedIcon /> : <SentIcon />}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-base text-white truncate">{n.title}</span>
                  {n.unread && <span className="w-2 h-2 rounded-full bg-[#8fb400] shrink-0"></span>}
                </div>
                <span className="text-zinc-500 text-xs truncate">{n.detail}</span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className={`font-semibold text-base ${received ? 'text-[#8fb400]' : 'text-white'}`}>{formatSignedINR(n.amount, received)}</span>
                <span className="text-zinc-500 text-xs">{n.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
