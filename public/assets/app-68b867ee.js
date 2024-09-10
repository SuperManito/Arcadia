import{_ as C}from"./app-18f65c91.js";import{aJ as D,a3 as m,aC as v,ah as p,G as I,h as V,y as d,a4 as _,a5 as o,a6 as s,F as i,aF as L,aj as R,aO as M,aT as N,aU as F,aR as H,aP as S,aD as W,am as j,aQ as z,b4 as U}from"./vendor-191e7315.js";import{b as A,m as G,e as J}from"./app-16ee8ad9.js";import"./app-d8a29f50.js";import"./app-9adaac50.js";import"./app-fd53326f.js";import"./vendor-2714f153.js";const O={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"};function Q(b,c){return m(),v("svg",O,c[0]||(c[0]=[p("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",d:"M12.5 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8M7 20h4m-2-4v4m11 1l2-2l-2-2m-3 0l-2 2l2 2"},null,-1)]))}const q=D({name:"tabler-device-desktop-code",render:Q}),K={class:"terminal-page",style:{height:"100%",width:"100%"}},X=["src"],Y=I({__name:"index",setup(b){const{t:c}=A(),h=V(()=>`/api/shell?token=${G()}`),f=d(),u=d(1),r=d("1"),a=d([{value:"1",label:"1",removable:!1}]);function g(){a.value.length===u.value?u.value+=1:u.value=a.value.length+1;const t=Number.parseInt(a.value[a.value.length-1].value)+1;a.value.push({value:`${t}`,label:`${t}`,removable:!0}),r.value=`${t}`}function y({value:t,index:e}){if(e<0)return!1;a.value.splice(e,1),a.value.length!==0&&r.value===t&&(r.value=a.value[Math.max(e-1,0)].value)}function k(t){const e=f.value[t-1].contentWindow;w(e),x(e)}function w(t){const e=t.document,n=e.createElement("style");n.id="stylePatch",n.innerHTML=`
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
`,e.getElementById("scriptPatch")||e.body.appendChild(n)}return(t,e)=>{const n=q,P=z,T=U,E=N,$=F,B=C;return m(),_(B,{"content-full":"","no-header":""},{default:o(()=>[p("div",K,[s($,{"global-config":{animation:{exclude:["ripple"]}}},{default:o(()=>[s(E,{modelValue:i(r),"onUpdate:modelValue":e[1]||(e[1]=l=>L(r)?r.value=l:null),style:{height:"100%",width:"100%","border-radius":"6px"},addable:!0,onAdd:g,onRemove:y},{default:o(()=>[(m(!0),v(M,null,R(i(a),l=>(m(),_(T,{key:l.value,style:{height:"100%",width:"100%",padding:"0"},value:l.value,label:l.label,removable:l.removable,"destroy-on-hide":!1},{label:o(()=>[s(i(H),{style:{gap:"4px"}},{default:o(()=>[s(P,{size:16},{default:o(()=>[s(n,{style:{"vertical-align":"-0.2em"}})]),_:1}),S(" "+W(`${i(c)("page.terminal.tabLabel")} ${l.label}`),1)]),_:2},1024)]),default:o(()=>[s(j,{name:"fade",mode:"out-in",appear:""},{default:o(()=>[p("iframe",{ref_for:!0,ref_key:"frameRef",ref:f,src:i(h),style:{height:"100%",width:"100%"},onLoad:e[0]||(e[0]=Z=>k(i(u)))},null,40,X)]),_:1})]),_:2},1032,["value","label","removable"]))),128))]),_:1},8,["modelValue"])]),_:1})])]),_:1})}}}),se=J(Y,[["__scopeId","data-v-fd09f71f"]]);export{se as default};
