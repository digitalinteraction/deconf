const initialTitle = document.title;
const url = new URL(location.href);

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

  message(`Connecting to "${target.id}"`);
  const result = await setupCall(peer, target);

  message(`Connection ${result}, waiting restarting…`);
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  // Reload the page to retry
  location.reload();
}

/** @returns {Promise<{ id: string, index: number }>} */
async function getTarget(id) {
  const res = await fetch(`/api/pairs/${id}`);
  if (!res.ok) throw new Error("Pair not found");
  const peer = await res.json();
  return peer;
}

async function setupCall(peer, target) {
  return target.index === 0
    ? waitForCall(peer, target)
    : startCall(peer, target);
}

function setupConnection(connection) {
  connection.send("hello there");

  return new Promise((resolve) => {
    // setTimeout(() => {
    //   console.log(connection);
    // }, 5_000);

    // Handle data messages
    connection.on("data", (data) => {
      console.debug("connection@data", data);

      if (data === "hello there") connection.send("general kenobi");
    });

    connection.on("close", () => resolve("closed"));
    connection.on("disconnected", () => resolve("disconnected"));
    connection.on("error", (error) => {
      console.error(error);
      resolve("failed");
    });
  });
}

async function waitForCall(peer, target) {
  console.debug("waiting for call");

  const connection = await new Promise((resolve) => {
    peer.on("connection", (connection) => {
      console.debug("peer@connection");
      resolve(connection);
    });
  });

  return setupConnection(connection);
}

async function startCall(peer, target) {
  for (let i = 0; i < 10; i++) {
    console.debug("creating call %d", i);

    const connection = peer.connect(target.id);

    let isOpen = false;
    connection.on("open", () => {
      console.debug("connection@open");
      isOpen = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 2_000));

    if (isOpen) return setupConnection(connection);
  }

  return null;
}

function message(message) {
  console.info(message);
}

main().catch((error) => {
  console.error(error);
  alert(error.message);
});
