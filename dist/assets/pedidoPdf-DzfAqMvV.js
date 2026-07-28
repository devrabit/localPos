import{i as e,n as t}from"./invoicePrint-CKet0WWx.js";import{n,r}from"./pedidoEstados-C4nMqb9I.js";function i(e){let i=t(e.id);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Pedido ${i}</title>
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
  <p><strong>ID:</strong> ${i}</p>
  <p><strong>Fecha:</strong> ${t(r(e.fechaCreacion))}</p>
  <p><strong>Dirigido a:</strong> ${t(e.dirigidoA||`-`)}</p>
  <p><strong>Estado:</strong> ${t(n(e.estado))}</p>
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
      ${(e.items||[]).map(e=>`
    <tr>
      <td>${t(e.nombreProducto)}</td>
      <td>${t(e.referencia)}</td>
      <td class="num">${t(String(e.cantidad))}</td>
      <td>${t(e.descripcion||``)}</td>
    </tr>`).join(``)||`<tr><td colspan="4">Sin items</td></tr>`}
    </tbody>
  </table>
</body>
</html>`}async function a(t){await e(i(t))}export{a as t};