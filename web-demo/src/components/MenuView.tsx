interface MenuViewProps {
  onDisconnect: () => void;
}

export function MenuView({ onDisconnect }: MenuViewProps) {
  const items: { label: string; icon: React.ReactNode }[] = [
    {
      label: 'Profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      )
    },
    {
      label: 'Linked Bank Accounts',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
      )
    },
    {
      label: 'Security & PIN',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      )
    },
    {
      label: 'Notifications',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      )
    },
    {
      label: 'Help & Support',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      )
    }
  ];

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 bg-[#000000] text-white overflow-y-auto pb-[100px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-6">
        <h1 className="text-xl font-semibold">Menu</h1>
      </div>

      {/* Connected status */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 bg-[#1B1D22] border border-[#000000] rounded-2xl p-4">
          <div className="w-10 h-10 rounded-full bg-[#FFFFFF]/10 flex items-center justify-center text-[#FFFFFF]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"></path><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><path d="M5 13a10 10 0 0 1 14 0"></path><path d="M2 9.5a15 15 0 0 1 20 0"></path></svg>
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">Mobile connected</span>
            <span className="text-zinc-500 text-xs">Synced just now · iPhone 15</span>
          </div>
        </div>
      </div>

      {/* Menu list */}
      <div className="px-6 space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#1B1D22] border border-[#000000] text-left transition-colors hover:bg-[#000000]"
          >
            <div className="w-9 h-9 rounded-full bg-[#000000] flex items-center justify-center text-zinc-300">
              {item.icon}
            </div>
            <span className="flex-1 font-medium text-sm">{item.label}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        ))}
      </div>

      {/* Disconnect */}
      <div className="px-6 mt-8">
        <button
          onClick={onDisconnect}
          className="w-full py-4 rounded-2xl border border-red-500/30 text-red-400 font-semibold text-sm transition-colors hover:bg-red-500/10"
        >
          Disconnect wallet
        </button>
      </div>
    </div>
  );
}
