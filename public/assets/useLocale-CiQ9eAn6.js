const __vite__fileDeps=["./en-Db3TZXKf.js","./index-hO6mdrNR.js","./vendor-CsvKI2kS.js","./vendor-CLyFf5IJ.css","./index-DxYJC5Id.css","./zh_CN-ChKpa3i7.js"],__vite__mapDeps=i=>i.map(i=>__vite__fileDeps[i]);
import{h as s,u as L,_ as u}from"./vendor-CsvKI2kS.js";import{a9 as l,aa as a,ab as c,ac as f,ad as p}from"./index-hO6mdrNR.js";function i(t){const o=l();a.mode==="legacy"?a.global.locale=t:a.global.locale.value=t,o.setLocaleInfo({locale:t}),p(t)}function P(){const t=l(),o=s(()=>t.getLocale),g=s(()=>t.getShowPicker);async function m(e){const n=a.global;if(L(n.locale)===e)return e;if(c.includes(e))return i(e),e;const r=(await f(Object.assign({"./lang/en.ts":()=>u(()=>import("./en-Db3TZXKf.js"),__vite__mapDeps([0,1,2,3,4]),import.meta.url),"./lang/zh_CN.ts":()=>u(()=>import("./zh_CN-ChKpa3i7.js"),__vite__mapDeps([5,1,2,3,4]),import.meta.url)}),`./lang/${e}.ts`,3)).default;if(!r)return;const{message:_}=r;return n.setLocaleMessage(e,_),c.push(e),i(e),e}return{getLocale:o,getShowLocalePicker:g,changeLocale:m}}export{P as u};