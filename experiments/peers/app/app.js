const initialTitle = document.title;
const url = new URL(location.href);

/** @type {HTMLVideoElement} */
const video = document.getElementById("video");
const messages = document.getElementById("messages");
const title = document.getElementById("title");
const version = document.getElementById("version");
version.innerText = "v0.0.6";

let currentCall = null;

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

function waitForEventSource(target) {
  return new Promise((resolve) => {
    const src = new EventSource(`api/online/${target.id}`);
    src.onerror = () => resolve();
  });
}

//
// App entry point
//
async function main() {
  const id = url.searchParams.get("id");
  if (typeof id !== "string") throw new Error("id not set");
  document.title = `${id} | ${initialTitle}`;
  debug(`Starting width=${window.innerWidth} height=${window.innerHeight}`);

  const peer = new Peer(id, {
    host: url.hostname,
    path: "/peerjs",
    port: url.port,
    proxied: true,
    debug: 2,
  });

  await setPeer(peer);

  const target = await getTarget(id);

  debug(`Connecting to "${target.id}"`);
  if (target.action === "wait") waitForCall(peer, target);
  else startCall(peer, target);

  // TODO: this doesn't trigger the other's "close" event
  // https://github.com/peers/peerjs/issues/636
  window.addEventListener("beforeunload", function (e) {
    debug("window@beforeunload");
    setCall(null);
  });
}

async function shutdown(message) {
  debug(`Peer ended with "${message}"`);
  pushMessage(`Connection ${message}, restarting…`);
  await pause(2_000);

  // Reload the page to retry
  location.reload();
}

function setPeer(peer) {
  peer.on("close", () => {
    debug("peer@close");
    shutdown("closed");
  });
  peer.on("disconnected", () => {
    debug("peer@disconnected");
    shutdown("disconnected");
  });

  return new Promise((resolve) => {
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
    debug("Recieved MediaStream");

    title.textContent = "";
    video.srcObject = mediaStream;
    video.play();

    version.setAttribute("aria-hidden", "true");

    mediaStream.addEventListener("removetrack", (e) => {
      debug("mediaStream@removetrack", e);
    });
  } else {
    debug("Clear MediaStream");

    title.textContent = "Disconnected";
    video.srcObject = null;
    video.pause();
    version.removeAttribute("aria-hidden");
  }
}

function setCall(call) {
  if (currentCall) currentCall.close();
  currentCall = call;

  if (call) {
    call.on("stream", (mediaStream) => {
      pushMessage("Call opened");
      debug("call@stream");
      setMediaStream(mediaStream);
    });
    call.on("close", () => {
      pushMessage("Call closed");
      debug("call@close");
      setMediaStream(null);
    });
    call.on("error", (error) => {
      debug("call@error " + error);
      console.error("call@error", error);
    });
  } else {
    setMediaStream(null);
  }
}

async function waitForCall(peer, target) {
  title.textContent = "Waiting for call…";
  debug("Waiting for call");

  const mediaStream = await getUserMedia();

  peer.on("call", (call) => {
    debug("peer@call");
    call.answer(mediaStream);

    setCall(call);
  });

  // Retry if the peer disconnects
  waitForEventSource(target).then(() => {
    debug("Wait for call disconnected");
    setCall(null);
  });
}

async function startCall(peer, target) {
  debug("Starting call");
  const mediaStream = await getUserMedia();

  const call = peer.call(target.id, mediaStream);
  title.textContent = "Calling…";

  setCall(call);

  // Retry the call if it took more the 5s
  setTimeout(() => {
    if (!call.open) shutdown("No answer");
  }, 5_000);

  // Retry if the peer disconnects
  waitForEventSource(target).then(() => shutdown("Lost connection"));
}

function onError(error) {
  debug("Fatal error: " + error);
  console.error(error);
  title.textContent = error?.message ?? error;
}

main().catch(onError);
window.addEventListener("error", (e) => onError(e.error));
window.addEventListener("unhandledrejection", (e) => onError(e.reason));
