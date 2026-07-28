import { escapeHtml, printHtmlInIframe } from '../../../utils/invoicePrint'
import { formatFechaPedido } from '../pedidoEstados'

const HEADER_PATH = `${import.meta.env.BASE_URL || '/'}pedido-header.png`.replace(
  /\/{2,}/g,
  '/',
)

async function loadHeaderDataUrl() {
  const url = new URL(HEADER_PATH, window.location.origin).href
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('No se pudo cargar la imagen de encabezado')
  }
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen de encabezado'))
    reader.readAsDataURL(blob)
  })
}

function buildPedidoDocumentHtml(pedido, headerDataUrl) {
  const id = escapeHtml(pedido.id)
  const fecha = escapeHtml(formatFechaPedido(pedido.fechaCreacion))
  const dirigidoA = escapeHtml(pedido.dirigidoA || '-')

  const rows = (pedido.items || [])
    .map(
      (it) => `
    <tr>
      <td>${escapeHtml(it.nombreProducto)}</td>
      <td>${escapeHtml(it.referencia)}</td>
      <td class="num">${escapeHtml(String(it.cantidad))}</td>
      <td>${escapeHtml(it.descripcion || '')}</td>
    </tr>`,
    )
    .join('')

  const header = headerDataUrl
    ? `<div class="header"><img src="${headerDataUrl}" alt="Nari Universe" /></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Pedido ${id}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; color: #111; }
    .header { margin: 0 0 1rem; text-align: center; }
    .header img { width: 100%; max-width: 720px; height: auto; display: block; margin: 0 auto; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    p { margin: 0.25rem 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95rem; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    .num { text-align: right; }
    @media print {
      body { padding: 0; }
      .header img { max-width: 100%; }
    }
  </style>
</head>
<body>
  ${header}
  <h1>Pedido</h1>
  <p><strong>ID:</strong> ${id}</p>
  <p><strong>Fecha:</strong> ${fecha}</p>
  <p><strong>Dirigido a:</strong> ${dirigidoA}</p>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Referencia</th>
        <th>Cantidad</th>
        <th>Descripcion</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Sin items</td></tr>'}
    </tbody>
  </table>
</body>
</html>`
}

/** Imprime / Guardar como PDF sin window.open (iframe oculto). */
export async function descargarPedidoPdf(pedido) {
  const headerDataUrl = await loadHeaderDataUrl()
  const html = buildPedidoDocumentHtml(pedido, headerDataUrl)
  await printHtmlInIframe(html)
}
