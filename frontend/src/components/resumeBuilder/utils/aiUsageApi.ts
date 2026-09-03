import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

/**
 * Fires a "resume built/downloaded" event to the backend so the admin AI
 * Center can show real usage numbers. Deliberately fire-and-forget:
 * a network hiccup here must never block or fail the actual PDF download.
 */
export function logResumeBuild(templateId: string, templateName?: string, action: 'created' | 'downloaded' = 'downloaded') {
  const token = localStorage.getItem('token');

  axios
    .post(
      `${API_BASE_URL}/api/ai-usage/log-resume-build`,
      { templateId, templateName, action },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    )
    .catch(() => {
      // Intentionally ignored — usage logging is best-effort only.
    });
}