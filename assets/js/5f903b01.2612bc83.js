"use strict";(self.webpackChunkarcadia=self.webpackChunkarcadia||[]).push([[5771],{6757:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>a,contentTitle:()=>d,default:()=>x,frontMatter:()=>c,metadata:()=>s,toc:()=>h});var r=n(6070),l=n(5710),i=n(1768),o=n(4520);const c={title:"\u83b7\u53d6\u6587\u4ef6\u5185\u5bb9",description:"\u6211\u60f3\u770b\u770b\u811a\u672c\u91cc\u5199\u4e86\u4ec0\u4e48\uff0c\u4e0d\u7136\u603b\u6709\u4eba\u53c8\u8981\u88ab\u5077\u5bb6\u4e86\u3002"},d=void 0,s={id:"dev/api/internal/file/get-content",title:"\u83b7\u53d6\u6587\u4ef6\u5185\u5bb9",description:"\u6211\u60f3\u770b\u770b\u811a\u672c\u91cc\u5199\u4e86\u4ec0\u4e48\uff0c\u4e0d\u7136\u603b\u6709\u4eba\u53c8\u8981\u88ab\u5077\u5bb6\u4e86\u3002",source:"@site/docs/dev/api/internal/file/get-content.mdx",sourceDirName:"dev/api/internal/file",slug:"/dev/api/internal/file/get-content",permalink:"/docs/dev/api/internal/file/get-content",draft:!1,unlisted:!1,editUrl:"https://github.com/SuperManito/Arcadia/tree/website/docs/dev/api/internal/file/get-content.mdx",tags:[],version:"current",frontMatter:{title:"\u83b7\u53d6\u6587\u4ef6\u5185\u5bb9",description:"\u6211\u60f3\u770b\u770b\u811a\u672c\u91cc\u5199\u4e86\u4ec0\u4e48\uff0c\u4e0d\u7136\u603b\u6709\u4eba\u53c8\u8981\u88ab\u5077\u5bb6\u4e86\u3002"},sidebar:"dev",previous:{title:"File \u6587\u4ef6",permalink:"/docs/category/file-\u6587\u4ef6"},next:{title:"\u4fdd\u5b58\u6587\u4ef6\u5185\u5bb9",permalink:"/docs/dev/api/internal/file/save-content"}},a={},h=[{value:"\u8bf7\u6c42",id:"\u8bf7\u6c42",level:2},{value:"\u54cd\u5e94",id:"\u54cd\u5e94",level:2}];function p(e){const t={code:"code",h2:"h2",li:"li",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,l.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(o.fG,{children:"/file"}),"\n",(0,r.jsx)(t.h2,{id:"\u8bf7\u6c42",children:"\u8bf7\u6c42"}),"\n",(0,r.jsx)(i.A,{children:(0,r.jsxs)(t.table,{children:[(0,r.jsx)(t.thead,{children:(0,r.jsxs)(t.tr,{children:[(0,r.jsx)(t.th,{style:{textAlign:"center"},children:"\u540d\u79f0"}),(0,r.jsx)(t.th,{style:{textAlign:"center"},children:"\u7c7b\u578b"}),(0,r.jsx)(t.th,{style:{textAlign:"center"},children:"\u5fc5\u586b"}),(0,r.jsx)(t.th,{children:"\u63cf\u8ff0"})]})}),(0,r.jsx)(t.tbody,{children:(0,r.jsxs)(t.tr,{children:[(0,r.jsx)(t.td,{style:{textAlign:"center"},children:(0,r.jsx)(t.code,{children:"path"})}),(0,r.jsx)(t.td,{style:{textAlign:"center"},children:(0,r.jsx)(t.code,{children:"string"})}),(0,r.jsx)(t.td,{style:{textAlign:"center"},children:"\u662f"}),(0,r.jsx)(t.td,{children:"\u7edd\u5bf9\u8def\u5f84"})]})})]})}),"\n",(0,r.jsx)(t.h2,{id:"\u54cd\u5e94",children:"\u54cd\u5e94"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:["ContentType ",(0,r.jsx)(t.code,{children:"text/plain"})]}),"\n"]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-json",metastring:'title="\u793a\u4f8b"',children:'public function template() {\\n    console.log(\\"Hello World\\");\\n}\n'})})]})}function x(e={}){const{wrapper:t}={...(0,l.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(p,{...e})}):p(e)}},1768:(e,t,n)=>{n.d(t,{A:()=>a});var r=n(758),l=n(6592),i=n(5557);const o={apiTable:"apiTable_e8hp"};var c=n(6070);function d(e,t){let{name:n,children:o}=e;const d=function(e){let t=e;for(;(0,r.isValidElement)(t);)[t]=r.Children.toArray(t.props.children);if("string"!=typeof t)throw new Error(`Could not extract APITable row name from JSX tree:\n${JSON.stringify(e,null,2)}`);return t}(o),s=n?`${n}-${d}`:d,a=`#${s}`,h=(0,i.W6)();return(0,l.A)().collectAnchor(s),(0,c.jsx)("tr",{id:s,tabIndex:0,ref:h.location.hash===a?t:void 0,onClick:e=>{"A"===e.target.tagName.toUpperCase()||h.push(a)},onKeyDown:e=>{"Enter"===e.key&&h.push(a)},children:o.props.children})}const s=r.forwardRef(d);function a(e){let{children:t,name:n}=e;if("table"!==t.type)throw new Error("Bad usage of APITable component.\nIt is probably that your Markdown table is malformed.\nMake sure to double-check you have the appropriate number of columns for each table row.");const[l,i]=r.Children.toArray(t.props.children),d=(0,r.useRef)(null);(0,r.useEffect)((()=>{d.current?.focus()}),[d]);const a=r.Children.map(i.props.children,(e=>(0,c.jsx)(s,{name:n,ref:d,children:e})));return(0,c.jsxs)("table",{className:o.apiTable,children:[l,(0,c.jsx)("tbody",{children:a})]})}},4520:(e,t,n)=>{n.d(t,{LO:()=>c,SJ:()=>d,Uc:()=>s,fG:()=>o});n(758);var r=n(4959),l=n(6070);const i=e=>{let{method:t,color:n,children:i}=e;return(0,l.jsxs)(r.A,{as:"h4",style:{backgroundColor:`${n}1a`,borderRadius:"6px",border:`2px solid ${n}`,padding:"8px 4px 9px 4px",width:"fit-content",marginTop:"0",marginBottom:"10px"},children:[(0,l.jsx)("span",{style:{backgroundColor:`${n}`,borderRadius:"5px",color:"#fff",fontSize:"14px",fontWeight:"700",userSelect:"none",padding:"6px 10px",textAlign:"center"},children:t}),(0,l.jsx)("span",{style:{fontSize:"16px",fontWeight:"600",fontFamily:"SF Mono",padding:"0 4px 0 10px",alignItems:"center",wordBreak:"break-word"},children:i})]})},o=e=>{let{children:t}=e;return(0,l.jsx)(i,{method:"GET",color:"#61affe",children:t})},c=e=>{let{children:t}=e;return(0,l.jsx)(i,{method:"POST",color:"#49cc90",children:t})},d=e=>{let{children:t}=e;return(0,l.jsx)(i,{method:"DELETE",color:"#f93e3e",children:t})},s=e=>{let{children:t}=e;return(0,l.jsx)(i,{method:"PUT",color:"#fca130",children:t})}},5710:(e,t,n)=>{n.d(t,{R:()=>o,x:()=>c});var r=n(758);const l={},i=r.createContext(l);function o(e){const t=r.useContext(i);return r.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function c(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(l):e.components||l:o(e.components),r.createElement(i.Provider,{value:t},e.children)}}}]);