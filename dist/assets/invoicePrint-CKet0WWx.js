function e(e){return e==null?``:String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function t(e){return Number(e||0).toLocaleString(`es-CO`,{minimumFractionDigits:0,maximumFractionDigits:2})}function n(e){if(!e)return``;let t=String(e);return t.includes(`T`)?t.replace(`T`,` `).slice(0,19):t}function r(){return e(`Nari Universe`)}function i(i){let a=e(i.id),o=e(n(i.fecha)),s=r(),c=e(i.cliente?.nombre||`-`),l=e(i.cliente?.documento||``),u=e(i.metodo_pago||`POS`),d=t(i.total),f=i.cash_received!=null&&Number.isFinite(Number(i.cash_received))?t(i.cash_received):null,p=i.change!=null&&Number.isFinite(Number(i.change))?t(i.change):null,m=(i.items||[]).map(n=>`
    <tr>
      <td>${e(n.nombre)}</td>
      <td class="num">${e(String(n.cantidad))}</td>
      <td class="num">$ ${t(n.precio)}</td>
      <td class="num">$ ${t(n.total)}</td>
    </tr>`).join(``);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Factura ${a}</title>
  <style>
    html, body {
      height: auto;
      min-height: 0;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 8px 10px 2px 10px;
      color: #111;
      box-sizing: border-box;
    }
    h1 { font-size: 1.25rem; margin: 0 0 0.35rem; }
    h2 { font-size: 1rem; margin: 0.6rem 0 0.35rem; }
    p { margin: 0.15rem 0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.35rem 0.3rem; text-align: left; }
    th { background: #f4f4f5; }
    .num { text-align: right; }
    .nombre-tienda {
      text-align: center;
      font-weight: 600;
      font-size: 1.05rem;
      margin: 0.35rem 0 0.45rem;
      width: 100%;
    }
    .total {
      margin: 0.5rem 0 0 0;
      padding: 0 0 0 0;
      font-size: 1.1rem;
      font-weight: bold;
    }
    @media print {
      @page { margin: 4mm 5mm 2mm 5mm; size: auto; }
      html, body { margin: 0; padding: 0 4mm 0 4mm; }
      body { padding-bottom: 0 !important; }
      .total { margin-bottom: 0 !important; page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <h1>Factura</h1>
  <p><strong>Pedido:</strong> #${a}</p>
  <p><strong>Fecha:</strong> ${o}</p>
  <h4 class="nombre-tienda">${s}</h4>
  <p><strong>Cliente:</strong> ${c}${l?` · ${l}`:``}</p>
  <p><strong>Pago:</strong> ${u}</p>
  ${f==null?``:`<p><strong>Recibido:</strong> $ ${e(f)}</p>`}
  ${p==null?``:`<p><strong>Cambio:</strong> $ ${e(p)}</p>`}
  <h2>Detalle</h2>
  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${m}</tbody>
  </table>
  <p class="total">Total: $ ${d}</p>
</body>
</html>`}function a(e){return{id:String(e.id),fecha:e.fecha,cliente:{nombre:e.cliente||`-`,documento:e.telefono||e.email||``},items:(e.items||[]).map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.lineTotal})),total:e.total,metodo_pago:e.metodoPago||`POS`}}async function o(e){let t=await fetch(`/print`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({content:e})});if(!t.ok){let e=await t.json().catch(()=>({}));throw Error(e.error||`print service ${t.status}`)}return t.json()}function s(e){return new Promise((t,n)=>{let r=document.createElement(`iframe`);r.setAttribute(`title`,`Factura`),Object.assign(r.style,{position:`fixed`,right:`0`,bottom:`0`,width:`0`,height:`0`,border:`0`,visibility:`hidden`}),document.body.appendChild(r);let i=r.contentDocument;if(!i){document.body.removeChild(r),n(Error(`No se pudo crear documento de impresion`));return}i.open(),i.write(e),i.close();let a=()=>{try{document.body.removeChild(r)}catch{}t()};r.onload=()=>{try{r.contentWindow.focus(),r.contentWindow.print()}catch(e){a(),n(e);return}setTimeout(a,500)}})}async function c(e,t={}){let{useLocalService:n=!0}=t,r=i(e);if(n)try{await o(r)}catch{}await s(r)}export{s as i,e as n,c as r,a as t};