/**
 * EventBus class to manage event subscriptions and emissions
 * using MiniSignal for event handling.
 */

import { MiniSignal } from 'mini-signals';

export type EventMap = Record<string, MiniSignal<[any]>>;

/**
 * Generic types for EventBus methods to reduce repetition
 */
export type EventBusOn<T extends EventMap> = <K extends keyof T>(
  key: K,
  listener: T[K] extends MiniSignal<infer A> ? (...args: A) => void : never
) => () => void;

export type EventBusEmit<T extends EventMap> = <K extends keyof T>(
  key: K,
  ...args: T[K] extends MiniSignal<[void | undefined]>
    ? [] | [undefined]
    : [T[K] extends MiniSignal<infer A> ? A[0] : never]
) => void;

export class EventBus<T extends EventMap> {
  protected _events: T;

  constructor(eventMap: T) {
    this._events = eventMap;
  }

  protected addEvents(eventMap: EventMap) {
    this._events = {
      ...this._events,
      ...eventMap
    };
  }

  /**
   * Register a listener for a specific event
   * @param key - The event key from the map
   * @param listener - The callback function to invoke when the event is emitted
   */
  on<K extends keyof T>(
    type: K,
    listener: T[K] extends MiniSignal<infer A> ? (...args: A) => void : never
  ) {
    const binding = this._events[type].add(listener);
    return () => {
      this._events[type].detach(binding);
    };
  }

  /**
   * Emit an event with data
   * @param key   * Emit an event with data
   * @param key - The event key from the map
   * @param data - The data to pass to listeners (optional for void events)
   */
  emit<K extends keyof T>(
    key: K,
    ...args: T[K] extends MiniSignal<[void | undefined]>
      ? [] | [undefined]
      : [T[K] extends MiniSignal<infer A> ? A[0] : never]
  ): void {
    this._events[key].dispatch(args[0]);
  }

  /**
   * Clear all listeners for all events
   */
  clear() {
    for (const key in this._events) {
      this._events[key].detachAll();
    }
  }
}

export function createEvent<T>(): MiniSignal<[T]> {
  return new MiniSignal<[T]>();
}
