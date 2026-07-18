import axios from 'axios';

// Base URL for the InstaPay backend. Override via a `.env` file (see .env.example)
// with VITE_API_BASE_URL; defaults to the standardized local dev port (5001).
export const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach/clear the JWT the extension obtains once its session is paired &
// unlocked (Phase 1/2 will call this). Kept in sync with the mobile client's API.
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
