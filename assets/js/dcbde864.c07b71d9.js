"use strict";(self.webpackChunkarcadia=self.webpackChunkarcadia||[]).push([[4899],{3438:(e,n,r)=>{r.r(n),r.d(n,{assets:()=>a,contentTitle:()=>c,default:()=>h,frontMatter:()=>l,metadata:()=>s,toc:()=>p});var t=r(8327),o=r(1326),i=r(7642),d=r(4520);const l={title:"\u83b7\u53d6\u4efb\u52a1\u5206\u7c7b"},c=void 0,s={id:"dev/api/internal/cron/bind-group",title:"\u83b7\u53d6\u4efb\u52a1\u5206\u7c7b",description:"/cron/order/bindGroup",source:"@site/docs/dev/api/internal/cron/bind-group.mdx",sourceDirName:"dev/api/internal/cron",slug:"/dev/api/internal/cron/bind-group",permalink:"/docs/dev/api/internal/cron/bind-group",draft:!1,unlisted:!1,editUrl:"https://github.com/SuperManito/Arcadia/tree/website/docs/dev/api/internal/cron/bind-group.mdx",tags:[],version:"current",frontMatter:{title:"\u83b7\u53d6\u4efb\u52a1\u5206\u7c7b"},sidebar:"dev",previous:{title:"\u8c03\u6574\u4efb\u52a1\u6392\u5e8f",permalink:"/docs/dev/api/internal/cron/order"},next:{title:"\u67e5\u8be2\u8fd0\u884c\u4e2d\u7684\u4efb\u52a1",permalink:"/docs/dev/api/internal/cron/running-task"}},a={},p=[{value:"<GET>/cron/order/bindGroup</GET>",id:"cronorderbindgroup",level:4},{value:"\u8bf7\u6c42",id:"\u8bf7\u6c42",level:2},{value:"\u54cd\u5e94",id:"\u54cd\u5e94",level:2}];function x(e){const n={code:"code",h2:"h2",h4:"h4",li:"li",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,o.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.h4,{id:"cronorderbindgroup",children:(0,t.jsx)(d.fG,{children:"/cron/order/bindGroup"})}),"\n",(0,t.jsx)(n.h2,{id:"\u8bf7\u6c42",children:"\u8bf7\u6c42"}),"\n",(0,t.jsx)(n.p,{children:"\u65e0\u53c2\u6570"}),"\n",(0,t.jsx)(n.h2,{id:"\u54cd\u5e94",children:"\u54cd\u5e94"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:["ContentType ",(0,t.jsx)(n.code,{children:"application/json"})]}),"\n"]}),"\n",(0,t.jsx)(i.A,{children:(0,t.jsxs)(n.table,{children:[(0,t.jsx)(n.thead,{children:(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.th,{children:"\u540d\u79f0"}),(0,t.jsx)(n.th,{style:{textAlign:"center"},children:"\u7c7b\u578b"}),(0,t.jsx)(n.th,{children:"\u63cf\u8ff0"})]})}),(0,t.jsxs)(n.tbody,{children:[(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:(0,t.jsx)(n.code,{children:"bind"})}),(0,t.jsx)(n.td,{style:{textAlign:"center"},children:(0,t.jsx)(n.code,{children:"string"})}),(0,t.jsx)(n.td,{children:"\u5206\u7c7b\u540d\u79f0"})]}),(0,t.jsxs)(n.tr,{children:[(0,t.jsx)(n.td,{children:(0,t.jsx)(n.code,{children:"count"})}),(0,t.jsx)(n.td,{style:{textAlign:"center"},children:(0,t.jsx)(n.code,{children:"number"})}),(0,t.jsx)(n.td,{children:"\u4efb\u52a1\u6570\u91cf"})]})]})]})}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",metastring:'title="\u793a\u4f8b"',children:'[\r\n  {\r\n    "bind": "",\r\n    "count": 1\r\n  },\r\n  {\r\n    "bind": "xxx_xxx",\r\n    "count": 2\r\n  }\r\n]\n'})})]})}function h(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(x,{...e})}):x(e)}},7642:(e,n,r)=>{r.d(n,{A:()=>a});var t=r(1503),o=r(2129),i=r(1776);const d={apiTable:"apiTable_e8hp"};var l=r(8327);function c(e,n){let{name:r,children:d}=e;const c=function(e){let n=e;for(;(0,t.isValidElement)(n);)[n]=t.Children.toArray(n.props.children);if("string"!=typeof n)throw new Error(`Could not extract APITable row name from JSX tree:\n${JSON.stringify(e,null,2)}`);return n}(d),s=r?`${r}-${c}`:c,a=`#${s}`,p=(0,i.W6)();return(0,o.A)().collectAnchor(s),(0,l.jsx)("tr",{id:s,tabIndex:0,ref:p.location.hash===a?n:void 0,onClick:e=>{"A"===e.target.tagName.toUpperCase()||p.push(a)},onKeyDown:e=>{"Enter"===e.key&&p.push(a)},children:d.props.children})}const s=t.forwardRef(c);function a(e){let{children:n,name:r}=e;if("table"!==n.type)throw new Error("Bad usage of APITable component.\nIt is probably that your Markdown table is malformed.\nMake sure to double-check you have the appropriate number of columns for each table row.");const[o,i]=t.Children.toArray(n.props.children),c=(0,t.useRef)(null);(0,t.useEffect)((()=>{c.current?.focus()}),[c]);const a=t.Children.map(i.props.children,(e=>(0,l.jsx)(s,{name:r,ref:c,children:e})));return(0,l.jsxs)("table",{className:d.apiTable,children:[o,(0,l.jsx)("tbody",{children:a})]})}},4520:(e,n,r)=>{r.d(n,{LO:()=>o,SJ:()=>d,Uc:()=>l,fG:()=>i});r(1503);var t=r(8327);function o(e){let{children:n}=e;return(0,t.jsxs)("span",{style:{backgroundColor:"rgba(73,204,144,.1)",borderRadius:"6px",border:"1px solid #49cc90",padding:"8px 4px 10px 4px"},children:[(0,t.jsx)("span",{style:{backgroundColor:"#49cc90",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"POST"}),(0,t.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function i(e){let{children:n}=e;return(0,t.jsxs)("span",{style:{backgroundColor:"rgba(97,175,254,.1)",borderRadius:"6px",border:"1px solid #61affe",padding:"8px 4px 10px 4px"},children:[(0,t.jsx)("span",{style:{backgroundColor:"#61affe",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"GET"}),(0,t.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function d(e){let{children:n}=e;return(0,t.jsxs)("span",{style:{backgroundColor:"rgba(249,62,62,.1)",borderRadius:"6px",border:"1px solid #f93e3e",padding:"8px 4px 10px 4px"},children:[(0,t.jsx)("span",{style:{backgroundColor:"#f93e3e",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"DELETE"}),(0,t.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function l(e){let{children:n}=e;return(0,t.jsxs)("span",{style:{backgroundColor:"rgba(252,161,48,.1)",borderRadius:"6px",border:"1px solid #fca130",padding:"8px 4px 10px 4px"},children:[(0,t.jsx)("span",{style:{backgroundColor:"#fca130",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"PUT"}),(0,t.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}},1326:(e,n,r)=>{r.d(n,{R:()=>d,x:()=>l});var t=r(1503);const o={},i=t.createContext(o);function d(e){const n=t.useContext(i);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:d(e.components),t.createElement(i.Provider,{value:n},e.children)}}}]);