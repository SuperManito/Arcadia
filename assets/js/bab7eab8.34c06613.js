"use strict";(self.webpackChunkarcadia=self.webpackChunkarcadia||[]).push([[8661],{9608:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>a,contentTitle:()=>s,default:()=>h,frontMatter:()=>o,metadata:()=>c,toc:()=>x});var r=t(8327),d=t(1326),l=t(7642),i=t(4520);const o={title:"\u5220\u9664"},s=void 0,c={id:"dev/api/internal/env/delete",title:"\u5220\u9664",description:"\u53d8\u91cf\u503c",source:"@site/docs/dev/api/internal/env/delete.mdx",sourceDirName:"dev/api/internal/env",slug:"/dev/api/internal/env/delete",permalink:"/docs/dev/api/internal/env/delete",draft:!1,unlisted:!1,editUrl:"https://github.com/SuperManito/Arcadia/tree/website/docs/dev/api/internal/env/delete.mdx",tags:[],version:"current",frontMatter:{title:"\u5220\u9664"},sidebar:"dev",previous:{title:"\u521b\u5efa/\u4fee\u6539",permalink:"/docs/dev/api/internal/env/save"},next:{title:"\u8c03\u6574\u6392\u5e8f",permalink:"/docs/dev/api/internal/env/order"}},a={},x=[{value:"\u53d8\u91cf\u503c",id:"\u53d8\u91cf\u503c",level:2},{value:"<DELETE>/env/deleteItem</DELETE>",id:"envdeleteitem",level:4},{value:"\u8bf7\u6c42",id:"\u8bf7\u6c42",level:3},{value:"\u53d8\u91cf\u7ec4",id:"\u53d8\u91cf\u7ec4",level:2},{value:"<DELETE>/env/delete</DELETE>",id:"envdelete",level:4},{value:"\u8bf7\u6c42",id:"\u8bf7\u6c42-1",level:3}];function p(e){const n={code:"code",h2:"h2",h3:"h3",h4:"h4",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,d.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h2,{id:"\u53d8\u91cf\u503c",children:"\u53d8\u91cf\u503c"}),"\n",(0,r.jsx)(n.h4,{id:"envdeleteitem",children:(0,r.jsx)(i.SJ,{children:"/env/deleteItem"})}),"\n",(0,r.jsx)(n.h3,{id:"\u8bf7\u6c42",children:"\u8bf7\u6c42"}),"\n",(0,r.jsx)(l.A,{children:(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"\u540d\u79f0"}),(0,r.jsx)(n.th,{style:{textAlign:"center"},children:"\u7c7b\u578b"}),(0,r.jsx)(n.th,{style:{textAlign:"center"},children:"\u5fc5\u586b"}),(0,r.jsx)(n.th,{children:"\u63cf\u8ff0"})]})}),(0,r.jsx)(n.tbody,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"id"})}),(0,r.jsx)(n.td,{style:{textAlign:"center"},children:(0,r.jsx)(n.code,{children:"number"})}),(0,r.jsx)(n.td,{style:{textAlign:"center"},children:"\u662f"}),(0,r.jsx)(n.td,{children:"\u552f\u4e00\u6807\u8bc6"})]})})]})}),"\n",(0,r.jsx)(n.h2,{id:"\u53d8\u91cf\u7ec4",children:"\u53d8\u91cf\u7ec4"}),"\n",(0,r.jsx)(n.h4,{id:"envdelete",children:(0,r.jsx)(i.SJ,{children:"/env/delete"})}),"\n",(0,r.jsx)(n.h3,{id:"\u8bf7\u6c42-1",children:"\u8bf7\u6c42"}),"\n",(0,r.jsx)(l.A,{children:(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"\u540d\u79f0"}),(0,r.jsx)(n.th,{style:{textAlign:"center"},children:"\u7c7b\u578b"}),(0,r.jsx)(n.th,{style:{textAlign:"center"},children:"\u5fc5\u586b"}),(0,r.jsx)(n.th,{children:"\u63cf\u8ff0"})]})}),(0,r.jsx)(n.tbody,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"id"})}),(0,r.jsx)(n.td,{style:{textAlign:"center"},children:(0,r.jsx)(n.code,{children:"number"})}),(0,r.jsx)(n.td,{style:{textAlign:"center"},children:"\u662f"}),(0,r.jsx)(n.td,{children:"\u552f\u4e00\u6807\u8bc6"})]})})]})})]})}function h(e={}){const{wrapper:n}={...(0,d.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(p,{...e})}):p(e)}},7642:(e,n,t)=>{t.d(n,{A:()=>a});var r=t(1503),d=t(2129),l=t(1776);const i={apiTable:"apiTable_e8hp"};var o=t(8327);function s(e,n){let{name:t,children:i}=e;const s=function(e){let n=e;for(;(0,r.isValidElement)(n);)[n]=r.Children.toArray(n.props.children);if("string"!=typeof n)throw new Error(`Could not extract APITable row name from JSX tree:\n${JSON.stringify(e,null,2)}`);return n}(i),c=t?`${t}-${s}`:s,a=`#${c}`,x=(0,l.W6)();return(0,d.A)().collectAnchor(c),(0,o.jsx)("tr",{id:c,tabIndex:0,ref:x.location.hash===a?n:void 0,onClick:e=>{"A"===e.target.tagName.toUpperCase()||x.push(a)},onKeyDown:e=>{"Enter"===e.key&&x.push(a)},children:i.props.children})}const c=r.forwardRef(s);function a(e){let{children:n,name:t}=e;if("table"!==n.type)throw new Error("Bad usage of APITable component.\nIt is probably that your Markdown table is malformed.\nMake sure to double-check you have the appropriate number of columns for each table row.");const[d,l]=r.Children.toArray(n.props.children),s=(0,r.useRef)(null);(0,r.useEffect)((()=>{s.current?.focus()}),[s]);const a=r.Children.map(l.props.children,(e=>(0,o.jsx)(c,{name:t,ref:s,children:e})));return(0,o.jsxs)("table",{className:i.apiTable,children:[d,(0,o.jsx)("tbody",{children:a})]})}},4520:(e,n,t)=>{t.d(n,{LO:()=>d,SJ:()=>i,Uc:()=>o,fG:()=>l});t(1503);var r=t(8327);function d(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(73,204,144,.1)",borderRadius:"6px",border:"1px solid #49cc90",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#49cc90",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"POST"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function l(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(97,175,254,.1)",borderRadius:"6px",border:"1px solid #61affe",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#61affe",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"GET"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function i(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(249,62,62,.1)",borderRadius:"6px",border:"1px solid #f93e3e",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#f93e3e",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"DELETE"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function o(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(252,161,48,.1)",borderRadius:"6px",border:"1px solid #fca130",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#fca130",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"PUT"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}},1326:(e,n,t)=>{t.d(n,{R:()=>i,x:()=>o});var r=t(1503);const d={},l=r.createContext(d);function i(e){const n=r.useContext(l);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(d):e.components||d:i(e.components),r.createElement(l.Provider,{value:n},e.children)}}}]);