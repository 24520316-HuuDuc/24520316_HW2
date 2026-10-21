
export interface AudioTask {
  id: number;
  file: File;
}

export class AudioTaskQueue {
  private queue: AudioTask[] = [];
  private nextId = 1;
  private activeController: AbortController | null = null;
  private processing = false;
  private stopped = false;
  private skipRequested = false;

  constructor(
    private readonly onStatus: (message: string) => void,
    private readonly onTrack: (
      file: File,
      signal: AbortSignal
    ) => Promise<void>,
    private readonly onQueueChange: (files: File[]) => void
  ) {}

  enqueue(files: File[]): void {
    this.stopped = false;

    for (const file of files) {
      this.queue.push({ id: this.nextId++, file });
    }

    this.updateQueue();
    this.onStatus(`${files.length} track(s) added to FIFO queue.`);
  }

  async playNext(): Promise<void> {
    if (this.processing) {
      if (this.queue.length === 0) {
        this.onStatus("No next track. Add more audio files first.");
        return;
      }

      this.skipRequested = true;
      this.onStatus("Skipping current track...");
      this.activeController?.abort();
      return;
    }

    const task = this.queue.shift();

    if (!task) {
      this.onStatus("Queue is empty. Add audio files first.");
      return;
    }

    this.stopped = false;
    this.skipRequested = false;
    this.processing = true;

    const controller = new AbortController();
    this.activeController = controller;
    this.updateQueue();

    try {
      this.onStatus(`Playing: ${task.file.name}`);
      await this.onTrack(task.file, controller.signal);

      if (!controller.signal.aborted) {
        this.onStatus(`Finished: ${task.file.name}`);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        this.onStatus(
          error instanceof Error ? error.message : "Cannot play audio."
        );
      }
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }

      this.processing = false;

      if (!this.stopped && this.queue.length > 0) {
        if (this.skipRequested) {
          this.onStatus("Playing next track...");
        }
        void this.playNext();
      } else if (!this.stopped && this.queue.length === 0) {
        this.onStatus("All tracks have finished.");
      }

      this.skipRequested = false;
    }
  }

  stop(): void {
    this.stopped = true;
    this.skipRequested = false;
    this.activeController?.abort();
    this.activeController = null;
    this.queue = [];
    this.updateQueue();
    this.onStatus("Stopped. Queue cleared.");
  }

  private updateQueue(): void {
    this.onQueueChange(this.queue.map(task => task.file));
  }
}
