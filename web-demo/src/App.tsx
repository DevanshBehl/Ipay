import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { HomeView } from './components/HomeView';
import { StatisticView } from './components/StatisticView';
import { SendMoneyView } from './components/SendMoneyView';
import { MenuView } from './components/MenuView';
import { HistoryView } from './components/HistoryView';
import { NotificationView } from './components/NotificationView';
import { BottomNav, type TabId } from './components/BottomNav';

type Stage = 'setup' | 'wallet';

function App() {
  const [stage, setStage] = useState<Stage>('setup');
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showSend, setShowSend] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
          <LandingPage onSetupComplete={() => setStage('wallet')} />
        ) : showSend ? (
          <SendMoneyView onBack={() => setShowSend(false)} />
        ) : (
          <>
            {activeTab === 'home' && <HomeView onOpenNotifications={() => setShowNotifications(true)} />}
            {activeTab === 'statistic' && <StatisticView />}
            {activeTab === 'menu' && <MenuView onDisconnect={() => setStage('setup')} />}

            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} historyOpen={showHistory} />

            <HistoryView open={showHistory} onClose={() => setShowHistory(false)} />

            <NotificationView open={showNotifications} onClose={() => setShowNotifications(false)} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
