export class PresetThumbnailCache {
  #entries = new Map<string, Promise<string>>();
  #urls = new Set<string>();
  #disposed = false;

  get(key: string, create: () => Promise<Blob>): Promise<string> {
    if (this.#disposed) return Promise.reject(new Error("Thumbnail cache is disposed"));
    const cached = this.#entries.get(key);
    if (cached) return cached;
    const pending = create()
      .then((blob) => {
        if (this.#disposed) throw new Error("Thumbnail cache is disposed");
        const url = URL.createObjectURL(blob);
        this.#urls.add(url);
        return url;
      })
      .catch((error) => {
        this.#entries.delete(key);
        throw error;
      });
    this.#entries.set(key, pending);
    return pending;
  }

  dispose(): void {
    this.#disposed = true;
    for (const url of this.#urls) URL.revokeObjectURL(url);
    this.#urls.clear();
    this.#entries.clear();
  }
}
