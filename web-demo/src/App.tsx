import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './components/LandingPage';
import { LockScreen } from './components/LockScreen';
import { HomeView } from './components/HomeView';
import { StatisticView } from './components/StatisticView';
import { SendMoneyView } from './components/SendMoneyView';
import { MenuView } from './components/MenuView';
import { HistoryView } from './components/HistoryView';
import { NotificationView } from './components/NotificationView';
import { BottomNav, type TabId } from './components/BottomNav';
import { ApprovalFlow } from './components/ApprovalFlow';
import { WalletProvider } from './WalletContext';
import { setAuthToken } from './utils/api';
import { loadSession, clearSession, pollStatus, sessionSocketUrl } from './utils/session';

type Stage = 'setup' | 'locked' | 'wallet';

// A WebSocket gives instant revocation; the slow poll is only a fallback for
// when the socket is down. (An MV3 popup only listens while it is open.)
const WALLET_POLL_INTERVAL_MS = 30000;
const WS_RECONNECT_MS = 3000;

// When opened as an approval popup window (index.html#/connect | #/approve),
// render the approval flow instead of the wallet.
const isApprovalWindow = /^#\/(connect|approve)\b/.test(window.location.hash);

function App() {
  if (isApprovalWindow) return <ApprovalFlow />;

  // Resume to the lock screen if we already hold a stored session. The JWT is
  // applied synchronously here so child effects (e.g. LockScreen's /auth/me)
  // see it before they run.
  const [stage, setStage] = useState<Stage>(() => {
    const stored = loadSession();
    if (stored) {
      setAuthToken(stored.jwt);
      return 'locked';
    }
    return 'setup';
  });
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showSend, setShowSend] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const disconnect = useCallback(() => {
    clearSession();
    setStage('setup');
    setActiveTab('home');
    setShowSend(false);
  }, []);

  // Watch for revocation whenever we hold a session (locked or unlocked), so a
  // phone-side terminate kicks even the lock screen back to pairing.
  useEffect(() => {
    if (stage === 'setup') return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByUs = false;

    const connect = () => {
      const stored = loadSession();
      if (!stored) {
        disconnect();
        return;
      }
      socket = new WebSocket(sessionSocketUrl(stored.sessionToken));

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'terminated') {
            closedByUs = true;
            disconnect();
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = () => {
        // Unexpected drop — retry so revocation stays near-instant (the effect
        // cleanup sets closedByUs when we leave this stage). The poll fallback
        // covers the gap until we reconnect.
        if (!closedByUs) {
          reconnectTimer = setTimeout(connect, WS_RECONNECT_MS);
        }
      };
    };

    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [stage, disconnect]);

  // Fallback: slow poll in case the socket is unavailable.
  useEffect(() => {
    if (stage === 'setup') return;

    const check = async () => {
      const stored = loadSession();
      if (!stored) {
        disconnect();
        return;
      }
      try {
        const res = await pollStatus(stored.sessionToken);
        if (res.status !== 'ACTIVE') disconnect();
      } catch {
        // Network hiccup — leave the session in place and retry next tick.
      }
    };

    const timer = setInterval(check, WALLET_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [stage, disconnect]);

  const handleTabChange = (tab: TabId) => {
    if (tab === 'history') {
      // The center clock button toggles the transaction-history panel.
      setShowHistory(prev => !prev);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="h-full w-full">
      {/* Extension popup surface — fills the 380x600 popup */}
      <div className="relative w-full h-full bg-[#000000] overflow-hidden flex flex-col">
        {stage === 'setup' ? (
          <LandingPage onSetupComplete={() => setStage('locked')} />
        ) : stage === 'locked' ? (
          <LockScreen onUnlock={() => setStage('wallet')} onDisconnect={disconnect} />
        ) : (
          <WalletProvider>
            {showSend ? (
              <SendMoneyView onBack={() => setShowSend(false)} />
            ) : (
              <>
                {activeTab === 'home' && <HomeView onOpenNotifications={() => setShowNotifications(true)} onSend={() => setShowSend(true)} />}
                {activeTab === 'statistic' && <StatisticView />}
                {activeTab === 'menu' && <MenuView onDisconnect={disconnect} onLock={() => setStage('locked')} />}

                <BottomNav activeTab={activeTab} onTabChange={handleTabChange} historyOpen={showHistory} />

                <HistoryView open={showHistory} onClose={() => setShowHistory(false)} />

                <NotificationView open={showNotifications} onClose={() => setShowNotifications(false)} />
              </>
            )}
          </WalletProvider>
        )}
      </div>
    </div>
  );
}

export default App;
