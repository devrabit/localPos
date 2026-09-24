import{t as e}from"./api-DRrfCRHX.js";import{M as t,r as n}from"./runtime-core.esm-bundler-9fOH5Sr9.js";import{r}from"./index-BYH5Elcl.js";var i={EFECTIVO:`EFECTIVO`,TRANSFERENCIA:`TRANSFERENCIA`},a=[{value:i.EFECTIVO,label:`Pago en efectivo`},{value:i.TRANSFERENCIA,label:`Transferencia virtual`}];function o(e){return a.find(t=>t.value===e)?.label||e||``}function s(e,t){return t!=null&&t!==``?`v-${t}`:`p-${e}`}var c=r(`carrito`,()=>{let r=t([]),a=t(!1),c=t(``),l=t(``),u=t(null);function d(e){if(e.tipo===`variable`)return;let t=e.stock===-1?-1:Number(e.stock??0);if(t===0)return;let n=s(e.id,null),i=r.value.find(e=>e.lineKey===n);if(i){if(t>=0&&i.cantidad>=t)return;i.cantidad+=1;return}r.value.push({lineKey:n,productId:e.id,variationId:null,nombre:e.nombre,precio:Number(e.precio),cantidad:1,maxStock:t})}function f({productId:e,variationId:t,nombre:n,precio:i,stock:a}){let o=a===-1?-1:Number(a??0);if(o===0)return;let c=s(e,t),l=r.value.find(e=>e.lineKey===c);if(l){if(o>=0&&l.cantidad>=o)return;l.cantidad+=1;return}r.value.push({lineKey:c,productId:e,variationId:t,nombre:n,precio:Number(i),cantidad:1,maxStock:o})}function p(e,t){let n=Math.max(1,Math.floor(Number(t)||1)),i=e.variationId==null?null:e.variationId,a=s(e.id,i),o=e.maxStock==null?-1:e.maxStock,c=r.value.find(e=>e.lineKey===a);if(c){let e=o>=0?o:1/0;c.cantidad=Math.min(c.cantidad+n,e);return}r.value.push({lineKey:a,productId:e.id,variationId:i,nombre:e.nombre,precio:Number(e.precio),cantidad:Math.min(n,o>=0?o:n),maxStock:o>=0?o:-1})}function m(e){let t=r.value.find(t=>t.lineKey===e);t&&(t.maxStock>=0&&t.cantidad>=t.maxStock||(t.cantidad+=1))}function h(e){let t=r.value.find(t=>t.lineKey===e);if(t){if(t.cantidad<=1){g(e);return}--t.cantidad}}function g(e){r.value=r.value.filter(t=>t.lineKey!==e)}function _(){r.value=[]}function v(){u.value=null}let y=n(()=>r.value.reduce((e,t)=>e+t.precio*t.cantidad,0));async function b(t,n){a.value=!0,c.value=``,l.value=``;try{if(!Object.values(i).includes(n))throw Error(`Debes seleccionar un metodo de pago`);let a={paymentMethod:n,items:r.value.map(({productId:e,variationId:t,cantidad:n})=>({productId:e,...t!=null&&t!==``?{variationId:t}:{},cantidad:n}))};t&&(t.id!=null||t.nombre&&String(t.nombre).trim()||t.telefono&&String(t.telefono).trim())&&(a.cliente={...t.id==null?{}:{id:t.id},nombre:t.nombre?String(t.nombre).trim():``,telefono:t.telefono?String(t.telefono).trim():``});let s=r.value.map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.precio*e.cantidad})),c=r.value.reduce((e,t)=>e+t.precio*t.cantidad,0),d=t||{},{data:f}=await e.post(`/orden`,a),p=o(n),m=d.nombre&&String(d.nombre).trim()?String(d.nombre).trim():d.id==null?`Mostrador`:`Cliente #${d.id}`;return u.value={id:String(f.orderId),fecha:new Date().toISOString(),cliente:{nombre:m,documento:d.telefono?String(d.telefono).trim():``},items:s,total:c,metodo_pago:p||`POS`},l.value=`Orden #${f.orderId} creada correctamente`,_(),f}catch(e){throw c.value=e?.response?.data?.error||e?.message||`No se pudo crear la orden`,e}finally{a.value=!1}}return{items:r,creatingOrder:a,orderError:c,orderSuccess:l,lastFactura:u,total:y,agregarProducto:d,agregarVariacion:f,agregarLinea:p,incrementar:m,decrementar:h,eliminar:g,limpiar:_,crearOrden:b,descartarUltimaFactura:v}});function l(e){return e==null?``:String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function u(e){return Number(e||0).toLocaleString(`es-CO`,{minimumFractionDigits:0,maximumFractionDigits:2})}function d(e){if(!e)return``;let t=String(e);return t.includes(`T`)?t.replace(`T`,` `).slice(0,19):t}function f(){return l(`Nari Universe`)}function p(e){let t=l(e.id),n=l(d(e.fecha)),r=f(),i=l(e.cliente?.nombre||`-`),a=l(e.cliente?.documento||``),o=l(e.metodo_pago||`POS`),s=u(e.total),c=(e.items||[]).map(e=>`
    <tr>
      <td>${l(e.nombre)}</td>
      <td class="num">${l(String(e.cantidad))}</td>
      <td class="num">$ ${u(e.precio)}</td>
      <td class="num">$ ${u(e.total)}</td>
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
  <p><strong>Pago:</strong> ${o}</p>
  <h2>Detalle</h2>
  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${c}</tbody>
  </table>
  <p class="total">Total: $ ${s}</p>
</body>
</html>`}function m(e){return{id:String(e.id),fecha:e.fecha,cliente:{nombre:e.cliente||`-`,documento:e.telefono||e.email||``},items:(e.items||[]).map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.lineTotal})),total:e.total,metodo_pago:e.metodoPago||`POS`}}async function h(e){let t=await fetch(`/print`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({content:e})});if(!t.ok){let e=await t.json().catch(()=>({}));throw Error(e.error||`print service ${t.status}`)}return t.json()}function g(e){return new Promise((t,n)=>{let r=document.createElement(`iframe`);r.setAttribute(`title`,`Factura`),Object.assign(r.style,{position:`fixed`,right:`0`,bottom:`0`,width:`0`,height:`0`,border:`0`,visibility:`hidden`}),document.body.appendChild(r);let i=r.contentDocument;if(!i){document.body.removeChild(r),n(Error(`No se pudo crear documento de impresion`));return}i.open(),i.write(e),i.close();let a=()=>{try{document.body.removeChild(r)}catch{}t()};r.onload=()=>{try{r.contentWindow.focus(),r.contentWindow.print()}catch(e){a(),n(e);return}setTimeout(a,500)}})}async function _(e,t={}){let{useLocalService:n=!0}=t,r=p(e);if(n)try{await h(r)}catch{}await g(r)}export{a,i,_ as n,c as r,m as t};