import { onMounted, onUnmounted } from 'vue'

function shouldIgnoreScanTarget(target) {
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  if (target.closest && target.closest('[data-no-barcode-scan]')) return true
  return false
}

export function playScanBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.value = 0.04
    o.start()
    setTimeout(() => {
      try {
        o.stop()
        ctx.close()
      } catch {
        /* ignore */
      }
    }, 70)
  } catch {
    /* ignore */
  }
}

/**
 * Lector USB tipo teclado: acumula hasta Enter.
 * @param {{ onDecoded: (code: string) => void, isEnabled?: () => boolean }} options
 */
export function useBarcodeScanner(options) {
  const { onDecoded, isEnabled } = options
  let buffer = ''

  function onKeyDown(e) {
    const ok = isEnabled ? isEnabled() : true
    if (!ok) return
    if (shouldIgnoreScanTarget(e.target)) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    if (e.key === 'Enter') {
      const code = buffer
      buffer = ''
      if (code.length >= 1) {
        onDecoded(code)
      }
      return
    }
    if (e.key === 'Escape') {
      buffer = ''
      return
    }
    if (e.key.length === 1 && buffer.length < 80) {
      buffer += e.key
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, true)
  })
}
