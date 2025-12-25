import { DEBUG_LOGGING_ENABLED, EVENT_TRACKING_ENABLED } from '../constants.ts';

declare global {
  interface Window {
    sa_event?: (eventName: string, properties?: Record<string, any>) => void;
  }
}

export function debugLog(message: string, ...optionalParams: any[]) {
  const tick = globalThis.gameManager?.getContext()?.tick ?? null;

  if (DEBUG_LOGGING_ENABLED) {
    console.log(`[DEBUG][Tick ${tick}] ${message}`, ...optionalParams);
  }
}

export function trackEvent(eventName: string, meta: Record<string, any> = {}) {
  if (!EVENT_TRACKING_ENABLED) return;

  const tick = globalThis.gameManager?.getContext()?.tick ?? null;

  let count = 1;
  try {
    count = parseInt(localStorage.getItem(eventName) ?? '0', 10) + 1;
  } catch (e) {
    console.error('Error reading event count from localStorage:', e);
  }
  localStorage.setItem(eventName, count + '');

  if (window && window.sa_event) {
    try {
      window.sa_event(eventName, {
        [eventName]: count,
        tick,
        ...meta
      });
    } catch (e) {
      console.error('Error tracking event:', e);
    }
  }
}
