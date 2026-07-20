import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getMe, type Me } from './utils/session';
import { getAccounts, getHistory, type Account, type RawTxn } from './utils/wallet';

interface WalletData {
  loading: boolean;
  error: string | null;
  profile: Me | null;
  accounts: Account[];
  transactions: RawTxn[];
  refetch: () => void;
}

const WalletContext = createContext<WalletData | null>(null);

export function useWallet(): WalletData {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

// Loads real profile / accounts / history once the wallet is unlocked.
export function WalletProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Me | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<RawTxn[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setProfile(me);
      const [accs, txns] = await Promise.all([
        getAccounts(me._id).catch(() => []),
        me.upiId ? getHistory(me.upiId).catch(() => []) : Promise.resolve([]),
      ]);
      setAccounts(accs);
      setTransactions(txns);
    } catch {
      setError('Could not load wallet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <WalletContext.Provider value={{ loading, error, profile, accounts, transactions, refetch: load }}>
      {children}
    </WalletContext.Provider>
  );
}
