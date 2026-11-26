import assert from 'node:assert/strict';
import {load} from './loader.mjs';
let shell=null,path='/';const context={};
const {useOverlayArea}=load('src/components/ui/useOverlayArea.ts',{react:{useContext:c=>{assert.equal(c,context);return shell;}},'react-router-dom':{useLocation:()=>({pathname:path})},'../../layouts/ShellContext':{ShellContext:context}});
for(const [url,expected] of [['/admin/reviews','admin'],['/advisor/appointments','advisor'],['/services','customer'],['/','customer']]){path=url;assert.equal(useOverlayArea(),expected);}
path='/admin/reviews';shell='advisor';assert.equal(useOverlayArea(),'advisor');shell='customer';assert.equal(useOverlayArea(),'customer');
