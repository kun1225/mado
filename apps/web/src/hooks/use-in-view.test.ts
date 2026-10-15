import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { observe } from './use-in-view';

class FakeObserver {
  static instances: FakeObserver[] = [];

  readonly observed = new Set<Element>();

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.add(element);
  }

  unobserve(element: Element) {
    this.observed.delete(element);
  }

  disconnect() {
    this.observed.clear();
  }

  fire(target: Element, isIntersecting: boolean, intersectionRatio = 1) {
    this.callback(
      [
        {
          target,
          isIntersecting,
          intersectionRatio,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function buildElement() {
  return {} as Element;
}

let stops: (() => void)[] = [];

function watch(...args: Parameters<typeof observe>) {
  const stop = observe(...args);
  stops.push(stop);
  return stop;
}

describe('observe', () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    stops.forEach((stop) => stop());
    stops = [];
    vi.unstubAllGlobals();
  });

  it('reports when the element enters and leaves', () => {
    const target = buildElement();
    const onChange = vi.fn();
    watch(target, { rootMargin: '0px', threshold: 0 }, onChange);
    const [observer] = FakeObserver.instances;

    observer.fire(target, true);
    observer.fire(target, false);

    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it('shares one observer for the same options', () => {
    const options = { rootMargin: '100% 0px', threshold: 0 };
    watch(buildElement(), options, vi.fn());
    watch(buildElement(), options, vi.fn());
    watch(buildElement(), { rootMargin: '0px', threshold: 0.5 }, vi.fn());

    expect(FakeObserver.instances).toHaveLength(2);
  });

  it('only notifies the listener of the changed element', () => {
    const first = buildElement();
    const second = buildElement();
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    const options = { rootMargin: '0px', threshold: 0 };
    watch(first, options, onFirst);
    watch(second, options, onSecond);

    FakeObserver.instances[0].fire(second, true);

    expect(onFirst).not.toHaveBeenCalled();
    expect(onSecond).toHaveBeenCalledWith(true);
  });

  it('treats an entry below the threshold as out of view', () => {
    const target = buildElement();
    const onChange = vi.fn();
    watch(target, { rootMargin: '0px', threshold: 0.5 }, onChange);

    FakeObserver.instances[0].fire(target, true, 0.2);

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('stops watching on cleanup', () => {
    const target = buildElement();
    const onChange = vi.fn();
    const stop = watch(target, { rootMargin: '0px', threshold: 0 }, onChange);
    const [observer] = FakeObserver.instances;

    stop();
    observer.fire(target, true);

    expect(observer.observed.has(target)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('makes a new observer after the last element leaves', () => {
    const options = { rootMargin: '0px', threshold: 0 };
    const stop = watch(buildElement(), options, vi.fn());
    stop();
    watch(buildElement(), options, vi.fn());

    expect(FakeObserver.instances).toHaveLength(2);
  });
});
