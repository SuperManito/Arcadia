"use strict";(self.webpackChunkarcadia=self.webpackChunkarcadia||[]).push([[3476],{3785:(n,e,r)=>{r.r(e),r.d(e,{assets:()=>a,contentTitle:()=>s,default:()=>p,frontMatter:()=>d,metadata:()=>o,toc:()=>l});var t=r(8327),i=r(1326);const d={title:"Env - \u73af\u5883\u53d8\u91cf"},s=void 0,o={id:"dev/api/internal/env/index",title:"Env - \u73af\u5883\u53d8\u91cf",description:"\u6570\u636e\u5173\u7cfb\u6a21\u578b",source:"@site/docs/dev/api/internal/env/index.mdx",sourceDirName:"dev/api/internal/env",slug:"/dev/api/internal/env/",permalink:"/docs/dev/api/internal/env/",draft:!1,unlisted:!1,editUrl:"https://github.com/SuperManito/Arcadia/tree/website/docs/dev/api/internal/env/index.mdx",tags:[],version:"current",frontMatter:{title:"Env - \u73af\u5883\u53d8\u91cf"},sidebar:"dev",previous:{title:"\u7ec8\u6b62\u4efb\u52a1",permalink:"/docs/dev/api/internal/cron/stop-run"},next:{title:"\u5206\u9875\u67e5\u8be2",permalink:"/docs/dev/api/internal/env/page"}},a={},l=[{value:"\u6570\u636e\u5173\u7cfb\u6a21\u578b",id:"\u6570\u636e\u5173\u7cfb\u6a21\u578b",level:2}];function c(n){const e={admonition:"admonition",code:"code",h2:"h2",li:"li",p:"p",pre:"pre",ul:"ul",...(0,i.R)(),...n.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(e.admonition,{title:"\u6b64\u90e8\u5206API\u4e0e\u6570\u636e\u6a21\u578b\u7d27\u5bc6\u76f8\u8fde\uff0c\u5982\u679c\u4f60\u65e0\u6cd5\u7406\u89e3\u9879\u76ee\u5e94\u7528\u7a0b\u5e8f\u8bbe\u8ba1\u90a3\u4e48\u8bf7\u8c28\u614e\u64cd\u4f5c\uff0c\u5efa\u8bae\u5148\u4e86\u89e3\u524d\u7aef\u5b9e\u73b0\u6216\u76f4\u63a5\u4f7f\u7528 Open API",type:"info"}),"\n",(0,t.jsx)(e.h2,{id:"\u6570\u636e\u5173\u7cfb\u6a21\u578b",children:"\u6570\u636e\u5173\u7cfb\u6a21\u578b"}),"\n",(0,t.jsxs)(e.p,{children:["\u6570\u636e\u5e93\u5bf9\u4e8e\u8be5\u529f\u80fd\u8bbe\u8ba1\u4e86\u4e24\u4e2a\u6570\u636e\u8868 ",(0,t.jsx)(e.code,{children:"envs"})," ",(0,t.jsx)(e.code,{children:"envs_group"}),"\uff0c\u5206\u522b\u4ee3\u8868\u53d8\u91cf\u503c\u548c\u53d8\u91cf\u7ec4"]}),"\n",(0,t.jsx)(e.pre,{children:(0,t.jsx)(e.code,{className:"language-prisma",children:'model envs {\r\n  id          Int         @id @default(autoincrement())\r\n  group_id    Int\r\n  type        String\r\n  tag_list    String      @default("")\r\n  description String      @default("")\r\n  remark      String      @default("")\r\n  value       String      @default("")\r\n  sort        Int         @default(0)\r\n  enable      Int         @default(1)\r\n  envs_group  envs_group? @relation(fields: [group_id], references: [id])\r\n\r\n  @@index([type])\r\n}\r\n\r\nmodel envs_group {\r\n  id          Int    @id @default(autoincrement())\r\n  type        String\r\n  description String @default("")\r\n  tag_list    String @default("")\r\n  separator   String @default("")\r\n  sort        Int    @default(0)\r\n  enable      Int    @default(1)\r\n  envs        envs[]\r\n\r\n  @@index([type])\r\n}\n'})}),"\n",(0,t.jsxs)(e.ul,{children:["\n",(0,t.jsxs)(e.li,{children:["\n",(0,t.jsxs)(e.p,{children:[(0,t.jsx)(e.code,{children:"envs"})," \u8868"]}),"\n",(0,t.jsxs)(e.p,{children:["\u7528\u4e8e\u5b58\u50a8\u6240\u6709\u53d8\u91cf\u7684\u503c\uff0c\u5176\u4e2d ",(0,t.jsx)(e.code,{children:"group_id"})," \u5b57\u6bb5\u7528\u4e8e\u5173\u8054 ",(0,t.jsx)(e.code,{children:"envs_group"})," \u8868\u7684 ",(0,t.jsx)(e.code,{children:"id"})," \u5b57\u6bb5\uff0c\u5982\u679c\u5173\u8054\u4e86\u5219\u8868\u660e\u8be5\u8bb0\u5f55\u662f\u76ee\u6807\u590d\u5408\u53d8\u91cf\u7684\u4e00\u4e2a\u503c\uff0c\u5426\u5219 ",(0,t.jsx)(e.code,{children:"group_id"})," \u4e3a0\u8868\u793a\u4e00\u4e2a\u72ec\u7acb\u7684\u666e\u901a\u53d8\u91cf"]}),"\n"]}),"\n",(0,t.jsxs)(e.li,{children:["\n",(0,t.jsxs)(e.p,{children:[(0,t.jsx)(e.code,{children:"envs_group"})," \u8868"]}),"\n",(0,t.jsx)(e.p,{children:"\u7528\u4e8e\u5b58\u50a8\u7ec4\u53d8\u91cf\uff08\u590d\u5408\u53d8\u91cf\uff09"}),"\n"]}),"\n"]})]})}function p(n={}){const{wrapper:e}={...(0,i.R)(),...n.components};return e?(0,t.jsx)(e,{...n,children:(0,t.jsx)(c,{...n})}):c(n)}},1326:(n,e,r)=>{r.d(e,{R:()=>s,x:()=>o});var t=r(1503);const i={},d=t.createContext(i);function s(n){const e=t.useContext(d);return t.useMemo((function(){return"function"==typeof n?n(e):{...e,...n}}),[e,n])}function o(n){let e;return e=n.disableParentContext?"function"==typeof n.components?n.components(i):n.components||i:s(n.components),t.createElement(d.Provider,{value:e},n.children)}}}]);