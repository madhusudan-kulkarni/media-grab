(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const u of document.querySelectorAll('link[rel="modulepreload"]'))n(u);new MutationObserver(u=>{for(const c of u)if(c.type==="childList")for(const p of c.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&n(p)}).observe(document,{childList:!0,subtree:!0});function a(u){const c={};return u.integrity&&(c.integrity=u.integrity),u.referrerPolicy&&(c.referrerPolicy=u.referrerPolicy),u.crossOrigin==="use-credentials"?c.credentials="include":u.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function n(u){if(u.ep)return;u.ep=!0;const c=a(u);fetch(u.href,c)}})();try{}catch(l){console.error("[wxt] Failed to initialize plugins",l)}const F=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,Q=F;var R,U;function ae(){if(U)return R;U=1;class l{constructor(a){this.data=a}}return R=class{constructor(){this.length=0}enqueue(a){const n=new l(a);return n.prev=this.tail,this.tail?this.tail.next=n:this.head=n,this.tail=n,this.length++,n}prepend(a){const n=new l(a);return n.next=this.head,this.head?this.head.prev=n:this.tail=n,this.head=n,this.length++,n}insertAfter(a,n){if(!a)return this.prepend(n);const u=new l(n);return u.prev=a,u.next=a.next,a.next?a.next.prev=u:this.tail=u,a.next=u,this.length++,u}moveToTail(a){a!==this.tail&&(a.prev?a.prev.next=a.next:this.head=a.next,a.next.prev=a.prev,a.prev=this.tail,a.next=void 0,this.tail.next=a,this.tail=a)}dequeue(){if(!this.head)return;const{data:a}=this.head;return this.remove(this.head),a}remove(a){a.prev?a.prev.next=a.next:this.head=a.next,a.next?a.next.prev=a.prev:this.tail=a.prev,this.length--}size(){return this.length}},R}var D,G;function re(){if(G)return D;G=1;const l=ae(),i=Symbol("shared");return D=(a=1)=>{const n=new Map,u=new l;let c,p=0,f=0,w=0;const b=t=>{let d=n.get(t);return d||(d={key:t,queue:new l,holders:0},d.turnNode=u.insertAfter(c,d),c=d.turnNode,n.set(t,d)),d},k=t=>{t.turnNode===c&&(c=t.turnNode.prev),u.remove(t.turnNode)},L=t=>{t.turnNode===c&&(c=t.turnNode.prev),u.moveToTail(t.turnNode)},I=t=>{t.holders>0||t.queue.size()>0||(k(t),n.delete(t.key))},$=t=>t.queue.head.data.joinSeq<=w,T=()=>{let t;for(let d=u.head;d;d=d.next){const m=d.data;if(!(m.queue.size()===0||!$(m))){if(m.holders===0)return m;t||(t=m)}}return t},r=()=>{const t=T();return t||(w=f,T())},s=t=>{--a,t.holders++,L(t);let d=!1;return()=>{d||(d=!0,t.holders--,L(t),I(t),++a,e())}},e=()=>{if(p===0)return;const t=r(),d=t.queue.dequeue();p--,d.acquire(s(t))},o=(t,d)=>new Promise(m=>{if(t!=null&&(typeof t.addEventListener!="function"||typeof t.removeEventListener!="function"||typeof t.aborted!="boolean"))throw new TypeError("`signal` needs to be an AbortSignal.");if(t?.aborted)return m(null);const h=b(d===void 0?i:d);if(!o.isLocked())return m(s(h));const M={joinSeq:++f,acquire:m};if(M.node=h.queue.enqueue(M),p++,t!=null){const S=()=>{h.queue.remove(M.node),p--,I(h),m(null)};M.acquire=x=>{t.removeEventListener("abort",S),m(x)},t.addEventListener("abort",S,{once:!0})}});return o.isLocked=()=>a===0,o.awaiting=()=>p,o},D}var _,X;function ie(){if(X)return _;X=1;const l=ae();return _=(i=1)=>{const a=new l,n=()=>{++i;const f=a.dequeue();f&&f.acquire()},u=()=>{let f=!1;return()=>{f||(f=!0,n())}},c=f=>{--i,f(u())},p=f=>f==null&&i!==0?(--i,Promise.resolve(u())):new Promise(w=>{if(f!=null&&typeof f.addEventListener!="function")throw new TypeError("`signal` needs to be an AbortSignal.");if(f!=null&&f.aborted)return w(null);if(i!==0)return c(w);const b={acquire:()=>c(w)},k=a.enqueue(b);if(f!=null){const L=()=>{a.remove(k),w(null)};b.acquire=()=>{f.removeEventListener("abort",L),c(w)},f.addEventListener("abort",L,{once:!0})}});return p.isLocked=()=>i===0,p.awaiting=()=>a.size(),p},_}var B,Z;function oe(){if(Z)return B;Z=1;const l=re(),i=ie();return B={withLock:u=>{const c=i(u),p=async(f,w)=>{const b=await c(w);if(b)try{return await f()}finally{b()}};return p.isLocked=c.isLocked,p.awaiting=c.awaiting,p},createLock:i,withFairQueue:u=>{const c=l(u),p=async(f,w,b)=>{const k=await c(b,w);if(k)try{return await f()}finally{k()}};return p.isLocked=c.isLocked,p.awaiting=c.awaiting,p},createFairQueue:l,createFairLock:l},B}var se=oe(),J=Object.prototype.hasOwnProperty;function W(l,i){var a,n;if(l===i)return!0;if(l&&i&&(a=l.constructor)===i.constructor){if(a===Date)return l.getTime()===i.getTime();if(a===RegExp)return l.toString()===i.toString();if(a===Array){if((n=l.length)===i.length)for(;n--&&W(l[n],i[n]););return n===-1}if(!a||typeof l=="object"){n=0;for(a in l)if(J.call(l,a)&&++n&&!J.call(i,a)||!(a in i)||!W(l[a],i[a]))return!1;return Object.keys(i).length===n}}return l!==l&&i!==i}const q=le();function le(){const l={local:P("local"),session:P("session"),sync:P("sync"),managed:P("managed")},i=r=>{const s=l[r];if(s==null){const e=Object.keys(l).join(", ");throw Error(`Invalid area "${r}". Options: ${e}`)}return s},a=r=>{const s=r.indexOf(":"),e=r.substring(0,s),o=r.substring(s+1);if(o==null)throw Error(`Storage key should be in the form of "area:key", but received "${r}"`);return{driverArea:e,driverKey:o,driver:i(e)}},n=r=>r+"$",u=(r,s)=>{const e={...r};return Object.entries(s).forEach(([o,t])=>{t==null?delete e[o]:e[o]=t}),e},c=(r,s)=>r??s??null,p=r=>r!=null&&typeof r=="object"&&!Array.isArray(r)?r:{},f=async(r,s,e)=>c(await r.getItem(s),e?.fallback??e?.defaultValue),w=async(r,s)=>{const e=n(s);return p(await r.getItem(e))},b=async(r,s,e)=>{await r.setItem(s,e??null)},k=async(r,s,e)=>{const o=n(s),t=p(await r.getItem(o));await r.setItem(o,u(t,e))},L=async(r,s,e)=>{if(await r.removeItem(s),e?.removeMeta){const o=n(s);await r.removeItem(o)}},I=async(r,s,e)=>{const o=n(s);if(e==null)await r.removeItem(o);else{const t=p(await r.getItem(o));[e].flat().forEach(d=>delete t[d]),await r.setItem(o,t)}},$=(r,s,e)=>r.watch(s,e),T=(r,s,e)=>$(r,n(s),(o,t)=>e(p(o),p(t)));return{getItem:async(r,s)=>{const{driver:e,driverKey:o}=a(r);return await f(e,o,s)},getItems:async r=>{const s=new Map,e=new Map,o=[];r.forEach(d=>{let m,h;typeof d=="string"?m=d:"getValue"in d?(m=d.key,h={fallback:d.fallback}):(m=d.key,h=d.options),o.push(m);const{driverArea:M,driverKey:S}=a(m),x=s.get(M)??[];s.set(M,x.concat(S)),e.set(m,h)});const t=new Map;return await Promise.all(Array.from(s.entries()).map(async([d,m])=>{(await l[d].getItems(m)).forEach(h=>{const M=`${d}:${h.key}`,S=e.get(M),x=c(h.value,S?.fallback??S?.defaultValue);t.set(M,x)})})),o.map(d=>({key:d,value:t.get(d)}))},getMeta:async r=>{const{driver:s,driverKey:e}=a(r);return await w(s,e)},getMetas:async r=>{const s=r.map(t=>{const d=typeof t=="string"?t:t.key,{driverArea:m,driverKey:h}=a(d);return{key:d,driverArea:m,driverKey:h,driverMetaKey:n(h)}}),e=s.reduce((t,d)=>(t[d.driverArea]??=[],t[d.driverArea].push(d),t),{}),o={};return await Promise.all(Object.entries(e).map(async([t,d])=>{const m=await F.storage[t].get(d.map(h=>h.driverMetaKey));d.forEach(h=>{o[h.key]=m[h.driverMetaKey]??{}})})),s.map(t=>({key:t.key,meta:o[t.key]}))},setItem:async(r,s)=>{const{driver:e,driverKey:o}=a(r);await b(e,o,s)},setItems:async r=>{const s={};r.forEach(e=>{const{driverArea:o,driverKey:t}=a("key"in e?e.key:e.item.key);s[o]??=[],s[o].push({key:t,value:e.value})}),await Promise.all(Object.entries(s).map(async([e,o])=>{await i(e).setItems(o)}))},setMeta:async(r,s)=>{const{driver:e,driverKey:o}=a(r);await k(e,o,s)},setMetas:async r=>{const s={};r.forEach(e=>{const{driverArea:o,driverKey:t}=a("key"in e?e.key:e.item.key);s[o]??=[],s[o].push({key:t,properties:e.meta})}),await Promise.all(Object.entries(s).map(async([e,o])=>{const t=i(e),d=o.map(({key:S})=>n(S)),m=await t.getItems(d),h=Object.fromEntries(m.map(({key:S,value:x})=>[S,p(x)])),M=o.map(({key:S,properties:x})=>{const E=n(S);return{key:E,value:u(h[E]??{},x)}});await t.setItems(M)}))},removeItem:async(r,s)=>{const{driver:e,driverKey:o}=a(r);await L(e,o,s)},removeItems:async r=>{const s={};r.forEach(e=>{let o,t;typeof e=="string"?o=e:"getValue"in e?o=e.key:"item"in e?(o=e.item.key,t=e.options):(o=e.key,t=e.options);const{driverArea:d,driverKey:m}=a(o);s[d]??=[],s[d].push(m),t?.removeMeta&&s[d].push(n(m))}),await Promise.all(Object.entries(s).map(async([e,o])=>{await i(e).removeItems(o)}))},clear:async r=>{await i(r).clear()},removeMeta:async(r,s)=>{const{driver:e,driverKey:o}=a(r);await I(e,o,s)},snapshot:async(r,s)=>{const e=await i(r).snapshot();return s?.excludeKeys?.forEach(o=>{delete e[o],delete e[n(o)]}),e},restoreSnapshot:async(r,s)=>{await i(r).restoreSnapshot(s)},watch:(r,s)=>{const{driver:e,driverKey:o}=a(r);return $(e,o,s)},watchMeta:(r,s)=>{const{driver:e,driverKey:o}=a(r);return T(e,o,s)},unwatch(){Object.values(l).forEach(r=>{r.unwatch()})},defineItem:(r,s)=>{const{driver:e,driverKey:o}=a(r),{version:t=1,migrations:d={},onMigrationComplete:m,debug:h=!1}=s??{};if(t<1)throw Error("Storage item version cannot be less than 1. Initial versions should be set to 1, not 0.");let M=!1;const S=async()=>{const v=n(o),[{value:z},{value:N}]=await e.getItems([o,v]);if(M=z==null&&N?.v==null&&!!t,z==null)return;const K=N?.v??1;if(K>t)throw Error(`Version downgrade detected (v${K} -> v${t}) for "${r}"`);if(K===t)return;h&&console.debug(`[@wxt-dev/storage] Running storage migration for ${r}: v${K} -> v${t}`);const A=Array.from({length:t-K},(y,O)=>K+O+1);let g=z;for(const y of A)try{g=await d?.[y]?.(g)??g,h&&console.debug(`[@wxt-dev/storage] Storage migration processed for version: v${y}`)}catch(O){throw new ce(r,y,{cause:O})}await e.setItems([{key:o,value:g},{key:v,value:{...N,v:t}}]),h&&console.debug(`[@wxt-dev/storage] Storage migration completed for ${r} v${t}`,{migratedValue:g}),m?.(g,t)},x=s?.migrations==null?Promise.resolve():S().catch(v=>{console.error(`[@wxt-dev/storage] Migration failed for ${r}`,v)}),E=se.withLock(),V=()=>s?.fallback??s?.defaultValue??null,j=()=>E(async()=>{const v=await e.getItem(o);if(v!=null||s?.init==null)return v;const z=await s.init();return await e.setItem(o,z),v==null&&t>1&&await k(e,o,{v:t}),z});return x.then(j),{key:r,get defaultValue(){return V()},get fallback(){return V()},getValue:async()=>(await x,s?.init?await j():await f(e,o,s)),getMeta:async()=>(await x,await w(e,o)),setValue:async v=>{await x,M?(M=!1,await Promise.all([b(e,o,v),k(e,o,{v:t})])):await b(e,o,v)},setMeta:async v=>(await x,await k(e,o,v)),removeValue:async v=>(await x,await L(e,o,v)),removeMeta:async v=>(await x,await I(e,o,v)),watch:v=>$(e,o,(z,N)=>v(z??V(),N??V())),watchMeta:v=>T(e,o,v),migrate:S}}}}function P(l){const i=()=>{if(F.runtime==null)throw Error(`'wxt/storage' must be loaded in a web extension environment

 - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371
 - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html
`);if(F.storage==null)throw Error("You must add the 'storage' permission to your manifest to use 'wxt/storage'");const n=F.storage[l];if(n==null)throw Error(`"browser.storage.${l}" is undefined`);return n},a=new Set;return{getItem:async n=>(await i().get(n))[n],getItems:async n=>{const u=await i().get(n);return n.map(c=>({key:c,value:u[c]??null}))},setItem:async(n,u)=>{u==null?await i().remove(n):await i().set({[n]:u})},setItems:async n=>{const u=n.reduce((c,{key:p,value:f})=>(c[p]=f,c),{});await i().set(u)},removeItem:async n=>{await i().remove(n)},removeItems:async n=>{await i().remove(n)},clear:async()=>{await i().clear()},snapshot:async()=>await i().get(),restoreSnapshot:async n=>{await i().set(n)},watch(n,u){const c=p=>{const f=p[n];f==null||W(f.newValue,f.oldValue)||u(f.newValue??null,f.oldValue??null)};return i().onChanged.addListener(c),a.add(c),()=>{i().onChanged.removeListener(c),a.delete(c)}},unwatch(){a.forEach(n=>{i().onChanged.removeListener(n)}),a.clear()}}}var ce=class extends Error{constructor(l,i,a){super(`v${i} migration failed for "${l}"`,a),this.key=l,this.version=i}};const C={filenameTemplate:q.defineItem("local:filenameTemplate",{fallback:"${domain}_${timestamp}_${index}.${ext}"}),hoverOverlayEnabled:q.defineItem("local:hoverOverlayEnabled",{fallback:!0}),batchSubfolder:q.defineItem("local:batchSubfolder",{fallback:!0}),minHoverSize:q.defineItem("local:minHoverSize",{fallback:150}),batchDownloadMode:q.defineItem("local:batchDownloadMode",{fallback:"zip"}),hoverKeyModifier:q.defineItem("local:hoverKeyModifier",{fallback:"none"})};function H(l){if(!l)return"image";let i=l.replace(/[\x00-\x1f\x7f-\x9f]/g,"").replace(/[<>:"/\\|?*]/g,"_").replace(/\s+/g," ").trim();return i=i.replace(/^\.+|\.+$/g,""),i?i.slice(0,120):"image"}function de(l){return l&&(l.split(/\s+[-|—•:]\s+/)[0]||l).replace(/[\x00-\x1f\x7f-\x9f]/g,"").replace(/[<>:"/\\|?*#%]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").trim().slice(0,45)||""}function ue(l){const i=l.split("/");return i.map((n,u)=>{if(u===i.length-1){const c=n.lastIndexOf(".");if(c>0){const p=H(n.slice(0,c)),f=n.slice(c+1).replace(/[^a-zA-Z0-9]/g,"").toLowerCase()||"jpg";return`${p}.${f}`}return H(n)}return H(n)}).filter(Boolean).join("/")}function pe(l,i){const{originalName:a,ext:n,domain:u,timestamp:c,index:p,pageTitle:f="",width:w=0,height:b=0}=i,k=c.split("_")[0]||c,L=c.split("_")[1]||"",I=String(p).padStart(2,"0"),$=H(a),T=H(u),r=H(de(f)||u);let s=l.replace(/\$\{original_name\}/gi,$).replace(/\$\{ext\}/gi,n).replace(/\$\{domain\}/gi,T).replace(/\$\{timestamp\}/gi,c).replace(/\$\{date\}/gi,k).replace(/\$\{time\}/gi,L).replace(/\$\{page_title\}/gi,r).replace(/\$\{width\}/gi,String(w||"")).replace(/\$\{height\}/gi,String(b||"")).replace(/\$\{index\}/gi,String(p)).replace(/\$\{index_00\}/gi,I);return s.toLowerCase().endsWith(`.${n.toLowerCase()}`)||(s=`${s}.${n}`),ue(s)}function fe(){const l=new Date,i=l.getFullYear(),a=String(l.getMonth()+1).padStart(2,"0"),n=String(l.getDate()).padStart(2,"0"),u=String(l.getHours()).padStart(2,"0"),c=String(l.getMinutes()).padStart(2,"0"),p=String(l.getSeconds()).padStart(2,"0");return`${i}-${a}-${n}_${u}${c}${p}`}const ee=document.getElementById("root");ee&&me(ee);async function me(l){const i={filenameTemplate:await C.filenameTemplate.getValue(),hoverOverlayEnabled:await C.hoverOverlayEnabled.getValue(),batchSubfolder:await C.batchSubfolder.getValue(),minHoverSize:await C.minHoverSize.getValue(),hoverKeyModifier:await C.hoverKeyModifier.getValue()};l.innerHTML="";const a=document.createElement("style");a.textContent=`
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .popup-card {
      padding: 14px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 2px;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-icon {
      width: 28px;
      height: 28px;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .save-indicator {
      font-size: 11px;
      font-weight: 600;
      color: #10b981;
      opacity: 0;
      transform: translateY(-2px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .save-indicator.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .version-pill {
      font-size: 10.5px;
      font-weight: 600;
      color: #64748b;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* Primary Action Card */
    .hero-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #1e293b;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
      transition: all 0.15s ease;
      outline: none;
    }
    .hero-btn:hover {
      background: #1e293b;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
      transform: translateY(-1px);
    }
    .hero-btn:active {
      transform: translateY(0);
    }
    .hero-btn-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kbd-shortcut {
      background: #334155;
      color: #cbd5e1;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 2px 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      font-weight: 500;
    }

    /* Section Card */
    .section-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }

    /* Toggle Rows */
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .toggle-label {
      font-size: 12.5px;
      font-weight: 500;
      color: #334155;
    }
    .toggle-switch {
      position: relative;
      width: 38px;
      height: 22px;
      background: #cbd5e1;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      transition: background-color 0.15s ease;
    }
    .toggle-switch.active {
      background: #2563eb;
    }
    .toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #ffffff;
      border-radius: 999px;
      transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .toggle-switch.active .toggle-knob {
      transform: translateX(16px);
    }

    /* Conditional Nested Options */
    .nested-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-left: 10px;
      border-left: 2px solid #e2e8f0;
      margin-left: 2px;
      transition: all 0.2s ease;
    }
    .nested-options.hidden {
      display: none;
    }
    .select-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .select-label {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 500;
    }
    .select-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11.5px;
      color: #334155;
      outline: none;
      cursor: pointer;
    }
    .select-input:focus {
      border-color: #2563eb;
    }

    /* Filename Template */
    .template-input-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .text-input {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      font-size: 11.5px;
      color: #0f172a;
      outline: none;
      background: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      transition: all 0.15s ease;
    }
    .text-input:focus {
      background: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }
    .tokens-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .token-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #2563eb;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .token-chip:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }
    .preview-line {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      overflow: hidden;
    }
    .preview-tag {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #475569;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .preview-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0284c7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-error {
      font-size: 11.5px;
      color: #dc2626;
      text-align: center;
      margin: 0;
      min-height: 0;
    }
    .popup-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding-top: 4px;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-link {
      color: #64748b;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
    }
    .footer-link:hover {
      color: #2563eb;
    }
    .footer-dot {
      color: #cbd5e1;
      font-size: 8px;
    }
  `,l.appendChild(a);const n=document.createElement("div");n.className="popup-card";let u=null;const c=()=>{b.classList.add("visible"),clearTimeout(u),u=setTimeout(()=>{b.classList.remove("visible")},1200)},p=document.createElement("div");p.className="header";const f=document.createElement("div");f.className="logo-wrap",f.innerHTML=`
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#2563eb">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
    </div>
    <h1 class="title">MediaGrab</h1>
  `;const w=document.createElement("div");w.className="header-right";const b=document.createElement("span");b.className="save-indicator",b.innerHTML=`
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
    <span>Saved</span>
  `;const k=document.createElement("span");k.className="version-pill",k.textContent="v1.1.0",w.append(b,k),p.append(f,w);const L=document.createElement("button");L.className="hero-btn",L.innerHTML=`
    <div class="hero-btn-left">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
      </svg>
      <span>Open Batch Downloader</span>
    </div>
    <span class="kbd-shortcut">Alt+Shift+I</span>
  `;const I=document.createElement("p");I.className="status-error",L.addEventListener("click",async()=>{I.textContent="";const[g]=await Q.tabs.query({active:!0,currentWindow:!0});if(!g?.id){I.textContent="No active webpage tab found.";return}try{if((await Q.runtime.sendMessage({type:"open-batch-modal",tabId:g.id}))?.ok===!1){I.textContent="Batch grabber is unavailable on this page.";return}window.close()}catch{I.textContent="Cannot inject into this page (e.g. browser system page)."}});const $=document.createElement("div");$.className="section-card";const T=document.createElement("div");T.className="toggle-row",T.innerHTML='<span class="toggle-label">Quick hover button on images</span>';const r=document.createElement("div");r.className=`nested-options ${i.hoverOverlayEnabled?"":"hidden"}`;const s=te(i.hoverOverlayEnabled,async g=>{i.hoverOverlayEnabled=g,await C.hoverOverlayEnabled.setValue(g),g?r.classList.remove("hidden"):r.classList.add("hidden"),c()});T.appendChild(s);const e=document.createElement("div");e.className="select-row",e.innerHTML='<span class="select-label">Trigger with</span>';const o=document.createElement("select");o.className="select-input",[{label:"Direct hover",val:"none"},{label:"Hold Alt / Option",val:"alt"},{label:"Hold Ctrl",val:"ctrl"}].forEach(g=>{const y=document.createElement("option");y.value=g.val,y.textContent=g.label,g.val===i.hoverKeyModifier&&(y.selected=!0),o.appendChild(y)}),o.addEventListener("change",async()=>{i.hoverKeyModifier=o.value,await C.hoverKeyModifier.setValue(i.hoverKeyModifier),c()}),e.appendChild(o);const t=document.createElement("div");t.className="select-row",t.innerHTML='<span class="select-label">Min image size</span>';const d=document.createElement("select");d.className="select-input",[{label:"100 \xD7 100 px",val:100},{label:"150 \xD7 150 px",val:150},{label:"200 \xD7 200 px",val:200},{label:"300 \xD7 300 px",val:300}].forEach(g=>{const y=document.createElement("option");y.value=String(g.val),y.textContent=g.label,g.val===i.minHoverSize&&(y.selected=!0),d.appendChild(y)}),d.addEventListener("change",async()=>{i.minHoverSize=Number(d.value)||150,await C.minHoverSize.setValue(i.minHoverSize),c()}),t.appendChild(d),r.append(e,t);const m=document.createElement("div");m.className="toggle-row",m.innerHTML='<span class="toggle-label">Save downloads into subfolder</span>';const h=te(i.batchSubfolder,async g=>{i.batchSubfolder=g,await C.batchSubfolder.setValue(g),c()});m.appendChild(h),$.append(T,r,m);const M=document.createElement("div");M.className="section-card";const S=document.createElement("div");S.className="card-title",S.textContent="Filename Template";const x=document.createElement("div");x.className="template-input-wrap";const E=document.createElement("input");E.type="text",E.className="text-input",E.value=i.filenameTemplate;const V=document.createElement("div");V.className="tokens-bar",["${domain}","${timestamp}","${original_name}","${index}","${ext}","${page_title}"].forEach(g=>{const y=document.createElement("span");y.className="token-chip",y.textContent=g,y.title=`Insert ${g}`,y.addEventListener("click",async()=>{const O=E.selectionStart||E.value.length,ne=E.selectionEnd||E.value.length,Y=E.value;E.value=Y.slice(0,O)+g+Y.slice(ne),E.focus(),E.setSelectionRange(O+g.length,O+g.length),i.filenameTemplate=E.value,N(),await C.filenameTemplate.setValue(i.filenameTemplate),c()}),V.appendChild(y)});const v=document.createElement("div");v.className="preview-line",v.innerHTML=`
    <span class="preview-tag">Preview</span>
    <span class="preview-val" id="ig-preview-val"></span>
  `;const z=v.querySelector("#ig-preview-val"),N=()=>{const g={originalName:"photo-sunset",ext:"jpg",domain:"unsplash.com",timestamp:fe(),index:1,pageTitle:"Nature Wallpapers",width:1920,height:1080};try{z.textContent=pe(i.filenameTemplate||"${domain}_${timestamp}_${index}.${ext}",g)}catch{z.textContent="Invalid template format"}};let K=null;E.addEventListener("input",()=>{i.filenameTemplate=E.value,N(),clearTimeout(K),K=setTimeout(async()=>{await C.filenameTemplate.setValue(i.filenameTemplate),c()},400)}),N(),x.append(E,V,v),M.append(S,x);const A=document.createElement("div");A.className="popup-footer",A.innerHTML=`
    <a href="https://addons.mozilla.org/en-US/firefox/addon/image-grab/" target="_blank" rel="noopener noreferrer" class="footer-link" title="Rate & Review on Firefox Add-ons">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
      <span>Firefox Add-on</span>
    </a>
    <span class="footer-dot">\u2022</span>
    <a href="https://github.com/madhusudan-kulkarni/image-grab" target="_blank" rel="noopener noreferrer" class="footer-link" title="View Source on GitHub">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <span>GitHub</span>
    </a>
  `,n.append(p,L,I,$,M,A),l.appendChild(n)}function te(l,i){let a=l;const n=document.createElement("button");n.className=`toggle-switch ${a?"active":""}`,n.type="button";const u=document.createElement("span");return u.className="toggle-knob",n.appendChild(u),n.addEventListener("click",()=>{a=!a,a?n.classList.add("active"):n.classList.remove("active"),i(a)}),n}
