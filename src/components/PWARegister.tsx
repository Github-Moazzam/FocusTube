'use client';
import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          function(registration) { console.log('SW registered'); },
          function(err) { console.log('SW failed', err); }
        );
      });
    }
  }, []);
  return null;
}
