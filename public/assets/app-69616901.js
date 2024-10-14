import{_ as I}from"./app-ccbb8a55.js";import{aN as C,a6 as m,aG as v,al as p,G as D,h as L,y as d,a7 as f,a8 as o,a9 as s,F as i,aJ as N,an as M,aS as R,aX as H,aY as S,aT as W,aH as z,aq as F,aU as G,aV as U,b8 as j}from"./vendor-f4e37609.js";import{b as q,n as A,e as J}from"./app-516cf0fd.js";import"./app-dbd1102e.js";import"./app-34fc42c0.js";import"./app-e921add8.js";import"./vendor-5db0929b.js";const X={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"};function Y(b,c){return m(),v("svg",X,c[0]||(c[0]=[p("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12.5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8M7 20h4m-2-4v4m11 1l2-2l-2-2m-3 0l-2 2l2 2"},null,-1)]))}const K=C({name:"tabler-device-desktop-code",render:Y}),O={class:"terminal-page",style:{height:"100%",width:"100%"}},Q=["src"],Z=D({__name:"index",setup(b){const{t:c}=q(),h=L(()=>`/api/shell?token=${A()}`),_=d(),u=d(1),r=d("1"),a=d([{value:"1",label:"1",removable:!1}]);function g(){a.value.length===u.value?u.value+=1:u.value=a.value.length+1;const t=Number.parseInt(a.value[a.value.length-1].value)+1;a.value.push({value:`${t}`,label:`${t}`,removable:!0}),r.value=`${t}`}function y({value:t,index:e}){if(e<0)return!1;a.value.splice(e,1),a.value.length!==0&&r.value===t&&(r.value=a.value[Math.max(e-1,0)].value)}function k(t){const e=_.value[t-1].contentWindow;w(e),x(e)}function w(t){const e=t.document,n=e.createElement("style");n.id="stylePatch",n.innerHTML=`
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
`,e.getElementById("stylePatch")||e.head.appendChild(n)}function x(t){const e=t.document,n=e.createElement("script");n.id="scriptPatch",n.innerHTML=`
  setTimeout(() => {
    const myEvent = new Event('resize')
    window.dispatchEvent(myEvent)
  }, 6000);
`,e.getElementById("scriptPatch")||e.body.appendChild(n)}return(t,e)=>{const n=K,T=G,P=U,E=j,$=H,V=S,B=I;return m(),f(B,{"content-full":"","no-header":""},{default:o(()=>[p("div",O,[s(V,{"global-config":{animation:{exclude:["ripple"]}}},{default:o(()=>[s($,{modelValue:i(r),"onUpdate:modelValue":e[1]||(e[1]=l=>N(r)?r.value=l:null),style:{height:"100%",width:"100%","border-radius":"6px"},addable:!0,onAdd:g,onRemove:y},{default:o(()=>[(m(!0),v(R,null,M(i(a),l=>(m(),f(E,{key:l.value,style:{height:"100%",width:"100%",padding:"0"},value:l.value,label:l.label,removable:l.removable,"destroy-on-hide":!1},{label:o(()=>[s(P,{style:{gap:"4px"}},{default:o(()=>[s(T,{size:16},{default:o(()=>[s(n,{style:{"vertical-align":"-0.2em"}})]),_:1}),W(" "+z(`${i(c)("page.terminal.tabLabel")} ${l.label}`),1)]),_:2},1024)]),default:o(()=>[s(F,{name:"fade",mode:"out-in",appear:""},{default:o(()=>[p("iframe",{ref_for:!0,ref_key:"frameRef",ref:_,src:i(h),style:{height:"100%",width:"100%"},onLoad:e[0]||(e[0]=ee=>k(i(u)))},null,40,Q)]),_:1})]),_:2},1032,["value","label","removable"]))),128))]),_:1},8,["modelValue"])]),_:1})])]),_:1})}}}),ie=J(Z,[["__scopeId","data-v-87272048"]]);export{ie as default};
