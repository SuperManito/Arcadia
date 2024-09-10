import{_ as be}from"./app-1a3e2845.js";import{aJ as ie,a3 as s,aC as N,ah as B,G as ye,y as le,r as he,J as ke,F as e,a4 as u,a5 as l,a6 as t,aP as m,aD as p,aE as L,aj as te,aO as ae,aF as U,as as xe,aQ as we,bl as Ce,aH as ze,ba as Ue,bE as Te,bq as Ee,aY as $e,bu as Pe,bv as Le,aw as Ne,cD as Re,bp as Ve,bJ as Ie,bF as Se,aI as Ae,bD as Be,b6 as Me,aR as Oe,bx as je,by as qe,q as j}from"./vendor-191e7315.js";import{i as ne,j as oe}from"./app-13b90414.js";import{d as De,a as Fe,b as Je,aj as se}from"./app-16ee8ad9.js";import{u as He}from"./app-9adaac50.js";const Ge={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"};function Qe(q,T){return s(),N("svg",Ge,T[0]||(T[0]=[B("path",{fill:"currentColor",d:"M17 14h2v3h3v2h-3v3h-2v-3h-3v-2h3zm-6 2L2 9l9-7l9 7zm0 2.54l1-.79V18c0 .71.12 1.39.35 2L11 21.07l-9-7l1.62-1.26z"},null,-1)]))}const Ye=ie({name:"mdi-layers-plus",render:Qe}),Ke={style:{display:"inline-block"},viewBox:"0 0 24 24",width:"1em",height:"1em"};function We(q,T){return s(),N("svg",Ke,T[0]||(T[0]=[B("path",{fill:"currentColor",d:"M4.63 10.27L3 9l9-7l7.94 6.17l-7.44 7.44l-.5.39zM10 18.94v-.83l.59-.58l.04-.03l-6.01-4.69L3 14.07l7 5.43zm11.7-6.36l-1.28-1.28a.55.55 0 0 0-.77 0l-1 1l2.05 2.05l1-1a.55.55 0 0 0 0-.77M12 21h2.06l6.05-6.07l-2.05-2.05L12 18.94z"},null,-1)]))}const Xe=ie({name:"mdi-layers-edit",render:We}),Ze={style:{"vertical-align":"-5px",padding:"0 2px"}},ol=ye({__name:"editEnv",emits:["ok"],setup(q,{expose:T,emit:ue}){const pe=ue,{getIsMobile:D}=He(),{message:R}=De(),{getThemeColor:re}=Fe(),{t:o}=Je(),f=le([]),M=le(null),v=he({title:"",type:"ordinary",show:!1,model:{},rules:{type:{required:!0,message:o("page.env.table.form.message.no_type"),trigger:["input","blur"]},enable:{required:!0},separator:{required:!1},value:{message:o("page.env.table.form.message.no_value"),trigger:["input","blur"]}},tagLabel:"",tagColor:re.value,showAddTagPopover:!1,isCompositeEnvValue:!1}),{title:O,type:h,show:k,model:i,rules:F,tagLabel:c,tagColor:x,showAddTagPopover:y,isCompositeEnvValue:$}=ke(v),I={onkeydown(r){if(r.key==="Enter")return R.warning(o("page.env.table.form.message.no_enter")),!1}};function J(){return new Promise(r=>{M.value?.validate(async a=>{if(!a)try{const d=v.model,w=v.type==="composite",C=v.type==="composite_value";delete d.update_time,d.id||delete d.id,w&&delete d.envs,C?d.tag_list="":d.tag_list=f.value.length>0?JSON.stringify(f.value):"",d.id?(w?await ne(d):await oe(d),R.success(o("page.env.table.message.edit.ok"))):(w?await ne(d):await oe(d),R.success(o("page.env.table.message.new.ok"))),pe("ok"),r(!0),D&&(k.value=!1)}catch(d){throw new Error(d)}r(!1)}).catch(()=>{})})}function H(){if(!c.value||!x.value){R.warning(o("page.env.editEnv.needInputTagContentMsg"));return}if(f.value.length>0){for(const r of f.value)if(r.label===c.value){R.warning(o("page.env.editEnv.tagExistedMsg"));return}}f.value.push({label:c.value,color:x.value}),c.value="",y.value=!1}function G(r){f.value.splice(r,1)}function Q(r){return{color:j(r).setAlpha(.12).toHex8String(),borderColor:j(r).toHexString(),textColor:j(r).toHexString()}}function de(r,a={},d=0){const w=r==="composite";$.value=r==="composite_value",$.value?v.title=o(`page.env.table.${a?.id?"editValue":"newValue"}`):v.title=o(`page.env.table.${a?.id?"edit":"new"}`);const C=Object.assign({id:null,type:"",description:"",update_time:"",tag_list:"",enable:1},w?{separator:"",envs:0}:{group_id:r==="composite_value"?d:0,remark:"",value:"",sort:0});v.model=xe(C),Object.assign(v.model,a);try{f.value=[];const E=JSON.parse(v.model.tag_list||"['']");Array.isArray(E)&&E.forEach(b=>{!b.label||!b.color||f.value.push(b)})}catch{v.model.tag_list=""}v.type=r,v.show=!0}return T({open:de}),(r,a)=>{const d=Xe,w=Ye,C=we,E=Ce,b=ze,g=Ue,_=Te,z=Ee,S=$e,A=Pe,Y=Le,K=be,P=Ne,W=Re,X=Ve,Z=Ie,ee=Se,me=Ae,_e=Be,ve=Me,ge=Oe,fe=je,ce=qe;return e(D)?(s(),u(ce,{key:1,show:e(k),"onUpdate:show":a[24]||(a[24]=n=>U(k)?k.value=n:null),height:"calc(var(--vh) * 100)",width:"100vw",placement:"right","auto-focus":!1,"mask-closable":!1},{default:l(()=>[t(fe,{closable:"","header-style":"height: 60px; padding: 16px 12px","body-content-style":"padding: 4px 12px","footer-style":"padding: 16px 24px"},{header:l(()=>[t(ge,{style:{gap:"4px"}},{default:l(()=>[t(C,{size:26,color:"var(--app-primary-color)"},{default:l(()=>[e(i).id?(s(),u(d,{key:0,style:{"vertical-align":"0"}})):(s(),u(w,{key:1,style:{"vertical-align":"0"}}))]),_:1}),t(ve,{style:{height:"100%","max-width":"260px"}},{tooltip:l(()=>[B("span",null,p(e(O)),1)]),default:l(()=>[B("span",Ze,p(e(O)),1)]),_:1}),t(E,{size:"small",bordered:!1,style:{"margin-top":"2px"}},{default:l(()=>[m(p(e(h)==="ordinary"?e(o)("page.env.type.ordinary"):e(o)("page.env.type.composite")),1)]),_:1})]),_:1})]),footer:l(()=>[t(b,null,{default:l(()=>[t(P,{tertiary:"",focusable:!1,onClick:a[23]||(a[23]=n=>k.value=!1)},{default:l(()=>[m(p(e(o)("common.cancelText")),1)]),_:1}),t(P,{type:"primary",focusable:!1,onClick:J},{default:l(()=>[m(p(e(o)("common.okText")),1)]),_:1})]),_:1})]),default:l(()=>[t(ee,{ref_key:"formRef",ref:M,model:e(i),rules:e(F),style:{"padding-top":"1em"}},{default:l(()=>[e($)?L("",!0):(s(),u(_,{key:0,label:e(o)("page.env.table.title.type"),path:"type"},{default:l(()=>[t(g,{value:e(i).type,"onUpdate:value":a[12]||(a[12]=n=>e(i).type=n),maxlength:"200",clearable:""},null,8,["value"])]),_:1},8,["label"])),e(h)==="composite"?(s(),u(Y,{key:1,"x-gap":"12",cols:3},{default:l(()=>[t(A,{span:2},{default:l(()=>[t(_,{label:e(o)("page.env.table.title.enable"),path:"enable"},{default:l(()=>[t(S,{value:e(i).enable,"onUpdate:value":a[13]||(a[13]=n=>e(i).enable=n),animated:"",type:"segment",size:"small",style:{height:"34px"}},{default:l(()=>[(s(),u(z,{key:1,name:1},{default:l(()=>[m(p(e(o)("common.active")),1)]),_:1})),(s(),u(z,{key:0,name:0},{default:l(()=>[m(p(e(o)("common.inactive")),1)]),_:1}))]),_:1},8,["value"])]),_:1},8,["label"])]),_:1}),t(A,{span:1},{default:l(()=>[t(_,{label:e(o)("page.env.table.title.separator"),path:"separator"},{default:l(()=>[t(g,{value:e(i).separator,"onUpdate:value":a[14]||(a[14]=n=>e(i).separator=n),placeholder:e(o)("page.env.table.none"),style:{width:"100%"},"input-props":I},null,8,["value","placeholder"])]),_:1},8,["label"])]),_:1})]),_:1})):(s(),u(_,{key:2,label:e(o)("page.env.table.title.enable"),path:"enable"},{default:l(()=>[t(S,{value:e(i).enable,"onUpdate:value":a[15]||(a[15]=n=>e(i).enable=n),animated:"",type:"segment",size:"small",style:{height:"34px"}},{default:l(()=>[(s(),u(z,{key:1,name:1},{default:l(()=>[m(p(e(o)("common.active")),1)]),_:1})),(s(),u(z,{key:0,name:0},{default:l(()=>[m(p(e(o)("common.inactive")),1)]),_:1}))]),_:1},8,["value"])]),_:1},8,["label"])),e(h)!=="composite"?(s(),u(_,{key:3,label:e(o)("page.env.table.title.value"),path:"value"},{default:l(()=>[t(g,{value:e(i).value,"onUpdate:value":a[16]||(a[16]=n=>e(i).value=n),type:"textarea","input-props":I},null,8,["value"])]),_:1},8,["label"])):L("",!0),e($)?(s(),u(_,{key:5,label:e(o)("page.env.table.title.remark"),path:"remark"},{default:l(()=>[t(g,{value:e(i).remark,"onUpdate:value":a[18]||(a[18]=n=>e(i).remark=n)},null,8,["value"])]),_:1},8,["label"])):(s(),u(_,{key:4,label:e(o)("page.env.table.title.description"),path:"description"},{default:l(()=>[t(g,{value:e(i).description,"onUpdate:value":a[17]||(a[17]=n=>e(i).description=n)},null,8,["value"])]),_:1},8,["label"])),e(h)!=="composite_value"?(s(),u(_,{key:6,label:e(o)("page.env.table.title.tag_list"),path:"tag_list"},{default:l(()=>[t(b,null,{default:l(()=>[(s(!0),N(ae,null,te(e(f),(n,V)=>(s(),N("div",{key:V,class:"tag-item"},[t(E,{color:Q(n.color),bordered:!1,closable:"",onClose:()=>G(V)},{default:l(()=>[m(p(n.label),1)]),_:2},1032,["color","onClose"])]))),128)),t(Z,{show:e(y),"onUpdate:show":a[22]||(a[22]=n=>U(y)?y.value=n:null),trigger:"click"},{trigger:l(()=>[t(P,{dashed:"",focusable:!1,style:{height:"28px",padding:"0 6px"},onClick:a[19]||(a[19]=n=>y.value=!0)},{icon:l(()=>[t(C,{depth:3},{default:l(()=>[t(K,{style:{"vertical-align":"0"}})]),_:1})]),_:1})]),default:l(()=>[t(b,{wrap:!1},{default:l(()=>[t(X,{size:"small"},{default:l(()=>[t(W,{value:e(x),"onUpdate:value":a[20]||(a[20]=n=>U(x)?x.value=n:null),size:"small",swatches:e(se),"render-label":()=>null,modes:["hex"],"show-alpha":!1,style:{width:"28px",height:"100%"}},null,8,["value","swatches"]),t(g,{value:e(c),"onUpdate:value":a[21]||(a[21]=n=>U(c)?c.value=n:null),size:"small",style:{width:"120px"}},null,8,["value"])]),_:1}),t(P,{size:"small",focusable:!1,onClick:H},{default:l(()=>[m(p(e(o)("component.modal.okText")),1)]),_:1})]),_:1})]),_:1},8,["show"])]),_:1})]),_:1},8,["label"])):L("",!0)]),_:1},8,["model","rules"])]),_:1})]),_:1},8,["show"])):(s(),u(_e,{key:0,show:e(k),"onUpdate:show":a[11]||(a[11]=n=>U(k)?k.value=n:null),preset:"dialog","auto-focus":!1,"mask-closable":!1,"positive-text":e(o)("common.okText"),"negative-text":e(o)("common.cancelText"),"negative-button-props":{ghost:!1,tertiary:!0},style:{width:"460px"},onPositiveClick:J},{icon:l(()=>[t(C,{size:28},{default:l(()=>[e(i).id?(s(),u(d,{key:0,style:{"vertical-align":"0"}})):(s(),u(w,{key:1,style:{"vertical-align":"0"}}))]),_:1})]),header:l(()=>[t(b,null,{default:l(()=>[m(p(e(O))+" ",1),t(E,{size:"small",bordered:!1,style:{"margin-top":"3px"}},{default:l(()=>[m(p(e(h)==="ordinary"?e(o)("page.env.type.ordinary"):e(o)("page.env.type.composite")),1)]),_:1})]),_:1})]),default:l(()=>[t(me,{bordered:!1,style:{height:"100%","word-break":"unset"},"content-style":"padding: 0"},{default:l(()=>[t(ee,{ref_key:"formRef",ref:M,model:e(i),rules:e(F),"label-width":"auto","require-mark-placement":"right-hanging",style:{"padding-top":"1em"}},{default:l(()=>[e($)?L("",!0):(s(),u(_,{key:0,label:e(o)("page.env.table.title.type"),path:"type"},{default:l(()=>[t(g,{value:e(i).type,"onUpdate:value":a[0]||(a[0]=n=>e(i).type=n),maxlength:"200",clearable:""},null,8,["value"])]),_:1},8,["label"])),e(h)==="composite"?(s(),u(Y,{key:1,"x-gap":"12",cols:3},{default:l(()=>[t(A,{span:2},{default:l(()=>[t(_,{label:e(o)("page.env.table.title.enable"),path:"enable"},{default:l(()=>[t(S,{value:e(i).enable,"onUpdate:value":a[1]||(a[1]=n=>e(i).enable=n),animated:"",type:"segment",size:"small",style:{height:"34px"}},{default:l(()=>[(s(),u(z,{key:1,name:1},{default:l(()=>[m(p(e(o)("common.active")),1)]),_:1})),(s(),u(z,{key:0,name:0},{default:l(()=>[m(p(e(o)("common.inactive")),1)]),_:1}))]),_:1},8,["value"])]),_:1},8,["label"])]),_:1}),t(A,{span:1},{default:l(()=>[t(_,{label:e(o)("page.env.table.title.separator"),path:"separator"},{default:l(()=>[t(g,{value:e(i).separator,"onUpdate:value":a[2]||(a[2]=n=>e(i).separator=n),placeholder:e(o)("page.env.table.none"),style:{width:"100%"},"input-props":I},null,8,["value","placeholder"])]),_:1},8,["label"])]),_:1})]),_:1})):(s(),u(_,{key:2,label:e(o)("page.env.table.title.enable"),path:"enable"},{default:l(()=>[t(S,{value:e(i).enable,"onUpdate:value":a[3]||(a[3]=n=>e(i).enable=n),animated:"",type:"segment",size:"small",style:{height:"34px"}},{default:l(()=>[(s(),u(z,{key:1,name:1},{default:l(()=>[m(p(e(o)("common.active")),1)]),_:1})),(s(),u(z,{key:0,name:0},{default:l(()=>[m(p(e(o)("common.inactive")),1)]),_:1}))]),_:1},8,["value"])]),_:1},8,["label"])),e(h)!=="composite"?(s(),u(_,{key:3,label:e(o)("page.env.table.title.value"),path:"value"},{default:l(()=>[t(g,{value:e(i).value,"onUpdate:value":a[4]||(a[4]=n=>e(i).value=n),type:"textarea","input-props":I},null,8,["value"])]),_:1},8,["label"])):L("",!0),e($)?(s(),u(_,{key:5,label:e(o)("page.env.table.title.remark"),path:"remark"},{default:l(()=>[t(g,{value:e(i).remark,"onUpdate:value":a[6]||(a[6]=n=>e(i).remark=n)},null,8,["value"])]),_:1},8,["label"])):(s(),u(_,{key:4,label:e(o)("page.env.table.title.description"),path:"description"},{default:l(()=>[t(g,{value:e(i).description,"onUpdate:value":a[5]||(a[5]=n=>e(i).description=n)},null,8,["value"])]),_:1},8,["label"])),e(h)!=="composite_value"?(s(),u(_,{key:6,label:e(o)("page.env.table.title.tag_list"),path:"tag_list"},{default:l(()=>[t(b,null,{default:l(()=>[(s(!0),N(ae,null,te(e(f),(n,V)=>(s(),N("div",{key:V,class:"tag-item"},[t(E,{color:Q(n.color),bordered:!1,closable:"",onClose:()=>G(V)},{default:l(()=>[m(p(n.label),1)]),_:2},1032,["color","onClose"])]))),128)),t(Z,{show:e(y),"onUpdate:show":a[10]||(a[10]=n=>U(y)?y.value=n:null),trigger:"click"},{trigger:l(()=>[t(P,{dashed:"",style:{height:"28px",padding:"0 6px"},onClick:a[7]||(a[7]=n=>y.value=!0)},{icon:l(()=>[t(C,{depth:3},{default:l(()=>[t(K,{style:{"vertical-align":"0"}})]),_:1})]),_:1})]),default:l(()=>[t(b,{wrap:!1},{default:l(()=>[t(X,{size:"small"},{default:l(()=>[t(W,{value:e(x),"onUpdate:value":a[8]||(a[8]=n=>U(x)?x.value=n:null),size:"small",swatches:e(se),"render-label":()=>null,modes:["hex"],"show-alpha":!1,style:{width:"28px",height:"100%"}},null,8,["value","swatches"]),t(g,{value:e(c),"onUpdate:value":a[9]||(a[9]=n=>U(c)?c.value=n:null),size:"small",style:{width:"120px"}},null,8,["value"])]),_:1}),t(P,{size:"small",focusable:!1,onClick:H},{default:l(()=>[m(p(e(o)("component.modal.okText")),1)]),_:1})]),_:1})]),_:1},8,["show"])]),_:1})]),_:1},8,["label"])):L("",!0)]),_:1},8,["model","rules"])]),_:1})]),_:1},8,["show","positive-text","negative-text"]))}}});export{ol as _};