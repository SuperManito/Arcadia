import{_ as ae,a as se,b as ie}from"./zoom-out-line-D8IMBg4W.js";import{a7 as a,aK as Z,av as p,I as re,A as S,r as ce,K as ue,u as n,a8 as s,a9 as e,aa as o,aL as d,aS as L,aG as F,aF as O,az as G,aT as pe,ap as _e,b3 as ge,aE as fe,co as de,bc as me,aU as ye,bJ as ve,b7 as he,b4 as we,bh as be,bj as ke,bE as xe,bF as ze}from"./vendor-CVUNLYN4.js";import{I as Ce}from"./Icon-ljQHnwJa.js";import{_ as Le,a as Fe}from"./fullscreen-CYCx4MyE.js";import{c as Ie,a as $e}from"./index-BW0Kz9QR.js";import{u as Ne}from"./useAppInject-Dal6O7k8.js";import{g as J,i as Se}from"./file-BQviJjRi.js";import{c as Be}from"./index-wCKpV3TT.js";const De={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"},He=p("path",{fill:"currentColor",d:"M13.5 8H12v5l4.28 2.54l.72-1.21l-3.5-2.08zM13 3a9 9 0 0 0-9 9H1l3.96 4.03L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.9 8.9 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9"},null,-1),Me=[He];function Re(Q,B){return a(),Z("svg",De,[...Me])}const Te={name:"mdi-history",render:Re},Ee=p("svg",{viewBox:"0 0 12 12",version:"1.1",xmlns:"http://www.w3.org/2000/svg","aria-hidden":"true"},[p("g",{stroke:"none","stroke-width":"1",fill:"none","fill-rule":"evenodd"},[p("g",{fill:"currentColor","fill-rule":"nonzero"},[p("path",{d:"M2.08859116,2.2156945 L2.14644661,2.14644661 C2.32001296,1.97288026 2.58943736,1.95359511 2.7843055,2.08859116 L2.85355339,2.14644661 L6,5.293 L9.14644661,2.14644661 C9.34170876,1.95118446 9.65829124,1.95118446 9.85355339,2.14644661 C10.0488155,2.34170876 10.0488155,2.65829124 9.85355339,2.85355339 L6.707,6 L9.85355339,9.14644661 C10.0271197,9.32001296 10.0464049,9.58943736 9.91140884,9.7843055 L9.85355339,9.85355339 C9.67998704,10.0271197 9.41056264,10.0464049 9.2156945,9.91140884 L9.14644661,9.85355339 L6,6.707 L2.85355339,9.85355339 C2.65829124,10.0488155 2.34170876,10.0488155 2.14644661,9.85355339 C1.95118446,9.65829124 1.95118446,9.34170876 2.14644661,9.14644661 L5.293,6 L2.14644661,2.85355339 C1.97288026,2.67998704 1.95359511,2.41056264 2.08859116,2.2156945 L2.14644661,2.14644661 L2.08859116,2.2156945 Z"})])])],-1),Ue={key:1},Ge=re({__name:"viewHistory",setup(Q,{expose:B}){const{message:I}=Ie(),{t:u}=$e(),{getIsMobile:D}=Ne(),$=S(null),m=S(D.value?14:16),N=S(null),_=ce({show:!1,loading:!0,log:"",showFullScreen:!1,currentPath:"",selectData:[]}),{show:y,loading:v,log:x,showFullScreen:C,currentPath:h,selectData:w}=ue(_),X=async i=>{_.showFullScreen=!1,_.currentPath="",_.selectData=[],_.log="";try{_.loading=!0,await Y(i.logPath,i.isRunning)}finally{_.loading=!1}},Y=async(i,t)=>{try{if(await ee(i),w.value.length){_.show=!0,w.value.sort((l,r)=>{const f=l.name.replace(".log","").replace(/-/g,"");return r.name.replace(".log","").replace(/-/g,"")-f});const g=t&&w.value[1]?w.value[1]:w.value[0];h.value=g.path;const b=await J({path:g.path});_.log=b}else I.warning(u("page.cron.viewHistory.noLatestMsg"))}catch(g){console.error(g)}},H=async(i,t)=>{if(!t.disabled){const g=await J({path:t.value});_.log=g,h.value=i}},ee=async i=>{const t=await Se({path:i}),g=ne(t.children);w.value=g.slice().reverse()},ne=i=>((b=>{b.length&&b.forEach(l=>{if(l.type===1){const r=l.name;if(r){const f=r.substring(r.lastIndexOf(".")+1),z=Be[f]||{};Object.assign(l,{value:l.path,label:r.replace(/\.log$/,""),language:"plaintext",disabled:z.icon&&z.disabled||!1})}}})})(i),i=(b=>b.filter(l=>!l.disabled))(i),i),k=i=>{switch(i){case"enlarge":m.value<20?m.value+=1:m.value===20&&I.info(u("page.log.enlargeMaxMsg"));break;case"narrow":m.value>12?m.value-=1:m.value===12&&I.info(u("page.log.narrowMinMsg"));break;case"bottom":const t=$.value?.$el?.clientHeight;N.value?.scrollTo({top:t,behavior:"smooth"});break;case"fullScreen":_.showFullScreen=!_.showFullScreen;break}};return B({open:X}),(i,t)=>{const g=Le,b=Fe,l=pe,r=_e,f=ge,z=fe,M=Ce,R=Te,T=de,E=ae,U=se,A=ie,P=me,V=ye,j=ve,W=he,q=we,K=be,oe=ke,te=xe,le=ze;return n(D)?(a(),s(le,{key:1,show:n(y),"onUpdate:show":t[12]||(t[12]=c=>F(y)?y.value=c:null),height:"calc(var(--vh) * 100)",width:"100vw",placement:"bottom","auto-focus":!1,"mask-closable":!1},{default:e(()=>[o(te,{"header-style":"height: 60px; padding: 16px 12px","body-content-style":"padding: 4px 0 4px 8px; overscroll-behavior: none","footer-style":"padding: 16px 24px 24px 24px"},{header:e(()=>[o(V,{style:{gap:"4px"}},{default:e(()=>[n(v)?(a(),s(M,{key:0,icon:"svg-spinners:pulse-2",size:26,color:"var(--app-primary-color)",style:{"vertical-align":"0"}})):(a(),s(l,{key:1,size:28,color:"var(--app-primary-color)"},{default:e(()=>[o(R,{style:{"vertical-align":"0"}})]),_:1})),o(T,{value:n(h),"onUpdate:value":t[7]||(t[7]=c=>F(h)?h.value=c:null),class:"max-w-190px w-190px ml-1",size:"small",loading:n(v),"consistent-menu-width":!1,options:n(w),"on-update:value":H},null,8,["value","loading","options"]),!n(v)&&n(x)?(a(),s(P,{key:2,style:{"padding-left":"8px"}},{default:e(()=>[o(f,{"show-arrow":!1,trigger:"hover",delay:500},{trigger:e(()=>[o(r,{strong:"",secondary:"",size:"small",focusable:!1,onClick:t[8]||(t[8]=c=>k("narrow"))},{icon:e(()=>[o(l,{size:18},{default:e(()=>[o(E,{style:{"vertical-align":"baseline"}})]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(u)("page.cron.viewHistory.narrowButtonTips")),1)]),_:1}),o(f,{"show-arrow":!1,trigger:"hover",delay:500},{trigger:e(()=>[o(r,{strong:"",secondary:"",size:"small",focusable:!1,onClick:t[9]||(t[9]=c=>k("enlarge"))},{icon:e(()=>[o(l,{size:18},{default:e(()=>[o(U,{style:{"vertical-align":"baseline"}})]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(u)("page.cron.viewHistory.enlargeButtonTips")),1)]),_:1}),o(f,{"show-arrow":!1,trigger:"click",delay:500},{trigger:e(()=>[o(r,{strong:"",secondary:"",size:"small",focusable:!1,onClick:t[10]||(t[10]=c=>k("bottom"))},{icon:e(()=>[o(l,{size:18},{default:e(()=>[o(A,{style:{"vertical-align":"baseline"}})]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(u)("file.bottom.button")),1)]),_:1})]),_:1})):O("",!0)]),_:1})]),default:e(()=>[o(K,{ref_key:"logInstWrapRef",ref:N,"native-scrollbar":!0,style:{width:"100%",height:"100%","background-color":"transparent"}},{default:e(()=>[n(v)?(a(),s(j,{key:0,text:"",repeat:33,height:"16px"})):(a(),Z("div",Ue,[n(x)?(a(),s(q,{key:1,ref_key:"logInstRef",ref:$,log:n(x),"line-height":1.5,"font-size":n(m),language:"naive-log",style:{width:"100%",height:"100%"}},null,8,["log","font-size"])):(a(),s(W,{key:0},{default:e(()=>[L(d(n(u)("common.noData")),1)]),_:1}))]))]),_:1},512)]),footer:e(()=>[o(r,{block:"",strong:"",secondary:"",type:"primary",focusable:!1,onClick:t[11]||(t[11]=c=>y.value=!1)},{default:e(()=>[L(d(n(u)("component.modal.close")),1)]),_:1})]),_:1})]),_:1},8,["show"])):(a(),s(oe,{key:0,show:n(y),"onUpdate:show":t[6]||(t[6]=c=>F(y)?y.value=c:null),preset:"dialog","auto-focus":!1,style:G({width:n(C)?"calc(-20px + 100vw)":"600px"})},{close:e(()=>[o(z,null,{default:e(()=>[o(f,{"show-arrow":!1,trigger:"hover",delay:500},{trigger:e(()=>[o(r,{size:"tiny",quaternary:"",focusable:!1,style:{padding:"4px"},onClick:t[0]||(t[0]=c=>k("fullScreen"))},{icon:e(()=>[o(l,{size:20,depth:2},{default:e(()=>[n(C)?(a(),s(b,{key:1,style:{"vertical-align":"baseline"}})):(a(),s(g,{key:0,style:{"vertical-align":"baseline"}}))]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(C)?n(u)("layout.header.tooltipExitFull"):n(u)("layout.header.tooltipEntryFull")),1)]),_:1}),o(r,{size:"tiny",quaternary:"",focusable:!1,style:{padding:"4px"},onClick:t[1]||(t[1]=c=>y.value=!1)},{icon:e(()=>[o(l,{size:18,depth:2},{default:e(()=>[Ee]),_:1})]),_:1})]),_:1})]),icon:e(()=>[n(v)?(a(),s(M,{key:0,icon:"svg-spinners:pulse-2",size:24,color:"var(--app-primary-color)",style:{"vertical-align":"0"}})):(a(),s(l,{key:1,size:24},{default:e(()=>[o(R,{style:{"vertical-align":"0"}})]),_:1}))]),header:e(()=>[o(V,null,{default:e(()=>[L(d(n(u)("page.cron.table.history"))+" ",1),o(T,{value:n(h),"onUpdate:value":t[2]||(t[2]=c=>F(h)?h.value=c:null),class:"max-w-190px w-190px",size:"small",loading:n(v),"consistent-menu-width":!1,options:n(w),"on-update:value":H},null,8,["value","loading","options"]),!n(v)&&n(x)?(a(),s(P,{key:0},{default:e(()=>[o(f,{"show-arrow":!1,trigger:"hover",delay:500},{trigger:e(()=>[o(r,{strong:"",secondary:"",size:"small",focusable:!1,onClick:t[3]||(t[3]=c=>k("narrow"))},{icon:e(()=>[o(l,{size:18},{default:e(()=>[o(E,{style:{"vertical-align":"baseline"}})]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(u)("page.cron.viewHistory.narrowButtonTips")),1)]),_:1}),o(f,{"show-arrow":!1,trigger:"hover",delay:500},{trigger:e(()=>[o(r,{strong:"",secondary:"",size:"small",focusable:!1,onClick:t[4]||(t[4]=c=>k("enlarge"))},{icon:e(()=>[o(l,{size:18},{default:e(()=>[o(U,{style:{"vertical-align":"baseline"}})]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(u)("page.cron.viewHistory.enlargeButtonTips")),1)]),_:1}),o(f,{"show-arrow":!1,trigger:"hover",delay:500},{trigger:e(()=>[o(r,{strong:"",secondary:"",size:"small",focusable:!1,onClick:t[5]||(t[5]=c=>k("bottom"))},{icon:e(()=>[o(l,{size:18},{default:e(()=>[o(A,{style:{"vertical-align":"baseline"}})]),_:1})]),_:1})]),default:e(()=>[p("span",null,d(n(u)("file.bottom.button")),1)]),_:1})]),_:1})):O("",!0)]),_:1})]),default:e(()=>[n(v)?(a(),s(j,{key:0,text:"",repeat:27,height:"16px"})):(a(),s(K,{key:1,ref_key:"logInstWrapRef",ref:N,"native-scrollbar":!1,style:G({paddingTop:"1em",width:"100%",backgroundColor:"transparent",height:n(C)?"calc(-120px + 100vh)":"600px"})},{default:e(()=>[p("div",null,[n(x)?(a(),s(q,{key:1,ref_key:"logInstRef",ref:$,log:n(x),"line-height":1.5,"font-size":n(m),language:"naive-log",style:{width:"100%",height:"100%"}},null,8,["log","font-size"])):(a(),s(W,{key:0},{default:e(()=>[L(d(n(u)("common.noData")),1)]),_:1}))])]),_:1},8,["style"]))]),_:1},8,["show","style"]))}}});export{Ge as _};