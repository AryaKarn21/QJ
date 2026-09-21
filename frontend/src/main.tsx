import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Handle dynamic import failures caused by new deployments / stale chunk hashes.
// When a chunk fails to load, Vite emits 'vite:preloadError'. We safely reload the page
// so the user fetches the newly deployed chunk without getting a blank screen.
window.addEventListener('vite:preloadError', () => {
  const retryKey = 'vite_preload_reload';
  const lastReload = sessionStorage.getItem(retryKey);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(retryKey, String(now));
    window.location.reload();
  }
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <App />
      <ToastContainer position="bottom-right" autoClose={3500} />
    </QueryClientProvider>
);
