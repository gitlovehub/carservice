import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
let pathname='',shell=null;
const {useOverlayArea}=component('src/components/ui/useOverlayArea.ts',{react:{useContext:()=>shell},'react-router-dom':{useLocation:()=>({pathname})},'../../layouts/ShellContext':{ShellContext:{}}});
for(const [path,expected] of [['/admin','admin'],['/admin/users','admin'],['/advisor','advisor'],['/advisor/bookings','advisor'],['/administrator','customer'],['/advisory','customer'],['/','customer']]){pathname=path;assert.equal(useOverlayArea(),expected);}
shell='admin';pathname='/';assert.equal(useOverlayArea(),'admin');
