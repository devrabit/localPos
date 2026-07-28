import { escapeHtml, printHtmlInIframe } from '../../../utils/invoicePrint'
import { etiquetaEstado, formatFechaPedido } from '../pedidoEstados'

function buildPedidoDocumentHtml(pedido) {
  const id = escapeHtml(pedido.id)
  const fecha = escapeHtml(formatFechaPedido(pedido.fechaCreacion))
  const dirigidoA = escapeHtml(pedido.dirigidoA || '-')
  const estado = escapeHtml(etiquetaEstado(pedido.estado))

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

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Pedido ${id}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 16px; color: #111; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    p { margin: 0.25rem 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95rem; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    .num { text-align: right; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>Pedido</h1>
  <p><strong>ID:</strong> ${id}</p>
  <p><strong>Fecha:</strong> ${fecha}</p>
  <p><strong>Dirigido a:</strong> ${dirigidoA}</p>
  <p><strong>Estado:</strong> ${estado}</p>
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
  const html = buildPedidoDocumentHtml(pedido)
  await printHtmlInIframe(html)
}
