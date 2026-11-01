import assert from 'node:assert/strict';
import {game,cam,scene} from './load-game.mjs';
const start=1700000000000;
function mission(){const m=game.createMission('Camo rehearsal','9876543210',8,60,true);m.miniGameMode='chameleon';m.chameleonBattles=cam.createCamBattles(m.teams);m.phase='games';m.startedAt=start;return m;}
const m=mission(),g=m.chameleonBattles[0],h=m.teams.find(t=>t.id===g.legs[0].hider),s=m.teams.find(t=>g.teams.includes(t.id)&&t.id!==h.id);
assert.equal(m.chameleonBattles.length,4);assert.equal(new Set(m.chameleonBattles.flatMap(g=>g.teams)).size,8);
const figures=scene.defaultFigures();assert.equal(scene.validFigures(figures),true);
const invalid=structuredClone(figures);invalid[1].spot=invalid[0].spot;assert.equal(scene.validFigures(invalid),false);
invalid[1].spot=1;invalid[0].colors[0]='<script>';assert.equal(scene.validFigures(invalid),false);
const waiting=cam.camView(m,s,start);assert.equal(waiting.scene,null);assert.equal(waiting.figures,undefined);assert.equal(waiting.foundFigures,undefined);
assert.equal(game.playerView(m,s).chameleonBattles,undefined);
assert.ok(game.applyPlayer(m,s,'cam-lock',{figures},start).error,'Seeker cannot place hiders');
assert.ok(game.applyPlayer(m,h,'cam-save',{figures:invalid},start).error);
assert.ok(!game.applyPlayer(m,h,'cam-save',{figures},start).error);
assert.ok(!game.applyPlayer(m,h,'cam-lock',{figures},start).error);
assert.ok(game.applyPlayer(m,h,'cam-save',{figures},start).error,'Locked camouflage cannot be changed');
assert.ok(game.applyPlayer(m,h,'cam-fire',{x:400,y:250},start).error);
for(const aim of [{x:-1,y:20},{x:801,y:20},{x:0,y:NaN},{x:'400',y:250}])assert.ok(game.applyPlayer(m,s,'cam-fire',aim,start).error);
const seek=cam.camView(m,s,start);assert.ok(seek.scene.includes('<polygon'));assert.equal(seek.figures,undefined);assert.equal(seek.scene.includes('data-spot'),false,'Seeker artwork must not identify hiding spots');
function visibleAim(layout,found,index){const p=scene.projectCam(scene.CAM_SPOTS[layout[index].spot].x,scene.CAM_SPOTS[layout[index].spot].y);for(let y=p.y-68;y<=p.y;y+=2)for(let x=p.x-28;x<=p.x+28;x+=2)if(scene.pickCam(layout,found,x,y)===index)return {x,y};throw Error('Invisible target '+index);}
for(let i=0;i<scene.CAM_SPOTS.length;i++)for(let pose=0;pose<3;pose++)visibleAim([{spot:i,pose,colors:Array(6).fill('#687b75')}],[],0);
let now=start+3000;
for(let i=0;i<3;i++){
 const aim=visibleAim(g.legs[0].figures,g.legs[0].found,i);
 assert.ok(!game.applyPlayer(m,s,'cam-fire',{...aim,hit:false},now).error);assert.equal(g.legs[0].found.length,i+1);
 if(i===0)assert.ok(game.applyPlayer(m,s,'cam-fire',{x:400,y:520},now+1).error,'Shot cooldown must be authoritative');
 now+=3000;
}
assert.equal(g.leg,1);assert.equal(g.phase,'hide');assert.equal(g.legs[1].hider,s.id,'Roles must swap');assert.ok(g.legs[0].score>300);
assert.ok(!game.applyPlayer(m,s,'cam-lock',{figures},now).error);
// Use all shots without finding a figure; this ends leg two and awards the correct seeker.
for(let i=0;i<15;i++){now+=3000;assert.ok(!game.applyPlayer(m,h,'cam-fire',{x:20,y:520},now).error);}
assert.equal(g.phase,'complete');assert.equal(g.winner,s.id);assert.equal(m.winner,null,'Hunt winner must not become the winning phone call');
assert.ok(game.applyPlayer(m,h,'cam-fire',{x:1,y:1},now).error);
assert.equal(m.chameleonBattles[1].phase,'hide','Other matches remain isolated');
const timer=mission(),tg=timer.chameleonBattles[0];assert.equal(cam.advanceCam(timer,start+89999),false);assert.equal(cam.advanceCam(timer,start+90000),true);assert.equal(tg.phase,'seek');
assert.equal(cam.advanceCam(timer,start+150000),true);assert.equal(tg.phase,'hide');assert.equal(tg.leg,1);
cam.advanceCam(timer,start+300000);assert.equal(tg.phase,'complete');assert.equal(tg.draw,true);assert.equal(tg.winner,null);
const paused=mission();paused.pausedAt=start+30000;assert.equal(cam.advanceCam(paused,start+200000),false);assert.equal(cam.camView(paused,paused.teams[0],start+200000).left,60);
assert.ok(game.applyPlayer(paused,paused.teams[0],'cam-lock',{figures},start+200000).error);
paused.startedAt+=170000;paused.pausedAt=null;assert.equal(cam.advanceCam(paused,start+200000),false,'Pause must not consume hiding time');
paused.phase='hunt';assert.equal(cam.advanceCam(paused,start+500000),false);assert.ok(game.applyPlayer(paused,paused.teams[0],'cam-fire',{x:20,y:20},start+500000).error);
const restored=JSON.parse(JSON.stringify(m));assert.equal(restored.chameleonBattles[0].winner,s.id);
console.log('PASS: all hiding spots/poses visible, private placements, validated painting, role gates, server hit detection/cooldown, swap, score/winner/draw, timeouts, pause/resume, BLACKOUT and four-match isolation.');
