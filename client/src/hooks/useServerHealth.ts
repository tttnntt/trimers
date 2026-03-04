import { useEffect, useState } from 'react';
import { checkHealth } from '../api/client';

export function useServerHealth() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const check = async () => {
      const ok = await checkHealth();
      if (!cancelled) {
        setReady(ok);
        setChecking(false);
        if (!ok && attempts < maxAttempts) {
          attempts++;
          setTimeout(() => check(), 5000);
        }
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  return { ready, checking };
}
