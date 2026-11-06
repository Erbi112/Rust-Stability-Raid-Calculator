import test from 'node:test';
import assert from 'node:assert/strict';
import {canvasInteraction,workspaceLayout,viewportDialogPosition} from '../src/core/module-layout.ts';

test('construction catalog exists only in Canvas Studio',()=>{
 assert.equal(workspaceLayout('studio'),'construction');
 assert.equal(canvasInteraction('studio'),'build');
 for(const m of ['dashboard','library','stability','settings'] as const){
  assert.equal(workspaceLayout(m),'fullscreen');
  assert.equal(canvasInteraction(m),'inspect');
 }
 assert.equal(workspaceLayout('raid'),'raid');
 assert.equal(canvasInteraction('raid'),'raid');
});
test('editor and raid menu stay inside browser viewport near right/bottom edge',()=>{
 for(const [x,y,w,h] of [[1800,920,1920,1080],[700,700,800,800],[115,400,320,600],[10,5,1366,768]] as const){
  for(const [dialogW,dialogH] of [[345,620],[355,465]]){
   const p=viewportDialogPosition(x,y,w,h,dialogW,dialogH);
   assert.ok(p.left>=12 && p.left+p.width<=w-12+1e-5);
   assert.ok(p.top>=12 && p.top+p.maxHeight<=h-12+1e-5);
   assert.ok(p.maxHeight>0);
  }
 }
});
test('narrow viewport popup becomes scrollable instead of overflowing',()=>{
 const p=viewportDialogPosition(290,280,320,430,345,620);
 assert.equal(p.width,296);
 assert.ok(p.maxHeight<=406);
});
