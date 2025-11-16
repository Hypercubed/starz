import { EVENT_TRACKING_ENABLED } from "./constants";
import { state } from "./state";

declare global {
  interface Window {
    sa_event?: (eventName: string, properties?: Record<string, any>) => void;
  }
}

export function trackEvent(eventName: string) {
  if (!EVENT_TRACKING_ENABLED) return;

  let count = 1;
  try {
    count = parseInt(localStorage.getItem(eventName) ?? "0", 10) + 1;
  } catch (e) {
    console.error("Error reading event count from localStorage:", e);
  }
  localStorage.setItem(eventName, count + "");

  if (window && window.sa_event) {
    try {
      window.sa_event(eventName, { [eventName]: count, tick: state.tick });
    } catch (e) {
      console.error("Error tracking event:", e);
    }
  }
}
