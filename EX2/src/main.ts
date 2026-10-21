
import { AudioTaskQueue } from "./audio-queue-controller";

const fileInput = document.querySelector<HTMLInputElement>("#audioFiles")!;
const fftSelect = document.querySelector<HTMLSelectElement>("#fftSize")!;
const playButton = document.querySelector<HTMLButtonElement>("#playNext")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stopAudio")!;
const status = document.querySelector<HTMLElement>("#status")!;
const currentTrack = document.querySelector<HTMLElement>("#currentTrack")!;
const queueList = document.querySelector<HTMLOListElement>("#queueList")!;
const queueCount = document.querySelector<HTMLElement>("#queueCount")!;
const canvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
const ctx = canvas.getContext("2d")!;

let audioContext: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let animationId = 0;

function setStatus(message: string): void {
  status.textContent = message;
}

function renderQueue(files: File[]): void {
  queueList.replaceChildren();
  queueCount.textContent = `${files.length} track(s) waiting`;

  if (files.length === 0) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "No tracks waiting in the queue.";
    queueList.append(item);
    return;
  }

  files.forEach((file, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${file.name}`;
    queueList.append(item);
  });
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
}

function draw(): void {
  if (!analyser) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = new Uint8Array(analyser.frequencyBinCount);

  analyser.getByteFrequencyData(data);
  ctx.clearRect(0, 0, width, height);

  const barWidth = width / data.length;

  for (let i = 0; i < data.length; i++) {
    const barHeight = (data[i] / 255) * height;
    ctx.fillStyle = `hsl(${190 + (i / data.length) * 100}, 85%, 60%)`;

    ctx.fillRect(
      i * barWidth,
      height - barHeight,
      Math.max(1, barWidth - 1),
      barHeight
    );
  }

  animationId = requestAnimationFrame(draw);
}

function cleanupAudio(): void {
  cancelAnimationFrame(animationId);
  animationId = 0;

  if (source) {
    source.onended = null;

    try {
      source.stop();
    } catch {
      // Source may already have stopped.
    }

    source.disconnect();
    source = null;
  }

  analyser?.disconnect();
  analyser = null;

  if (audioContext) {
    const oldContext = audioContext;
    audioContext = null;
    void oldContext.close().catch(() => undefined);
  }
}

function playFile(file: File, signal: AbortSignal): Promise<void> {
  cleanupAudio();

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;

      signal.removeEventListener("abort", onAbort);
      cleanupAudio();

      if (error) reject(error);
      else resolve();
    };

    const onAbort = (): void => {
      currentTrack.textContent = "No track playing";
      finish();
    };

    if (signal.aborted) {
      finish();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    void (async () => {
      try {
        const context = new AudioContext();
        audioContext = context;

        const bytes = await file.arrayBuffer();

        if (signal.aborted) return;

        const buffer = await context.decodeAudioData(bytes);

        if (signal.aborted) return;

        await context.resume();

        if (signal.aborted) return;

        const newAnalyser = context.createAnalyser();
        newAnalyser.fftSize = Number(fftSelect.value);

        const newSource = context.createBufferSource();
        newSource.buffer = buffer;

        analyser = newAnalyser;
        source = newSource;

        newSource.connect(newAnalyser);
        newAnalyser.connect(context.destination);

        currentTrack.textContent = file.name;
        setStatus(`Playing: ${file.name}`);

        resizeCanvas();
        draw();

        newSource.onended = () => {
          if (!signal.aborted) finish();
        };

        newSource.start();
      } catch (error) {
        if (!signal.aborted) {
          finish(
            error instanceof Error
              ? error
              : new Error("Unable to play this audio file.")
          );
        }
      }
    })();
  });
}

const queue = new AudioTaskQueue(
  setStatus,
  playFile,
  renderQueue
);

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files ?? []);

  if (files.length > 0) {
    queue.enqueue(files);
  }

  fileInput.value = "";
});

playButton.addEventListener("click", () => {
  void queue.playNext();
});

stopButton.addEventListener("click", () => {
  queue.stop();
  cleanupAudio();
  currentTrack.textContent = "No track playing";
});

fftSelect.addEventListener("change", () => {
  if (analyser) {
    analyser.fftSize = Number(fftSelect.value);
  }
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
renderQueue([]);
