import {
  DEBUG_LOGGING_ENABLED,
  EVENT_TRACKING_ENABLED
} from '../core/constants.ts';
import { state } from '../game/state.ts';

declare global {
  interface Window {
    sa_event?: (eventName: string, properties?: Record<string, any>) => void;
  }
}

export function debugLog(message: string, ...optionalParams: any[]) {
  if (DEBUG_LOGGING_ENABLED) {
    console.log(`[DEBUG][Tick ${state.tick}] ${message}`, ...optionalParams);
  }
}

export function trackEvent(eventName: string, meta: Record<string, any> = {}) {
  if (!EVENT_TRACKING_ENABLED) return;

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
        tick: state.tick,
        ...meta
      });
    } catch (e) {
      console.error('Error tracking event:', e);
    }
  }
}
