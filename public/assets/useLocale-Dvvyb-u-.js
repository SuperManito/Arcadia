const __vite__fileDeps=["./en-DzMJWonk.js","./index-BW0Kz9QR.js","./vendor-CVUNLYN4.js","./vendor-CLyFf5IJ.css","./index-nvS2JY3H.css","./zh_CN-BCQd3HlZ.js"],__vite__mapDeps=i=>i.map(i=>__vite__fileDeps[i]);
import{h as s,u as L,_ as u}from"./vendor-CVUNLYN4.js";import{a9 as l,aa as a,ab as c,ac as f,ad as p}from"./index-BW0Kz9QR.js";function i(t){const o=l();a.mode==="legacy"?a.global.locale=t:a.global.locale.value=t,o.setLocaleInfo({locale:t}),p(t)}function P(){const t=l(),o=s(()=>t.getLocale),g=s(()=>t.getShowPicker);async function m(e){const n=a.global;if(L(n.locale)===e)return e;if(c.includes(e))return i(e),e;const r=(await f(Object.assign({"./lang/en.ts":()=>u(()=>import("./en-DzMJWonk.js"),__vite__mapDeps([0,1,2,3,4]),import.meta.url),"./lang/zh_CN.ts":()=>u(()=>import("./zh_CN-BCQd3HlZ.js"),__vite__mapDeps([5,1,2,3,4]),import.meta.url)}),`./lang/${e}.ts`)).default;if(!r)return;const{message:_}=r;return n.setLocaleMessage(e,_),c.push(e),i(e),e}return{getLocale:o,getShowLocalePicker:g,changeLocale:m}}export{P as u};