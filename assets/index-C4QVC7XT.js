const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./local-DmtFPsBk.js","./manager-MN-hWKbU.js"])))=>i.map(i=>d[i]);
import{G as Rt,c as kt,r as _,E as At,a as Nt,b as Dt,d as Ve,s as He,e as Ot,f as W,g as We,h as ot,i as Lt}from"./manager-MN-hWKbU.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function s(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(n){if(n.ep)return;n.ep=!0;const r=s(n);fetch(n.href,r)}})();const It="modulepreload",Ut=function(t,e){return new URL(t,e).href},ze={},Vt=function(e,s,i){let n=Promise.resolve();if(s&&s.length>0){let p=function(m){return Promise.all(m.map(d=>Promise.resolve(d).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const o=document.getElementsByTagName("link"),a=document.querySelector("meta[property=csp-nonce]"),l=a?.nonce||a?.getAttribute("nonce");n=p(s.map(m=>{if(m=Ut(m,i),m in ze)return;ze[m]=!0;const d=m.endsWith(".css"),f=d?'[rel="stylesheet"]':"";if(i)for(let E=o.length-1;E>=0;E--){const T=o[E];if(T.href===m&&(!d||T.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${m}"]${f}`))return;const u=document.createElement("link");if(u.rel=d?"stylesheet":It,d||(u.as="script"),u.crossOrigin="",u.href=m,l&&u.setAttribute("nonce",l),document.head.appendChild(u),d)return new Promise((E,T)=>{u.addEventListener("load",E),u.addEventListener("error",()=>T(new Error(`Unable to preload CSS for ${m}`)))})}))}function r(o){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=o,window.dispatchEvent(a),!a.defaultPrevented)throw o}return n.then(o=>{for(const a of o||[])a.status==="rejected"&&r(a.reason);return e().catch(r)})};class at extends Event{constructor(e,s,i,n){super("context-request",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=s,this.callback=i,this.subscribe=n??!1}}class Be{constructor(e,s,i,n){if(this.subscribe=!1,this.provided=!1,this.value=void 0,this._callback=(r,o)=>{this.unsubscribe&&(this.unsubscribe!==o&&(this.provided=!1,this.unsubscribe()),this.subscribe||this.unsubscribe()),this.value=r,this.host.requestUpdate(),(!this.provided||this.subscribe)&&(this.provided=!0,this.callback&&this.callback(r,o)),this.unsubscribe=o},this.host=e,s.context!==void 0){const r=s;this.context=r.context,this.callback=r.callback,this.subscribe=r.subscribe??!1}else this.context=s,this.callback=i,this.subscribe=n??!1;this.host.addController(this)}hostConnected(){this.dispatchRequest()}hostDisconnected(){this.unsubscribe&&(this.unsubscribe(),this.unsubscribe=void 0)}dispatchRequest(){this.host.dispatchEvent(new at(this.context,this.host,this._callback,this.subscribe))}}class Ht{get value(){return this._value}set value(e){this.setValue(e)}setValue(e,s=!1){const i=s||!Object.is(e,this._value);this._value=e,i&&this.updateObservers()}constructor(e){this.subscriptions=new Map,this.updateObservers=()=>{for(const[s,{disposer:i}]of this.subscriptions)s(this._value,i)},e!==void 0&&(this.value=e)}addCallback(e,s,i){if(!i){e(this.value);return}this.subscriptions.has(e)||this.subscriptions.set(e,{disposer:()=>{this.subscriptions.delete(e)},consumerHost:s});const{disposer:n}=this.subscriptions.get(e);e(this.value,n)}clearCallbacks(){this.subscriptions.clear()}}class Wt extends Event{constructor(e,s){super("context-provider",{bubbles:!0,composed:!0}),this.context=e,this.contextTarget=s}}class je extends Ht{constructor(e,s,i){super(s.context!==void 0?s.initialValue:i),this.onContextRequest=n=>{if(n.context!==this.context)return;const r=n.contextTarget??n.composedPath()[0];r!==this.host&&(n.stopPropagation(),this.addCallback(n.callback,r,n.subscribe))},this.onProviderRequest=n=>{if(n.context!==this.context||(n.contextTarget??n.composedPath()[0])===this.host)return;const o=new Set;for(const[a,{consumerHost:l}]of this.subscriptions)o.has(a)||(o.add(a),l.dispatchEvent(new at(this.context,l,a,!0)));n.stopPropagation()},this.host=e,s.context!==void 0?this.context=s.context:this.context=s,this.attachListeners(),this.host.addController?.(this)}attachListeners(){this.host.addEventListener("context-request",this.onContextRequest),this.host.addEventListener("context-provider",this.onProviderRequest)}hostConnected(){this.host.dispatchEvent(new Wt(this.context,this.host))}}function te({context:t}){return((e,s)=>{const i=new WeakMap;if(typeof s=="object")return{get(){return e.get.call(this)},set(n){return i.get(this).setValue(n),e.set.call(this,n)},init(n){return i.set(this,new je(this,{context:t,initialValue:n})),n}};{e.constructor.addInitializer(o=>{i.set(o,new je(o,{context:t}))});const n=Object.getOwnPropertyDescriptor(e,s);let r;if(n===void 0){const o=new WeakMap;r={get(){return o.get(this)},set(a){i.get(this).setValue(a),o.set(this,a)},configurable:!0,enumerable:!0}}else{const o=n.set;r={...n,set(a){i.get(this).setValue(a),o?.call(this,a)}}}Object.defineProperty(e,s,r);return}})}function G({context:t,subscribe:e}){return((s,i)=>{typeof i=="object"?i.addInitializer(function(){new Be(this,{context:t,callback:n=>{s.set.call(this,n)},subscribe:e})}):s.constructor.addInitializer(n=>{new Be(n,{context:t,callback:r=>{n[i]=r},subscribe:e})})})}const zt=!1,ie=globalThis,Te=ie.ShadowRoot&&(ie.ShadyCSS===void 0||ie.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,lt=Symbol(),qe=new WeakMap;class Bt{constructor(e,s,i){if(this._$cssResult$=!0,i!==lt)throw new Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this._strings=s}get styleSheet(){let e=this._styleSheet;const s=this._strings;if(Te&&e===void 0){const i=s!==void 0&&s.length===1;i&&(e=qe.get(s)),e===void 0&&((this._styleSheet=e=new CSSStyleSheet).replaceSync(this.cssText),i&&qe.set(s,e))}return e}toString(){return this.cssText}}const jt=t=>new Bt(typeof t=="string"?t:String(t),void 0,lt),qt=(t,e)=>{if(Te)t.adoptedStyleSheets=e.map(s=>s instanceof CSSStyleSheet?s:s.styleSheet);else for(const s of e){const i=document.createElement("style"),n=ie.litNonce;n!==void 0&&i.setAttribute("nonce",n),i.textContent=s.cssText,t.appendChild(i)}},Gt=t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return jt(e)},Ge=Te||zt?t=>t:t=>t instanceof CSSStyleSheet?Gt(t):t;const{is:Ft,defineProperty:Kt,getOwnPropertyDescriptor:Fe,getOwnPropertyNames:Yt,getOwnPropertySymbols:Jt,getPrototypeOf:Ke}=Object,w=globalThis;let P;const Ye=w.trustedTypes,Qt=Ye?Ye.emptyScript:"",ct=w.reactiveElementPolyfillSupportDevMode;w.litIssuedWarnings??=new Set,P=(t,e)=>{e+=` See https://lit.dev/msg/${t} for more information.`,!w.litIssuedWarnings.has(e)&&!w.litIssuedWarnings.has(t)&&(console.warn(e),w.litIssuedWarnings.add(e))},queueMicrotask(()=>{P("dev-mode","Lit is in dev mode. Not recommended for production!"),w.ShadyDOM?.inUse&&ct===void 0&&P("polyfill-support-missing","Shadow DOM is being polyfilled via `ShadyDOM` but the `polyfill-support` module has not been loaded.")});const Zt=t=>{w.emitLitDebugLogEvents&&w.dispatchEvent(new CustomEvent("lit-debug",{detail:t}))},j=(t,e)=>t,ae={toAttribute(t,e){switch(e){case Boolean:t=t?Qt:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t);break}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=t!==null;break;case Number:s=t===null?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch{s=null}break}return s}},xe=(t,e)=>!Ft(t,e),Je={attribute:!0,type:String,converter:ae,reflect:!1,useDefault:!1,hasChanged:xe};Symbol.metadata??=Symbol("metadata");w.litPropertyMetadata??=new WeakMap;class R extends HTMLElement{static addInitializer(e){this.__prepare(),(this._initializers??=[]).push(e)}static get observedAttributes(){return this.finalize(),this.__attributeToPropertyMap&&[...this.__attributeToPropertyMap.keys()]}static createProperty(e,s=Je){if(s.state&&(s.attribute=!1),this.__prepare(),this.prototype.hasOwnProperty(e)&&(s=Object.create(s),s.wrapped=!0),this.elementProperties.set(e,s),!s.noAccessor){const i=Symbol.for(`${String(e)} (@property() cache)`),n=this.getPropertyDescriptor(e,i,s);n!==void 0&&Kt(this.prototype,e,n)}}static getPropertyDescriptor(e,s,i){const{get:n,set:r}=Fe(this.prototype,e)??{get(){return this[s]},set(o){this[s]=o}};if(n==null){if("value"in(Fe(this.prototype,e)??{}))throw new Error(`Field ${JSON.stringify(String(e))} on ${this.name} was declared as a reactive property but it's actually declared as a value on the prototype. Usually this is due to using @property or @state on a method.`);P("reactive-property-without-getter",`Field ${JSON.stringify(String(e))} on ${this.name} was declared as a reactive property but it does not have a getter. This will be an error in a future version of Lit.`)}return{get:n,set(o){const a=n?.call(this);r?.call(this,o),this.requestUpdate(e,a,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Je}static __prepare(){if(this.hasOwnProperty(j("elementProperties")))return;const e=Ke(this);e.finalize(),e._initializers!==void 0&&(this._initializers=[...e._initializers]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(j("finalized")))return;if(this.finalized=!0,this.__prepare(),this.hasOwnProperty(j("properties"))){const s=this.properties,i=[...Yt(s),...Jt(s)];for(const n of i)this.createProperty(n,s[n])}const e=this[Symbol.metadata];if(e!==null){const s=litPropertyMetadata.get(e);if(s!==void 0)for(const[i,n]of s)this.elementProperties.set(i,n)}this.__attributeToPropertyMap=new Map;for(const[s,i]of this.elementProperties){const n=this.__attributeNameForProperty(s,i);n!==void 0&&this.__attributeToPropertyMap.set(n,s)}this.elementStyles=this.finalizeStyles(this.styles),this.hasOwnProperty("createProperty")&&P("no-override-create-property","Overriding ReactiveElement.createProperty() is deprecated. The override will not be called with standard decorators"),this.hasOwnProperty("getPropertyDescriptor")&&P("no-override-get-property-descriptor","Overriding ReactiveElement.getPropertyDescriptor() is deprecated. The override will not be called with standard decorators")}static finalizeStyles(e){const s=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const n of i)s.unshift(Ge(n))}else e!==void 0&&s.push(Ge(e));return s}static __attributeNameForProperty(e,s){const i=s.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this.__instanceProperties=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this.__reflectingProperty=null,this.__initialize()}__initialize(){this.__updatePromise=new Promise(e=>this.enableUpdating=e),this._$changedProperties=new Map,this.__saveInstanceProperties(),this.requestUpdate(),this.constructor._initializers?.forEach(e=>e(this))}addController(e){(this.__controllers??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this.__controllers?.delete(e)}__saveInstanceProperties(){const e=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this.__instanceProperties=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return qt(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this.__controllers?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this.__controllers?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,s,i){this._$attributeToProperty(e,i)}__propertyToAttribute(e,s){const n=this.constructor.elementProperties.get(e),r=this.constructor.__attributeNameForProperty(e,n);if(r!==void 0&&n.reflect===!0){const a=(n.converter?.toAttribute!==void 0?n.converter:ae).toAttribute(s,n.type);this.constructor.enabledWarnings.includes("migration")&&a===void 0&&P("undefined-attribute-value",`The attribute value for the ${e} property is undefined on element ${this.localName}. The attribute will be removed, but in the previous version of \`ReactiveElement\`, the attribute would not have changed.`),this.__reflectingProperty=e,a==null?this.removeAttribute(r):this.setAttribute(r,a),this.__reflectingProperty=null}}_$attributeToProperty(e,s){const i=this.constructor,n=i.__attributeToPropertyMap.get(e);if(n!==void 0&&this.__reflectingProperty!==n){const r=i.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:ae;this.__reflectingProperty=n;const a=o.fromAttribute(s,r.type);this[n]=a??this.__defaultValues?.get(n)??a,this.__reflectingProperty=null}}requestUpdate(e,s,i){if(e!==void 0){e instanceof Event&&P("","The requestUpdate() method was called with an Event as the property name. This is probably a mistake caused by binding this.requestUpdate as an event listener. Instead bind a function that will call it with no arguments: () => this.requestUpdate()");const n=this.constructor,r=this[e];if(i??=n.getPropertyOptions(e),(i.hasChanged??xe)(r,s)||i.useDefault&&i.reflect&&r===this.__defaultValues?.get(e)&&!this.hasAttribute(n.__attributeNameForProperty(e,i)))this._$changeProperty(e,s,i);else return}this.isUpdatePending===!1&&(this.__updatePromise=this.__enqueueUpdate())}_$changeProperty(e,s,{useDefault:i,reflect:n,wrapped:r},o){i&&!(this.__defaultValues??=new Map).has(e)&&(this.__defaultValues.set(e,o??s??this[e]),r!==!0||o!==void 0)||(this._$changedProperties.has(e)||(!this.hasUpdated&&!i&&(s=void 0),this._$changedProperties.set(e,s)),n===!0&&this.__reflectingProperty!==e&&(this.__reflectingProperties??=new Set).add(e))}async __enqueueUpdate(){this.isUpdatePending=!0;try{await this.__updatePromise}catch(s){Promise.reject(s)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){const e=this.performUpdate();return this.constructor.enabledWarnings.includes("async-perform-update")&&typeof e?.then=="function"&&P("async-perform-update",`Element ${this.localName} returned a Promise from performUpdate(). This behavior is deprecated and will be removed in a future version of ReactiveElement.`),e}performUpdate(){if(!this.isUpdatePending)return;if(Zt?.({kind:"update"}),!this.hasUpdated){this.renderRoot??=this.createRenderRoot();{const r=[...this.constructor.elementProperties.keys()].filter(o=>this.hasOwnProperty(o)&&o in Ke(this));if(r.length)throw new Error(`The following properties on element ${this.localName} will not trigger updates as expected because they are set using class fields: ${r.join(", ")}. Native class fields and some compiled output will overwrite accessors used for detecting changes. See https://lit.dev/msg/class-field-shadowing for more information.`)}if(this.__instanceProperties){for(const[n,r]of this.__instanceProperties)this[n]=r;this.__instanceProperties=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[n,r]of i){const{wrapped:o}=r,a=this[n];o===!0&&!this._$changedProperties.has(n)&&a!==void 0&&this._$changeProperty(n,void 0,r,a)}}let e=!1;const s=this._$changedProperties;try{e=this.shouldUpdate(s),e?(this.willUpdate(s),this.__controllers?.forEach(i=>i.hostUpdate?.()),this.update(s)):this.__markUpdated()}catch(i){throw e=!1,this.__markUpdated(),i}e&&this._$didUpdate(s)}willUpdate(e){}_$didUpdate(e){this.__controllers?.forEach(s=>s.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e),this.isUpdatePending&&this.constructor.enabledWarnings.includes("change-in-update")&&P("change-in-update",`Element ${this.localName} scheduled an update (generally because a property was set) after an update completed, causing a new update to be scheduled. This is inefficient and should be avoided unless the next update can only be scheduled as a side effect of the previous update.`)}__markUpdated(){this._$changedProperties=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this.__updatePromise}shouldUpdate(e){return!0}update(e){this.__reflectingProperties&&=this.__reflectingProperties.forEach(s=>this.__propertyToAttribute(s,this[s])),this.__markUpdated()}updated(e){}firstUpdated(e){}}R.elementStyles=[];R.shadowRootOptions={mode:"open"};R[j("elementProperties")]=new Map;R[j("finalized")]=new Map;ct?.({ReactiveElement:R});{R.enabledWarnings=["change-in-update","async-perform-update"];const t=function(e){e.hasOwnProperty(j("enabledWarnings"))||(e.enabledWarnings=e.enabledWarnings.slice())};R.enableWarning=function(e){t(this),this.enabledWarnings.includes(e)||this.enabledWarnings.push(e)},R.disableWarning=function(e){t(this);const s=this.enabledWarnings.indexOf(e);s>=0&&this.enabledWarnings.splice(s,1)}}(w.reactiveElementVersions??=[]).push("2.1.1");w.reactiveElementVersions.length>1&&queueMicrotask(()=>{P("multiple-versions","Multiple versions of Lit loaded. Loading multiple versions is not recommended.")});const b=globalThis,c=t=>{b.emitLitDebugLogEvents&&b.dispatchEvent(new CustomEvent("lit-debug",{detail:t}))};let Xt=0,J;b.litIssuedWarnings??=new Set,J=(t,e)=>{e+=t?` See https://lit.dev/msg/${t} for more information.`:"",!b.litIssuedWarnings.has(e)&&!b.litIssuedWarnings.has(t)&&(console.warn(e),b.litIssuedWarnings.add(e))},queueMicrotask(()=>{J("dev-mode","Lit is in dev mode. Not recommended for production!")});const v=b.ShadyDOM?.inUse&&b.ShadyDOM?.noPatch===!0?b.ShadyDOM.wrap:t=>t,le=b.trustedTypes,Qe=le?le.createPolicy("lit-html",{createHTML:t=>t}):void 0,es=t=>t,ue=(t,e,s)=>es,ts=t=>{if(I!==ue)throw new Error("Attempted to overwrite existing lit-html security policy. setSanitizeDOMValueFactory should be called at most once.");I=t},ss=()=>{I=ue},we=(t,e,s)=>I(t,e,s),dt="$lit$",x=`lit$${Math.random().toFixed(9).slice(2)}$`,ht="?"+x,ns=`<${ht}>`,L=document,Q=()=>L.createComment(""),Z=t=>t===null||typeof t!="object"&&typeof t!="function",Re=Array.isArray,is=t=>Re(t)||typeof t?.[Symbol.iterator]=="function",ge=`[ 	
\f\r]`,rs=`[^ 	
\f\r"'\`<>=]`,os=`[^\\s"'>=/]`,Y=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Ze=1,ye=2,as=3,Xe=/-->/g,et=/>/g,D=new RegExp(`>|${ge}(?:(${os}+)(${ge}*=${ge}*(?:${rs}|("|')|))|$)`,"g"),ls=0,tt=1,cs=2,st=3,_e=/'/g,be=/"/g,ut=/^(?:script|style|textarea|title)$/i,ds=1,$e=2,ve=3,ke=1,ce=2,hs=3,us=4,ps=5,Ae=6,ms=7,fs=t=>(e,...s)=>(e.some(i=>i===void 0)&&console.warn(`Some template strings are undefined.
This is probably caused by illegal octal escape sequences.`),s.some(i=>i?._$litStatic$)&&J("",`Static values 'literal' or 'unsafeStatic' cannot be used as values to non-static templates.
Please use the static 'html' tag function. See https://lit.dev/docs/templates/expressions/#static-expressions`),{_$litType$:t,strings:e,values:s}),h=fs(ds),A=Symbol.for("lit-noChange"),g=Symbol.for("lit-nothing"),nt=new WeakMap,O=L.createTreeWalker(L,129);let I=ue;function pt(t,e){if(!Re(t)||!t.hasOwnProperty("raw")){let s="invalid template strings array";throw s=`
          Internal Error: expected template strings to be an array
          with a 'raw' field. Faking a template strings array by
          calling html or svg like an ordinary function is effectively
          the same as calling unsafeHtml and can lead to major security
          issues, e.g. opening your code up to XSS attacks.
          If you're using the html or svg tagged template functions normally
          and still seeing this error, please file a bug at
          https://github.com/lit/lit/issues/new?template=bug_report.md
          and include information about your build tooling, if any.
        `.trim().replace(/\n */g,`
