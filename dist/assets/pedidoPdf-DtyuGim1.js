import{n as e}from"./invoicePrint-Lv67RAg3.js";import{n as t,r as n}from"./pedidoEstados-C4nMqb9I.js";function r(r){let i=e(r.id);return`<!DOCTYPE html>
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
  <p><strong>Fecha:</strong> ${e(n(r.fechaCreacion))}</p>
  <p><strong>Dirigido a:</strong> ${e(r.dirigidoA||`-`)}</p>
  <p><strong>Estado:</strong> ${e(t(r.estado))}</p>
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
      ${(r.items||[]).map(t=>`
    <tr>
      <td>${e(t.nombreProducto)}</td>
      <td>${e(t.referencia)}</td>
      <td class="num">${e(String(t.cantidad))}</td>
      <td>${e(t.descripcion||``)}</td>
    </tr>`).join(``)||`<tr><td colspan="4">Sin items</td></tr>`}
    </tbody>
  </table>
</body>
</html>`}function i(e){let t=r(e),n=window.open(``,`_blank`,`noopener,noreferrer,width=900,height=700`);if(!n)throw Error(`El navegador bloqueo la ventana de impresion`);n.document.open(),n.document.write(t),n.document.close(),n.focus(),setTimeout(()=>{n.print()},250)}export{i as t};