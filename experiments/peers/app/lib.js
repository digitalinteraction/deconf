export const appVersion = "v0.0.13";

export function debounce(ms, fn) {
  let timerid = null;
  return () => {
    if (timerid !== null) clearTimeout(timerid);
    timerid = setTimeout(fn, ms);
  };
}

export const appOptions = {
  /** @type {RTCConfiguration} */
  rtc: {
    iceServers: [
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  },
  /** @type {MediaStreamConstraints} */
  userMedia: {
    video: { width: 1280, height: 720 },
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
  emit(name, ...args) {
    this.#listeners.get(name)?.forEach((l) => l(...args));
  }
}

/** @type {MediaStream | null} */
let mediaStream = null;

/** @return {Promise<MediaStream>} */
export async function getStream() {
  if (mediaStream !== null) return mediaStream;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(
      appOptions.userMedia
    );
    return mediaStream;
  } catch (error) {
    console.error(error.name, error.message);
    throw error;
  }
}

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pushMessage(message) {
  console.info(message);

  const messages = document.getElementById("messages");

  const elem = messages.appendChild(document.createElement("p"));
  elem.innerText = message;

  pause(10_000).then(() => {
    messages.removeChild(elem);
  });
}

export function createDebug(id) {
  return (message) => {
    console.debug(message);

    fetch(`/api/log/${id}`, {
      method: "POST",
      body: message,
    });
  };
}
