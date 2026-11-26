import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const Icon=()=>null;const ref={};const {Button,IconButton}=component('src/components/ui/Button.tsx',{react:{forwardRef:f=>p=>f(p,ref)},'./Icon':{Icon},'./buttonClass':{buttonClass:()=>''}});
const ready=Button({children:'Lưu',icon:'check',iconRight:'arrow'});assert.equal(ready.props.type,'button');assert.equal(ready.props.ref,ref);assert.equal(nodes(ready,n=>n.type===Icon).length,2);
const busy=Button({loading:true,loadingText:'Đang lưu',children:'Lưu',icon:'check',iconRight:'arrow'});assert.equal(busy.props.disabled,true);assert.equal(busy.props['aria-busy'],true);assert.ok(busy.props.children.includes('Đang lưu'));assert.equal(nodes(busy,n=>n.type===Icon).length,0);
assert.equal(Button({disabled:true,type:'submit'}).props.disabled,true);assert.equal(Button({type:'submit'}).props.type,'submit');
const icon=IconButton({icon:'close',label:'Đóng',loading:true});assert.equal(icon.props['aria-label'],'Đóng');assert.equal(icon.props.title,'Đóng');assert.equal(icon.props.disabled,true);assert.equal(IconButton({icon:'close',label:'Đóng',title:'Thoát'}).props.title,'Thoát');
