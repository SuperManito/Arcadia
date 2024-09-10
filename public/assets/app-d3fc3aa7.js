import{A as M,a1 as l,a2 as r}from"./app-16ee8ad9.js";import{I as w}from"./app-9f5af7f8.js";import{ap as g}from"./vendor-191e7315.js";const{apiUrl:C=""}=M();function _({path:e},i="message"){return l.get({url:`/file?path=${e}`},{errorMessageMode:i})}function B(e,i="message"){return l.post({url:"/file",data:e,headers:{"Content-Type":r.JSON}},{errorMessageMode:i,formatDate:!1})}async function Y({type:e="",isDir:i="",keywords:t="",startTime:a="",endTime:c=""},u="message"){const s=await l.get({url:`/file/tree?type=${e}&isDir=${String(i)}&keywords=${t}&startTime=${a}&endTime=${c}`},{errorMessageMode:u});return Array.isArray(s)&&s.length>0?e?s.length===1&&s[0]?.children?s[0].children:[]:s:[]}function Z({path:e},i="message"){return l.get({url:`/file/dir?path=${encodeURIComponent(e)}`},{errorMessageMode:i})}function K(e,i="message"){return l.delete({url:"/file",data:e,headers:{"Content-Type":r.JSON}},{errorMessageMode:i})}function Q({path:e},i="message"){return new Promise(async t=>{const a=await l.get({url:`/file/download?path=${e}`,responseType:"blob"},{isReturnNativeResponse:!0,errorMessageMode:i});if(a.headers["content-disposition"])t({code:1,blob:a.data});else{const c=new FileReader;c.readAsText(a.data),c.onload=function(){const u=c.result||"{}";t(JSON.parse(u))}}})}function W(e,i="message"){return l.post({url:"/file/rename",data:e,headers:{"Content-Type":r.JSON}},{errorMessageMode:i})}function X({path:e},i="message"){return l.get({url:`/file/info?path=${e}`},{errorMessageMode:i})}function ee(e,i="message"){return l.post({url:"/file/move",data:e,headers:{"Content-Type":r.JSON}},{errorMessageMode:i})}function ne(e,i="message"){return l.post({url:"/file/create",data:e,headers:{"Content-Type":r.JSON}},{errorMessageMode:i})}function ie({params:e,path:i,onUploadProgress:t}){return l.uploadFile({url:`${C}/file/upload?path=${i}`,onUploadProgress:t,timeout:600*1e3},e)}function n(e){return g(w,e)}const S=n({icon:"heroicons:command-line",color:"#cc6699",style:"vertical-align: baseline"}),j=n({icon:"vscode-icons:file-type-python",style:"vertical-align: baseline"}),p=n({icon:"vscode-icons:file-type-light-js",style:"vertical-align: baseline"}),T=n({icon:"vscode-icons:file-type-typescript",style:"vertical-align: baseline"}),x=n({icon:"vscode-icons:file-type-light-json",style:"vertical-align: baseline"}),R=n({icon:"vscode-icons:file-type-markdown",style:"vertical-align: baseline"}),$=n({icon:"vscode-icons:file-type-go",style:"vertical-align: baseline"}),N=n({icon:"ri:file-list-2-line",depth:2,style:"vertical-align: baseline"}),v=n({icon:"vscode-icons:file-type-light-yaml",style:"vertical-align: baseline"}),b=n({icon:"vscode-icons:file-type-html",style:"vertical-align: baseline"}),D=n({icon:"vscode-icons:file-type-css",style:"vertical-align: baseline"}),J=n({icon:"vscode-icons:file-type-less",style:"vertical-align: baseline"}),O=n({icon:"vscode-icons:file-type-java",style:"vertical-align: baseline"}),k=n({icon:"vscode-icons:file-type-c",style:"vertical-align: baseline"}),z=n({icon:"vscode-icons:file-type-text",style:"vertical-align: baseline"}),f=n({icon:"mdi:folder-zip-outline",depth:2,style:"vertical-align: baseline"}),y=n({icon:"mdi:image-outline",depth:2,style:"vertical-align: baseline"}),H=n({icon:"ph:file-csv",depth:2,style:"vertical-align: baseline"}),le=n({icon:"ph:file-bold",depth:2,style:"vertical-align: baseline"}),oe=n({icon:"mdi:file-question-outline",depth:2,style:"vertical-align: baseline"}),d=n({icon:"vscode-icons:file-type-db",style:"vertical-align: baseline"}),I=n({icon:"material-symbols:folder-rounded",depth:2,style:"vertical-align: baseline"}),o=n({icon:"material-symbols:folder-open-outline-rounded",depth:2,style:"vertical-align: baseline"}),L=n({icon:"material-symbols:folder-off-outline-rounded",style:"vertical-align: baseline"}),U=n({icon:"mdi:folder-outline",depth:2,style:"vertical-align: baseline"}),A=n({icon:"material-symbols:folder-supervised",depth:2,style:"vertical-align: baseline"}),P=n({icon:"material-symbols:folder-managed-rounded",depth:2,style:"vertical-align: baseline"}),m=n({icon:"material-symbols:folder-data-rounded",depth:2,style:"vertical-align: baseline"}),h=n({icon:"mdi:folder-star",depth:2,style:"vertical-align: baseline"}),q=n({icon:"mdi:folder-eye",depth:2,style:"vertical-align: baseline"}),te=g("svg",{xmlns:"http://www.w3.org/2000/svg",style:"vertical-align: baseline; margin: 0 auto",x:"0px",y:"0px",width:"18",height:"18",viewBox:"0 0 48 48"},[g("path",{fill:"#ffa000",d:"M40,12H22l-4-4H8c-2.2,0-4,1.8-4,4v24c0,2.2,1.8,4,4,4h29.7L44,29V16C44,13.8,42.2,12,40,12z"}),g("path",{fill:"#ffca28",d:"M40,12H8c-2.2,0-4,1.8-4,4v20c0,2.2,1.8,4,4,4h32c2.2,0,4-1.8,4-4V16C44,13.8,42.2,12,40,12z"})]),se={txt:{language:"plaintext",icon:z},log:{language:"log",icon:N},sh:{language:"shell",icon:S,canRun:!0},py:{language:"python",icon:j,canRun:!0},js:{language:"javascript",icon:p,canRun:!0},mjs:{language:"javascript",icon:p,canRun:!0},cjs:{language:"javascript",icon:p,canRun:!0},ts:{language:"typescript",icon:T,canRun:!0},go:{language:"go",icon:$,canRun:!0},c:{language:"c",icon:k,canRun:!0},json:{language:"json",icon:x},md:{language:"markdown",icon:R},yml:{language:"yaml",icon:v},yaml:{language:"yaml",icon:v},xml:{language:"xml",icon:b},html:{language:"html",icon:b},css:{language:"css",icon:D},less:{language:"less",icon:J},java:{language:"java",icon:O},zip:{icon:f,disabled:!0},"7z":{icon:f,disabled:!0},rar:{icon:f,disabled:!0},png:{icon:y,disabled:!0},jpeg:{icon:y,disabled:!0},gif:{icon:y,disabled:!0},csv:{icon:H,disabled:!0},db:{icon:d,disabled:!0},mdb:{icon:d,disabled:!0},accdb:{icon:d,disabled:!0},sql:{icon:d,disabled:!0}},F={open:{"-":o,config:o,sample:o,script:o,scripts:o,repo:o,raw:o,".git":o,src:o},close:{"-":I,config:P,sample:q,script:h,scripts:A,repo:m,raw:h,".git":m,src:m}};function ae(e=""){return F.open[e]||o}function ce(e=""){return F.close[e]||I}function re(e=""){return L}function de(e=""){return U}export{le as I,Y as a,se as b,ce as c,de as d,re as e,ee as f,_ as g,te as h,oe as i,Z as j,X as k,ne as l,W as m,ie as n,K as o,Q as p,ae as q,B as s};