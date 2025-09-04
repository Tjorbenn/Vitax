// Extending the Set prototype to include filter, some and all methods
declare global {
  interface Set<T> {
    /**
     * Filters the set based on a callback function.
     * @param callback - A function that accepts an element of the set and returns a boolean indicating whether to keep the element.
     * @returns A new Set containing elements that satisfy the condition.
     */
    filter(callback: (value: T) => boolean): Set<T>;

    /**
     * Checks if at least one element in the set satisfies the condition defined by the callback function.
     * @param callback - A function that accepts an element of the set and returns a boolean indicating whether the element satisfies the condition.
     * @returns True if at least one element satisfies the condition, otherwise false.
     */
    some(callback: (value: T) => boolean): boolean;

    /**
     * Checks if all elements in the set satisfy the condition defined by the callback function.
     * @param callback - A function that accepts an element of the set and returns a boolean indicating whether the element satisfies the condition.
     * @returns True if all elements satisfy the condition, otherwise false.
     */
    all(callback: (value: T) => boolean): boolean;

    /**
     * Maps the elements of the set to a new Array based on a callback function.
     * @param callback - A function that accepts an element of the set and returns a value to be included in the new Array.
     * @returns A new Array containing the results of applying the callback function to each element in the original Set.
     */
    map<U>(callback: (value: T) => U): U[];

    /**
     * Finds the first element in the set that satisfies the condition defined by the callback function.
     * @param callback - A function that accepts an element of the set and returns a boolean indicating whether the element satisfies the condition.
     * @returns The first element that satisfies the condition, or undefined if no element satisfies it.
     */
    find(callback: (value: T) => boolean): T | undefined;

    /**
     * Returns the first element of the set, or undefined if the set is empty.
     * @returns The first element of the set, or undefined if the set is empty.
     */
    first(): T | undefined;

    /**
     * Returns a new Set containing unique elements from this set and another iterable,
     * where uniqueness is determined by a key selector function.
     * @param other - Another iterable of elements to union with.
     * @param keySelector - Function to produce a comparable key for each element.
     * @returns A new Set with elements from both sets without duplicate keys.
     */
    unionBy(other: Iterable<T>, keySelector: (value: T) => unknown): Set<T>;

    /**
     * Joins the elements of the set into a string, separated by the specified separator.
     * @param separator - The string to separate each element. Defaults to ",".
     * @returns A string representation of the set elements.
     */
    join(separator?: string): string;
  }
}

if (typeof Set.prototype.filter === "undefined") {
  Set.prototype.filter = function <T>(this: Set<T>, callback: (value: T) => boolean): Set<T> {
    const result = new Set<T>();
    for (const value of this) {
      if (callback(value)) {
        result.add(value);
      }
    }
    return result;
  };
}

if (typeof Set.prototype.some === "undefined") {
  Set.prototype.some = function <T>(this: Set<T>, callback: (value: T) => boolean): boolean {
    for (const value of this) {
      if (callback(value)) {
        return true;
      }
    }
    return false;
  };
}

if (typeof Set.prototype.all === "undefined") {
  Set.prototype.all = function <T>(this: Set<T>, callback: (value: T) => boolean): boolean {
    for (const value of this) {
      if (!callback(value)) {
        return false;
      }
    }
    return true;
  };
}

if (typeof Set.prototype.map === "undefined") {
  Set.prototype.map = function <T, U>(this: Set<T>, callback: (value: T) => U): U[] {
    const result: U[] = [];
    for (const value of this) {
      result.push(callback(value));
    }
    return result;
  };
}

if (typeof Set.prototype.find === "undefined") {
  Set.prototype.find = function <T>(this: Set<T>, callback: (value: T) => boolean): T | undefined {
    for (const value of this) {
      if (callback(value)) {
        return value;
      }
    }
    return undefined;
  };
}

if (typeof Set.prototype.first === "undefined") {
  Set.prototype.first = function <T>(this: Set<T>): T | undefined {
    for (const value of this) {
      return value;
    }
    return undefined;
  };
}

if (typeof Set.prototype.unionBy === "undefined") {
  Set.prototype.unionBy = function <T>(
    this: Set<T>,
    other: Iterable<T>,
    keySelector: (value: T) => unknown,
  ): Set<T> {
    const map = new Map<unknown, T>();
    for (const value of this) {
      map.set(keySelector(value), value);
    }
    for (const value of other) {
      const key = keySelector(value);
      if (!map.has(key)) {
        map.set(key, value);
      }
    }
    return new Set<T>(Array.from(map.values()));
  };
}

if (typeof Set.prototype.join === "undefined") {
  Set.prototype.join = function <T>(this: Set<T>, separator = ","): string {
    const elements = this.map((value) => {
      return String(value);
    });
    return elements.join(separator);
  };
}
