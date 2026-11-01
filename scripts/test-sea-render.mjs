import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {game,seaURL,sceneURL} from './load-game.mjs';
function compileUI(file,replacements={}){
  let code=ts.transpileModule(readFileSync(new URL('../app/'+file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  for(const name of ['react/jsx-runtime','react','lucide-react'])code=code.replaceAll('"'+name+'"',JSON.stringify(import.meta.resolve(name))).replaceAll("'"+name+"'",JSON.stringify(import.meta.resolve(name)));
  for(const [name,url] of Object.entries(replacements))code=code.replaceAll("'"+name+"'",JSON.stringify(url));
  return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
}
const panelURL=compileUI('sea-battle-panel.tsx',{'./sea-battle':seaURL});
const {default:Panel,SeaBattleDesk}=await import(panelURL);
const chameleonURL=compileUI('chameleon-panel.tsx',{'./chameleon-scene':sceneURL});
const {default:PassPlay}=await import(compileUI('sea-pass-play.tsx',{'./sea-battle-panel':panelURL,'./chameleon-panel':chameleonURL}));
const {default:Setup}=await import(compileUI('round-setup.tsx',{'./game':(await import('./load-game.mjs')).gameURL}));
const m=game.createMission('UI rehearsal','9876543210',8,60,true);m.phase='games';m.startedAt=Date.now();const t=m.teams[0];
const props=()=>({battle:game.playerView(m,t).seaBattle,teamId:t.id,closed:false,busy:false,offline:false,onAction:async()=>{}});
let html=renderToStaticMarkup(createElement(Panel,props()));assert.match(html,/Ready — lock fleet/);assert.equal((html.match(/class="sea-cell/g)||[]).length,100);
const fleet=[[0,1,2,3,4],[10,11,12,13],[20,21,22],[30,31,32],[40,41]];
game.applyPlayer(m,t,'sea-deploy',{fleet});game.applyPlayer(m,m.teams[1],'sea-deploy',{fleet});
html=renderToStaticMarkup(createElement(Panel,props()));assert.match(html,/Fire one shot/);assert.equal((html.match(/class="sea-cell/g)||[]).length,200);
const desk=renderToStaticMarkup(createElement(SeaBattleDesk,{mission:m,onLocal:()=>{}}));assert.match(desk,/Team 07/);assert.equal((desk.match(/Pass &amp; play/g)||[]).length,4);
const shared=renderToStaticMarkup(createElement(PassPlay,{mission:m,battleId:m.seaBattles[0].id,onClose:()=>{},onRefresh:async()=>{}}));
assert.match(shared,/PRIVATE BOARD HIDDEN/);assert.doesNotMatch(shared,/class="sea-cell/,'Shared device must start with all grids hidden');
m.phase='lobby';const setup=renderToStaticMarkup(createElement(Setup,{mission:m,busy:false,onSave:()=>{}}));assert.equal((setup.match(/DUEL [1-4]/g)||[]).length,4);
console.log('PASS: placement and combat screens, 100-cell boards, four matchups, mode editor, and shared-device privacy curtain.');
