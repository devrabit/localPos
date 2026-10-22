import { onMounted, onUnmounted } from 'vue'
import { crearBufferEscaneo, limpiarCodigoLector } from '../utils/scanCode'

function shouldIgnoreScanTarget(target) {
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  if (target.closest && target.closest('[data-no-barcode-scan]')) return true
  return false
}

/** El lector alcanza a meter las primeras teclas en el input antes de que detectemos la rafaga. */
function limpiarCampoSiContiene(target, code) {
  if (!target) return
  const tag = target.tagName
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return
  const value = String(target.value || '')
  if (!value || !code) return
  let leaked = Math.min(value.length, code.length)
  while (leaked > 0 && !value.endsWith(code.slice(0, leaked))) leaked -= 1
  if (!leaked) return
  target.value = value.slice(0, -leaked)
  target.dispatchEvent(new Event('input', { bubbles: true }))
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
 * Tambien reconoce una rafaga rapida dentro de un input (el foco no se traga la lectura).
 * @param {{ onDecoded: (code: string) => void, isEnabled?: () => boolean }} options
 */
export function useBarcodeScanner(options) {
  const { onDecoded, isEnabled } = options
  const buffer = crearBufferEscaneo()

  function onKeyDown(e) {
    const ok = isEnabled ? isEnabled() : true
    if (!ok) return
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return

    const enCampo = shouldIgnoreScanTarget(e.target)
    const now = Date.now()

    if (e.key === 'Enter' || e.code === 'NumpadEnter') {
      const code = limpiarCodigoLector(buffer.pushEnter(now, enCampo))
      if (!code) return
      e.preventDefault()
      e.stopPropagation()
      limpiarCampoSiContiene(e.target, code)
      onDecoded(code)
      return
    }
    if (e.key === 'Escape') {
      buffer.reset()
      return
    }
    if (e.key.length !== 1) return

    const { robarTecla } = buffer.pushChar(e.key, now)
    if (enCampo && robarTecla) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, true)
  })
}