`),new Error(s)}return Qe!==void 0?Qe.createHTML(e):e}const gs=(t,e)=>{const s=t.length-1,i=[];let n=e===$e?"<svg>":e===ve?"<math>":"",r,o=Y;for(let l=0;l<s;l++){const p=t[l];let m=-1,d,f=0,u;for(;f<p.length&&(o.lastIndex=f,u=o.exec(p),u!==null);)if(f=o.lastIndex,o===Y){if(u[Ze]==="!--")o=Xe;else if(u[Ze]!==void 0)o=et;else if(u[ye]!==void 0)ut.test(u[ye])&&(r=new RegExp(`</${u[ye]}`,"g")),o=D;else if(u[as]!==void 0)throw new Error("Bindings in tag names are not supported. Please use static templates instead. See https://lit.dev/docs/templates/expressions/#static-expressions")}else o===D?u[ls]===">"?(o=r??Y,m=-1):u[tt]===void 0?m=-2:(m=o.lastIndex-u[cs].length,d=u[tt],o=u[st]===void 0?D:u[st]==='"'?be:_e):o===be||o===_e?o=D:o===Xe||o===et?o=Y:(o=D,r=void 0);console.assert(m===-1||o===D||o===_e||o===be,"unexpected parse state B");const E=o===D&&t[l+1].startsWith("/>")?" ":"";n+=o===Y?p+ns:m>=0?(i.push(d),p.slice(0,m)+dt+p.slice(m)+x+E):p+x+(m===-2?l:E)}const a=n+(t[s]||"<?>")+(e===$e?"</svg>":e===ve?"</math>":"");return[pt(t,a),i]};class X{constructor({strings:e,["_$litType$"]:s},i){this.parts=[];let n,r=0,o=0;const a=e.length-1,l=this.parts,[p,m]=gs(e,s);if(this.el=X.createElement(p,i),O.currentNode=this.el.content,s===$e||s===ve){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(n=O.nextNode())!==null&&l.length<a;){if(n.nodeType===1){{const d=n.localName;if(/^(?:textarea|template)$/i.test(d)&&n.innerHTML.includes(x)){const f=`Expressions are not supported inside \`${d}\` elements. See https://lit.dev/msg/expression-in-${d} for more information.`;if(d==="template")throw new Error(f);J("",f)}}if(n.hasAttributes())for(const d of n.getAttributeNames())if(d.endsWith(dt)){const f=m[o++],E=n.getAttribute(d).split(x),T=/([.?@])?(.*)/.exec(f);l.push({type:ke,index:r,name:T[2],strings:E,ctor:T[1]==="."?_s:T[1]==="?"?bs:T[1]==="@"?ws:pe}),n.removeAttribute(d)}else d.startsWith(x)&&(l.push({type:Ae,index:r}),n.removeAttribute(d));if(ut.test(n.tagName)){const d=n.textContent.split(x),f=d.length-1;if(f>0){n.textContent=le?le.emptyScript:"";for(let u=0;u<f;u++)n.append(d[u],Q()),O.nextNode(),l.push({type:ce,index:++r});n.append(d[f],Q())}}}else if(n.nodeType===8)if(n.data===ht)l.push({type:ce,index:r});else{let f=-1;for(;(f=n.data.indexOf(x,f+1))!==-1;)l.push({type:ms,index:r}),f+=x.length-1}r++}if(m.length!==o)throw new Error('Detected duplicate attribute bindings. This occurs if your template has duplicate attributes on an element tag. For example "<input ?disabled=${true} ?disabled=${false}>" contains a duplicate "disabled" attribute. The error was detected in the following template: \n`'+e.join("${...}")+"`");c&&c({kind:"template prep",template:this,clonableTemplate:this.el,parts:this.parts,strings:e})}static createElement(e,s){const i=L.createElement("template");return i.innerHTML=e,i}}function q(t,e,s=t,i){if(e===A)return e;let n=i!==void 0?s.__directives?.[i]:s.__directive;const r=Z(e)?void 0:e._$litDirective$;return n?.constructor!==r&&(n?._$notifyDirectiveConnectionChanged?.(!1),r===void 0?n=void 0:(n=new r(t),n._$initialize(t,s,i)),i!==void 0?(s.__directives??=[])[i]=n:s.__directive=n),n!==void 0&&(e=q(t,n._$resolve(t,e.values),n,i)),e}class ys{constructor(e,s){this._$parts=[],this._$disconnectableChildren=void 0,this._$template=e,this._$parent=s}get parentNode(){return this._$parent.parentNode}get _$isConnected(){return this._$parent._$isConnected}_clone(e){const{el:{content:s},parts:i}=this._$template,n=(e?.creationScope??L).importNode(s,!0);O.currentNode=n;let r=O.nextNode(),o=0,a=0,l=i[0];for(;l!==void 0;){if(o===l.index){let p;l.type===ce?p=new se(r,r.nextSibling,this,e):l.type===ke?p=new l.ctor(r,l.name,l.strings,this,e):l.type===Ae&&(p=new $s(r,this,e)),this._$parts.push(p),l=i[++a]}o!==l?.index&&(r=O.nextNode(),o++)}return O.currentNode=L,n}_update(e){let s=0;for(const i of this._$parts)i!==void 0&&(c&&c({kind:"set part",part:i,value:e[s],valueIndex:s,values:e,templateInstance:this}),i.strings!==void 0?(i._$setValue(e,i,s),s+=i.strings.length-2):i._$setValue(e[s])),s++}}class se{get _$isConnected(){return this._$parent?._$isConnected??this.__isConnected}constructor(e,s,i,n){this.type=ce,this._$committedValue=g,this._$disconnectableChildren=void 0,this._$startNode=e,this._$endNode=s,this._$parent=i,this.options=n,this.__isConnected=n?.isConnected??!0,this._textSanitizer=void 0}get parentNode(){let e=v(this._$startNode).parentNode;const s=this._$parent;return s!==void 0&&e?.nodeType===11&&(e=s.parentNode),e}get startNode(){return this._$startNode}get endNode(){return this._$endNode}_$setValue(e,s=this){if(this.parentNode===null)throw new Error("This `ChildPart` has no `parentNode` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's `innerHTML` or `textContent` can do this.");if(e=q(this,e,s),Z(e))e===g||e==null||e===""?(this._$committedValue!==g&&(c&&c({kind:"commit nothing to child",start:this._$startNode,end:this._$endNode,parent:this._$parent,options:this.options}),this._$clear()),this._$committedValue=g):e!==this._$committedValue&&e!==A&&this._commitText(e);else if(e._$litType$!==void 0)this._commitTemplateResult(e);else if(e.nodeType!==void 0){if(this.options?.host===e){this._commitText("[probable mistake: rendered a template's host in itself (commonly caused by writing ${this} in a template]"),console.warn("Attempted to render the template host",e,"inside itself. This is almost always a mistake, and in dev mode ","we render some warning text. In production however, we'll ","render it, which will usually result in an error, and sometimes ","in the element disappearing from the DOM.");return}this._commitNode(e)}else is(e)?this._commitIterable(e):this._commitText(e)}_insert(e){return v(v(this._$startNode).parentNode).insertBefore(e,this._$endNode)}_commitNode(e){if(this._$committedValue!==e){if(this._$clear(),I!==ue){const s=this._$startNode.parentNode?.nodeName;if(s==="STYLE"||s==="SCRIPT"){let i="Forbidden";throw s==="STYLE"?i="Lit does not support binding inside style nodes. This is a security risk, as style injection attacks can exfiltrate data and spoof UIs. Consider instead using css`...` literals to compose styles, and do dynamic styling with css custom properties, ::parts, <slot>s, and by mutating the DOM rather than stylesheets.":i="Lit does not support binding inside script nodes. This is a security risk, as it could allow arbitrary code execution.",new Error(i)}}c&&c({kind:"commit node",start:this._$startNode,parent:this._$parent,value:e,options:this.options}),this._$committedValue=this._insert(e)}}_commitText(e){if(this._$committedValue!==g&&Z(this._$committedValue)){const s=v(this._$startNode).nextSibling;this._textSanitizer===void 0&&(this._textSanitizer=we(s,"data","property")),e=this._textSanitizer(e),c&&c({kind:"commit text",node:s,value:e,options:this.options}),s.data=e}else{const s=L.createTextNode("");this._commitNode(s),this._textSanitizer===void 0&&(this._textSanitizer=we(s,"data","property")),e=this._textSanitizer(e),c&&c({kind:"commit text",node:s,value:e,options:this.options}),s.data=e}this._$committedValue=e}_commitTemplateResult(e){const{values:s,["_$litType$"]:i}=e,n=typeof i=="number"?this._$getTemplate(e):(i.el===void 0&&(i.el=X.createElement(pt(i.h,i.h[0]),this.options)),i);if(this._$committedValue?._$template===n)c&&c({kind:"template updating",template:n,instance:this._$committedValue,parts:this._$committedValue._$parts,options:this.options,values:s}),this._$committedValue._update(s);else{const r=new ys(n,this),o=r._clone(this.options);c&&c({kind:"template instantiated",template:n,instance:r,parts:r._$parts,options:this.options,fragment:o,values:s}),r._update(s),c&&c({kind:"template instantiated and updated",template:n,instance:r,parts:r._$parts,options:this.options,fragment:o,values:s}),this._commitNode(o),this._$committedValue=r}}_$getTemplate(e){let s=nt.get(e.strings);return s===void 0&&nt.set(e.strings,s=new X(e)),s}_commitIterable(e){Re(this._$committedValue)||(this._$committedValue=[],this._$clear());const s=this._$committedValue;let i=0,n;for(const r of e)i===s.length?s.push(n=new se(this._insert(Q()),this._insert(Q()),this,this.options)):n=s[i],n._$setValue(r),i++;i<s.length&&(this._$clear(n&&v(n._$endNode).nextSibling,i),s.length=i)}_$clear(e=v(this._$startNode).nextSibling,s){for(this._$notifyConnectionChanged?.(!1,!0,s);e!==this._$endNode;){const i=v(e).nextSibling;v(e).remove(),e=i}}setConnected(e){if(this._$parent===void 0)this.__isConnected=e,this._$notifyConnectionChanged?.(e);else throw new Error("part.setConnected() may only be called on a RootPart returned from render().")}}class pe{get tagName(){return this.element.tagName}get _$isConnected(){return this._$parent._$isConnected}constructor(e,s,i,n,r){this.type=ke,this._$committedValue=g,this._$disconnectableChildren=void 0,this.element=e,this.name=s,this._$parent=n,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$committedValue=new Array(i.length-1).fill(new String),this.strings=i):this._$committedValue=g,this._sanitizer=void 0}_$setValue(e,s=this,i,n){const r=this.strings;let o=!1;if(r===void 0)e=q(this,e,s,0),o=!Z(e)||e!==this._$committedValue&&e!==A,o&&(this._$committedValue=e);else{const a=e;e=r[0];let l,p;for(l=0;l<r.length-1;l++)p=q(this,a[i+l],s,l),p===A&&(p=this._$committedValue[l]),o||=!Z(p)||p!==this._$committedValue[l],p===g?e=g:e!==g&&(e+=(p??"")+r[l+1]),this._$committedValue[l]=p}o&&!n&&this._commitValue(e)}_commitValue(e){e===g?v(this.element).removeAttribute(this.name):(this._sanitizer===void 0&&(this._sanitizer=I(this.element,this.name,"attribute")),e=this._sanitizer(e??""),c&&c({kind:"commit attribute",element:this.element,name:this.name,value:e,options:this.options}),v(this.element).setAttribute(this.name,e??""))}}class _s extends pe{constructor(){super(...arguments),this.type=hs}_commitValue(e){this._sanitizer===void 0&&(this._sanitizer=I(this.element,this.name,"property")),e=this._sanitizer(e),c&&c({kind:"commit property",element:this.element,name:this.name,value:e,options:this.options}),this.element[this.name]=e===g?void 0:e}}class bs extends pe{constructor(){super(...arguments),this.type=us}_commitValue(e){c&&c({kind:"commit boolean attribute",element:this.element,name:this.name,value:!!(e&&e!==g),options:this.options}),v(this.element).toggleAttribute(this.name,!!e&&e!==g)}}class ws extends pe{constructor(e,s,i,n,r){if(super(e,s,i,n,r),this.type=ps,this.strings!==void 0)throw new Error(`A \`<${e.localName}>\` has a \`@${s}=...\` listener with invalid content. Event listeners in templates must have exactly one expression and no surrounding text.`)}_$setValue(e,s=this){if(e=q(this,e,s,0)??g,e===A)return;const i=this._$committedValue,n=e===g&&i!==g||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,r=e!==g&&(i===g||n);c&&c({kind:"commit event listener",element:this.element,name:this.name,value:e,options:this.options,removeListener:n,addListener:r,oldListener:i}),n&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,e),this._$committedValue=e}handleEvent(e){typeof this._$committedValue=="function"?this._$committedValue.call(this.options?.host??this.element,e):this._$committedValue.handleEvent(e)}}class $s{constructor(e,s,i){this.element=e,this.type=Ae,this._$disconnectableChildren=void 0,this._$parent=s,this.options=i}get _$isConnected(){return this._$parent._$isConnected}_$setValue(e){c&&c({kind:"commit to element binding",element:this.element,value:e,options:this.options}),q(this,e)}}const vs=b.litHtmlPolyfillSupportDevMode;vs?.(X,se);(b.litHtmlVersions??=[]).push("3.3.1");b.litHtmlVersions.length>1&&queueMicrotask(()=>{J("multiple-versions","Multiple versions of Lit loaded. Loading multiple versions is not recommended.")});const re=(t,e,s)=>{if(e==null)throw new TypeError(`The container to render into may not be ${e}`);const i=Xt++,n=s?.renderBefore??e;let r=n._$litPart$;if(c&&c({kind:"begin render",id:i,value:t,container:e,options:s,part:r}),r===void 0){const o=s?.renderBefore??null;n._$litPart$=r=new se(e.insertBefore(Q(),o),o,void 0,s??{})}return r._$setValue(t),c&&c({kind:"end render",id:i,value:t,container:e,options:s,part:r}),r};re.setSanitizer=ts,re.createSanitizer=we,re._testOnlyClearSanitizerFactoryDoNotCallOrElse=ss;const Ps=(t,e)=>t,k=globalThis;let mt;k.litIssuedWarnings??=new Set,mt=(t,e)=>{e+=` See https://lit.dev/msg/${t} for more information.`,!k.litIssuedWarnings.has(e)&&!k.litIssuedWarnings.has(t)&&(console.warn(e),k.litIssuedWarnings.add(e))};class $ extends R{constructor(){super(...arguments),this.renderOptions={host:this},this.__childPart=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const s=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this.__childPart=re(s,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this.__childPart?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this.__childPart?.setConnected(!1)}render(){return A}}$._$litElement$=!0;$[Ps("finalized")]=!0;k.litElementHydrateSupport?.({LitElement:$});const Ss=k.litElementPolyfillSupportDevMode;Ss?.({LitElement:$});(k.litElementVersions??=[]).push("4.2.1");k.litElementVersions.length>1&&queueMicrotask(()=>{mt("multiple-versions","Multiple versions of Lit loaded. Loading multiple versions is not recommended.")});const N=t=>(e,s)=>{s!==void 0?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)};let ft;globalThis.litIssuedWarnings??=new Set,ft=(t,e)=>{e+=` See https://lit.dev/msg/${t} for more information.`,!globalThis.litIssuedWarnings.has(e)&&!globalThis.litIssuedWarnings.has(t)&&(console.warn(e),globalThis.litIssuedWarnings.add(e))};const Cs=(t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0},Es={attribute:!0,type:String,converter:ae,reflect:!1,hasChanged:xe},Ms=(t=Es,e,s)=>{const{kind:i,metadata:n}=s;n==null&&ft("missing-class-metadata",`The class ${e} is missing decorator metadata. This could mean that you're using a compiler that supports decorators but doesn't support decorator metadata, such as TypeScript 5.1. Please update your compiler.`);let r=globalThis.litPropertyMetadata.get(n);if(r===void 0&&globalThis.litPropertyMetadata.set(n,r=new Map),i==="setter"&&(t=Object.create(t),t.wrapped=!0),r.set(s.name,t),i==="accessor"){const{name:o}=s;return{set(a){const l=e.get.call(this);e.set.call(this,a),this.requestUpdate(o,l,t)},init(a){return a!==void 0&&this._$changeProperty(o,void 0,t,a),a}}}else if(i==="setter"){const{name:o}=s;return function(a){const l=this[o];e.call(this,a),this.requestUpdate(o,l,t)}}throw new Error(`Unsupported decorator location: ${i}`)};function Ne(t){return(e,s)=>typeof s=="object"?Ms(t,e,s):Cs(t,e,s)}function y(t){return Ne({...t,state:!0,attribute:!1})}const Ts=(t,e,s)=>(s.configurable=!0,s.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(t,e,s),s);globalThis.litIssuedWarnings??=new Set;function ne(t,e){return((s,i,n)=>{const r=o=>o.renderRoot?.querySelector(t)??null;return Ts(s,i,{get(){return r(this)}})})}const gt={ATTRIBUTE:1,CHILD:2},yt=t=>(...e)=>({_$litDirective$:t,values:e});class _t{constructor(e){}get _$isConnected(){return this._$parent._$isConnected}_$initialize(e,s,i){this.__part=e,this._$parent=s,this.__attributeIndex=i}_$resolve(e,s){return this.update(e,s)}update(e,s){return this.render(...s)}}const xs=1;class De extends _t{constructor(e){if(super(e),this._value=g,e.type!==gt.CHILD)throw new Error(`${this.constructor.directiveName}() can only be used in child bindings`)}render(e){if(e===g||e==null)return this._templateResult=void 0,this._value=e;if(e===A)return e;if(typeof e!="string")throw new Error(`${this.constructor.directiveName}() called with a non-string value`);if(e===this._value)return this._templateResult;this._value=e;const s=[e];return s.raw=s,this._templateResult={_$litType$:this.constructor.resultType,strings:s,values:[]}}}De.directiveName="unsafeHTML";De.resultType=xs;const S=yt(De),H=Rt,Rs=Symbol("config"),ks=Symbol("state"),As=Symbol("player"),Ns=Symbol("context"),Ds=`<dialog id="optionsDialog">
  <form id="optionsForm" method="dialog">
    <label for="fowInput">
      Fog of War
      <input name="fow" type="checkbox" role="switch" checked />
    </label>

    <label for="numSystemsInput">
      Bubble Size
      <input name="numSystems" min="0" max="4" step="1" type="range" list="steplist">
      <datalist id="steplist">
        <option value="48">Tiny</option>
        <option value="96"></option>
        <option value="192">Med</option>
        <option value="384"></option>
        <option value="768">Large</option>
      </datalist>
    </label>

    <p />&nbsp;
    <p />
    <button id="optionsOkButton">OK</button>
    <button id="optionsCancelButton" type="reset">Reset</button>
  </form>
</dialog>`,Os=`<!-- @license lucide-static v0.562.0 - ISC -->
<svg
  class="lucide lucide-play"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
</svg>
`,Ls=`<!-- @license lucide-static v0.562.0 - ISC -->
<svg
  class="lucide lucide-cog"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11 10.27 7 3.34" />
  <path d="m11 13.73-4 6.93" />
  <path d="M12 22v-2" />
  <path d="M12 2v2" />
  <path d="M14 12h8" />
  <path d="m17 20.66-1-1.73" />
  <path d="m17 3.34-1 1.73" />
  <path d="M2 12h2" />
  <path d="m20.66 17-1.73-1" />
  <path d="m20.66 7-1.73 1" />
  <path d="m3.34 17 1.73-1" />
  <path d="m3.34 7 1.73 1" />
  <circle cx="12" cy="12" r="2" />
  <circle cx="12" cy="12" r="8" />
</svg>
`,Is=`<!-- @license lucide-static v0.562.0 - ISC -->
<svg
  class="lucide lucide-plus"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 12h14" />
  <path d="M12 5v14" />
</svg>
`,Us=`<!-- @license lucide-static v0.562.0 - ISC -->
<svg
  class="lucide lucide-bot"
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 8V4H8" />
  <rect width="16" height="12" x="4" y="8" rx="2" />
  <path d="M2 14h2" />
  <path d="M20 14h2" />
  <path d="M15 13v2" />
  <path d="M9 13v2" />
</svg>
`,bt=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
</svg>`,wt=`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord" viewBox="0 0 16 16">
  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
