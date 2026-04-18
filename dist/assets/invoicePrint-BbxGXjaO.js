import{t as e}from"./api-BwGJr1U7.js";import{D as t,a as n,n as r}from"./pinia-DDx8mYOQ.js";function i(e){let t=Number(e);return Number.isFinite(t)?Math.round(t*100):0}function a(e){let t=Number(e);return Number.isFinite(t)?Math.round(t)/100:0}function o(e){if(e==null)return null;let t=String(e).trim().replace(/\s/g,``).replace(`,`,`.`);if(t===``)return null;let n=Number(t);return!Number.isFinite(n)||n<0?null:n}function s(e,t){return!Number.isFinite(e)||!Number.isFinite(t)?null:t-e}function c(e){return Number(e||0).toLocaleString(`es-CO`,{minimumFractionDigits:0,maximumFractionDigits:2})}function l(e,t){return t!=null&&t!==``?`v-${t}`:`p-${e}`}var u={CASH:`EFECTIVO`,TRANSFER:`TRANSFERENCIA`},d=[{value:u.CASH,label:`Pago en efectivo`},{value:u.TRANSFER,label:`Transferencia virtual`}];function f(e){return d.find(t=>t.value===e)?.label||``}var p=r(`carrito`,()=>{let r=t([]),c=t(!1),d=t(``),p=t(``),m=t(``),h=t(``);function g(e){m.value=e,e!==u.CASH&&(h.value=``)}function _(e){let t=Number(e);if(!Number.isFinite(t)||t<=0)return;let n=k.value??0;h.value=String(a(i(n)+i(t)))}let v=t(null);function y(e){if(e.tipo===`variable`)return;let t=e.stock===-1?-1:Number(e.stock??0);if(t===0)return;let n=l(e.id,null),i=r.value.find(e=>e.lineKey===n);if(i){if(t>=0&&i.cantidad>=t)return;i.cantidad+=1;return}r.value.push({lineKey:n,productId:e.id,variationId:null,nombre:e.nombre,precio:Number(e.precio),cantidad:1,maxStock:t})}function b({productId:e,variationId:t,nombre:n,precio:i,stock:a}){let o=a===-1?-1:Number(a??0);if(o===0)return;let s=l(e,t),c=r.value.find(e=>e.lineKey===s);if(c){if(o>=0&&c.cantidad>=o)return;c.cantidad+=1;return}r.value.push({lineKey:s,productId:e,variationId:t,nombre:n,precio:Number(i),cantidad:1,maxStock:o})}function x(e,t){let n=Math.max(1,Math.floor(Number(t)||1)),i=e.variationId==null?null:e.variationId,a=l(e.id,i),o=e.maxStock==null?-1:e.maxStock,s=r.value.find(e=>e.lineKey===a);if(s){let e=o>=0?o:1/0;s.cantidad=Math.min(s.cantidad+n,e);return}r.value.push({lineKey:a,productId:e.id,variationId:i,nombre:e.nombre,precio:Number(e.precio),cantidad:Math.min(n,o>=0?o:n),maxStock:o>=0?o:-1})}function S(e){let t=r.value.find(t=>t.lineKey===e);t&&(t.maxStock>=0&&t.cantidad>=t.maxStock||(t.cantidad+=1))}function C(e){let t=r.value.find(t=>t.lineKey===e);if(t){if(t.cantidad<=1){w(e);return}--t.cantidad}}function w(e){r.value=r.value.filter(t=>t.lineKey!==e)}function T(){r.value=[]}function E(){v.value=null}let D=n(()=>r.value.reduce((e,t)=>e+t.precio*t.cantidad,0)),O=n(()=>i(D.value)),k=n(()=>o(h.value)),A=n(()=>{if(m.value!==u.CASH)return null;let e=k.value;return e==null?null:s(O.value,i(e))}),j=n(()=>{if(m.value!==u.CASH)return!0;let e=k.value;return e==null?!1:i(e)>=O.value});async function M(t){c.value=!0,d.value=``,p.value=``;try{if(!m.value)throw Error(`Debes seleccionar un método de pago`);if(m.value===u.CASH){let e=k.value;if(e==null)throw Error(`Ingresa el dinero recibido`);if(i(e)<O.value)throw Error(`El dinero es insuficiente`)}let n={payment_method:m.value,paymentMethod:m.value,items:r.value.map(({productId:e,variationId:t,cantidad:n})=>({productId:e,...t!=null&&t!==``?{variationId:t}:{},cantidad:n}))};if(m.value===u.CASH){let e=k.value;n.cash_received=e,n.cashReceived=e}t&&(t.id!=null||t.nombre&&String(t.nombre).trim()||t.telefono&&String(t.telefono).trim())&&(n.cliente={...t.id==null?{}:{id:t.id},nombre:t.nombre?String(t.nombre).trim():``,telefono:t.telefono?String(t.telefono).trim():``});let a=r.value.map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.precio*e.cantidad})),o=r.value.reduce((e,t)=>e+t.precio*t.cantidad,0),s=m.value===u.CASH?k.value:null,c=m.value===u.CASH&&s!=null?s-o:null,l=t||{},{data:d}=await e.post(`/orden`,n),g=l.nombre&&String(l.nombre).trim()?String(l.nombre).trim():l.id==null?`Mostrador`:`Cliente #${l.id}`;return v.value={id:String(d.orderId),fecha:new Date().toISOString(),cliente:{nombre:g,documento:l.telefono?String(l.telefono).trim():``},items:a,total:o,metodo_pago:f(m.value)||m.value,...s==null?{}:{cash_received:s,change:c}},p.value=`Orden #${d.orderId} creada correctamente`,T(),m.value=``,h.value=``,d}catch(e){throw d.value=e?.response?.data?.error||e?.message||`No se pudo crear la orden`,e}finally{c.value=!1}}return{items:r,creatingOrder:c,orderError:d,orderSuccess:p,paymentMethod:m,setPaymentMethod:g,addQuickCash:_,cashReceivedStr:h,totalMinor:O,cashReceivedParsed:k,changeMinorValue:A,cashReadyForCheckout:j,lastFactura:v,total:D,agregarProducto:y,agregarVariacion:b,agregarLinea:x,incrementar:S,decrementar:C,eliminar:w,limpiar:T,crearOrden:M,descartarUltimaFactura:E}});function m(e){return e==null?``:String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function h(e){return Number(e||0).toLocaleString(`es-CO`,{minimumFractionDigits:0,maximumFractionDigits:2})}function g(e){if(!e)return``;let t=String(e);return t.includes(`T`)?t.replace(`T`,` `).slice(0,19):t}function _(){return m(`Nari Universe`)}function v(e){let t=m(e.id),n=m(g(e.fecha)),r=_(),i=m(e.cliente?.nombre||`-`),a=m(e.cliente?.documento||``),o=m(e.metodo_pago||`POS`),s=h(e.total),c=e.cash_received!=null&&Number.isFinite(Number(e.cash_received))?h(e.cash_received):null,l=e.change!=null&&Number.isFinite(Number(e.change))?h(e.change):null,u=(e.items||[]).map(e=>`
    <tr>
      <td>${m(e.nombre)}</td>
      <td class="num">${m(String(e.cantidad))}</td>
      <td class="num">$ ${h(e.precio)}</td>
      <td class="num">$ ${h(e.total)}</td>
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
  ${c==null?``:`<p><strong>Recibido:</strong> $ ${m(c)}</p>`}
  ${l==null?``:`<p><strong>Cambio:</strong> $ ${m(l)}</p>`}
  <h2>Detalle</h2>
  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${u}</tbody>
  </table>
  <p class="total">Total: $ ${s}</p>
</body>
</html>`}function y(e){return{id:String(e.id),fecha:e.fecha,cliente:{nombre:e.cliente||`-`,documento:e.telefono||e.email||``},items:(e.items||[]).map(e=>({nombre:e.nombre,cantidad:e.cantidad,precio:e.precio,total:e.lineTotal})),total:e.total,metodo_pago:e.metodoPago||`POS`}}async function b(e){let t=await fetch(`/print`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({content:e})});if(!t.ok){let e=await t.json().catch(()=>({}));throw Error(e.error||`print service ${t.status}`)}return t.json()}function x(e){return new Promise((t,n)=>{let r=document.createElement(`iframe`);r.setAttribute(`title`,`Factura`),Object.assign(r.style,{position:`fixed`,right:`0`,bottom:`0`,width:`0`,height:`0`,border:`0`,visibility:`hidden`}),document.body.appendChild(r);let i=r.contentDocument;if(!i){document.body.removeChild(r),n(Error(`No se pudo crear documento de impresion`));return}i.open(),i.write(e),i.close();let a=()=>{try{document.body.removeChild(r)}catch{}t()};r.onload=()=>{try{r.contentWindow.focus(),r.contentWindow.print()}catch(e){a(),n(e);return}setTimeout(a,500)}})}async function S(e,t={}){let{useLocalService:n=!0}=t,r=v(e);if(n)try{await b(r)}catch{}await x(r)}export{p as a,d as i,S as n,c as o,u as r,y as t};