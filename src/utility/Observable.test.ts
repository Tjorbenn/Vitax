import { describe, it, expect, vi } from "vite-plus/test";
import { Observable, EventObservable } from "./Observable";

describe("Observable", () => {
  it("should initialize with initial value", () => {
    const obs = new Observable<number>(42);
    expect(obs.value).toBe(42);
  });

  it("should call subscriber immediately upon subscription", () => {
    const obs = new Observable<string>("hello");
    const callback = vi.fn();
    obs.subscribe(callback);
    expect(callback).toHaveBeenCalledWith("hello");
    expect(callback).toHaveBeenCalledOnce();
  });

  it("should notify subscribers when value is set", () => {
    const obs = new Observable<boolean>(false);
    const callback = vi.fn();
    obs.subscribe(callback);

    callback.mockClear();
    obs.value = true;

    expect(obs.value).toBe(true);
    expect(callback).toHaveBeenCalledWith(true);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("should allow unsubscribing from changes", () => {
    const obs = new Observable<number>(1);
    const callback = vi.fn();
    const unsubscribe = obs.subscribe(callback);

    callback.mockClear();
    obs.value = 2;
    expect(callback).toHaveBeenCalledWith(2);

    unsubscribe();
    callback.mockClear();
    obs.value = 3;
    expect(callback).not.toHaveBeenCalled();
    expect(obs.value).toBe(3);
  });
});

describe("EventObservable", () => {
  it("should not invoke subscriber upon subscription", () => {
    const eventObs = new EventObservable<string>();
    const callback = vi.fn();
    eventObs.subscribe(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it("should notify subscribers when event is emitted", () => {
    const eventObs = new EventObservable<string>();
    const callback = vi.fn();
    eventObs.subscribe(callback);

    eventObs.emit("event-data");
    expect(callback).toHaveBeenCalledWith("event-data");
    expect(callback).toHaveBeenCalledOnce();
  });

  it("should allow unsubscribing from events", () => {
    const eventObs = new EventObservable();
    const callback = vi.fn();
    const unsubscribe = eventObs.subscribe(callback);

    eventObs.emit();
    expect(callback).toHaveBeenCalledOnce();

    unsubscribe();
    callback.mockClear();
    eventObs.emit();
    expect(callback).not.toHaveBeenCalled();
  });
});
