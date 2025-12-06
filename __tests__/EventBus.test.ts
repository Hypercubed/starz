import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/events/EventBus';

interface TestEvents {
  item: string;
  count: number;
}

describe('EventBus', () => {
  it('should allow subscription and emission', () => {
    const bus = new EventBus<TestEvents>();
    const callback = vi.fn();

    bus.on('item', callback);
    bus.emit('item', 'hello');

    expect(callback).toHaveBeenCalledWith('hello');
  });

  it('should allow multiple listeners', () => {
    const bus = new EventBus<TestEvents>();
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    bus.on('count', cb1);
    bus.on('count', cb2);
    bus.emit('count', 123);

    expect(cb1).toHaveBeenCalledWith(123);
    expect(cb2).toHaveBeenCalledWith(123);
  });

  it('should allow unsubscription', () => {
    const bus = new EventBus<TestEvents>();
    const callback = vi.fn();
    const unsubscribe = bus.on('item', callback);

    unsubscribe();
    bus.emit('item', 'world');

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear all listeners', () => {
    const bus = new EventBus<TestEvents>();
    const callback = vi.fn();

    bus.on('item', callback);
    bus.clear();
    bus.emit('item', 'test');

    expect(callback).not.toHaveBeenCalled();
  });
});