</svg>`;function Oe(t){return t.name==="PartykitGameManager"}function Pe(t){return t.name==="PlayroomGameManager"}var Vs=Object.defineProperty,Hs=Object.getOwnPropertyDescriptor,$t=t=>{throw TypeError(t)},M=(t,e,s,i)=>{for(var n=i>1?void 0:i?Hs(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&Vs(e,s,n),n},Ws=(t,e,s)=>e.has(t)||$t("Cannot "+s),zs=(t,e,s)=>e.has(t)?$t("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,s),it=(t,e,s)=>(Ws(t,e,"access private method"),s),oe,vt,Pt;const z=5;let C=class extends ${constructor(){super(...arguments),zs(this,oe)}async connectedCallback(){super.connectedCallback(),it(this,oe,vt).call(this),it(this,oe,Pt).call(this)}createRenderRoot(){return this}render(){return h`
      <dialog id="startDialog" closedby="none">
        <start-screen
          @newGameClicked=${this.onNewGame}
          @joinRoomClicked=${t=>this.onJoinRoom(t.detail.roomCode)}
        ></start-screen>
      </dialog>
      <dialog id="matchLobby" closedby="none">
        <match-lobby @startClicked=${this.onStart}></match-lobby>
      </dialog>
      <dialog id="endDialog">
        <p id="endMessage"></p>
        <form method="dialog">
          <button id="restartButton">Yes</button>
        </form>
      </dialog>
      <dialog id="helpDialog">${this.renderHelp()}</dialog>
      ${S(Ds)}
      <game-canvas id="app"></game-canvas>
      <tick-box tick="${this.context?.tick}"></tick-box>
      <leaderboard-element></leaderboard-element>
      <message-box></message-box>
      <button id="helpButton" @click=${this.showHelp}>?</button>
    `}renderHelp(){return h`<article>
      <h2>Introduction</h2>

      <p>
        This is a simple strategy game where you control a number of star
        systems and try to conquer the the Bubble. The Bubble is a cluster of
        star systems connected by hyperspace lanes. You start with one system
        and must expand your control by sending ships to capture other systems.
      </p>

      <h3>Gameplay</h3>
      <ul>
        <li>
          The game is played in real-time, with each turn lasting 1 second.
        </li>
        <li>You begin the game controlling one system, your homeworld.</li>
        <li>
          Each turn, your homeworld and any other inhabited systems you control,
          will produce an additional ship.
        </li>
        <li>You can send these ships to other systems to capture them.</li>
        <li>
          Each controlled system receives an additional ship each 25 turns.
        </li>
        <li>
          To transfer ships, left click on a system you control and then right
          click on a target system.
        </li>
        <li>
          This will send all available ships, less one, from the source system
          to the target system.
        </li>
        <li>
          Right click on the hyperspace lane between the systems to send half of
          the available ships.
        </li>
        <li>
          If the target system is uninhabited, you will capture it
          automatically.
        </li>
        <li>
          If the target system is controlled by another player, a battle will
          ensue.
        </li>
        <li>
          The player with the most ships on the target system after all ships
          have arrived will take control of the system.
        </li>
      </ul>
      <h3>Objective</h3>
      <p>
        The goal is to eliminate all other player's homeworlds and control the
        entire Bubble.
      </p>

      ${this.renderLinks()}

      <form method="dialog">
        <button>Exit</button>
      </form>
    </article>`}renderLinks(){return h`<p>
        <a href="https://github.com/Hypercubed/starz">
          ${S(bt)}
        </a>
        <a href="https://discord.gg/vnJxSCwfYY">
          ${S(wt)}
        </a>
        </p>`}showStartDialog(){this.startDialog?.showModal()}onStart(){this.matchLobby.close(),this.gameManager.start()}async onNewGame(){this.startDialog.close(),this.matchLobby.showModal(),this.gameManager.waiting()}onJoinRoom(t){this.startDialog.close(),t&&(Pe(this.gameManager)?this.gameManager.waiting(t):this.gameManager.waiting(),this.matchLobby.showModal())}async onKeyup(t){const e=t.target?.tagName;if(!(e==="INPUT"||e==="TEXTAREA")){switch(t.key){case"?":this.showHelp();return;case"Escape":kt(),_();return;case"x":{if(!t.ctrlKey)return;this.gameManager.quit();return}}if(At&&t.altKey){t.preventDefault();const{S:s,C:i,E:n}=globalThis.gameManager.getFnContext();switch(t.code){case"KeyC":for(const r of s.world.systemMap.values())r.ownerId===i.playerId&&(r.ships*=2);_();return;case"KeyR":Nt(s),_();return;case"NumpadAdd":case"Equal":{const r=Math.min(16,i.config.timeScale*2);globalThis.gameManager.setConfig({timeScale:r}),n.emit("LOG",{message:`Time scale increased to ${i.config.timeScale}x`});return}case"NumpadSubtract":case"Minus":{const r=Math.max(.25,i.config.timeScale/2);globalThis.gameManager.setConfig({timeScale:r}),n.emit("LOG",{message:`Time scale decreased by ${i.config.timeScale}x`});return}}}}}async onKeypress(t){const e=t.target?.tagName;if(!(e==="INPUT"||e==="TEXTAREA"))switch(t.code){case"Space":"pauseToggle"in globalThis.gameManager&&globalThis.gameManager.pauseToggle();return;case"Equal":case"NumpadAdd":We(1.2),_();return;case"Minus":case"NumpadSubtract":We(.8),_();return;case"KeyW":W([0,z]),_();return;case"KeyA":W([-z,0]),_();return;case"KeyS":W([0,-z]),_();return;case"KeyD":W([z,0]),_();return;case"KeyQ":W([0,0,z]),_();break;case"KeyE":W([0,0,-z]),_();break;case"KeyH":Ve(),_();return;case"KeyC":He.last&&(Ot(He.last),_());return;case"KeyP":Dt(),Ve(),_();return}}showHelp(){this.helpDialog.showModal()}async showEndGame(t){return this.endDialog.showModal(),this.endDialog.querySelector("p#endMessage").textContent=t,new Promise(e=>{this.endDialog.addEventListener("close",()=>e(!0)),this.endDialog.addEventListener("cancel",()=>e(!1))})}};oe=new WeakSet;vt=function(){window.document.addEventListener("keyup",t=>this.onKeyup(t)),window.document.addEventListener("keypress",t=>this.onKeypress(t))};Pt=function(){const t=()=>{this.config=this.gameManager.getConfig(),this.state=this.gameManager.getState(),this.player=this.gameManager.getPlayer(),this.context=this.gameManager.getContext()};t(),this.gameManager.on("GAME_INIT",t),this.gameManager.on("CONFIG_UPDATED",t),this.gameManager.on("STATE_UPDATED",t),this.gameManager.on("GAME_TICK",t),this.gameManager.on("GAME_STARTED",()=>{this.startDialog.close(),this.matchLobby.close()})};M([te({context:H}),Ne({attribute:!1})],C.prototype,"gameManager",2);M([te({context:Rs}),y()],C.prototype,"config",2);M([te({context:ks}),y()],C.prototype,"state",2);M([te({context:As}),y()],C.prototype,"player",2);M([te({context:Ns}),y()],C.prototype,"context",2);M([ne("#helpDialog")],C.prototype,"helpDialog",2);M([ne("#startDialog")],C.prototype,"startDialog",2);M([ne("#matchLobby")],C.prototype,"matchLobby",2);M([ne("#endDialog")],C.prototype,"endDialog",2);C=M([N("app-root")],C);var Bs=Object.defineProperty,js=Object.getOwnPropertyDescriptor,Le=(t,e,s,i)=>{for(var n=i>1?void 0:i?js(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&Bs(e,s,n),n};const qs=ot(".3~s");let de=class extends ${createRenderRoot(){return this}connectedCallback(){super.connectedCallback(),this.gameManager.on("GAME_TICK",()=>this.updateStats()),this.gameManager.on("STATE_UPDATED",()=>this.updateStats())}updateStats(){const t=this.gameManager.getState()?.playerMap;t&&(this.stats=Array.from(t.values()).sort((e,s)=>s.stats.systems-e.stats.systems||s.stats.ships-e.stats.ships))}render(){return h`
      <table id="leaderbox">
        ${this.renderHeader()} ${this.renderBody()}
      </table>
    `}renderBody(){return h`<tbody>
      ${this.stats?.map(e=>h`<tr
            style="--owner-color: ${e.color||null}"
            title="${e.bot?e.bot.name:"Human"}"
            class="${e.isAlive?"":"eliminated"}"
          >
            <td>${" "}${e.name}${" "}</td>
            <td>${" "}${e.stats.systems}${" "}</td>
            <td>${" "}${qs(e.stats.ships)}${" "}</td>
          </tr>`)}
    </tbody>`}renderHeader(){return h`<thead>
        <tr>
          <th>Player</th>
          <th>Systems</th>
          <th>Ships</th>
        </tr>
      </thead>
      <tbody></tbody>`}};Le([G({context:H}),y()],de.prototype,"gameManager",2);Le([y()],de.prototype,"stats",2);de=Le([N("leaderboard-element")],de);var Gs=Object.defineProperty,Fs=Object.getOwnPropertyDescriptor,me=(t,e,s,i)=>{for(var n=i>1?void 0:i?Fs(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&Gs(e,s,n),n};const Ks=ot(".3~s"),B=" ";let ee=class extends ${constructor(){super(...arguments),this.leaderboard=[],this.showMore=!1}createRenderRoot(){return this}async connectedCallback(){super.connectedCallback(),Oe(this.gameManager)&&(this.leaderboard=await this.gameManager.loadLeaderboard(),this.gameManager.on("LEADERBOARD_UPDATED",async({leaderboard:t})=>{this.leaderboard=t}))}render(){return!this.leaderboard||this.leaderboard.length===0?h``:h`
      <table id="leaderbox">
        ${this.renderHeader()} ${this.renderBody()}
      </table>
      ${this.leaderboard.length>5?h` <details @toggle="${this.onOpenMore}">
            <summary>Show More</summary>
          </details>`:""}
    `}renderBody(){return h`<tbody>
      ${this.leaderboard.slice(0,5).map(rt)}
      ${this.showMore?this.leaderboard.slice(5,21).map(rt):""}
    </tbody>`}renderHeader(){return h`<thead>
      <tr>
        <th data-tooltip="Rank" data-placement="right">#</th>
        <th>Name</th>
        <th data-tooltip="Number of Homeworlds Captured" data-placement="left">
          ✶
        </th>
      </tr>
    </thead>`}onOpenMore(){this.showMore=!this.showMore}};me([G({context:H}),y()],ee.prototype,"gameManager",2);me([y()],ee.prototype,"leaderboard",2);me([y()],ee.prototype,"showMore",2);ee=me([N("lobby-leaderboard-element")],ee);function rt(t){const e=t.uid?.slice(0,4)??"";return h`<tr>
    <td>${B}${t.rank}${B}</td>
    <td>${B}${t.name}<span class="short-id">#${e}</span>${B}</td>
    <td>${B}${Ks(t.score)}${B}</td>
  </tr>`}var Ys=Object.defineProperty,Js=Object.getOwnPropertyDescriptor,St=(t,e,s,i)=>{for(var n=i>1?void 0:i?Js(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&Ys(e,s,n),n};let Se=class extends ${constructor(){super(...arguments),this.tick=0}createRenderRoot(){return this}render(){const t=~~(this.tick/2),e=this.tick%2===1?".":"";return h`${t}${e}`}};St([Ne({type:Number})],Se.prototype,"tick",2);Se=St([N("tick-box")],Se);const Qs=`<div class="lore">
  <p>
    Nobody knows why <i>The Bubble</i> exists, or who built the lattice
    of hyperspace lanes threading its hundreds of star systems together
    like a cosmic web. Its discovery was accidental - a distortion
    ripple detected on the edge of settled space, leading explorers to
    the shimmering boundary of a region where physics seemed... wrong.
  </p>
  <p>
    What <i>is</i> known is this: control of <i>The Bubble</i> means
    control of immense resources and power. Rival factions flood its
    systems, each desperate to carve out their claim before somebody
    else does.
  </p>
  <p>
    As a commander, you are the spearhead of your faction's ambitions:
    tasked with expanding your influence, capturing systems, and
    ultimately dominating <i>The Bubble</i>.
  </p>
