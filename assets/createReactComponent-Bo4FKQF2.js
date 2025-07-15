import{j as d}from"./jsx-runtime-D_zvdyIk.js";import{a as t}from"./chunk-QMGIS6GS-npKyu-26.js";function k(o){const r=t.createContext(null);return[({children:e,value:n})=>d.jsx(r.Provider,{value:n,children:e}),()=>{const e=t.useContext(r);if(e===null)throw new Error(o);return e}]}const h=t.createContext({dir:"ltr",toggleDirection:()=>{},setDirection:()=>{}});function E(){return t.useContext(h)}/**
 * @license @tabler/icons-react v3.34.0 - MIT
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the root directory of this source tree.
 */var p={outline:{xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},filled:{xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"currentColor",stroke:"none"}};/**
 * @license @tabler/icons-react v3.34.0 - MIT
 *
 * This source code is licensed under the MIT license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=(o,r,s,a)=>{const e=t.forwardRef(({color:n="currentColor",size:c=24,stroke:u=2,title:l,className:x,children:i,...w},m)=>t.createElement("svg",{ref:m,...p[o],width:c,height:c,className:["tabler-icon",`tabler-icon-${r}`,x].join(" "),strokeWidth:u,stroke:n,...w},[l&&t.createElement("title",{key:"svg-title"},l),...a.map(([f,C])=>t.createElement(f,C)),...Array.isArray(i)?i:[i]]));return e.displayName=`${s}`,e};export{j as a,k as c,E as u};
