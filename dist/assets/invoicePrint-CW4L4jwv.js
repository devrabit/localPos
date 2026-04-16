import{t as e}from"./api-BwGJr1U7.js";import{D as t,a as n,n as r}from"./pinia-DDx8mYOQ.js";function i(e,t){return t!=null&&t!==``?`v-${t}`:`p-${e}`}var a=r(`carrito`,()=>{let r=t([]),a=t(!1),o=t(``),s=t(``),c=t(null);function l(e){if(e.tipo===`variable`)return;let t=e.stock===-1?-1:Number(e.stock??0);if(t===0)return;let n=i(e.id,null),a=r.value.find(e=>e.lineKey===n);if(a){if(t>=0&&a.cantidad>=t)return;a.cantidad+=1;return}r.value.push({lineKey:n,productId:e.id,variationId:null,nombre:e.nombre,precio:Number(e.precio),cantidad:1,maxStock:t})}function u({productId:e,variationId:t,nombre:n,precio:a,stock:o}){let s=o===-1?-1:Number(o??0);if(s===0)return;let c=i(e,t),l=r.value.find(e=>e.lineKey===c);if(l){if(s>=0&&l.cantidad>=s)return;l.cantidad+=1;return}r.value.push({lineKey:c,productId:e,variationId:t,nombre:n,precio:Number(a),cantidad:1,maxStock:s})}function d(e,t){let n=Math.max(1,Math.floor(Number(t)||1)),a=e.variationId==null?null:e.variationId,o=i(e.id,a),s=e.maxStock==null?-1:e.maxStock,c=r.value.find(e=>e.lineKey===o);if(c){let e=s>=0?s:1/0;c.cantidad=Math.min(c.cantidad+n,e);return}r.value.push({lineKey:o,productId:e.id,variationId:a,nombre:e.nombre,precio:Number(e.precio),cantidad:Math.min(n,s>=0?s:n),maxStock:s>=0?s:-1})}function f(e){let t=r.value.find(t=>t.lineKey===e);t&&(t.maxStock>=0&&t.cantidad>=t.maxStock||(t.cantidad+=1))}function p(e){let t=r.value.find(t=>t.lineKey===e);if(t){if(t.cantidad<=1){m(e);return}--t.cantidad}}function m(e){r.value=r.value.filter(t=>t.lineKey!==e)}function h(){r.value=[]}function g(){c.value=null}let _=n(()=>r.value.reduce((e,t)=>e+t.precio*t.cantidad,0));async function v(t){a.value=!0,o.value=``,s.value=``;try{let n={items:r.value.map(({productId:e,variationId:t,cantidad:n})=>({productId:e,...t!=null&&t!==``?{variationId:t}:{},cantidad:n}))};t&&(t.id!=null||t.nombre&&String(t.nombre).trim()||t.telefono&&String(t.telefono).trim())&&(n.cliente={...t.id==null?{}:{id:t.id},nombre:t.nombre?String(t.nombre).trim():``,telefono:t.telefono?String(t.telefono).trim():``});let i=r.value.map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.precio*e.cantidad})),a=r.value.reduce((e,t)=>e+t.precio*t.cantidad,0),o=t||{},{data:l}=await e.post(`/orden`,n),u=o.nombre&&String(o.nombre).trim()?String(o.nombre).trim():o.id==null?`Mostrador`:`Cliente #${o.id}`;return c.value={id:String(l.orderId),fecha:new Date().toISOString(),cliente:{nombre:u,documento:o.telefono?String(o.telefono).trim():``},items:i,total:a,metodo_pago:`POS`},s.value=`Orden #${l.orderId} creada correctamente`,h(),l}catch(e){throw o.value=e?.response?.data?.error||`No se pudo crear la orden`,e}finally{a.value=!1}}return{items:r,creatingOrder:a,orderError:o,orderSuccess:s,lastFactura:c,total:_,agregarProducto:l,agregarVariacion:u,agregarLinea:d,incrementar:f,decrementar:p,eliminar:m,limpiar:h,crearOrden:v,descartarUltimaFactura:g}});function o(e){return e==null?``:String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function s(e){return Number(e||0).toLocaleString(`es-CO`,{minimumFractionDigits:0,maximumFractionDigits:2})}function c(e){if(!e)return``;let t=String(e);return t.includes(`T`)?t.replace(`T`,` `).slice(0,19):t}function l(){return o(`Nari Universe`)}function u(e){let t=o(e.id),n=o(c(e.fecha)),r=l(),i=o(e.cliente?.nombre||`-`),a=o(e.cliente?.documento||``),u=o(e.metodo_pago||`POS`),d=s(e.total),f=(e.items||[]).map(e=>`
    <tr>
      <td>${o(e.nombre)}</td>
      <td class="num">${o(String(e.cantidad))}</td>
      <td class="num">$ ${s(e.precio)}</td>
      <td class="num">$ ${s(e.total)}</td>
    </tr>`).join(``);return`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Factura ${t}</title>
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
  <p><strong>Pedido:</strong> #${t}</p>
  <p><strong>Fecha:</strong> ${n}</p>
  <h4 class="nombre-tienda">${r}</h4>
  <p><strong>Cliente:</strong> ${i}${a?` · ${a}`:``}</p>
  <p><strong>Pago:</strong> ${u}</p>
  <h2>Detalle</h2>
  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${f}</tbody>
  </table>
  <p class="total">Total: $ ${d}</p>
</body>
</html>`}function d(e){return{id:String(e.id),fecha:e.fecha,cliente:{nombre:e.cliente||`-`,documento:e.telefono||e.email||``},items:(e.items||[]).map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.lineTotal})),total:e.total,metodo_pago:e.metodoPago||`POS`}}async function f(e){let t=await fetch(`/print`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({content:e})});if(!t.ok){let e=await t.json().catch(()=>({}));throw Error(e.error||`print service ${t.status}`)}return t.json()}function p(e){return new Promise((t,n)=>{let r=document.createElement(`iframe`);r.setAttribute(`title`,`Factura`),Object.assign(r.style,{position:`fixed`,right:`0`,bottom:`0`,width:`0`,height:`0`,border:`0`,visibility:`hidden`}),document.body.appendChild(r);let i=r.contentDocument;if(!i){document.body.removeChild(r),n(Error(`No se pudo crear documento de impresion`));return}i.open(),i.write(e),i.close();let a=()=>{try{document.body.removeChild(r)}catch{}t()};r.onload=()=>{try{r.contentWindow.focus(),r.contentWindow.print()}catch(e){a(),n(e);return}setTimeout(a,500)}})}async function m(e,t={}){let{useLocalService:n=!0}=t,r=u(e);if(n)try{await f(r)}catch{}await p(r)}export{m as n,a as r,d as t};