import{_ as P}from"./PageWrapper.vue_vue_type_style_index_0_lang-DleleeUi.js";import{a7 as u,aK as h,av as m,I as B,h as L,A as d,a8 as v,a9 as l,aa as c,ax as V,u as r,aR as D,aG as C,aW as M,aU as R,aS as W,aL as N,aA as S,aT as A,b6 as H}from"./vendor-CsvKI2kS.js";import{a as z,k as U,d as j}from"./index-hO6mdrNR.js";import"./sharp-arrow-back-ios-DPZSNare.js";import"./useDesign-7pXfWKnw.js";import"./useAppInject-BoZf51bk.js";const F={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"},G=m("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12.5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8M7 20h4m-2-4v4m11 1l2-2l-2-2m-3 0l-2 2l2 2"},null,-1),K=[G];function q(f,p){return u(),h("svg",F,[...K])}const J={name:"tabler-device-desktop-code",render:q},O={class:"terminal-page",style:{height:"100%",width:"100%"}},Q=["src"],X=B({__name:"index",setup(f){const{t:p}=z(),b=L(()=>U()),_=d(),i=d(1),s=d("1"),a=d([{value:"1",label:"1",removable:!1}]),g=()=>{a.value.length===i.value?i.value+=1:i.value=a.value.length+1;const t=parseInt(a.value[a.value.length-1].value)+1;a.value.push({value:`${t}`,label:`${t}`,removable:!0}),s.value=`${t}`},k=({value:t,index:e})=>{if(e<0)return!1;a.value.splice(e,1),a.value.length!==0&&s.value===t&&(s.value=a.value[Math.max(e-1,0)].value)},y=t=>{const e=_.value[t-1].contentWindow;w(e),x(e)},w=t=>{const e=t.document,n=e.createElement("style");n.id="stylePatch",n.innerHTML=`
#terminal-container .xterm-viewport {
  overflow-y: auto;
}

/* 整个滚动条 */
::-webkit-scrollbar {
  width: 10px;
  background-color: transparent;
}

/* 滚动条上的滚动滑块 */
::-webkit-scrollbar-thumb {
  background-color: #999999;
  border-radius: 5px;
}

/* 滚动条轨道 */
::-webkit-scrollbar-track {
  background-color: transparent;
}
`,e.getElementById("stylePatch")||e.head.appendChild(n)},x=t=>{const e=t.document,n=e.createElement("script");n.id="scriptPatch",n.innerHTML=`
  setTimeout(() => {
    const myEvent = new Event('resize')
    window.dispatchEvent(myEvent)
  }, 6000);
`,e.getElementById("scriptPatch")||e.body.appendChild(n)};return(t,e)=>{const n=J,T=A,$=H,E=M,I=P;return u(),v(I,{ref:"pageWrapper","content-full":"","no-header":""},{default:l(()=>[m("div",O,[c(E,{modelValue:r(s),"onUpdate:modelValue":e[1]||(e[1]=o=>C(s)?s.value=o:null),style:{height:"100%",width:"100%"},addable:!0,onAdd:g,onRemove:k},{default:l(()=>[(u(!0),h(D,null,V(r(a),o=>(u(),v($,{key:o.value,style:{height:"100%",width:"100%",padding:"0"},value:o.value,label:o.label,removable:o.removable,"destroy-on-hide":!1},{label:l(()=>[c(r(R),{style:{gap:"4px"}},{default:l(()=>[c(T,{size:16},{default:l(()=>[c(n,{style:{"vertical-align":"-0.2em"}})]),_:1}),W(" "+N(`${r(p)("page.terminal.tabLabel")} ${o.label}`),1)]),_:2},1024)]),default:l(()=>[c(S,{name:"fade",mode:"out-in",appear:""},{default:l(()=>[m("iframe",{ref_for:!0,ref_key:"frameRef",ref:_,src:`/api/shell?token=${r(b)}`,style:{height:"100%",width:"100%"},onLoad:e[0]||(e[0]=Y=>y(r(i)))},null,40,Q)]),_:1})]),_:2},1032,["value","label","removable"]))),128))]),_:1},8,["modelValue"])])]),_:1},512)}}}),le=j(X,[["__scopeId","data-v-3d4c0e52"]]);export{le as default};
