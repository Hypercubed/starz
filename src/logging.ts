import { EVENT_TRACKING_ENABLED } from "./constants";

export function trackEvent(eventName: string) {
  if (!EVENT_TRACKING_ENABLED) return;

  let count = 1;
  try {
    count = parseInt(localStorage.getItem(eventName) ?? '0', 10)+1;
  } catch (e) {
    console.error("Error reading event count from localStorage:", e);
  }
  localStorage.setItem(eventName, count + '');
  
  // @ts-ignore
  if (window && window['sa_event']) {
    try {
      // @ts-ignore
      window['sa_event'](eventName, { [eventName]: count });
    } catch (e) {
      console.error("Error tracking event:", e);
    }
  }
}