import assert from 'node:assert/strict';
import {overlay,nodes} from './overlay-harness.mjs';
const {Modal}=overlay('src/components/ui/Modal.tsx',{useState:x=>[x,()=>{}]});let closed=0;
const render=(open,dismissible)=>Modal({open,dismissible,bare:true,title:'Chi tiết',children:'Nội dung',onClose:()=>closed++});
assert.equal(render(false,true),null);let t=render(true,false);const backdrop=t=>nodes(t,n=>n.props?.['aria-hidden']==='true')[0].props;
backdrop(t).onMouseDown();assert.equal(closed,0);t=render(true,true);backdrop(t).onMouseDown();assert.equal(closed,1);
const dialog=nodes(t,n=>n.props?.role==='dialog')[0].props;assert.equal(dialog['aria-modal'],'true');assert.equal(dialog['aria-label'],'Chi tiết');assert.equal(dialog.tabIndex,-1);
