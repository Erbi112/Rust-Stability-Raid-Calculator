/** Module-specific workspace behavior; no construction controls outside Canvas Studio. */
export type WorkspaceModule='studio'|'raid'|'stability'|'dashboard'|'library'|'settings';
export type WorkspaceLayout='construction'|'raid'|'fullscreen';
export function workspaceLayout(module:WorkspaceModule):WorkspaceLayout {
 if(module==='studio')return 'construction';
 if(module==='raid')return 'raid';
 return 'fullscreen';
}
export type CanvasInteraction='build'|'raid'|'inspect';
export function canvasInteraction(module:WorkspaceModule):CanvasInteraction {
 return module==='studio'?'build':module==='raid'?'raid':'inspect';
}
/** Position a dialog relative to the *browser viewport*, not the clipped canvas.
 * The returned maxHeight always fits below top and leaves breathing room. */
export function viewportDialogPosition(x:number,y:number,viewportWidth:number,viewportHeight:number,
 requestedWidth=345,requestedHeight=620){
 const margin=12;
 const width=Math.max(0,Math.min(requestedWidth,viewportWidth-2*margin));
 const expectedHeight=Math.max(0,Math.min(requestedHeight,viewportHeight-2*margin));
 const leftCandidate=x+14+width<=viewportWidth-margin?x+14:x-width-14;
 const left=Math.max(margin,Math.min(viewportWidth-margin-width,leftCandidate));
 const top=Math.max(margin,Math.min(y-18,viewportHeight-margin-expectedHeight));
 return {left,top,width,maxHeight:Math.max(0,viewportHeight-top-margin)};
}
