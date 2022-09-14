const initialTitle = document.title;
const url = new URL(location.href);

/** @type {HTMLVideoElement} */
const video = document.getElementById("video");
const messages = document.getElementById("messages");
const title = document.getElementById("title");

function message(message) {
  console.info(message);

  const elem = messages.appendChild(document.createElement("p"));
  elem.innerText = message;

  pause(10_000).then(() => {
    messages.removeChild(elem);
  });
}

/** @returns {Promise<{ id: string, index: number }>} */
async function getTarget(id) {
  const res = await fetch(`/api/pairs/${id}`);
  if (!res.ok) throw new Error("Pair not found");
  const peer = await res.json();
  return peer;
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//
// App entry point
//
async function main() {
  const id = url.searchParams.get("id");
  if (typeof id !== "string") throw new Error("id not set");
  document.title = `${id} | ${initialTitle}`;

  const target = await getTarget(id);
  console.debug("%s → %s", id, target.id);

  const peer = new Peer(id, {
    host: url.hostname,
    path: "/peerjs",
    port: url.port,
    proxied: true,
    debug: 2,
  });

  console.debug("Connecting to %s", target.id);
  await (target.index === 0
    ? waitForCall(peer, target)
    : startCall(peer, target));

  const result = await setupPeer(peer);

  message(`Connection ${result}, restarting…`);
  await pause(1_000);

  // Reload the page to retry
  location.reload();
}

function setupPeer(peer) {
  return new Promise((resolve) => {
    peer.on("close", () => resolve("closed"));
    peer.on("disconnected", () => resolve("disconnected"));
    peer.on("error", (error) => {
      console.error(error);
      resolve("failed");
    });
  });
}

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
function getUserMedia() {
  return navigator.mediaDevices
    .getUserMedia({
      video: { width: 1920, height: 1080 },
    })
    .catch((error) => {
      console.error(error.name, error.message);
      throw error;
    });
}

/** @param {MediaStream|null} mediaStream */
function setMediaStream(mediaStream) {
  if (mediaStream) {
    title.textContent = "";
    video.srcObject = mediaStream;
    video.play();

    mediaStream.addEventListener("removetrack", (e) => {
      console.log("mediaStream@removetrack", e);
    });
  } else {
    title.textContent = "Disconnected";
    video.srcObject = null;
    video.pause();
  }
}

function setupCall(call) {
  call.on("stream", (mediaStream) => {
    message("Call opened");
    console.debug("call@stream");
    setMediaStream(mediaStream);
  });
  call.on("close", () => {
    message("Call closed");
    console.debug("call@close");
    setMediaStream(null);
  });
  call.on("error", (error) => {
    console.error("call@error", error);
  });
}

async function waitForCall(peer, target) {
  title.textContent = "Waiting for call…";
  console.debug("Waiting for call from %o", target.id);

  const mediaStream = await getUserMedia();

  await new Promise((resolve) => {
    peer.on("call", (call) => {
      console.debug("peer@call");
      call.answer(mediaStream);
      setupCall(call);
      resolve();
    });
  });
}

async function startCall(peer, target) {
  console.debug("Calling %o", target.id);
  const mediaStream = await getUserMedia();

  let i = 1;
  let call = peer.call(target.id, mediaStream);
  setupCall(call);
  title.textContent = "Calling";

  setInterval(() => {
    if (call.open) return;
    i++;
    title.textContent = `Calling - ${i}`;

    call = peer.call(target.id, mediaStream);
    setupCall(call);
  }, 2_000);
}

main().catch((error) => {
  console.error(error);
  title.textContent = error.message;
});
