export type Listener<T> = (data: T) => void;
export type Unsubscribe = () => void;

export class EventBus<Events extends Record<string, any>> {
  private listeners: { [K in keyof Events]?: Listener<Events[K]>[] } = {};

  on<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>
  ): Unsubscribe {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);

    return () => {
      this.listeners[event] = this.listeners[event]!.filter(
        (l) => l !== listener
      );
    };
  }

  emit<K extends keyof Events>(
    event: K,
    data: Events[K] extends undefined ? void : Events[K]
  ): void {
    const listeners = this.listeners[event];
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data as Events[K]);
        } catch (error) {
          console.error(`Error in listener for event ${String(event)}:`, error);
        }
      }
    }
  }

  clear(): void {
    this.listeners = {};
  }
}
