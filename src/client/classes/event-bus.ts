import { Event } from 'ts-typed-events';

export type EventMap = Record<string, Event<any>>;

/**
 * Generic types for EventBus methods to reduce repetition
 */
export type EventBusOn<TEvents extends Record<string, Event<any>>> = <
  K extends keyof TEvents
>(
  key: K,
  listener: TEvents[K] extends Event<infer T> ? (data: T) => void : never
) => () => void;

export type EventBusEmit<TEvents extends Record<string, Event<any>>> = <
  K extends keyof TEvents
>(
  key: K,
  ...args: TEvents[K] extends Event<void>
    ? [] | [undefined]
    : [TEvents[K] extends Event<infer T> ? T : never]
) => void;

export class EventBus<T extends EventMap> {
  protected _events: T;

  constructor(eventMap: T) {
    this._events = eventMap;
  }

  /**
   * Register a listener for a specific event
   * @param key - The event key from the map
   * @param listener - The callback function to invoke when the event is emitted
   */
  on<K extends keyof T>(
    type: K,
    listener: T[K] extends Event<infer T> ? (data: T) => void : never
  ) {
    this._events[type].on(listener);
    return () => {
      this._events[type].off(listener);
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
    ...args: T[K] extends Event<void>
      ? [] | [undefined]
      : [T[K] extends Event<infer T> ? T : never]
  ): void {
    this._events[key].emit(args[0] as any);
  }

  /**
   * Clear all listeners for all events
   */
  clear() {
    for (const key in this._events) {
      this._events[key].offAll();
    }
  }
}
