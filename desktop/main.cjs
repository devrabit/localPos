const path = require('path')
const http = require('http')
const { app, BrowserWindow, dialog } = require('electron')

const BACKEND_PORT = 3001

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend')
  }
  return path.resolve(__dirname, '../backend')
}

function getFrontendIndex() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend-dist/index.html')
  }
  return path.resolve(__dirname, '../frontend/dist/index.html')
}

function waitForBackend(timeoutMs = 30000) {
  const startTs = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve()
          return
        }
        req.destroy()
      })

      req.on('error', () => {
        if (Date.now() - startTs >= timeoutMs) {
          reject(new Error('Backend no responde en /health'))
          return
        }
        setTimeout(tick, 400)
      })

      req.setTimeout(1500, () => req.destroy())
    }

    tick()
  })
}

function bootBackend() {
  const backendDir = getBackendDir()
  process.chdir(backendDir)
  process.env.PORT = String(BACKEND_PORT)
  const { start } = require(path.join(backendDir, 'src/server.js'))
  start()
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  await win.loadFile(getFrontendIndex())
}

app.whenReady().then(async () => {
  try {
    bootBackend()
    await waitForBackend()
    await createWindow()
  } catch (error) {
    dialog.showErrorBox('Error iniciando NariPOS', String(error?.message || error))
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
