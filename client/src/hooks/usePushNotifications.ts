import { useEffect, useState } from 'react';
import { pushApi } from '../api/client';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!supported || !VAPID_KEY) return false;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as BufferSource
      });
      await pushApi.subscribe(sub.toJSON());
      return true;
    } catch (e) {
      console.error('Push subscribe failed:', e);
      return false;
    }
  };

  return { supported, permission, requestPermission };
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
