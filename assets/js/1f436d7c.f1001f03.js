"use strict";(self.webpackChunkarcadia=self.webpackChunkarcadia||[]).push([[3453],{9492:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>s,contentTitle:()=>c,default:()=>f,frontMatter:()=>l,metadata:()=>a,toc:()=>p});var r=t(8327),o=t(1326),i=t(7642),d=t(4520);const l={title:"\u5206\u9875\u5220\u9664"},c=void 0,a={id:"dev/api/internal/config/type/delete",title:"\u5206\u9875\u5220\u9664",description:"/config/type",source:"@site/docs/dev/api/internal/config/type/delete.mdx",sourceDirName:"dev/api/internal/config/type",slug:"/dev/api/internal/config/type/delete",permalink:"/docs/dev/api/internal/config/type/delete",draft:!1,unlisted:!1,editUrl:"https://github.com/SuperManito/Arcadia/tree/website/docs/dev/api/internal/config/type/delete.mdx",tags:[],version:"current",frontMatter:{title:"\u5206\u9875\u5220\u9664"}},s={},p=[{value:"<DELETE>/config/type</DELETE>",id:"configtype",level:4},{value:"\u8bf7\u6c42",id:"\u8bf7\u6c42",level:2}];function x(e){const n={code:"code",h2:"h2",h4:"h4",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,o.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h4,{id:"configtype",children:(0,r.jsx)(d.SJ,{children:"/config/type"})}),"\n",(0,r.jsx)(n.h2,{id:"\u8bf7\u6c42",children:"\u8bf7\u6c42"}),"\n",(0,r.jsx)(i.A,{children:(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"\u540d\u79f0"}),(0,r.jsx)(n.th,{style:{textAlign:"center"},children:"\u7c7b\u578b"}),(0,r.jsx)(n.th,{style:{textAlign:"center"},children:"\u5fc5\u586b"}),(0,r.jsx)(n.th,{children:"\u63cf\u8ff0"})]})}),(0,r.jsx)(n.tbody,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"id"})}),(0,r.jsx)(n.td,{style:{textAlign:"center"},children:(0,r.jsx)(n.code,{children:"number"})}),(0,r.jsx)(n.td,{style:{textAlign:"center"},children:"\u662f"}),(0,r.jsx)(n.td,{children:"\u64cd\u4f5c\u5bf9\u8c61\u7684id"})]})})]})})]})}function f(e={}){const{wrapper:n}={...(0,o.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(x,{...e})}):x(e)}},7642:(e,n,t)=>{t.d(n,{A:()=>s});var r=t(1503),o=t(2129),i=t(1776);const d={apiTable:"apiTable_e8hp"};var l=t(8327);function c(e,n){let{name:t,children:d}=e;const c=function(e){let n=e;for(;(0,r.isValidElement)(n);)[n]=r.Children.toArray(n.props.children);if("string"!=typeof n)throw new Error(`Could not extract APITable row name from JSX tree:\n${JSON.stringify(e,null,2)}`);return n}(d),a=t?`${t}-${c}`:c,s=`#${a}`,p=(0,i.W6)();return(0,o.A)().collectAnchor(a),(0,l.jsx)("tr",{id:a,tabIndex:0,ref:p.location.hash===s?n:void 0,onClick:e=>{"A"===e.target.tagName.toUpperCase()||p.push(s)},onKeyDown:e=>{"Enter"===e.key&&p.push(s)},children:d.props.children})}const a=r.forwardRef(c);function s(e){let{children:n,name:t}=e;if("table"!==n.type)throw new Error("Bad usage of APITable component.\nIt is probably that your Markdown table is malformed.\nMake sure to double-check you have the appropriate number of columns for each table row.");const[o,i]=r.Children.toArray(n.props.children),c=(0,r.useRef)(null);(0,r.useEffect)((()=>{c.current?.focus()}),[c]);const s=r.Children.map(i.props.children,(e=>(0,l.jsx)(a,{name:t,ref:c,children:e})));return(0,l.jsxs)("table",{className:d.apiTable,children:[o,(0,l.jsx)("tbody",{children:s})]})}},4520:(e,n,t)=>{t.d(n,{LO:()=>o,SJ:()=>d,Uc:()=>l,fG:()=>i});t(1503);var r=t(8327);function o(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(73,204,144,.1)",borderRadius:"6px",border:"1px solid #49cc90",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#49cc90",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"POST"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function i(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(97,175,254,.1)",borderRadius:"6px",border:"1px solid #61affe",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#61affe",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"GET"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function d(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(249,62,62,.1)",borderRadius:"6px",border:"1px solid #f93e3e",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#f93e3e",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"DELETE"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}function l(e){let{children:n}=e;return(0,r.jsxs)("span",{style:{backgroundColor:"rgba(252,161,48,.1)",borderRadius:"6px",border:"1px solid #fca130",padding:"8px 4px 10px 4px"},children:[(0,r.jsx)("span",{style:{backgroundColor:"#fca130",borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:"PUT"}),(0,r.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:n})]})}},1326:(e,n,t)=>{t.d(n,{R:()=>d,x:()=>l});var r=t(1503);const o={},i=r.createContext(o);function d(e){const n=r.useContext(i);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function l(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:d(e.components),r.createElement(i.Provider,{value:n},e.children)}}}]);