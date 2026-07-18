// Centralized mock data for the extension wallet UI (all amounts in INR).
//
// Phase 0 note: this is still static/mock data, but it now lives in ONE place
// and is INR-denominated. Phases 1–2 will replace these exports with values
// fetched from the backend via `../utils/api`, ideally without touching the
// components that consume them.

export interface Contact {
  id: number;
  name: string;
  img: string;
  selected?: boolean;
}

export interface HistoryTxn {
  name: string;
  time: string;
  amount: number; // INR, always positive; use `positive` for direction
  positive: boolean;
  type: string;
  img: string;
}

export interface AppNotification {
  kind: 'sent' | 'received';
  title: string;
  detail: string;
  amount: number; // INR, always positive
  time: string;
  unread: boolean;
}

export const currentUser = {
  name: 'Sajibur Rahman',
  greeting: 'Good Morning',
  avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
};

export const primaryCard = {
  network: 'VISA',
  last4: '5466',
  balance: 786898.67, // INR
};

export const defaultSendAmount = '6,342.49';
export const quickAmounts = [50, 100, 500, 1000, 1500];

export const sendContacts: Contact[] = [
  { id: 1, name: 'Mahesh', img: 'https://i.pravatar.cc/150?u=4', selected: false },
  { id: 2, name: 'Dinesh', img: 'https://i.pravatar.cc/150?u=5', selected: true },
  { id: 3, name: 'Roshan', img: 'https://i.pravatar.cc/150?u=6', selected: false },
  { id: 4, name: 'Pradeep', img: 'https://i.pravatar.cc/150?u=7', selected: false },
];

export const transactions: HistoryTxn[] = [
  { name: 'Henry James', time: 'Today, 10:30 AM', amount: 450, positive: true, type: 'Deposit', img: 'https://i.pravatar.cc/150?u=1' },
  { name: 'Chris Michael', time: 'Today, 10:00 AM', amount: 250, positive: true, type: 'Deposit', img: 'https://i.pravatar.cc/150?u=2' },
  { name: 'Spotify Premium', time: 'Today, 08:12 AM', amount: 129, positive: false, type: 'Subscription', img: 'https://i.pravatar.cc/150?u=10' },
  { name: 'Dinesh Maisha', time: 'Yesterday', amount: 340, positive: true, type: 'Deposit', img: 'https://i.pravatar.cc/150?u=3' },
  { name: 'Amazon', time: 'Yesterday', amount: 1284, positive: false, type: 'Shopping', img: 'https://i.pravatar.cc/150?u=11' },
  { name: 'Sophia Turner', time: 'Jul 16', amount: 750, positive: false, type: 'Transfer', img: 'https://i.pravatar.cc/150?u=4' },
  { name: 'Uber', time: 'Jul 16', amount: 216, positive: false, type: 'Travel', img: 'https://i.pravatar.cc/150?u=12' },
  { name: 'Marcus Lee', time: 'Jul 15', amount: 12000, positive: true, type: 'Salary', img: 'https://i.pravatar.cc/150?u=5' },
  { name: 'Netflix', time: 'Jul 14', amount: 199, positive: false, type: 'Subscription', img: 'https://i.pravatar.cc/150?u=13' },
  { name: 'Olivia Brown', time: 'Jul 13', amount: 900, positive: true, type: 'Deposit', img: 'https://i.pravatar.cc/150?u=6' },
];

export const notifications: AppNotification[] = [
  { kind: 'received', title: 'Payment Received', detail: 'From Henry James', amount: 450, time: 'Just now', unread: true },
  { kind: 'sent', title: 'Payment Successful', detail: 'To Sophia Turner', amount: 750, time: '5 min ago', unread: true },
  { kind: 'received', title: 'Payment Received', detail: 'From Chris Michael', amount: 250, time: '1 hour ago', unread: true },
  { kind: 'sent', title: 'Payment Successful', detail: 'To Amazon', amount: 1284, time: 'Yesterday', unread: false },
  { kind: 'received', title: 'Payment Received', detail: 'From Marcus Lee — Salary', amount: 12000, time: 'Jul 15', unread: false },
  { kind: 'sent', title: 'Payment Successful', detail: 'To Uber', amount: 216, time: 'Jul 16', unread: false },
  { kind: 'received', title: 'Payment Received', detail: 'From Olivia Brown', amount: 900, time: 'Jul 13', unread: false },
];

export const statistics = {
  total: 67545.23,
  totalWithdrawal: 60500,
  totalDeposit: 20500,
  gridLabels: ['₹30K', '₹20K', '₹10K', '₹0K'],
  bars: [
    { label: 'Jan', height: '40%' },
    { label: 'Feb', height: '55%' },
    { label: 'Mar', height: '85%', active: true },
    { label: 'Apr', height: '45%' },
    { label: 'May', height: '60%' },
    { label: 'Jun', height: '35%' },
  ],
};
