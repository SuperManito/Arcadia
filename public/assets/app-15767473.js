import{_ as C}from"./app-e7833723.js";import{aN as D,a6 as m,aG as v,al as p,G as L,h as V,y as d,a7 as _,a8 as o,a9 as s,F as i,aJ as M,an as N,aS as R,aW as S,aY as H,aH as W,aq as z,aU as F,b5 as G,b9 as U}from"./vendor-c495fdf6.js";import{b as j,n as q,e as A}from"./app-b60428ff.js";import"./app-ea00c288.js";import"./app-25ce29fa.js";import"./app-6e808beb.js";import"./vendor-8fb801c2.js";const J={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"};function Y(b,c){return m(),v("svg",J,c[0]||(c[0]=[p("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12.5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8M7 20h4m-2-4v4m11 1l2-2l-2-2m-3 0l-2 2l2 2"},null,-1)]))}const K=D({name:"tabler-device-desktop-code",render:Y}),O={class:"terminal-page",style:{height:"100%",width:"100%"}},Q={style:{"font-family":"var(--app-font-family)"}},X=["src"],Z=L({__name:"index",setup(b){const{t:c}=j(),h=V(()=>`/api/shell?token=${q()}`),f=d(),u=d(1),r=d("1"),a=d([{value:"1",label:"1",removable:!1}]);function g(){a.value.length===u.value?u.value+=1:u.value=a.value.length+1;const t=Number.parseInt(a.value[a.value.length-1].value)+1;a.value.push({value:`${t}`,label:`${t}`,removable:!0}),r.value=`${t}`}function y({value:t,index:e}){if(e<0)return!1;a.value.splice(e,1),a.value.length!==0&&r.value===t&&(r.value=a.value[Math.max(e-1,0)].value)}function k(t){const e=f.value[t-1].contentWindow;w(e),x(e)}function w(t){const e=t.document,n=e.createElement("style");n.id="stylePatch",n.innerHTML=`
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
`,e.getElementById("scriptPatch")||e.body.appendChild(n)}return(t,e)=>{const n=K,P=F,T=G,E=U,$=S,B=H,I=C;return m(),_(I,{"content-full":"","no-header":""},{default:o(()=>[p("div",O,[s(B,{"global-config":{animation:{exclude:["ripple"]}}},{default:o(()=>[s($,{modelValue:i(r),"onUpdate:modelValue":e[1]||(e[1]=l=>M(r)?r.value=l:null),style:{height:"100%",width:"100%","border-radius":"6px"},addable:!0,onAdd:g,onRemove:y},{default:o(()=>[(m(!0),v(R,null,N(i(a),l=>(m(),_(E,{key:l.value,style:{height:"100%",width:"100%",padding:"0"},value:l.value,label:l.label,removable:l.removable,"destroy-on-hide":!1},{label:o(()=>[s(T,{style:{gap:"4px"}},{default:o(()=>[s(P,{size:16},{default:o(()=>[s(n,{style:{"vertical-align":"-0.2em"}})]),_:1}),p("span",Q,W(`${i(c)("page.terminal.tabLabel")} ${l.label}`),1)]),_:2},1024)]),default:o(()=>[s(z,{name:"fade",mode:"out-in",appear:""},{default:o(()=>[p("iframe",{ref_for:!0,ref_key:"frameRef",ref:f,src:i(h),style:{height:"100%",width:"100%"},onLoad:e[0]||(e[0]=ee=>k(i(u)))},null,40,X)]),_:1})]),_:2},1032,["value","label","removable"]))),128))]),_:1},8,["modelValue"])]),_:1})])]),_:1})}}}),ie=A(Z,[["__scopeId","data-v-c277f211"]]);export{ie as default};
