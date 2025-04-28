import{_ as V}from"./app-564c9d98.js";import{az as C,aq as v,T as m,a5 as p,G as D,h as L,A as d,S as _,V as o,W as s,aE as M,aF as R,at as S,F as i,aG as H,a7 as N,aH as W,ab as z,aM as F,aw as A,as as G}from"./vendor-ca0e89fa.js";import{b as j,k as q,e as U}from"./app-dbd4b5f0.js";import"./app-40fcbbd5.js";import"./app-240cd649.js";import"./vendor-6c6d1442.js";const J={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"};function K(b,c){return m(),v("svg",J,c[0]||(c[0]=[p("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12.5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8M7 20h4m-2-4v4m11 1l2-2l-2-2m-3 0l-2 2l2 2"},null,-1)]))}const O=C({name:"tabler-device-desktop-code",render:K}),Q={class:"terminal-page",style:{height:"100%",width:"100%"}},X={style:{"font-family":"var(--app-font-family)"}},Y=["src"],Z=D({__name:"index",setup(b){const{t:c}=j(),h=L(()=>`/api/shell?token=${q()}`),f=d(),u=d(1),r=d("1"),a=d([{value:"1",label:"1",removable:!1}]);function g(){a.value.length===u.value?u.value+=1:u.value=a.value.length+1;const t=Number.parseInt(a.value[a.value.length-1].value)+1;a.value.push({value:`${t}`,label:`${t}`,removable:!0}),r.value=`${t}`}function y({value:t,index:e}){if(e<0)return!1;a.value.splice(e,1),a.value.length!==0&&r.value===t&&(r.value=a.value[Math.max(e-1,0)].value)}function k(t){const e=f.value[t-1].contentWindow;w(e),x(e)}function w(t){const e=t.document,n=e.createElement("style");n.id="stylePatch",n.innerHTML=`
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
`,e.getElementById("scriptPatch")||e.body.appendChild(n)}return(t,e)=>{const n=O,P=A,T=F,E=W,$=R,B=M,I=V;return m(),_(I,{"content-full":"","no-header":""},{default:o(()=>[p("div",Q,[s(B,{"global-config":{animation:{exclude:["ripple"]}}},{default:o(()=>[s($,{modelValue:i(r),"onUpdate:modelValue":e[1]||(e[1]=l=>S(r)?r.value=l:null),style:{height:"100%",width:"100%","border-radius":"6px"},addable:!0,onAdd:g,onRemove:y},{default:o(()=>[(m(!0),v(H,null,N(i(a),l=>(m(),_(E,{key:l.value,style:{height:"100%",width:"100%",padding:"0"},value:l.value,label:l.label,removable:l.removable,"destroy-on-hide":!1},{label:o(()=>[s(T,{style:{gap:"4px"}},{default:o(()=>[s(P,{size:16},{default:o(()=>[s(n,{style:{"vertical-align":"-0.2em"}})]),_:1}),p("span",X,G(`${i(c)("page.terminal.tabLabel")} ${l.label}`),1)]),_:2},1024)]),default:o(()=>[s(z,{name:"fade",mode:"out-in",appear:""},{default:o(()=>[p("iframe",{ref_for:!0,ref_key:"frameRef",ref:f,src:i(h),style:{height:"100%",width:"100%"},onLoad:e[0]||(e[0]=ee=>k(i(u)))},null,40,Y)]),_:1})]),_:2},1032,["value","label","removable"]))),128))]),_:1},8,["modelValue"])]),_:1})])]),_:1})}}}),se=U(Z,[["__scopeId","data-v-c277f211"]]);export{se as default};
