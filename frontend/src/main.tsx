import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <App />
      {/* react-toastify is already a dependency and used throughout (e.g.
          components/admin/JobCategoryManagement.tsx) but had no
          <ToastContainer /> mounted anywhere, so none of those toast()
          calls were actually rendering. Added once here, at the root. */}
      <ToastContainer position="bottom-right" autoClose={3500} />
    </QueryClientProvider>
);
