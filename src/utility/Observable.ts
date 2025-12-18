/**
 * This module provides simple observable and event observable classes for managing state and events.
 * It allows subscribers to listen for changes in values or events and react accordingly.
 *
 * First we define a generic `Subscriber` type which is a generic function that represents a subscriber callback when the observable value changes.
 * Then we define an `Unsubscribe` type which is a function that can be called to unsubscribe from the observable value.
 * These two types make up the core of our observable pattern implementation.
 */

export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;

/**
 * Next we define the `Observable` class.
 * This class manages an observable value of type `T` and allows subscribers to listen for changes to that value.
 * The observable value is stored in a private property with public accessors and mutators available to make sure that changes to the value are only made through the defined `setter` method with defined behavior.
 */

/**
 * A generic observable value.
 */
export class Observable<T> {
  private currentValue: T;
  private subscribers: Set<Subscriber<T>>;

  /**
   * On construction, the `Observable` class takes an initial value of type `T` and sets it as the observable value.
   * The `subscribers` Set is initialized as an empty Set.
   */

  /**
   * Creates a new Observable.
   * @param initialValue - The starting value of the observable.
   */
  constructor(initialValue: T) {
    this.currentValue = initialValue;
    this.subscribers = new Set<Subscriber<T>>();
  }

  /**
   * A public `subscribe` method is exposed, which is the primary way for external code to listen for changes to the observable value.
   * This method takes a `Subscriber` callback as an argument, adds it to the `subscribers` Set, and immediately invokes the callback with the current value.
   * It returns an anonymous `Unsubscribe` function that can be called to remove the callback from the Set.
   */

  /**
   * Subscribes to value changes.
   * @param callback - The subscriber function to call on change.
   * @returns An unsubscribe function.
   */
  public subscribe(callback: Subscriber<T>): Unsubscribe {
    this.subscribers.add(callback);
    callback(this.currentValue);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * The private `notify` method is the mechanism by which all subscribers are informed of changes to the observable value.
   * It iterates over the `subscribers` Set and invokes each callback with the current value.
   * This method is called internally whenever the observable value is updated.
   */

  /**
   * Notifies all subscribers of the current value.
   */
  private notify(): void {
    this.subscribers.forEach((callback) => {
      callback(this.currentValue);
    });
  }

  /**
   * To enable other modules to update the observable value, we need to define a public mutator method `set value`.
   * This is the only way to change the internal `currentValue` as long as the `Observable` class itself does not use any other internal methods to modify it.
   * It takes a new value of the same type `T` and updates the internal `currentValue`.
   * Afterwards it calls the private `notify` method to inform all subscribers of the change.
   */

  /**
   * Sets the current value and notifies subscribers.
   * @param newValue - The new value to set.
   */
  public set value(newValue: T) {
    this.currentValue = newValue;
    this.notify();
  }

  /**
   * We also define an accessor method to retrieve the current value of the observable at any time, independent of value changes.
   */

  /**
   * Gets the current value.
   * @returns The current value.
   */
  public get value(): T {
    return this.currentValue;
  }
}

/**
 * A similar `EventObservable` class is defined to manage event-based subscriptions.
 * This class does not hold a value but allows subscribers to listen for events and react when those events are emitted.
 * The use of a generic type `T` with the default type of `void` allows calling subscribers with or without a value being passed.
 */

/**
 * A generic event-based observable.
 */
export class EventObservable<T = void> {
  private subscribers = new Set<Subscriber<T>>();

  /**
   * The `subscribe` method works similarly to the one in the `Observable` class.
   * It takes a `Subscriber` callback, adds it to the `subscribers` Set, and returns an `Unsubscribe` function to remove the callback from the Set when needed.
   */

  /**
   * Subscribes to events.
   * @param callback - The subscriber function.
   * @returns An unsubscribe function.
   */
  subscribe(callback: Subscriber<T>): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * The `emit` method is the mechanism by which events are triggered.
   * It takes a value of type `T` and invokes all subscriber callbacks with that value.
   */

  /**
   * Emits an event with the given value.
   * @param value - The value to emit.
   */
  emit(value: T): void {
    this.subscribers.forEach((callback) => {
      callback(value);
    });
  }
}
