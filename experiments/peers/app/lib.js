export function debounce(ms, fn) {
  let timerid = null;
  return () => {
    if (timerid !== null) clearTimeout(timerid);
    timerid = setTimeout(fn, ms);
  };
}

export const appVersion = "v0.0.8";

export const options = {
  /** @type {RTCConfiguration} */
  rtc: {
    iceServers: [
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  },
  /** @type {MediaStreamConstraints} */
  userMedia: {
    video: { width: 1920, height: 1080 },
  },
};

export class EventEmitter {
  #listeners = new Map();
  addEventListener(name, listener) {
    this.#listeners.set(name, [...(this.#listeners.get(name) ?? []), listener]);
  }
  removeEventListener(name, listener) {
    this.#listeners.set(
      name,
      this.#listeners.get(name)?.filter((l) => l !== listener) ?? []
    );
  }
  emit(name, payload) {
    this.#listeners.get(name)?.forEach((l) => l(payload));
  }
}

/** @type {MediaStream | null} */
let mediaStream = null;

/** @return {Promise<MediaStream>} */
export async function getStream() {
  if (mediaStream !== null) return mediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(options.userMedia);
    return mediaStream;
  } catch (error) {
    console.error(error.name, error.message);
    throw error;
  }
}

/** @return {HTMLVideoElement} */
export function getVideoElement(id) {
  const elem = document.getElementById(id);
  elem.muted = true;
  elem.autoplay = true;
  return elem;
}
