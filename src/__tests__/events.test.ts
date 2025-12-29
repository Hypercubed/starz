import { describe, it, expect, vi } from 'vitest';
import { MiniSignal } from 'mini-signals';

import { EventBus, EventBusEmit, EventBusOn } from '../client/classes/event-bus.ts';

const testEvents = {
  item: new MiniSignal<[string]>(),
  count: new MiniSignal<[number]>()
} as const;

class TestEventBus extends EventBus<typeof testEvents> {
  constructor() {
    super(testEvents);
  }
}

type TestEvents = typeof testEvents;
type AnotherEventBusEvents = TestEvents & { extra: MiniSignal<[boolean]> };

class AnotherEventBus extends TestEventBus {
  declare protected events: AnotherEventBusEvents;
  declare on: EventBusOn<AnotherEventBusEvents>;
  declare emit: EventBusEmit<AnotherEventBusEvents>;

  constructor() {
    super();
    this.addEvents({ extra: new MiniSignal<[boolean]>() });
  }
}

describe('EventBus', () => {
  it('should allow subscription and emission', () => {
    const bus = new EventBus(testEvents);
    const callback = vi.fn();

    bus.on('item', callback);
    bus.emit('item', 'hello');

    expect(callback).toHaveBeenCalledWith('hello');
  });

  it('should allow multiple listeners', () => {
    const bus = new EventBus(testEvents);
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    bus.on('count', cb1);
    bus.on('count', cb2);
    bus.emit('count', 123);

    expect(cb1).toHaveBeenCalledWith(123);
    expect(cb2).toHaveBeenCalledWith(123);
  });

  it('should allow unsubscription', () => {
    const bus = new EventBus(testEvents);
    const callback = vi.fn();
    const unsubscribe = bus.on('item', callback);

    unsubscribe();
    bus.emit('item', 'world');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear all listeners', () => {
    const bus = new EventBus(testEvents);
    const callback = vi.fn();

    bus.on('item', callback);
    bus.clear();
    bus.emit('item', 'test');

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('TestEventBus', () => {
  it('should work with the extended class', () => {
    const bus = new TestEventBus();
    const callback = vi.fn();

    bus.on('item', callback);
    bus.emit('item', 'extended');

    expect(callback).toHaveBeenCalledWith('extended');
  });

  it('should work with another level of extension', () => {
    const bus = new AnotherEventBus();
    const callback = vi.fn();
    
    bus.on('extra', callback);
    bus.emit('extra', true);
    expect(callback).toHaveBeenCalledWith(true);
  });
});
