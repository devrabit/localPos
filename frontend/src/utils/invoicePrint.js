/**
 * Generación e impresión de factura (HTML + window.print).
 * Textos escapados para evitar inyección en plantilla.
 */

export function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatFecha(iso) {
  if (!iso) return ''
  const s = String(iso)
  return s.includes('T') ? s.replace('T', ' ').slice(0, 19) : s
}

/** @param {object} factura modelo del spec (id, fecha, cliente, items, total, metodo_pago) */
export function buildInvoiceDocumentHtml(factura) {
  const id = escapeHtml(factura.id)
  const fecha = escapeHtml(formatFecha(factura.fecha))
  const clienteNombre = escapeHtml(factura.cliente?.nombre || '-')
  const documento = escapeHtml(factura.cliente?.documento || '')
  const metodo = escapeHtml(factura.metodo_pago || 'POS')
  const total = formatMoney(factura.total)

  const rows = (factura.items || [])
    .map(
      (it) => `
    <tr>
      <td>${escapeHtml(it.nombre)}</td>
      <td class="num">${escapeHtml(String(it.cantidad))}</td>
      <td class="num">$ ${formatMoney(it.precio)}</td>
      <td class="num">$ ${formatMoney(it.total)}</td>
    </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Factura ${id}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 1rem; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    h2 { font-size: 1rem; margin: 1rem 0 0.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.4rem 0.35rem; text-align: left; }
    th { background: #f4f4f5; }
    .num { text-align: right; }
    .total { margin-top: 1rem; font-size: 1.1rem; font-weight: bold; }
    @media print { body { margin: 0.5rem; } }
  </style>
</head>
<body>
  <h1>Factura</h1>
  <p><strong>Pedido:</strong> #${id}</p>
  <p><strong>Fecha:</strong> ${fecha}</p>
  <p><strong>Cliente:</strong> ${clienteNombre}${documento ? ` · ${documento}` : ''}</p>
  <p><strong>Pago:</strong> ${metodo}</p>
  <h2>Detalle</h2>
  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: $ ${total}</p>
</body>
</html>`
}

export function detalleHistorialToFactura(detalle) {
  return {
    id: String(detalle.id),
    fecha: detalle.fecha,
    cliente: {
      nombre: detalle.cliente || '-',
      documento: detalle.telefono || detalle.email || '',
    },
    items: (detalle.items || []).map((i) => ({
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: i.precio,
      total: i.lineTotal,
    })),
    total: detalle.total,
    metodo_pago: detalle.metodoPago || 'POS',
  }
}

/**
 * Notifica al servicio local (MVP: mismo endpoint que spec POST /print).
 * En dev, Vite proxy envía a backend. Si falla, la impresión por navegador sigue.
 */
export async function notifyPrintService(html) {
  const res = await fetch('/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: html }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `print service ${res.status}`)
  }
  return res.json()
}

export function printHtmlInIframe(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Factura')
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      visibility: 'hidden',
    })
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    if (!doc) {
      document.body.removeChild(iframe)
      reject(new Error('No se pudo crear documento de impresion'))
      return
    }
    doc.open()
    doc.write(html)
    doc.close()
    const cleanup = () => {
      try {
        document.body.removeChild(iframe)
      } catch {
        /* ignore */
      }
      resolve()
    }
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (e) {
        cleanup()
        reject(e)
        return
      }
      setTimeout(cleanup, 500)
    }
  })
}

/** @param {object} factura @param {{ useLocalService?: boolean }} [options] */
export async function imprimirFactura(factura, options = {}) {
  const { useLocalService = true } = options
  const html = buildInvoiceDocumentHtml(factura)
  if (useLocalService) {
    try {
      await notifyPrintService(html)
    } catch {
      /* impresión navegador aun así */
    }
  }
  await printHtmlInIframe(html)
}
