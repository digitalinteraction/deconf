const initialTitle = document.title;
const url = new URL(location.href);

/** @type {HTMLVideoElement} */
const video = document.getElementById("video");
const messages = document.getElementById("messages");
const title = document.getElementById("title");
const version = document.getElementById("version");
version.innerText = "v0.0.2";

function pushMessage(message) {
  console.info(message);

  const elem = messages.appendChild(document.createElement("p"));
  elem.innerText = message;

  pause(10_000).then(() => {
    messages.removeChild(elem);
  });
}

function debug(message) {
  console.debug(message);

  const id = url.searchParams.get("id");
  if (id) {
    fetch(`/api/log/${id}`, {
      method: "POST",
      body: message,
    });
  }
}

/** @returns {Promise<{ id: string, action: string }>} */
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
  debug("Starting");

  const peer = new Peer(id, {
    host: url.hostname,
    path: "/peerjs",
    port: url.port,
    proxied: true,
    debug: 2,
  });

  await setupPeer(peer);

  const target = await getTarget(id);

  debug(`Connecting to "${target.id}"`);
  if (target.action === "wait") waitForCall(peer, target);
  else startCall(peer, target);
}

async function shutdown(message) {
  debug(`Peer ended with "${message}"`);
  pushMessage(`Connection ${message}, restarting…`);
  await pause(5_000);

  // Reload the page to retry
  location.reload();
}

function setupPeer(peer) {
  peer.on("close", () => {
    debug("peer@close");
    shutdown("closed");
  });
  peer.on("disconnected", () => {
    debug("peer@disconnected");
    shutdown("disconnected");
  });

  return new Promise((resolve, reject) => {
    peer.on("open", (error) => {
      debug("peer@open " + error);
      resolve();
    });
    peer.on("error", (error) => {
      debug("peer@error " + error);
      shutdown(error.toString());
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

    version.setAttribute("aria-hidden", "true");

    mediaStream.addEventListener("removetrack", (e) => {
      debug("mediaStream@removetrack", e);
    });
  } else {
    title.textContent = "Disconnected";
    video.srcObject = null;
    video.pause();
    version.removeAttribute("aria-hidden");
  }
}

function setupCall(call) {
  call.on("stream", (mediaStream) => {
    pushMessage("Call opened");
    debug("call@stream");
    setMediaStream(mediaStream);
  });
  call.on("close", () => {
    pushMessage("Call closed");
    debug("call@close");
    setMediaStream(null);
    shutdown("Connection closed");
  });
  call.on("error", (error) => {
    debug("call@error " + error);
    console.error("call@error", error);
    shutdown("Connection error");
  });
}

async function waitForCall(peer, target) {
  title.textContent = "Waiting for call…";
  debug("Waiting for call");

  const mediaStream = await getUserMedia();

  const call = await new Promise((resolve) =>
    peer.on("call", (call) => resolve(call))
  );

  debug("peer@call");
  call.answer(mediaStream);

  setupCall(call);
}

async function startCall(peer, target) {
  debug("Starting call");
  const mediaStream = await getUserMedia();

  const call = peer.call(target.id, mediaStream);
  title.textContent = "Calling…";

  setupCall(call);
}

main().catch((error) => {
  debug("Fatal error" + error);
  console.error(error);
  title.textContent = error.message;
});
