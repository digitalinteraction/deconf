import { appVersion, getStream, getVideoElement } from "./lib.js";
import { Portal, SignalingChannel } from "./portal.js";

const localVideo = getVideoElement("localVideo");
const removeVideo = getVideoElement("remoteVideo");
const title = document.getElementById("title");
const version = document.getElementById("version");
version.innerText = appVersion;

async function main() {
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (!id) throw new Error("id not set");

  const server = new URL("portal", url);
  server.protocol = server.protocol.replace(/^http/, "ws");

  const stream = await getStream();

  if (url.searchParams.has("self")) {
    localVideo.removeAttribute("aria-hidden");
    localVideo.srcObject = stream;
  }

  const signaler = new SignalingChannel({ id, server });
  const portal = new Portal(signaler);

  portal.addEventListener("connection", (connection) => {
    for (const track of stream.getTracks()) {
      connection.addTrack(track, stream);
    }

    connection.addEventListener("track", (event) => {
      console.log("connection@track");
      event.track.onunmute = () => setRemoteStream(event.streams[0]);
    });
  });

  portal.addEventListener("close", () => {
    setRemoteStream(null);
  });

  portal.addEventListener("error", (error) => {
    onError(error);
  });

  signaler.addEventListener("info", (payload) => {
    if (payload.action === "wait") title.textContent = "Waiting…";
    if (payload.action === "call") {
      title.textContent = payload.polite ? "Listening…" : "Calling…";
    }
  });
}

function setRemoteStream(stream) {
  if (stream) {
    // if (video.srcObject) return;
    removeVideo.srcObject = stream;
    removeVideo.removeAttribute("aria-hidden");
    title.setAttribute("aria-hidden", "true");
    version.setAttribute("aria-hidden", "true");
  } else {
    removeVideo.setAttribute("aria-hidden", "true");
    title.removeAttribute("aria-hidden");
    version.removeAttribute("aria-hidden");
  }
}

function onError(error) {
  title.textContent = "Error - " + error.message;
  console.error(error);
}

window.addEventListener("error", (e) => onError(e.error));
window.addEventListener("unhandledrejection", (e) => onError(e.reason));

main().catch((error) => onError(error));
