import { appVersion, debounce, getStream, pushMessage } from "./lib.js";
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
    const count = parseInt(url.searchParams.get("grid"));
    for (let i = 0; i < count; i++) {
      const elem = document.createElement("div");
      elem.classList.add("debug");
      grid.append(elem);
    }
    updateGrid(count);
  }

  const stream = await getStream();
  if (url.searchParams.has("self")) {
    const localVideo = document.getElementById("localVideo");
    localVideo.removeAttribute("aria-hidden");
    localVideo.srcObject = stream;
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

  const onResize = debounce(200, () => {
    console.log("onResize");
    updateGrid(grid.children.length);
  });

  window.addEventListener("resize", onResize);
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

  updateGrid(grid.children.length);
}

function updateGrid(count) {
  const aspect = 16 / 9;
  const { innerHeight, innerWidth } = window;

  let [columns, rows] = [1, 1];
  for (let requiredColumns = 1; requiredColumns <= count; requiredColumns++) {
    const w = innerWidth / requiredColumns;
    const h = w / aspect;
    const requiredRows = Math.ceil(count / requiredColumns);
    const requiredHeight = requiredRows * h;
    if (requiredHeight <= innerHeight) {
      [columns, rows] = [requiredColumns, requiredRows];
      break;
    }
  }

  grid.style = `--columns: ${columns};`;

  if (count > 0) {
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
