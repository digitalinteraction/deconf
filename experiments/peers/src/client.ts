import { PortalGun, debounce, InfoSignal } from '@openlab/portals/client.js'

//
// An example client that connects to the PortalServer and receives connections
//

const grid = document.getElementById('grid') as HTMLElement
const title = document.getElementById('title') as HTMLElement
const version = document.getElementById('version') as HTMLElement
const notifications = document.getElementById('notifications') as HTMLElement
version.innerText = '0.1.6'

const rtc = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

async function main() {
  const url = new URL(location.href)
  const room = url.searchParams.get('room')

  if (!room) {
    return pushNotification('No room set', 'error')
  }

  const server = new URL('portal', location.href)
  server.protocol = server.protocol.replace(/^http/, 'ws')

  const constraints: MediaTrackConstraints = {}
  const canConstrain = navigator.mediaDevices.getSupportedConstraints()

  if (canConstrain.width) constraints.width = { ideal: 1280 * 0.5 }
  if (canConstrain.height) constraints.height = { ideal: 720 * 0.5 }
  if (canConstrain.frameRate) constraints.frameRate = { ideal: 24 }

  const stream = await navigator.mediaDevices.getUserMedia({
    video:
      !url.searchParams.has('noConstrain') &&
      Object.keys(constraints).length > 0
        ? { ...constraints }
        : true,
  })

  console.debug('canConstrain', canConstrain, constraints)

  if (url.searchParams.has('self')) {
    const localVideo = document.getElementById('localVideo') as HTMLVideoElement
    localVideo.removeAttribute('aria-hidden')
    localVideo.srcObject = stream
  }

  const portalGun = new PortalGun({ room, url: server, rtc })

  portalGun.addEventListener('connection', (portal) => {
    portal.addMediaStream(stream)
    portal.peer.addEventListener('track', (event) => {
      event.track.onunmute = () => {
        updatePeer(portal.target.id, event.streams[0])
      }
    })
    portal.peer.addEventListener('connectionstatechange', (event) => {
      console.debug('peer@state', event)
    })
    portal.addEventListener('error', (error) => {
      pushNotification(error.message, 'error')
    })
    // TODO: just use above when ice errors are merged
    portal.peer.addEventListener('icecandidateerror', (event) => {
      pushNotification(event.type, 'error')
    })
  })

  portalGun.addEventListener('disconnection', (portal) =>
    updatePeer(portal.target.id, null)
  )
  portalGun.addEventListener('info', (info) => updateState(info))
  portalGun.addEventListener('debug', console.debug)
  portalGun.addEventListener('error', console.error)

  stream.addEventListener('addtrack', (event) => {
    console.debug('stream@addtrack', event.track)
  })
  stream.addEventListener('removetrack', (event) => {
    console.debug('stream@removetrack', event.track)
  })

  window.addEventListener(
    'resize',
    debounce(200, () => {
      console.log('onResize')
      updateGrid(grid.children.length)
    })
  )
}

function updatePeer(id: string, stream: MediaStream | null) {
  console.log('updatePeer', id, stream)

  let elem = document.querySelector<HTMLVideoElement>(
    `#grid > [data-video="${id}"]`
  )

  if (stream) {
    if (!elem) {
      elem = document.createElement('video')
      elem.muted = true
      elem.autoplay = true
      elem.dataset.video = id
      elem.playsInline = true
      grid.appendChild(elem)
    }

    elem.srcObject = stream
  } else if (elem) {
    grid.removeChild(elem)
  }

  updateGrid(grid.children.length)
}

function updateGrid(count: number) {
  const aspect = 16 / 9
  const { innerHeight, innerWidth } = window

  let [columns, rows] = [1, 1]
  for (let requiredColumns = 1; requiredColumns <= count; requiredColumns++) {
    const w = innerWidth / requiredColumns
    const h = w / aspect
    const requiredRows = Math.ceil(count / requiredColumns)
    const requiredHeight = requiredRows * h
    if (requiredHeight <= innerHeight) {
      ;[columns, rows] = [requiredColumns, requiredRows]
      break
    }
  }

  grid.style.setProperty('--columns', columns.toString())

  if (count > 0) {
    title.setAttribute('aria-hidden', 'true')
    version.setAttribute('aria-hidden', 'true')
  } else {
    title.removeAttribute('aria-hidden')
    version.removeAttribute('aria-hidden')
    title.textContent
  }
}

function updateState(info: InfoSignal) {
  console.log('info', info)
}

function pushNotification(message: string, type: 'info' | 'error') {
  const elem = document.createElement('div')
  elem.innerText = message
  elem.dataset.type = type
  notifications.appendChild(elem)

  setTimeout(() => {
    notifications.removeChild(elem)
  }, 10_000)
}

main()
