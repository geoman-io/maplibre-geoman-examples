/** Order writes for each feature, even when requests settle out of order. */
export class FeatureWriteQueue {
  private pending = new Map<string, Promise<void>>();
  private revisions = new Map<string, number>();

  has(id: string) {
    return this.pending.has(id);
  }

  enqueue<T>(id: string, write: () => Promise<T>, apply: (value: T) => void) {
    const revision = (this.revisions.get(id) ?? 0) + 1;
    this.revisions.set(id, revision);
    const task = (this.pending.get(id) ?? Promise.resolve())
      .then(write)
      .then((value) => {
        // An older response must not resurrect a feature deleted/undone since.
        if (this.revisions.get(id) === revision) apply(value);
      })
      .catch((error) => console.warn('GIS: feature write failed', id, error));
    this.pending.set(id, task);
    void task.then(() => {
      if (this.pending.get(id) === task) {
        this.pending.delete(id);
        this.revisions.delete(id);
      }
    });
    return task;
  }
}
