type Subscriber<T> = (payload: T) => void;

class VisualizationBusImpl {
  private resetViewSubs = new Set<Subscriber<Record<string, never>>>();

  subscribeResetView(cb: Subscriber<Record<string, never>>): () => void {
    this.resetViewSubs.add(cb);
    return () => this.resetViewSubs.delete(cb);
  }

  publishResetView(): void {
    for (const cb of this.resetViewSubs) {
      try {
        cb({});
      } catch (err) {
        console.error("VisualizationBus resetView subscriber failed", err);
      }
    }
  }
}

export const VisualizationBus = new VisualizationBusImpl();
