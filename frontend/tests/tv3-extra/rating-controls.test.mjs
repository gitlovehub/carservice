import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {RatingStars,RatingInput}=component('src/components/ui/Rating.tsx',{react:{useState:x=>[x,()=>{}]}});
assert.equal(RatingStars({value:8}).props['aria-label'],'5 trên 5 sao');assert.equal(RatingStars({value:-1}).props['aria-label'],'0 trên 5 sao');
const partial=RatingStars({value:4.5});assert.equal(partial.props['aria-label'],'4.5 trên 5 sao');assert.equal(nodes(partial,n=>n.props?.style?.width==='50%').length,1);
const changes=[],previews=[];const render=value=>RatingInput({value,label:'Đánh giá',onChange:x=>changes.push(x),onPreview:x=>previews.push(x)});
const tree=render(3);const stars=nodes(tree,n=>n.props?.role==='radio');assert.equal(stars.length,5);assert.equal(stars[2].props['aria-checked'],true);assert.equal(stars.filter(s=>s.props.tabIndex===0).length,1);
stars[4].props.onClick();assert.equal(changes.at(-1),5);stars[0].props.onMouseEnter();tree.props.onMouseLeave();assert.deepEqual(previews,[1,0]);
let prevented=0;const key=(tree,key)=>tree.props.onKeyDown({key,preventDefault:()=>prevented++});key(render(5),'ArrowRight');assert.equal(changes.at(-1),5);key(render(1),'ArrowLeft');assert.equal(changes.at(-1),1);assert.equal(prevented,2);
