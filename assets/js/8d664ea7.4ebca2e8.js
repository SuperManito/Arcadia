"use strict";(self.webpackChunkarcadia=self.webpackChunkarcadia||[]).push([[282],{7775:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>a,contentTitle:()=>s,default:()=>p,frontMatter:()=>i,metadata:()=>l,toc:()=>d});var r=n(6070),c=n(6113),o=n(1768);const i={description:"\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e"},s="\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e",l={id:"cli/config/raw",title:"\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e",description:"\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e",source:"@site/docs/cli/config/raw.md",sourceDirName:"cli/config",slug:"/cli/config/raw",permalink:"/docs/cli/config/raw",draft:!1,unlisted:!1,editUrl:"https://github.com/SuperManito/Arcadia/tree/website/docs/cli/config/raw.md",tags:[],version:"current",frontMatter:{description:"\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e"},sidebar:"docs",previous:{title:"repo",permalink:"/docs/cli/config/repo"},next:{title:"\u670d\u52a1\u529f\u80fd\u63a7\u5236",permalink:"/docs/category/\u670d\u52a1\u529f\u80fd\u63a7\u5236"}},a={},d=[{value:"\u547d\u4ee4\u9009\u9879",id:"\u547d\u4ee4\u9009\u9879",level:2}];function h(e){const t={code:"code",h1:"h1",h2:"h2",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,c.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e",children:"\u6dfb\u52a0\u8fdc\u7a0b\u6587\u4ef6\u914d\u7f6e"}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-bash",children:"arcadia raw <name> <url> [--options]\n"})}),"\n",(0,r.jsx)(t.p,{children:"\u5fc5\u987b\u63d0\u4f9b\u914d\u7f6e\u540d\u79f0\u3001\u94fe\u63a5\u5730\u5740\uff0c\u547d\u4ee4\u9009\u9879\u540e\u9762\u9700\u8981\u8ddf\u9009\u9879\u503c"}),"\n",(0,r.jsx)(t.h2,{id:"\u547d\u4ee4\u9009\u9879",children:"\u547d\u4ee4\u9009\u9879"}),"\n",(0,r.jsx)(o.A,{children:(0,r.jsxs)(t.table,{children:[(0,r.jsx)(t.thead,{children:(0,r.jsxs)(t.tr,{children:[(0,r.jsx)(t.th,{style:{textAlign:"center"},children:"\u540d\u79f0"}),(0,r.jsx)(t.th,{children:"\u63cf\u8ff0"})]})}),(0,r.jsxs)(t.tbody,{children:[(0,r.jsxs)(t.tr,{children:[(0,r.jsx)(t.td,{style:{textAlign:"center"},children:(0,r.jsx)(t.code,{children:"--updateTaskList"})}),(0,r.jsx)(t.td,{children:"\u662f\u5426\u4e3a\u8be5\u914d\u7f6e\u542f\u7528\u5b9a\u65f6\u4efb\u52a1"})]}),(0,r.jsxs)(t.tr,{children:[(0,r.jsx)(t.td,{style:{textAlign:"center"},children:(0,r.jsx)(t.code,{children:"--help"})}),(0,r.jsx)(t.td,{children:"\u83b7\u53d6\u547d\u4ee4\u5e2e\u52a9"})]})]})]})})]})}function p(e={}){const{wrapper:t}={...(0,c.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(h,{...e})}):h(e)}},1768:(e,t,n)=>{n.d(t,{A:()=>d});var r=n(758),c=n(3416),o=n(5557);const i={apiTable:"apiTable_e8hp"};var s=n(6070);function l(e,t){let{name:n,children:i}=e;const l=function(e){let t=e;for(;(0,r.isValidElement)(t);)[t]=r.Children.toArray(t.props.children);if("string"!=typeof t)throw new Error(`Could not extract APITable row name from JSX tree:\n${JSON.stringify(e,null,2)}`);return t}(i),a=n?`${n}-${l}`:l,d=`#${a}`,h=(0,o.W6)();return(0,c.A)().collectAnchor(a),(0,s.jsx)("tr",{id:a,tabIndex:0,ref:h.location.hash===d?t:void 0,onClick:e=>{"A"===e.target.tagName.toUpperCase()||h.push(d)},onKeyDown:e=>{"Enter"===e.key&&h.push(d)},children:i.props.children})}const a=r.forwardRef(l);function d(e){let{children:t,name:n}=e;if("table"!==t.type)throw new Error("Bad usage of APITable component.\nIt is probably that your Markdown table is malformed.\nMake sure to double-check you have the appropriate number of columns for each table row.");const[c,o]=r.Children.toArray(t.props.children),l=(0,r.useRef)(null);(0,r.useEffect)((()=>{l.current?.focus()}),[l]);const d=r.Children.map(o.props.children,(e=>(0,s.jsx)(a,{name:n,ref:l,children:e})));return(0,s.jsxs)("table",{className:i.apiTable,children:[c,(0,s.jsx)("tbody",{children:d})]})}},6113:(e,t,n)=>{n.d(t,{R:()=>i,x:()=>s});var r=n(758);const c={},o=r.createContext(c);function i(e){const t=r.useContext(o);return r.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function s(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(c):e.components||c:i(e.components),r.createElement(o.Provider,{value:t},e.children)}}}]);