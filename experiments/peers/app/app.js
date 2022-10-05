import { appVersion, getStream, getVideoElement, pushMessage } from "./lib.js";
import { Portal, SignalingChannel } from "./portal-v2.js";

const grid = document.getElementById("grid");
const title = document.getElementById("title");
const version = document.getElementById("version");
version.innerText = appVersion;

async function main() {
  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if (!id) throw new Error("id not set");

  const server = new URL("portal", url);
  server.protocol = server.protocol.replace(/^http/, "ws");

  if (url.searchParams.has("grid")) {
    for (let i = 0; i < parseInt(url.searchParams.get("grid")); i++) {
      const elem = document.createElement("div");
      elem.classList.add("debug");
      grid.append(elem);
    }
  }

  const stream = await getStream();
  if (url.searchParams.has("self")) {
    setVideoStream("__self__", stream);
  }

  const signaler = new SignalingChannel({ id, server });
  const portal = new Portal(signaler);

  portal.addEventListener("connection", (connection) => {
    for (const track of stream.getTracks()) {
      connection.peer.addTrack(track, stream);
    }

    connection.peer.addEventListener("track", (event) => {
      console.log("connection@track");
      event.track.onunmute = () => {
        setVideoStream(connection.target, event.streams[0]);
      };
    });
  });

  portal.addEventListener("close", (connection) => {
    setVideoStream(connection.target, null);
  });

  portal.addEventListener("error", (error) => {
    onError(error);
  });

  signaler.addEventListener("info", (payload) => {
    title.textContent = payload.members.length > 0 ? "Calling…" : "Waiting…";
  });
}

function setVideoStream(id, stream) {
  console.log("setRemoteStream", id);
  let elem = document.querySelector(`#grid > [data-video="${id}"]`);

  if (stream) {
    if (!elem) {
      elem = document.createElement("video");
      elem.muted = true;
      elem.autoplay = true;
      elem.dataset.video = id;
      grid.appendChild(elem);
    }

    elem.srcObject = stream;
  } else if (elem) {
    grid.removeChild(elem);
  }

  grid.style = `--elements: ${grid.children.length};`;

  if (grid.hasChildNodes) {
    title.setAttribute("aria-hidden", "true");
    version.setAttribute("aria-hidden", "true");
  } else {
    title.removeAttribute("aria-hidden");
    version.removeAttribute("aria-hidden");
    title.textContent;
  }
}

function onError(error) {
  pushMessage(error.message);
  title.textContent = "Error - " + error.message;
  console.error(error);
}

window.addEventListener("error", (e) => onError(e.error));
window.addEventListener("unhandledrejection", (e) => onError(e.reason));

main().catch((error) => onError(error));
