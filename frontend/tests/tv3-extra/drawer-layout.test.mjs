import assert from 'node:assert/strict';
import {overlay,nodes} from './overlay-harness.mjs';
const {Drawer,IconButton}=overlay('src/components/ui/Modal.tsx',{useState:x=>[x,()=>{}]});
const render=(side,width,dismissible)=>Drawer({open:true,title:'Bộ lọc',side,width,hideHeader:true,dismissible,onClose:()=>{},children:'Nội dung'});
let t=render('left','lg',false);let panel=nodes(t,n=>n.props?.role==='dialog')[0].props;assert.equal(panel['data-side'],'left');assert.match(panel.className,/left-0/);assert.match(panel.className,/max-w-2xl/);assert.equal(panel['aria-label'],'Bộ lọc');assert.equal(nodes(t,n=>n.type===IconButton)[0].props.disabled,true);
t=render('right','sm',true);panel=nodes(t,n=>n.props?.role==='dialog')[0].props;assert.equal(panel['data-side'],'right');assert.match(panel.className,/right-0/);assert.match(panel.className,/max-w-sm/);assert.equal(nodes(t,n=>n.type===IconButton)[0].props.disabled,false);
