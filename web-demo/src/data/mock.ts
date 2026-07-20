// Remaining mock data for the extension wallet UI (INR).
//
// After Phase 2, the wallet's Home / History / Statistics / Notifications are
// backed by real backend data (see WalletContext). Only the "Send Money" screen
// is still mock, because it is non-functional until the window.upi flow lands
// in Phase 3/4.

export interface Contact {
  id: number;
  name: string;
  img: string;
  selected?: boolean;
}

export const defaultSendAmount = '6,342.49';
export const quickAmounts = [50, 100, 500, 1000, 1500];

export const sendContacts: Contact[] = [
  { id: 1, name: 'Mahesh', img: 'https://i.pravatar.cc/150?u=4', selected: false },
  { id: 2, name: 'Dinesh', img: 'https://i.pravatar.cc/150?u=5', selected: true },
  { id: 3, name: 'Roshan', img: 'https://i.pravatar.cc/150?u=6', selected: false },
  { id: 4, name: 'Pradeep', img: 'https://i.pravatar.cc/150?u=7', selected: false },
];
