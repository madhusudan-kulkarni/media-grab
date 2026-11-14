(function(){"use strict";function zt(n){return n}function ee(n,...t){}const ae={debug:(...n)=>ee(console.debug,...n),log:(...n)=>ee(console.log,...n),warn:(...n)=>ee(console.warn,...n),error:(...n)=>ee(console.error,...n)},He=Symbol("null");let je=0;class Oe extends Map{constructor(...t){super(),this._objectHashes=new WeakMap,this._symbolHashes=new Map,this._publicKeys=new Map;const[e]=t;if(e!=null){if(typeof e[Symbol.iterator]!="function")throw new TypeError(typeof e+" is not iterable (cannot read property Symbol(Symbol.iterator))");for(const[r,i]of e)this.set(r,i)}}_getPublicKeys(t,e=!1){if(!Array.isArray(t))throw new TypeError("The keys parameter must be an array");const r=this._getPrivateKey(t,e);let i;return r&&this._publicKeys.has(r)?i=this._publicKeys.get(r):e&&(i=[...t],this._publicKeys.set(r,i)),{privateKey:r,publicKey:i}}_getPrivateKey(t,e=!1){const r=[];for(const i of t){const a=i===null?He:i;let l;if(typeof a=="object"||typeof a=="function"?l="_objectHashes":typeof a=="symbol"?l="_symbolHashes":l=!1,!l)r.push(a);else if(this[l].has(a))r.push(this[l].get(a));else if(e){const u=`@@mkm-ref-${je++}@@`;this[l].set(a,u),r.push(u)}else return!1}return JSON.stringify(r)}set(t,e){const{publicKey:r}=this._getPublicKeys(t,!0);return super.set(r,e)}get(t){const{publicKey:e}=this._getPublicKeys(t);return super.get(e)}has(t){const{publicKey:e}=this._getPublicKeys(t);return super.has(e)}delete(t){const{publicKey:e,privateKey:r}=this._getPublicKeys(t);return!!(e&&super.delete(e)&&this._publicKeys.delete(r))}clear(){super.clear(),this._symbolHashes.clear(),this._publicKeys.clear()}get[Symbol.toStringTag](){return"ManyKeysMap"}get size(){return super.size}}function oe(n){if(n===null||typeof n!="object")return!1;const t=Object.getPrototypeOf(n);return t!==null&&t!==Object.prototype&&Object.getPrototypeOf(t)!==null||Symbol.iterator in n?!1:Symbol.toStringTag in n?Object.prototype.toString.call(n)==="[object Module]":!0}function se(n,t,e=".",r){if(!oe(t))return se(n,{},e,r);const i={...t};for(const a of Object.keys(n)){if(a==="__proto__"||a==="constructor")continue;const l=n[a];l!=null&&(r&&r(i,a,l,e)||(Array.isArray(l)&&Array.isArray(i[a])?i[a]=[...l,...i[a]]:oe(l)&&oe(i[a])?i[a]=se(l,i[a],(e?`${e}.`:"")+a.toString(),r):i[a]=l))}return i}function Be(n){return(...t)=>t.reduce((e,r)=>se(e,r,"",n),{})}const Re=Be(),Le=n=>n!==null?{isDetected:!0,result:n}:{isDetected:!1},Ve=n=>n===null?{isDetected:!0,result:null}:{isDetected:!1},We=()=>({target:globalThis.document,unifyProcess:!0,detector:Le,observeConfigs:{childList:!0,subtree:!0,attributes:!0},signal:void 0,customMatcher:void 0}),Ue=(n,t)=>Re(n,t),ce=new Oe;function Ge(n){const{defaultOptions:t}=n;return(e,r)=>{const{target:i,unifyProcess:a,observeConfigs:l,detector:u,signal:g,customMatcher:b}=Ue(r,t),w=[e,i,a,l,u,g,b],S=ce.get(w);if(a&&S)return S;const v=new Promise(async(y,E)=>{if(g?.aborted)return E(g.reason);const s=new MutationObserver(async()=>{if(g?.aborted){s.disconnect();return}const o=await Ce({selector:e,target:i,detector:u,customMatcher:b});o.isDetected&&(s.disconnect(),y(o.result))});g?.addEventListener("abort",()=>(s.disconnect(),E(g.reason)),{once:!0}),s.observe(i,l);const d=await Ce({selector:e,target:i,detector:u,customMatcher:b});if(d.isDetected)return s.disconnect(),y(d.result)}).finally(()=>{ce.delete(w)});return ce.set(w,v),v}}async function Ce({target:n,selector:t,detector:e,customMatcher:r}){const i=r?r(t):n.querySelector(t);return await e(i)}const Ye=Ge({defaultOptions:We()});function Ze(n,t,e){e.position!=="inline"&&(e.zIndex!=null&&(n.style.zIndex=String(e.zIndex)),n.style.overflow="visible",n.style.position="relative",n.style.width="0",n.style.height="0",n.style.display="block",t&&(e.position==="overlay"?(t.style.position="absolute",e.alignment?.startsWith("bottom-")?t.style.bottom="0":t.style.top="0",e.alignment?.endsWith("-right")?t.style.right="0":t.style.left="0"):(t.style.position="fixed",t.style.top="0",t.style.bottom="0",t.style.left="0",t.style.right="0")))}function le(n){if(n.anchor==null)return document.body;let t=typeof n.anchor=="function"?n.anchor():n.anchor;return typeof t=="string"?t.startsWith("/")?document.evaluate(t,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue??void 0:document.querySelector(t)??void 0:t??void 0}function Qe(n,t){const e=le(t);if(e==null)throw Error("Failed to mount content script UI: could not find anchor element");switch(t.append){case void 0:case"last":e.append(n);break;case"first":e.prepend(n);break;case"replace":e.replaceWith(n);break;case"after":e.parentElement?.insertBefore(n,e.nextElementSibling);break;case"before":e.parentElement?.insertBefore(n,e);break;default:t.append(e,n)}}function Xe(n,t){let e;const r=()=>{e?.stopAutoMount(),e=void 0},i=()=>{n.mount()},a=n.remove;return{mount:i,remove:()=>{r(),n.remove()},autoMount:g=>{e&&ae.warn("autoMount is already set."),e=Je({mount:i,unmount:a,stopAutoMount:r},{...t,...g})}}}function Je(n,t){const e=new AbortController,r="explicit_stop_auto_mount",i=()=>{e.abort(r),t.onStop?.()};let a=typeof t.anchor=="function"?t.anchor():t.anchor;if(a instanceof Element)throw Error("autoMount and Element anchor option cannot be combined. Avoid passing `Element` directly or `() => Element` to the anchor.");async function l(u){let g=!!le(t);for(g&&n.mount();!e.signal.aborted;)try{g=!!await Ye(u??"body",{customMatcher:()=>le(t)??null,detector:g?Ve:Le,signal:e.signal}),g?n.mount():(n.unmount(),t.once&&n.stopAutoMount())}catch(b){if(e.signal.aborted&&e.signal.reason===r)break;throw b}}return l(a),{stopAutoMount:i}}const Ie=/(\s*@(property|font-face)[\s\S]*?{[\s\S]*?})/gm;function et(n){return{documentCss:Array.from(n.matchAll(Ie),t=>t[0]).join("").trim(),shadowCss:n.replace(Ie,"").trim()}}const V=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,$=V;function tt(n){return n&&n.__esModule&&Object.prototype.hasOwnProperty.call(n,"default")?n.default:n}var de,Te;function nt(){if(Te)return de;Te=1;var n=/^[a-z](?:[\.0-9_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*-(?:[\x2D\.0-9_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*$/,t=function(e){return n.test(e)};return de=t,de}var rt=nt();const it=tt(rt),at=["article","aside","blockquote","body","div","footer","h1","h2","h3","h4","h5","h6","header","main","nav","p","section","span"];async function ot(n){const{name:t,mode:e="closed",css:r,isolateEvents:i=!1}=n;if(!at.includes(t)&&!it(t))throw Error(`"${t}" cannot have a shadow root attached to it. It must be two words and kebab-case, with a few exceptions. See https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to`);const a=document.createElement(t),l=a.attachShadow({mode:e}),u=document.createElement("div");if(r){const g=document.createElement("style");"url"in r?g.textContent=await fetch(r.url).then(b=>b.text()):g.textContent=r.textContent,l.appendChild(g)}return l.appendChild(u),i&&(Array.isArray(i)?i:["keydown","keyup","keypress"]).forEach(g=>{l.addEventListener(g,b=>b.stopPropagation())}),{parentElement:a,shadow:l,isolatedElement:u}}async function st(n,t){const e=Math.random().toString(36).substring(2,15),r=[];if(t.inheritStyles||r.push("/* WXT Shadow Root Reset */ :host{all:initial !important;}"),t.css&&r.push(t.css),n.options?.cssInjectionMode==="ui"){const y=await ct();r.push(y.replaceAll(":root",":host"))}const{shadowCss:i,documentCss:a}=et(r.join(`
`).trim()),{isolatedElement:l,parentElement:u,shadow:g}=await ot({name:t.name,css:{textContent:i},mode:t.mode??"open",isolateEvents:t.isolateEvents});let b;const w=()=>{if(Qe(u,t),Ze(u,l,t),a&&!document.querySelector(`style[wxt-shadow-root-document-styles="${e}"]`)){const y=document.createElement("style");y.textContent=a,y.setAttribute("wxt-shadow-root-document-styles",e),(document.head??document.body).append(y)}b=t.onMount(l,g,u)},S=()=>{for(t.onRemove?.(b),u.remove(),document.querySelector(`style[wxt-shadow-root-document-styles="${e}"]`)?.remove();l.lastChild;)l.removeChild(l.lastChild);b=void 0},v=Xe({mount:w,remove:S},t);return n.onInvalidated(S),{shadow:g,shadowHost:u,uiContainer:l,...v,get mounted(){return b}}}async function ct(){const n=$.runtime.getURL("/content-scripts/image-scraper.css");try{return await(await fetch(n)).text()}catch(t){return ae.warn(`Failed to load styles @ ${n}. Did you forget to import the stylesheet in your entrypoint?`,t),""}}var ue,Ae;function ze(){if(Ae)return ue;Ae=1;class n{constructor(e){this.data=e}}return ue=class{constructor(){this.length=0}enqueue(e){const r=new n(e);return r.prev=this.tail,this.tail?this.tail.next=r:this.head=r,this.tail=r,this.length++,r}prepend(e){const r=new n(e);return r.next=this.head,this.head?this.head.prev=r:this.tail=r,this.head=r,this.length++,r}insertAfter(e,r){if(!e)return this.prepend(r);const i=new n(r);return i.prev=e,i.next=e.next,e.next?e.next.prev=i:this.tail=i,e.next=i,this.length++,i}moveToTail(e){e!==this.tail&&(e.prev?e.prev.next=e.next:this.head=e.next,e.next.prev=e.prev,e.prev=this.tail,e.next=void 0,this.tail.next=e,this.tail=e)}dequeue(){if(!this.head)return;const{data:e}=this.head;return this.remove(this.head),e}remove(e){e.prev?e.prev.next=e.next:this.head=e.next,e.next?e.next.prev=e.prev:this.tail=e.prev,this.length--}size(){return this.length}},ue}var fe,Fe;function lt(){if(Fe)return fe;Fe=1;const n=ze(),t=Symbol("shared");return fe=(e=1)=>{const r=new Map,i=new n;let a,l=0,u=0,g=0;const b=c=>{let h=r.get(c);return h||(h={key:c,queue:new n,holders:0},h.turnNode=i.insertAfter(a,h),a=h.turnNode,r.set(c,h)),h},w=c=>{c.turnNode===a&&(a=c.turnNode.prev),i.remove(c.turnNode)},S=c=>{c.turnNode===a&&(a=c.turnNode.prev),i.moveToTail(c.turnNode)},v=c=>{c.holders>0||c.queue.size()>0||(w(c),r.delete(c.key))},y=c=>c.queue.head.data.joinSeq<=g,E=()=>{let c;for(let h=i.head;h;h=h.next){const x=h.data;if(!(x.queue.size()===0||!y(x))){if(x.holders===0)return x;c||(c=x)}}return c},s=()=>{const c=E();return c||(g=u,E())},d=c=>{--e,c.holders++,S(c);let h=!1;return()=>{h||(h=!0,c.holders--,S(c),v(c),++e,o())}},o=()=>{if(l===0)return;const c=s(),h=c.queue.dequeue();l--,h.acquire(d(c))},f=(c,h)=>new Promise(x=>{if(c!=null&&(typeof c.addEventListener!="function"||typeof c.removeEventListener!="function"||typeof c.aborted!="boolean"))throw new TypeError("`signal` needs to be an AbortSignal.");if(c?.aborted)return x(null);const L=b(h===void 0?t:h);if(!f.isLocked())return x(d(L));const T={joinSeq:++u,acquire:x};if(T.node=L.queue.enqueue(T),l++,c!=null){const A=()=>{L.queue.remove(T.node),l--,v(L),x(null)};T.acquire=C=>{c.removeEventListener("abort",A),x(C)},c.addEventListener("abort",A,{once:!0})}});return f.isLocked=()=>e===0,f.awaiting=()=>l,f},fe}var ge,qe;function dt(){if(qe)return ge;qe=1;const n=ze();return ge=(t=1)=>{const e=new n,r=()=>{++t;const u=e.dequeue();u&&u.acquire()},i=()=>{let u=!1;return()=>{u||(u=!0,r())}},a=u=>{--t,u(i())},l=u=>u==null&&t!==0?(--t,Promise.resolve(i())):new Promise(g=>{if(u!=null&&typeof u.addEventListener!="function")throw new TypeError("`signal` needs to be an AbortSignal.");if(u!=null&&u.aborted)return g(null);if(t!==0)return a(g);const b={acquire:()=>a(g)},w=e.enqueue(b);if(u!=null){const S=()=>{e.remove(w),g(null)};b.acquire=()=>{u.removeEventListener("abort",S),a(g)},u.addEventListener("abort",S,{once:!0})}});return l.isLocked=()=>t===0,l.awaiting=()=>e.size(),l},ge}var he,Pe;function ut(){if(Pe)return he;Pe=1;const n=lt(),t=dt();return he={withLock:i=>{const a=t(i),l=async(u,g)=>{const b=await a(g);if(b)try{return await u()}finally{b()}};return l.isLocked=a.isLocked,l.awaiting=a.awaiting,l},createLock:t,withFairQueue:i=>{const a=n(i),l=async(u,g,b)=>{const w=await a(b,g);if(w)try{return await u()}finally{w()}};return l.isLocked=a.isLocked,l.awaiting=a.awaiting,l},createFairQueue:n,createFairLock:n},he}var ft=ut(),De=Object.prototype.hasOwnProperty;function pe(n,t){var e,r;if(n===t)return!0;if(n&&t&&(e=n.constructor)===t.constructor){if(e===Date)return n.getTime()===t.getTime();if(e===RegExp)return n.toString()===t.toString();if(e===Array){if((r=n.length)===t.length)for(;r--&&pe(n[r],t[r]););return r===-1}if(!e||typeof n=="object"){r=0;for(e in n)if(De.call(n,e)&&++r&&!De.call(t,e)||!(e in t)||!pe(n[e],t[e]))return!1;return Object.keys(t).length===r}}return n!==n&&t!==t}const O=gt();function gt(){const n={local:te("local"),session:te("session"),sync:te("sync"),managed:te("managed")},t=s=>{const d=n[s];if(d==null){const o=Object.keys(n).join(", ");throw Error(`Invalid area "${s}". Options: ${o}`)}return d},e=s=>{const d=s.indexOf(":"),o=s.substring(0,d),f=s.substring(d+1);if(f==null)throw Error(`Storage key should be in the form of "area:key", but received "${s}"`);return{driverArea:o,driverKey:f,driver:t(o)}},r=s=>s+"$",i=(s,d)=>{const o={...s};return Object.entries(d).forEach(([f,c])=>{c==null?delete o[f]:o[f]=c}),o},a=(s,d)=>s??d??null,l=s=>s!=null&&typeof s=="object"&&!Array.isArray(s)?s:{},u=async(s,d,o)=>a(await s.getItem(d),o?.fallback??o?.defaultValue),g=async(s,d)=>{const o=r(d);return l(await s.getItem(o))},b=async(s,d,o)=>{await s.setItem(d,o??null)},w=async(s,d,o)=>{const f=r(d),c=l(await s.getItem(f));await s.setItem(f,i(c,o))},S=async(s,d,o)=>{if(await s.removeItem(d),o?.removeMeta){const f=r(d);await s.removeItem(f)}},v=async(s,d,o)=>{const f=r(d);if(o==null)await s.removeItem(f);else{const c=l(await s.getItem(f));[o].flat().forEach(h=>delete c[h]),await s.setItem(f,c)}},y=(s,d,o)=>s.watch(d,o),E=(s,d,o)=>y(s,r(d),(f,c)=>o(l(f),l(c)));return{getItem:async(s,d)=>{const{driver:o,driverKey:f}=e(s);return await u(o,f,d)},getItems:async s=>{const d=new Map,o=new Map,f=[];s.forEach(h=>{let x,L;typeof h=="string"?x=h:"getValue"in h?(x=h.key,L={fallback:h.fallback}):(x=h.key,L=h.options),f.push(x);const{driverArea:T,driverKey:A}=e(x),C=d.get(T)??[];d.set(T,C.concat(A)),o.set(x,L)});const c=new Map;return await Promise.all(Array.from(d.entries()).map(async([h,x])=>{(await n[h].getItems(x)).forEach(L=>{const T=`${h}:${L.key}`,A=o.get(T),C=a(L.value,A?.fallback??A?.defaultValue);c.set(T,C)})})),f.map(h=>({key:h,value:c.get(h)}))},getMeta:async s=>{const{driver:d,driverKey:o}=e(s);return await g(d,o)},getMetas:async s=>{const d=s.map(c=>{const h=typeof c=="string"?c:c.key,{driverArea:x,driverKey:L}=e(h);return{key:h,driverArea:x,driverKey:L,driverMetaKey:r(L)}}),o=d.reduce((c,h)=>(c[h.driverArea]??=[],c[h.driverArea].push(h),c),{}),f={};return await Promise.all(Object.entries(o).map(async([c,h])=>{const x=await V.storage[c].get(h.map(L=>L.driverMetaKey));h.forEach(L=>{f[L.key]=x[L.driverMetaKey]??{}})})),d.map(c=>({key:c.key,meta:f[c.key]}))},setItem:async(s,d)=>{const{driver:o,driverKey:f}=e(s);await b(o,f,d)},setItems:async s=>{const d={};s.forEach(o=>{const{driverArea:f,driverKey:c}=e("key"in o?o.key:o.item.key);d[f]??=[],d[f].push({key:c,value:o.value})}),await Promise.all(Object.entries(d).map(async([o,f])=>{await t(o).setItems(f)}))},setMeta:async(s,d)=>{const{driver:o,driverKey:f}=e(s);await w(o,f,d)},setMetas:async s=>{const d={};s.forEach(o=>{const{driverArea:f,driverKey:c}=e("key"in o?o.key:o.item.key);d[f]??=[],d[f].push({key:c,properties:o.meta})}),await Promise.all(Object.entries(d).map(async([o,f])=>{const c=t(o),h=f.map(({key:A})=>r(A)),x=await c.getItems(h),L=Object.fromEntries(x.map(({key:A,value:C})=>[A,l(C)])),T=f.map(({key:A,properties:C})=>{const N=r(A);return{key:N,value:i(L[N]??{},C)}});await c.setItems(T)}))},removeItem:async(s,d)=>{const{driver:o,driverKey:f}=e(s);await S(o,f,d)},removeItems:async s=>{const d={};s.forEach(o=>{let f,c;typeof o=="string"?f=o:"getValue"in o?f=o.key:"item"in o?(f=o.item.key,c=o.options):(f=o.key,c=o.options);const{driverArea:h,driverKey:x}=e(f);d[h]??=[],d[h].push(x),c?.removeMeta&&d[h].push(r(x))}),await Promise.all(Object.entries(d).map(async([o,f])=>{await t(o).removeItems(f)}))},clear:async s=>{await t(s).clear()},removeMeta:async(s,d)=>{const{driver:o,driverKey:f}=e(s);await v(o,f,d)},snapshot:async(s,d)=>{const o=await t(s).snapshot();return d?.excludeKeys?.forEach(f=>{delete o[f],delete o[r(f)]}),o},restoreSnapshot:async(s,d)=>{await t(s).restoreSnapshot(d)},watch:(s,d)=>{const{driver:o,driverKey:f}=e(s);return y(o,f,d)},watchMeta:(s,d)=>{const{driver:o,driverKey:f}=e(s);return E(o,f,d)},unwatch(){Object.values(n).forEach(s=>{s.unwatch()})},defineItem:(s,d)=>{const{driver:o,driverKey:f}=e(s),{version:c=1,migrations:h={},onMigrationComplete:x,debug:L=!1}=d??{};if(c<1)throw Error("Storage item version cannot be less than 1. Initial versions should be set to 1, not 0.");let T=!1;const A=async()=>{const k=r(f),[{value:z},{value:_}]=await o.getItems([f,k]);if(T=z==null&&_?.v==null&&!!c,z==null)return;const P=_?.v??1;if(P>c)throw Error(`Version downgrade detected (v${P} -> v${c}) for "${s}"`);if(P===c)return;L&&console.debug(`[@wxt-dev/storage] Running storage migration for ${s}: v${P} -> v${c}`);const be=Array.from({length:c-P},(H,W)=>P+W+1);let K=z;for(const H of be)try{K=await h?.[H]?.(K)??K,L&&console.debug(`[@wxt-dev/storage] Storage migration processed for version: v${H}`)}catch(W){throw new ht(s,H,{cause:W})}await o.setItems([{key:f,value:K},{key:k,value:{..._,v:c}}]),L&&console.debug(`[@wxt-dev/storage] Storage migration completed for ${s} v${c}`,{migratedValue:K}),x?.(K,c)},C=d?.migrations==null?Promise.resolve():A().catch(k=>{console.error(`[@wxt-dev/storage] Migration failed for ${s}`,k)}),N=ft.withLock(),q=()=>d?.fallback??d?.defaultValue??null,re=()=>N(async()=>{const k=await o.getItem(f);if(k!=null||d?.init==null)return k;const z=await d.init();return await o.setItem(f,z),k==null&&c>1&&await w(o,f,{v:c}),z});return C.then(re),{key:s,get defaultValue(){return q()},get fallback(){return q()},getValue:async()=>(await C,d?.init?await re():await u(o,f,d)),getMeta:async()=>(await C,await g(o,f)),setValue:async k=>{await C,T?(T=!1,await Promise.all([b(o,f,k),w(o,f,{v:c})])):await b(o,f,k)},setMeta:async k=>(await C,await w(o,f,k)),removeValue:async k=>(await C,await S(o,f,k)),removeMeta:async k=>(await C,await v(o,f,k)),watch:k=>y(o,f,(z,_)=>k(z??q(),_??q())),watchMeta:k=>E(o,f,k),migrate:A}}}}function te(n){const t=()=>{if(V.runtime==null)throw Error(`'wxt/storage' must be loaded in a web extension environment

 - If thrown during a build, see https://github.com/wxt-dev/wxt/issues/371
 - If thrown during tests, mock 'wxt/browser' correctly. See https://wxt.dev/guide/go-further/testing.html
`);if(V.storage==null)throw Error("You must add the 'storage' permission to your manifest to use 'wxt/storage'");const r=V.storage[n];if(r==null)throw Error(`"browser.storage.${n}" is undefined`);return r},e=new Set;return{getItem:async r=>(await t().get(r))[r],getItems:async r=>{const i=await t().get(r);return r.map(a=>({key:a,value:i[a]??null}))},setItem:async(r,i)=>{i==null?await t().remove(r):await t().set({[r]:i})},setItems:async r=>{const i=r.reduce((a,{key:l,value:u})=>(a[l]=u,a),{});await t().set(i)},removeItem:async r=>{await t().remove(r)},removeItems:async r=>{await t().remove(r)},clear:async()=>{await t().clear()},snapshot:async()=>await t().get(),restoreSnapshot:async r=>{await t().set(r)},watch(r,i){const a=l=>{const u=l[r];u==null||pe(u.newValue,u.oldValue)||i(u.newValue??null,u.oldValue??null)};return t().onChanged.addListener(a),e.add(a),()=>{t().onChanged.removeListener(a),e.delete(a)}},unwatch(){e.forEach(r=>{t().onChanged.removeListener(r)}),e.clear()}}}var ht=class extends Error{constructor(n,t,e){super(`v${t} migration failed for "${n}"`,e),this.key=n,this.version=t}};const D={filenameTemplate:O.defineItem("local:filenameTemplate",{fallback:"${domain}_${timestamp}_${index}.${ext}"}),hoverOverlayEnabled:O.defineItem("local:hoverOverlayEnabled",{fallback:!0}),batchSubfolder:O.defineItem("local:batchSubfolder",{fallback:!0}),minHoverSize:O.defineItem("local:minHoverSize",{fallback:150}),batchDownloadMode:O.defineItem("local:batchDownloadMode",{fallback:"zip"}),hoverKeyModifier:O.defineItem("local:hoverKeyModifier",{fallback:"none"})};function pt(n){if(!n)return"image";let t=n.replace(/[\x00-\x1f\x7f-\x9f]/g,"").replace(/[<>:"/\\|?*]/g,"_").replace(/\s+/g," ").trim();return t=t.replace(/^\.+|\.+$/g,""),t?t.slice(0,120):"image"}function mt(n){if(!n)return"jpg";if(n.startsWith("data:image/")){const t=n.match(/^data:image\/([a-zA-Z0-9+.-]+);/);if(t?.[1]){let e=t[1].toLowerCase();return e==="svg+xml"?"svg":e==="jpeg"?"jpg":e==="x-icon"?"ico":e}return"jpg"}try{const t=new URL(n),e=["format","fm","ext","type","mime"];for(const l of e){const u=t.searchParams.get(l)?.toLowerCase();if(u){const g=u.replace(/[^a-z0-9]/g,"");if(["jpg","jpeg","png","gif","webp","svg","bmp","ico","avif"].includes(g))return g==="jpeg"?"jpg":g}}const a=(t.pathname.split("/").pop()||"").split(".");if(a.length>1){const l=a.pop()?.toLowerCase();if(l&&["jpg","jpeg","png","gif","webp","svg","bmp","ico","avif"].includes(l))return l==="jpeg"?"jpg":l}return"jpg"}catch{return"jpg"}}function bt(n){if(!n||n.startsWith("data:")||n.startsWith("blob:"))return"image";try{const t=new URL(n),r=decodeURIComponent(t.pathname).split("/").filter(Boolean).pop()||"image",i=r.lastIndexOf("."),a=i>0?r.slice(0,i):r;return pt(a)||"image"}catch{return"image"}}const vt={matches:["<all_urls>"],cssInjectionMode:"ui",async main(n){let t=await D.hoverOverlayEnabled.getValue(),e=await D.minHoverSize.getValue(),r=await D.batchDownloadMode.getValue(),i=await D.hoverKeyModifier.getValue();D.hoverOverlayEnabled.watch(u=>{t=!!u,t||l.hide()}),D.minHoverSize.watch(u=>{e=Number(u)||150}),D.batchDownloadMode.watch(u=>{r=u}),D.hoverKeyModifier.watch(u=>{i=u});const a=await st(n,{name:"mediagrab-ui-root",position:"inline",anchor:"html",onMount:u=>{const g=document.createElement("style");g.textContent=Mt(),u.appendChild(g);const b=St(u,()=>r,async(v,y,E)=>{E(1,v.length,"Preparing images...");const s=y==="zip"?"download-batch-zip":"download-batch",d=await $.runtime.sendMessage({type:s,images:v,pageTitle:document.title||""});if(d&&d.ok===!1)throw new Error(d.error||"Failed to download images.")},async v=>await yt(v)),w=xt(u,async(v,y,E)=>{await $.runtime.sendMessage({type:"download-image",src:v,pageTitle:document.title||"",width:y,height:E})}),S=v=>{if(v.type==="open-batch-modal"){const y=Ne();b.open(y)}};return $.runtime.onMessage.addListener(S),{modal:b,hoverBtn:w,onMessage:S}},onRemove:u=>{u&&($.runtime.onMessage.removeListener(u.onMessage),u.modal.destroy(),u.hoverBtn.destroy())}});a.mount();const l=Et(()=>t,()=>e,()=>i,(u,g)=>{a.mounted&&a.mounted.hoverBtn.show(u,g)},()=>{a.mounted&&a.mounted.hoverBtn.hide()})}};function wt(n,t){if(!n||!t)return"square";const e=n/t;return e>1.2?"landscape":e<.83?"portrait":"square"}function Ne(){const n=[],t=new Set,e=(i,a,l,u="")=>{if(!i||typeof i!="string")return;const g=i.trim();if(!g||g.startsWith("javascript:"))return;let b=g;if(!g.startsWith("data:")&&!g.startsWith("blob:"))try{b=new URL(g,window.location.href).href}catch{return}if(t.has(b))return;t.add(b);const w=mt(b),S=bt(b),v=w.toUpperCase(),y=Math.max(a,0),E=Math.max(l,0),s=wt(y,E);n.push({src:b,originalName:S,ext:w,width:y,height:E,format:v,alt:u.trim(),orientation:s})},r=i=>i.split(",").map(a=>a.trim().split(/\s+/)[0]).filter(Boolean);return document.querySelectorAll("img").forEach(i=>{const a=i.naturalWidth||i.width||Math.round(i.getBoundingClientRect().width),l=i.naturalHeight||i.height||Math.round(i.getBoundingClientRect().height),u=i.alt||"";[i.currentSrc,i.src,i.getAttribute("src"),i.dataset.src,i.dataset.lazySrc,i.dataset.originalSrc,i.dataset.highres,i.dataset.full,i.dataset.zoomSrc].filter(Boolean).forEach(w=>e(w,a,l,u));const b=i.getAttribute("srcset")||i.dataset.srcset||"";b&&r(b).forEach(w=>e(w,a,l,u))}),document.querySelectorAll("picture source").forEach(i=>{const a=i.getAttribute("srcset")||i.getAttribute("data-srcset")||"";a&&r(a).forEach(l=>e(l,999,999))}),document.querySelectorAll("video[poster]").forEach(i=>{const a=i.getAttribute("poster"),l=i.getBoundingClientRect();a&&e(a,Math.round(l.width),Math.round(l.height))}),document.querySelectorAll("*").forEach(i=>{if(i instanceof HTMLImageElement||i instanceof HTMLSourceElement)return;const l=window.getComputedStyle(i).backgroundImage;if(l&&l!=="none"){const u=l.match(/url\(["']?([^"')]+)["']?\)/);if(u?.[1]){const g=i.getBoundingClientRect();g.width>=30&&g.height>=30&&e(u[1],Math.round(g.width),Math.round(g.height))}}}),document.querySelectorAll("canvas").forEach(i=>{if(i.width>=50&&i.height>=50)try{const a=i.toDataURL("image/png");e(a,i.width,i.height,"Canvas Render")}catch{}}),n.sort((i,a)=>a.width*a.height-i.width*i.height)}async function yt(n){const t=window.scrollY,e=window.innerHeight,r=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight),i=Math.min(Math.ceil(r/(e*.8)),8);for(let a=1;a<=i;a++)n(`Scanning page for images (${a}/${i})...`),window.scrollTo({top:a/i*(r-e),behavior:"smooth"}),await new Promise(l=>setTimeout(l,300));return window.scrollTo({top:t,behavior:"smooth"}),await new Promise(a=>setTimeout(a,200)),Ne()}function xt(n,t){const e=document.createElement("button");e.className="ig-floating-btn",e.title="Save Image (MediaGrab)",e.innerHTML=`
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
    <span>Save</span>
  `;let r=null,i=!1;return e.addEventListener("mouseenter",()=>{i=!0}),e.addEventListener("mouseleave",()=>{i=!1,e.style.opacity="0",e.style.pointerEvents="none"}),e.addEventListener("click",async a=>{if(a.preventDefault(),a.stopPropagation(),!!r){e.innerHTML=`
      <svg viewBox="0 0 24 24" width="15" height="15" fill="#10b981">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span>Saved!</span>
    `;try{await t(r.src,r.width,r.height)}finally{setTimeout(()=>{e.innerHTML=`
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>Save</span>
        `},1500)}}}),n.appendChild(e),{show(a,l){r=a,e.style.top=`${Math.max(l.top+8,8)}px`,e.style.left=`${Math.min(l.right-80,window.innerWidth-86)}px`,e.style.opacity="1",e.style.pointerEvents="auto"},hide(){i||(e.style.opacity="0",e.style.pointerEvents="none")},destroy(){e.remove()}}}function Et(n,t,e,r,i){let a=null,l;const u=w=>{if(!n())return;const S=e();if(S==="alt"&&!w.altKey||S==="ctrl"&&!w.ctrlKey&&!w.metaKey)return;const v=w.target;if(!(v instanceof HTMLElement))return;let y=null,E="";if(v instanceof HTMLImageElement)y=v,E=v.currentSrc||v.src||v.dataset.src||"";else{const h=window.getComputedStyle(v).backgroundImage;if(h&&h!=="none"){const x=h.match(/url\(["']?([^"')]+)["']?\)/);x?.[1]&&(E=x[1])}}if(!E||E.startsWith("data:image/svg"))return;const s=v.getBoundingClientRect(),d=t(),o=y&&y.naturalWidth||s.width,f=y&&y.naturalHeight||s.height;s.width<d||s.height<d||o<d||f<d||(clearTimeout(l),a=v,r({src:E,width:Math.round(o),height:Math.round(f)},s))},g=w=>{w.target===a&&(l=window.setTimeout(()=>{i(),a=null},250))},b=()=>{if(a){const w=a.getBoundingClientRect();if(w.bottom<0||w.top>window.innerHeight)i(),a=null;else{const S=a.currentSrc||a.src||"";r({src:S,width:Math.round(w.width),height:Math.round(w.height)},w)}}};return document.addEventListener("mouseover",u,{passive:!0}),document.addEventListener("mouseout",g,{passive:!0}),window.addEventListener("scroll",b,{passive:!0}),window.addEventListener("resize",b,{passive:!0}),{hide:i}}function St(n,t,e,r){const i=document.createElement("div");i.className="ig-modal-backdrop";const a=document.createElement("div");a.className="ig-modal-card";const l=document.createElement("div");l.className="ig-modal-header",l.innerHTML=`
    <div class="ig-modal-title-wrap">
      <div class="ig-logo-badge">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#2563eb">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
      <div>
        <h2 class="ig-modal-title">Batch Image Downloader</h2>
        <span class="ig-modal-subtitle" id="ig-subtitle">0 images found</span>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button class="ig-action-btn" id="ig-deep-scan-btn" title="Scroll down page to find lazy-loaded images">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        <span>Scan More</span>
      </button>
      <button class="ig-icon-btn" id="ig-close-btn" title="Close (Esc)">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `;const u=document.createElement("div");u.className="ig-modal-toolbar",u.innerHTML=`
    <div class="ig-toolbar-left">
      <div class="ig-format-filters" id="ig-format-filters"></div>
      <div class="ig-orientation-filters" id="ig-orientation-filters">
        <button class="ig-chip ig-chip-active" data-orientation="all">All Shapes</button>
        <button class="ig-chip" data-orientation="landscape">Landscape</button>
        <button class="ig-chip" data-orientation="portrait">Portrait</button>
        <button class="ig-chip" data-orientation="square">Square</button>
      </div>
      <div class="ig-size-filter-wrap">
        <select id="ig-min-dimension-select" class="ig-select">
          <option value="0">All Sizes</option>
          <option value="100">Min 100px</option>
          <option value="300">Min 300px</option>
          <option value="600">Min 600px</option>
          <option value="1000">Min 1000px</option>
        </select>
      </div>
    </div>
    <div class="ig-toolbar-right">
      <input type="text" id="ig-search-input" class="ig-search-input" placeholder="Search images..." />
      <button class="ig-action-link-btn" id="ig-select-all-btn">Select All</button>
    </div>
  `;const g=document.createElement("div");g.className="ig-grid-wrap";const b=document.createElement("div");b.className="ig-image-grid",g.appendChild(b);const w=document.createElement("div");w.className="ig-modal-footer",w.innerHTML=`
    <div class="ig-footer-status">
      <span id="ig-selected-counter" class="ig-counter-badge">0 selected</span>
      <span id="ig-progress-label" class="ig-progress-label"></span>
    </div>
    <div class="ig-footer-actions">
      <button class="ig-btn ig-btn-secondary" id="ig-cancel-btn">Cancel</button>
      <button class="ig-btn ig-btn-outline" id="ig-download-individual-btn" title="Download each image as a separate file">
        <span>Save Separately</span>
      </button>
      <button class="ig-btn ig-btn-primary" id="ig-download-zip-btn" title="Download all selected images in 1 ZIP file (No spam dialogs)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span id="ig-download-zip-btn-text">Download as ZIP</span>
      </button>
    </div>
  `;const S=document.createElement("div");S.className="ig-toast",S.id="ig-toast";const v=document.createElement("div");v.className="ig-lightbox",v.innerHTML=`
    <div class="ig-lightbox-content">
      <button class="ig-lightbox-close" id="ig-lightbox-close">&times;</button>
      <img id="ig-lightbox-img" src="" alt="Preview" />
      <div class="ig-lightbox-info" id="ig-lightbox-info"></div>
    </div>
  `,a.append(l,u,g,w),i.append(a,S,v),n.appendChild(i);let y=[],E=new Set,s="ALL",d="all",o=0,f="",c=!1,h=!1;const x=a.querySelector("#ig-subtitle"),L=a.querySelector("#ig-format-filters"),T=a.querySelector("#ig-orientation-filters"),A=a.querySelector("#ig-min-dimension-select"),C=a.querySelector("#ig-search-input"),N=a.querySelector("#ig-select-all-btn"),q=a.querySelector("#ig-deep-scan-btn"),re=a.querySelector("#ig-selected-counter"),k=a.querySelector("#ig-progress-label"),z=a.querySelector("#ig-download-zip-btn"),_=a.querySelector("#ig-download-zip-btn-text"),P=a.querySelector("#ig-download-individual-btn"),be=a.querySelector("#ig-cancel-btn"),K=a.querySelector("#ig-close-btn"),H=v.querySelector("#ig-lightbox-img"),W=v.querySelector("#ig-lightbox-info"),Tt=v.querySelector("#ig-lightbox-close"),ve=p=>{S.textContent=p,S.classList.add("ig-toast-visible"),setTimeout(()=>{S.classList.remove("ig-toast-visible")},2e3)},we=()=>y.filter(p=>{if(s!=="ALL"&&!(p.ext.toUpperCase()===s)||d!=="all"&&p.orientation!==d||o>0&&p.width<o&&p.height<o)return!1;if(f){const m=f.toLowerCase(),M=p.originalName.toLowerCase().includes(m),I=p.src.toLowerCase().includes(m),F=p.alt?p.alt.toLowerCase().includes(m):!1;if(!M&&!I&&!F)return!1}return!0}),U=()=>{const p=we();x.textContent=`${y.length} images found (${p.length} shown)`;const m=p.filter(I=>E.has(I.src)).length;re.textContent=`${m} / ${p.length} selected`;const M=p.length>0&&m===p.length;N.textContent=M?"Deselect All":"Select All",z.disabled=m===0||c,P.disabled=m===0||c,_.textContent=c?"Bundling ZIP...":`Download ZIP (${m})`},ye=()=>{L.innerHTML="";const p=["ALL","JPG","PNG","WEBP","SVG","GIF","AVIF"],m={ALL:y.length};for(const M of y){const I=M.ext.toUpperCase();m[I]=(m[I]||0)+1}p.forEach(M=>{const I=m[M]||0;if(M!=="ALL"&&I===0)return;const F=document.createElement("button");F.className=`ig-chip ${s===M?"ig-chip-active":""}`,F.textContent=`${M} (${I})`,F.addEventListener("click",()=>{s=M,ye(),j()}),L.appendChild(F)})};T.querySelectorAll(".ig-chip").forEach(p=>{p.addEventListener("click",()=>{T.querySelectorAll(".ig-chip").forEach(m=>m.classList.remove("ig-chip-active")),p.classList.add("ig-chip-active"),d=p.getAttribute("data-orientation")||"all",j()})});const j=()=>{b.innerHTML="";const p=we();if(p.length===0){const m=document.createElement("div");m.className="ig-empty-state",m.innerHTML=`
        <svg viewBox="0 0 24 24" width="48" height="48" fill="#9ca3af">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <p>No images match the current filter.</p>
      `,b.appendChild(m),U();return}p.forEach(m=>{const M=E.has(m.src),I=document.createElement("div");I.className=`ig-card ${M?"ig-card-selected":""}`;const F=document.createElement("div");F.className="ig-card-topbar";const R=document.createElement("input");R.type="checkbox",R.className="ig-checkbox",R.checked=M;const xe=document.createElement("div");xe.className="ig-card-quick-actions";const G=document.createElement("button");G.className="ig-quick-btn",G.title="Copy image URL",G.innerHTML=`
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
      `,G.addEventListener("click",X=>{X.stopPropagation(),navigator.clipboard.writeText(m.src),ve("Image URL copied to clipboard!")});const Y=document.createElement("button");Y.className="ig-quick-btn",Y.title="Open full image in new tab",Y.innerHTML=`
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
      `,Y.addEventListener("click",X=>{X.stopPropagation(),window.open(m.src,"_blank")});const Z=document.createElement("button");Z.className="ig-quick-btn",Z.title="Preview full size",Z.innerHTML=`
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      `,Z.addEventListener("click",X=>{X.stopPropagation(),At(m)}),xe.append(G,Y,Z),F.append(R,xe);const Ee=document.createElement("div");Ee.className="ig-thumb-wrap";const Q=document.createElement("img");Q.className="ig-thumb",Q.src=m.src,Q.alt=m.alt||m.originalName,Q.loading="lazy",Ee.appendChild(Q);const Se=document.createElement("div");Se.className="ig-card-meta";const Me=document.createElement("span");Me.className="ig-badge ig-badge-size",Me.textContent=m.width&&m.height?`${m.width}\xD7${m.height}`:"Dynamic";const ke=document.createElement("span");ke.className="ig-badge ig-badge-format",ke.textContent=m.ext.toUpperCase(),Se.append(Me,ke),I.append(F,Ee,Se),I.addEventListener("click",()=>{E.has(m.src)?(E.delete(m.src),I.classList.remove("ig-card-selected"),R.checked=!1):(E.add(m.src),I.classList.add("ig-card-selected"),R.checked=!0),U()}),b.appendChild(I)}),U()};q.addEventListener("click",async()=>{if(!h){h=!0,q.classList.add("ig-action-btn-loading"),q.querySelector("span").textContent="Scanning...";try{const p=y.length,m=await r(I=>{k.textContent=I});y=m,m.forEach(I=>E.add(I.src));const M=m.length-p;ye(),j(),ve(M>0?`+${M} new images discovered!`:"Scan complete. All visible images captured."),k.textContent=""}catch{ve("Scan interrupted.")}finally{h=!1,q.classList.remove("ig-action-btn-loading"),q.querySelector("span").textContent="Scan More"}}});const At=p=>{H.src=p.src,W.innerHTML=`
      <span><strong>${p.originalName}.${p.ext}</strong></span>
      <span>${p.width} \xD7 ${p.height} px (${p.orientation||"shape"})</span>
    `,v.style.display="flex"},ie=()=>{v.style.display="none",H.src=""};Tt.addEventListener("click",ie),v.addEventListener("click",p=>{p.target===v&&ie()}),N.addEventListener("click",()=>{const p=we();p.every(M=>E.has(M.src))?p.forEach(M=>E.delete(M.src)):p.forEach(M=>E.add(M.src)),j()}),C.addEventListener("input",()=>{f=C.value.trim(),j()}),A.addEventListener("change",()=>{o=Number(A.value)||0,j()});const $e=async p=>{if(c)return;const m=y.filter(M=>E.has(M.src));if(m.length!==0&&!(p==="individual"&&m.length>5&&!window.confirm(`Saving ${m.length} separate files.

NOTE: If your browser setting "Ask where to save each file before downloading" is turned ON, your browser will prompt for every single image.

Tip: Use "Download as ZIP" to download everything in 1 file prompt.

Do you want to continue saving separately?`))){c=!0,U(),k.textContent=p==="zip"?`Fetching & packaging ${m.length} images into ZIP...`:`Starting individual download of ${m.length} images...`;try{await e(m,p,(M,I,F)=>{k.textContent=F||`Processing ${M} of ${I}...`}),k.textContent=p==="zip"?"ZIP archive downloaded successfully!":`Saved ${m.length} images!`,setTimeout(()=>{B()},1400)}catch{k.textContent="Download failed. Please check browser permissions."}finally{c=!1,U()}}};z.addEventListener("click",()=>$e("zip")),P.addEventListener("click",()=>$e("individual"));const B=()=>{i.style.display="none",ie()};return K.addEventListener("click",B),be.addEventListener("click",B),i.addEventListener("click",p=>{p.target===i&&B()}),document.addEventListener("keydown",p=>{if(i.style.display==="flex"){if(p.key==="Escape"){v.style.display==="flex"?ie():B();return}if((p.ctrlKey||p.metaKey)&&p.key.toLowerCase()==="a"&&document.activeElement!==C){p.preventDefault(),N.click();return}p.key==="Enter"&&!c&&!h&&v.style.display!=="flex"&&document.activeElement!==C&&(p.preventDefault(),z.click())}}),{open(p){y=p,E=new Set(p.map(m=>m.src)),s="ALL",d="all",o=0,f="",A.value="0",C.value="",k.textContent="",c=!1,h=!1,T.querySelectorAll(".ig-chip").forEach((m,M)=>{M===0?m.classList.add("ig-chip-active"):m.classList.remove("ig-chip-active")}),ye(),j(),i.style.display="flex"},close:B,destroy(){i.remove()}}}function Mt(){return`
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Floating Save Button */
    .ig-floating-btn {
      position: fixed;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      z-index: 2147483646;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.15s ease, background 0.15s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }
    .ig-floating-btn:hover {
      background: #2563eb;
      transform: scale(1.04);
    }
    .ig-floating-btn svg {
      flex-shrink: 0;
    }

    /* Modal Backdrop */
    .ig-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      padding: 20px;
      box-sizing: border-box;
    }

    /* Modal Card */
    .ig-modal-card {
      width: 100%;
      max-width: 980px;
      height: 88vh;
      max-height: 860px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: ig-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes ig-scale-in {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Modal Header */
    .ig-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .ig-modal-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ig-modal-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .ig-modal-subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .ig-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ig-action-btn:hover {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .ig-action-btn-loading {
      opacity: 0.7;
      cursor: wait;
    }
    .ig-icon-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .ig-icon-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Toolbar */
    .ig-modal-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ig-toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ig-toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-format-filters, .ig-orientation-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .ig-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ig-chip:hover {
      border-color: #94a3b8;
      background: #f1f5f9;
    }
    .ig-chip-active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .ig-chip-active:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }
    .ig-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      color: #334155;
      cursor: pointer;
      outline: none;
    }
    .ig-search-input {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
      width: 150px;
      transition: width 0.2s ease, border-color 0.2s ease;
    }
    .ig-search-input:focus {
      border-color: #2563eb;
      width: 180px;
    }
    .ig-action-link-btn {
      background: transparent;
      border: none;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
    }
    .ig-action-link-btn:hover {
      text-decoration: underline;
    }

    /* Grid Wrap */
    .ig-grid-wrap {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      background: #f8fafc;
    }
    .ig-image-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 16px;
    }

    /* Empty State */
    .ig-empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;
      font-size: 14px;
    }

    /* Card */
    .ig-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      user-select: none;
    }
    .ig-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }
    .ig-card-selected {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .ig-card-selected:hover {
      border-color: #2563eb;
    }

    /* Card Topbar */
    .ig-card-topbar {
      position: absolute;
      top: 6px;
      left: 6px;
      right: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }
    .ig-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      cursor: pointer;
      accent-color: #2563eb;
    }
    .ig-card-quick-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .ig-card:hover .ig-card-quick-actions {
      opacity: 1;
    }
    .ig-quick-btn {
      width: 24px;
      height: 24px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      border: none;
      border-radius: 6px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .ig-quick-btn:hover {
      background: #2563eb;
    }

    /* Thumbnail */
    .ig-thumb-wrap {
      width: 100%;
      height: 130px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .ig-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s ease;
    }
    .ig-card:hover .ig-thumb {
      transform: scale(1.03);
    }

    /* Card Meta */
    .ig-card-meta {
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
    }
    .ig-badge {
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 5px;
    }
    .ig-badge-size {
      color: #64748b;
      background: #f1f5f9;
    }
    .ig-badge-format {
      color: #2563eb;
      background: #eff6ff;
    }

    /* Modal Footer */
    .ig-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      gap: 16px;
    }
    .ig-footer-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ig-counter-badge {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .ig-progress-label {
      font-size: 12px;
      color: #2563eb;
      font-weight: 500;
    }
    .ig-footer-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .ig-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      outline: none;
    }
    .ig-btn-secondary {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #475569;
    }
    .ig-btn-secondary:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .ig-btn-outline {
      background: #ffffff;
      border-color: #94a3b8;
      color: #334155;
    }
    .ig-btn-outline:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #64748b;
    }
    .ig-btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .ig-btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    .ig-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Toast Notification */
    .ig-toast {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(15, 23, 42, 0.9);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
      z-index: 20;
    }
    .ig-toast-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Lightbox Preview */
    .ig-lightbox {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 30;
      padding: 40px;
      box-sizing: border-box;
    }
    .ig-lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .ig-lightbox-close {
      position: absolute;
      top: -36px;
      right: 0;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 28px;
      cursor: pointer;
      line-height: 1;
    }
    .ig-lightbox-img {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .ig-lightbox-info {
      color: #f1f5f9;
      font-size: 13px;
      display: flex;
      gap: 16px;
      background: rgba(0, 0, 0, 0.4);
      padding: 6px 14px;
      border-radius: 20px;
    }
  `}var Ke=class _e extends Event{static EVENT_NAME=me("wxt:locationchange");constructor(t,e){super(_e.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=e}};function me(n){return`${$?.runtime?.id}:image-scraper:${n}`}const kt=typeof globalThis.navigation?.addEventListener=="function";function Lt(n){let t,e=!1;return{run(){e||(e=!0,t=new URL(location.href),kt?globalThis.navigation.addEventListener("navigate",r=>{const i=new URL(r.destination.url);i.href!==t.href&&(window.dispatchEvent(new Ke(i,t)),t=i)},{signal:n.signal}):n.setInterval(()=>{const r=new URL(location.href);r.href!==t.href&&(window.dispatchEvent(new Ke(r,t)),t=r)},1e3))}}}var Ct=class J{static SCRIPT_STARTED_MESSAGE_TYPE=me("wxt:content-script-started");id;abortController;locationWatcher=Lt(this);constructor(t,e){this.contentScriptName=t,this.options=e,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return $.runtime?.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,e){const r=setInterval(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearInterval(r)),r}setTimeout(t,e){const r=setTimeout(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearTimeout(r)),r}requestAnimationFrame(t){const e=requestAnimationFrame((...r)=>{this.isValid&&t(...r)});return this.onInvalidated(()=>cancelAnimationFrame(e)),e}requestIdleCallback(t,e){const r=requestIdleCallback((...i)=>{this.signal.aborted||t(...i)},e);return this.onInvalidated(()=>cancelIdleCallback(r)),r}addEventListener(t,e,r,i){e==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),t.addEventListener?.(e.startsWith("wxt:")?me(e):e,r,{...i,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),ae.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(J.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),this.options?.noScriptStartedPostMessage||window.postMessage({type:J.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},"*")}verifyScriptStartedEvent(t){const e=t.detail?.contentScriptName===this.contentScriptName,r=t.detail?.messageId===this.id;return e&&!r}listenForNewerScripts(){const t=e=>{!(e instanceof CustomEvent)||!this.verifyScriptStartedEvent(e)||this.notifyInvalidated()};document.addEventListener(J.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(J.SCRIPT_STARTED_MESSAGE_TYPE,t))}};function Ft(){}function ne(n,...t){}const It={debug:(...n)=>ne(console.debug,...n),log:(...n)=>ne(console.log,...n),warn:(...n)=>ne(console.warn,...n),error:(...n)=>ne(console.error,...n)};return(async()=>{try{const{main:n,...t}=vt;return await n(new Ct("image-scraper",t))}catch(n){throw It.error('The content script "image-scraper" crashed on startup!',n),n}})()})();
