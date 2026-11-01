import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5173';
const login=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert.ok(cookie);
async function api(action,body={},code='',admin=false,expected=200){
  const response=await fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(admin?{Cookie:cookie}:{}),...(code?{Authorization:'Bearer '+code}:{})},body:JSON.stringify({action,...body})});
  const data=await response.json();assert.equal(response.status,expected,action+': '+JSON.stringify(data));return data;
}
const {mission:m}=await api('create',{name:'Sea Battle API rehearsal',demo:true,count:8,duration:60},'',true);
assert.equal(m.seaBattles.length,4);
const pairs=m.seaBattles.map(g=>g.teams);
await api('configure',{id:m.id,mode:'sea-battle',pairs},m.teams[0].code,false,403);
const invalid=pairs.map(p=>[...p]);invalid[0][1]=invalid[0][0];
await api('configure',{id:m.id,mode:'sea-battle',pairs:invalid},'',true,400);
const swapped=pairs.map(p=>[...p]);[swapped[0][1],swapped[1][0]]=[swapped[1][0],swapped[0][1]];
await api('configure',{id:m.id,mode:'sea-battle',pairs:swapped},'',true);
await api('configure',{id:m.id,mode:'sea-battle',pairs},'',true);
await api('start',{id:m.id},'',true);
const fleet=[[0,1,2,3,4],[10,11,12,13],[20,21,22],[30,31,32],[40,41]];
await api('sea-deploy',{id:m.id,fleet:[]},m.teams[0].code,false,400);
await Promise.all(m.teams.map(t=>api('sea-deploy',{id:m.id,fleet},t.code)));
const admin=await api('admin',{id:m.id},'',true);
for(const t of m.teams){const p=await api('player',{id:m.id},t.code);assert.ok(p.seaBattle.started);assert.equal(p.seaBattles,undefined);assert.equal(p.seaBattle.fleets,undefined);assert.deepEqual(p.seaBattle.ownFleet,fleet);assert.equal(p.phone,undefined);}
await Promise.all(admin.mission.seaBattles.map(async g=>{
  const attacker=m.teams.find(t=>t.id===g.turn),defender=m.teams.find(t=>g.teams.includes(t.id)&&t.id!==g.turn);
  await api('sea-fire',{id:m.id,cell:0},defender.code,false,400);
  const shot=await api('sea-fire',{id:m.id,cell:0,hit:false},attacker.code);assert.equal(shot.player.seaBattle.shots[0].hit,true);assert.equal(shot.player.seaBattle.yourTurn,false);
  await api('sea-fire',{id:m.id,cell:99},defender.code);
  await api('sea-fire',{id:m.id,cell:0},attacker.code,false,400);
}));
const current=(await api('admin',{id:m.id},'',true)).mission;
assert.ok(current.seaBattles.every(g=>g.shots.length===2));
const g=current.seaBattles[0],t=m.teams.find(t=>t.id===g.turn);
// Two simultaneous requests from the same turn must produce only one shot.
const races=await Promise.all([1,2].map(cell=>fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Authorization:'Bearer '+t.code},body:JSON.stringify({action:'sea-fire',id:m.id,cell})})));
assert.deepEqual(races.map(r=>r.status).sort(),[200,400]);
await api('pause',{id:m.id},'',true);
await api('sea-fire',{id:m.id,cell:3},m.teams[0].code,false,400);
await api('resume',{id:m.id},'',true);
await api('caution',{id:m.id},'',true);
await api('sea-fire',{id:m.id,cell:3},m.teams[0].code,false,400);
await api('sea-deploy',{id:m.id,fleet},m.teams[0].code,false,400);
const after=await api('player',{id:m.id},m.teams[0].code);assert.equal(after.phase,'hunt');assert.equal(after.winner,null);
await api('scan',{id:m.id,token:m.qr[0]},m.teams[0].code);
await api('end',{id:m.id},'',true);
console.log('PASS: real D1/API, organiser-only pairings, 8 concurrent deployments, four independent duels, fleet secrecy, authoritative shots, concurrent turn enforcement, pause/resume and BLACKOUT-to-hunt.');
