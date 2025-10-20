export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;

export class Observable<T> {
  private subscribers = new Set<Subscriber<T>>();
  private currentValue: T;

  constructor(initialValue: T) {
    this.currentValue = initialValue;
  }

  get value(): T {
    return this.currentValue;
  }

  set value(newValue: T) {
    this.currentValue = newValue;
    this.notify();
  }

  subscribe(callback: Subscriber<T>): Unsubscribe {
    this.subscribers.add(callback);
    // Immediately call with current value
    callback(this.currentValue);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((callback) => {
      callback(this.currentValue);
    });
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }
}

export class EventObservable<T = void> {
  private subscribers = new Set<Subscriber<T>>();

  subscribe(callback: Subscriber<T>): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  emit(value: T): void {
    this.subscribers.forEach((callback) => {
      callback(value);
    });
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }
}
