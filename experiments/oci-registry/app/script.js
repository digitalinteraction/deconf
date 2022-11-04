const VERSION = '1.0.0'

window.addEventListener('DOMContentLoaded', () => {
  console.debug('window@DOMContentLoaded')
  const versionElem = document.getElementById('version')
  versionElem.textContent = 'v' + VERSION
})