</div>

<h3>
  Capture the enemy systems.
  <br />Protect our homeworld.
</h3>`;var Zs=Object.defineProperty,Xs=Object.getOwnPropertyDescriptor,Ct=t=>{throw TypeError(t)},F=(t,e,s,i)=>{for(var n=i>1?void 0:i?Xs(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&Zs(e,s,n),n},en=(t,e,s)=>e.has(t)||Ct("Cannot "+s),tn=(t,e,s)=>e.has(t)?Ct("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,s),sn=(t,e,s)=>(en(t,e,"access private method"),s),Ce,Et;let U=class extends ${constructor(){super(...arguments),tn(this,Ce),this.playerToken="",this.roomCode="",this.keyText="Click to copy your save key. Use this key to restore your player data later."}createRenderRoot(){return this}connectedCallback(){super.connectedCallback();const t=this.getRoomCodeFromURL();t&&(console.log("Found room code in URL:",t),this.roomCode=t),sn(this,Ce,Et).call(this)}getRoomCodeFromURL(){const t=window.location.hash;return new URLSearchParams(t.substring(1)).get("r")??null}render(){const t=nn(this.player,this.playerToken),e=rn(this.player?.id,this.playerToken);return h`
      <lobby-leaderboard-element></lobby-leaderboard-element>
      <article>
        <h1>STARZ!</h1>
        ${this.renderLinks()}
        <small class="version">${"v0.0.10-dev"}</small>

        ${S(Qs)}

        <form method="dialog">
          <div class="grid">
            <div>
              <input
                name="playerName"
                id="playerNameInput"
                type="text"
                .value=${this.player?.name??""}
                @input="${this.onChange}"
                @keydown="${this.onKeydown}"
                placeholder="Name or Save Key"
                minlength="1"
                maxlength="32"
                required
              />
              <small>(Name will be used in leaderboard)</small>
            </div>
            <div>
              <span>${this.player?.name??""}</span
              ><span
                class="short-id"
                data-tooltip="${this.keyText}"
                @click="${()=>this.copyText(e)}"
                >${t}</span
              >
              ${this.player?.score?h`<span>✶ ${this.player.score.score}</span>`:""}
              <br /><small
                >${this.player?.score?.rank?`Rank: ${this.player.score.rank}`:""}</small
              >
            </div>
          </div>

          <button type="button" @click="${this.onNewGame}">
            Create Name Game
          </button>

          ${this.gameManager.isMultiplayer()?h`${this.renderJoinRoom()}`:""}
        </form>
      </article>`}renderJoinRoom(){return h`<hr />
      <input
        type="text"
        id="roomCodeInput"
        placeholder="Enter a Room Code"
        .value=${this.roomCode}
        @input=${t=>this.roomCode=t.target.value}
      />
      <button type="button" @click="${this.onJoinRoom}">Join Room</button>`}renderLinks(){return h`<p>
        <a href="https://github.com/Hypercubed/starz">
          ${S(bt)}
        </a>
        <a href="https://discord.gg/vnJxSCwfYY">
          ${S(wt)}
        </a>
        </p>`}async onNewGame(){await this.gameManager.setConfig({playerName:this.player?.name??""}),this.removeRoomCodeFromURL(),this.dispatchEvent(new Event("newGameClicked"))}removeRoomCodeFromURL(){const t=new URL(window.location.href);t.hash="",window.history.replaceState({},document.title,t.toString())}setRoomCodeInURL(t){const e=new URL(window.location.href);e.hash=`r=${t}`,window.history.replaceState({},document.title,e.toString())}onJoinRoom(){console.log("Joining room",this.roomCode);const t=this.roomCode.trim();this.setRoomCodeInURL(t),this.dispatchEvent(new CustomEvent("joinRoomClicked",{detail:{roomCode:t}}))}async onKeydown(t){t.key==="Enter"&&(t.preventDefault(),await this.setName(t.target.value))}async onChange(t){t.stopPropagation(),t.stopImmediatePropagation(),await this.setName(t.target.value)}async setName(t){if(t=t.trim(),Oe(this.gameManager)&&t.includes("::")){const[e,s]=t.split("::");await this.gameManager.setPlayerAuth(e,s),this.playerToken=s,this.playerNameInput.value=this.gameManager.getPlayer()?.name??""}else this.gameManager.updatePlayerName(t),this.playerNameInput.value=this.gameManager.getPlayer()?.name??""}async copyText(t){try{await navigator.clipboard.writeText(t),this.keyText="Copied to clipboard!",this.requestUpdate(),setTimeout(()=>{this.keyText="Use this key to restore your player data later.  Click to copy.",this.requestUpdate()},2e3)}catch{}}};Ce=new WeakSet;Et=function(){const t=()=>{this.player=this.gameManager.getPlayer(),this.playerToken=this.gameManager.playerToken??""};t(),this.gameManager.on("PLAYER_JOINED",t),this.gameManager.on("PLAYER_REMOVED",t),this.gameManager.on("PLAYER_UPDATED",t),this.gameManager.on("CONFIG_UPDATED",t),this.gameManager.on("GAME_INIT",t),Oe(this.gameManager)&&this.gameManager.on("PLAYER_AUTH_UPDATED",t)};F([G({context:H}),y()],U.prototype,"gameManager",2);F([y()],U.prototype,"player",2);F([y()],U.prototype,"playerToken",2);F([y()],U.prototype,"roomCode",2);F([ne("#playerNameInput")],U.prototype,"playerNameInput",2);U=F([N("start-screen")],U);function nn(t,e){return!t||t.bot||!e?"":t.id?"#"+t.id.slice(0,4):""}function rn(t,e){return!t||!e?"":`${t}::${e}`}var on=Object.defineProperty,an=Object.getOwnPropertyDescriptor,Ie=(t,e,s,i)=>{for(var n=i>1?void 0:i?an(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&on(e,s,n),n};let he=class extends ${constructor(){super(...arguments),this.messages=[]}connectedCallback(){super.connectedCallback(),this.gameManager.on("ADD_MESSAGE",t=>{this.messages=[...this.messages,{message:t,tick:0}]}),this.gameManager.on("CLEAR_MESSAGES",()=>{this.messages=[]})}createRenderRoot(){return this}render(){if(this.messages.length>0){const t=this.messages.slice(-5);return h`${t.map(e=>{const s=~~(e.tick/2),i=e.tick%2===1?".":"";return h`<div>
          ${S(e.message)} <small>${s}${i}</small>
        </div>`})}`}return h``}};Ie([G({context:H}),y()],he.prototype,"gameManager",2);Ie([y()],he.prototype,"messages",2);he=Ie([N("message-box")],he);var ln=Object.defineProperty,cn=Object.getOwnPropertyDescriptor,Mt=(t,e,s,i)=>{for(var n=i>1?void 0:i?cn(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&ln(e,s,n),n};let Ee=class extends ${connectedCallback(){super.connectedCallback(),this.gameManager.on("GAME_STARTED",()=>{Lt(document.getElementById("app"),this.gameManager.getFnContext())}),this.gameManager.on("STATE_UPDATED",()=>{_()}),this.gameManager.on("GAME_TICK",()=>{_()})}createRenderRoot(){return this}render(){return h`
      <canvas></canvas>
      <svg></svg>
    `}};Mt([G({context:H}),y()],Ee.prototype,"gameManager",2);Ee=Mt([N("game-canvas")],Ee);class dn extends _t{constructor(e){if(super(e),e.type!==gt.ATTRIBUTE||e.name!=="class"||e.strings?.length>2)throw new Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(s=>e[s]).join(" ")+" "}update(e,[s]){if(this._previousClasses===void 0){this._previousClasses=new Set,e.strings!==void 0&&(this._staticClasses=new Set(e.strings.join(" ").split(/\s/).filter(n=>n!=="")));for(const n in s)s[n]&&!this._staticClasses?.has(n)&&this._previousClasses.add(n);return this.render(s)}const i=e.element.classList;for(const n of this._previousClasses)n in s||(i.remove(n),this._previousClasses.delete(n));for(const n in s){const r=!!s[n];r!==this._previousClasses.has(n)&&!this._staticClasses?.has(n)&&(r?(i.add(n),this._previousClasses.add(n)):(i.remove(n),this._previousClasses.delete(n)))}return A}}const hn=yt(dn);function un(t,e,s){return t?e(t):s?.(t)}var pn=Object.defineProperty,mn=Object.getOwnPropertyDescriptor,Tt=t=>{throw TypeError(t)},K=(t,e,s,i)=>{for(var n=i>1?void 0:i?mn(e,s):e,r=t.length-1,o;r>=0;r--)(o=t[r])&&(n=(i?o(e,s,n):o(n))||n);return i&&n&&pn(e,s,n),n},fn=(t,e,s)=>e.has(t)||Tt("Cannot "+s),gn=(t,e,s)=>e.has(t)?Tt("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(t):e.set(t,s),yn=(t,e,s)=>(fn(t,e,"access private method"),s),Me,xt;let V=class extends ${constructor(){super(...arguments),gn(this,Me),this.players=[],this.roomCode="",this.isHost=!0}createRenderRoot(){return this}connectedCallback(){super.connectedCallback(),yn(this,Me,xt).call(this)}renderRoomCode(){return h` <p>
      Room Code:
      <span @click="${this.onCopy}" data-tooltip="Click to copy"
        >${this.roomCode}</span
      >
      <br /><small @click="${this.onShare}"
        ><a href="#r=${this.roomCode}">(click to share)</a></small
      >
    </p>`}render(){return h`<article>
      <h4>Welcome, ${this.player?.name??""}</h4>
      ${un(this.roomCode,()=>this.renderRoomCode())}
      <fieldset>
        <legend>Players ${this.players.length}</legend>

        <ul class="player-list">
          ${this.players.map(t=>h`<li
                style="--owner-color: ${t.color||null}"
                class="${hn({bot:!!t.bot,human:!t.bot,clearable:this.isHost&&!!t.bot})}"
                @click="${()=>{this.removeBot(t.id)}}"
              >
                ${t.bot?S(Us):""} ${t.name}<span
                  class="short-id"
                  >${_n(t)}</span
                >
              </li>`)}
        </ul>
      </fieldset>

      ${this.gameManager.isMultiplayer()?this.isHost?h`<p>You are the host.</p>`:h`<p>Waiting for host to start the game...</p>`:""}
      ${this.isHost?this.renderActions():""}
    </article>`}renderActions(){return h`
    <button type="button" @click="${this.onAddBot}">
        ${S(Is)} Add Bot
      </button>
      <button type="button" @click="${this.onPlay}">
        ${S(Os)}
      </button>
      <button type="button" @click="${this.onOptions}">
        ${S(Ls)}
      </button></article>`}removeBot(t){this.isHost&&this.gameManager.removeBot(t)}async onAddBot(){this.gameManager.addBot()}async onPlay(){this.dispatchEvent(new Event("startClicked"))}async onOptions(){if(await this.showOptions()){const e=document.getElementById("optionsForm"),s=new FormData(e),i=globalThis.gameManager,n=+s.get("numBots"),r=s.get("playerName"),o=s.get("fow")==="on",a=+s.get("numSystems");i.setConfig({numBots:n,playerName:r,fow:o,numSystems:48*2**a})}}showOptions(){const t=document.getElementById("optionsDialog");return t.showModal(),new Promise(e=>{t.addEventListener("close",()=>e(!0)),t.addEventListener("cancel",()=>e(!1))})}async onCopy(t){if(t.preventDefault(),navigator.clipboard){const e=t.target,s=e.getAttribute("data-tooltip")||"";await navigator.clipboard.writeText(this.roomCode),e.setAttribute("data-tooltip","Copied to clipboard!"),setTimeout(()=>{e.setAttribute("data-tooltip",s)},2e3)}}async onShare(t){t.preventDefault(),navigator.share&&navigator.share({title:"Starz.io Game Lobby",url:window.location.href})}};Me=new WeakSet;xt=function(){const t=()=>{this.players=Array.from(this.gameManager.getState().playerMap.values()),this.player=this.gameManager.getPlayer(),Pe(this.gameManager)&&(this.isHost=this.gameManager.isHost())};t(),this.gameManager.on("PLAYER_REMOVED",()=>t),this.gameManager.on("PLAYER_JOINED",t),this.gameManager.on("PLAYER_REMOVED",t),this.gameManager.on("PLAYER_UPDATED",t),this.gameManager.on("CONFIG_UPDATED",t),this.gameManager.on("GAME_INIT",t),Pe(this.gameManager)&&this.gameManager.on("ROOM_CREATED",({roomId:e,isHost:s})=>{this.roomCode=e,this.isHost=s})};K([G({context:H}),y()],V.prototype,"gameManager",2);K([y()],V.prototype,"player",2);K([y()],V.prototype,"players",2);K([y()],V.prototype,"roomCode",2);K([y()],V.prototype,"isHost",2);V=K([N("match-lobby")],V);function _n(t){return!t||t.bot?"":t.id?"#"+t.id.slice(0,4):""}async function bn(){return await Vt(async()=>{const{LocalGameManager:t}=await import("./local-DmtFPsBk.js");return{LocalGameManager:t}},__vite__mapDeps([0,1]),import.meta.url).then(({LocalGameManager:t})=>new t)}const Ue=document.createElement("app-root"),fe=await bn();globalThis.gameManager=fe;Ue.gameManager=fe;document.body.appendChild(Ue);fe.mount(Ue);console.log("starz.io version v0.0.10-dev");fe.connect();
