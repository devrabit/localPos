import{i as e,n as t}from"./invoicePrint-CKet0WWx.js";import{r as n}from"./pedidoEstados-C4nMqb9I.js";var r=`/pedido-header.png`.replace(/\/{2,}/g,`/`);async function i(){let e=new URL(r,window.location.origin).href,t=await fetch(e);if(!t.ok)throw Error(`No se pudo cargar la imagen de encabezado`);let n=await t.blob();return new Promise((e,t)=>{let r=new FileReader;r.onload=()=>e(String(r.result||``)),r.onerror=()=>t(Error(`No se pudo leer la imagen de encabezado`)),r.readAsDataURL(n)})}function a(e,r){let i=t(e.id),a=t(n(e.fechaCreacion)),o=t(e.dirigidoA||`-`),s=(e.items||[]).map(e=>`
    <tr>
      <td>${t(e.nombreProducto)}</td>
      <td>${t(e.referencia)}</td>
      <td class="num">${t(String(e.cantidad))}</td>
      <td>${t(e.descripcion||``)}</td>
    </tr>`).join(``);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Pedido ${i}</title>
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
  ${r?`<div class="header"><img src="${r}" alt="Nari Universe" /></div>`:``}
  <h1>Pedido</h1>
  <p><strong>ID:</strong> ${i}</p>
  <p><strong>Fecha:</strong> ${a}</p>
  <p><strong>Dirigido a:</strong> ${o}</p>
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
      ${s||`<tr><td colspan="4">Sin items</td></tr>`}
    </tbody>
  </table>
</body>
</html>`}async function o(t){await e(a(t,await i()))}export{o as t};