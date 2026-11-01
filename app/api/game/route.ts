import { env } from 'cloudflare:workers';
import {createMission,playerView,applyPlayer,timeLeft,puzzles,type Mission} from '../../game';
import {pairBattles} from '../../sea-battle';
import {advanceCam,createCamBattles} from '../../chameleon';
export const dynamic='force-dynamic';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request) {return handle(req);}
export async function POST(req:Request) {return handle(req);}
async function handle(req:Request) {
 try {
  const db=env.DB;if(!db)return json({error:'Database is not connected.'},503);
  const u=new URL(req.url);const b=req.method==='POST'?await req.json() as any:{};
  if(req.method==='POST'&&req.headers.get('origin')!==u.origin)return json({error:'Invalid request origin.'},403);
  const uid=req.headers.get('oai-authenticated-user-id');
  const action=b.action??u.searchParams.get('action')??'list';
  if(req.method==='GET'&&!['list','admin','player'].includes(action))return json({error:'Use POST for game actions.'},405);
  const code=(req.headers.get('authorization')??'').replace(/^Bearer /,'').toUpperCase();
  if(action==='list') {
    if(!uid)return json({error:'Sign in to open the organiser desk.'},401);
    const rows=await db.prepare('SELECT id,data FROM missions WHERE owner=? ORDER BY created DESC LIMIT 20').bind(uid).all<any>();
    return json({missions:rows.results.map((r:any)=>{const m=JSON.parse(r.data);return {id:r.id,name:m.name,phase:m.phase,demo:m.demo};})});
  }
  if(action==='create') {
    if(!uid)return json({error:'Sign in to create a mission.'},401);
    const phone=String(b.phone??'').replace(/\s/g,''); const demo=!!b.demo;
    if(!demo&&!/^[6-9]\d{9}$/.test(phone))return json({error:'Enter the coordinator’s 10-digit Indian mobile number.'},400);
    const count=Math.min(10,Math.max(1,Number(b.count)||5));const duration=Math.min(90,Math.max(5,Number(b.duration)||60));
    const m=createMission(String(b.name||'BLACKOUT / Round 02').slice(0,80),demo?'0000000000':phone,Math.floor(count),duration,demo);
    await db.prepare('INSERT INTO missions(id,owner,data,version,created) VALUES(?,?,?,0,?)').bind(m.id,uid,JSON.stringify(m),Date.now()).run();return json({mission:m});
  }
  const id=b.id??u.searchParams.get('id');if(!id)return json({error:'Mission not found.'},404);
  for(let retry=0;retry<24;retry++) {
    if(retry)await new Promise(resolve=>setTimeout(resolve,10+Math.random()*35));
    const row=await db.prepare('SELECT * FROM missions WHERE id=?').bind(id).first<any>();if(!row)return json({error:'Mission not found.'},404);
    const m:Mission=JSON.parse(row.data);if(m.qr.length>3){m.qr=m.qr.slice(0,3);m.teams.forEach(t=>{t.clues=t.clues.filter(i=>i<3);});}const isAdmin=uid&&row.owner===uid;const t=m.teams.find(t=>t.code===code);
    // Advance server-owned hide/seek deadlines without overwriting concurrent moves.
    if((action==='admin'&&isAdmin||action==='player'&&t)&&advanceCam(m)){
      const savedTimer=await db.prepare('UPDATE missions SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(m),id,row.version).run();
      if(!savedTimer.meta.changes)continue;
    }
    if(action==='admin') {if(!isAdmin)return json({error:'Only this mission’s organiser can access the desk.'},403);return json({mission:{...m,puzzles:m.puzzles??puzzles},serverNow:Date.now(),left:timeLeft(m)});}
    if(action==='player') {if(!t)return json({error:'Team code not recognised. Check your invitation.'},403);return json(playerView(m,t));}
    let result:any={};
    if(['start','caution','pause','resume','end','winner','rename','configure'].includes(action)) {
      if(!isAdmin)return json({error:'Organiser access required.'},403);
      const now=Date.now();
      if(action==='configure'){
        if(m.phase!=='lobby')return json({error:'Edit the round before it starts.'},400);
        const mode=b.mode??m.miniGameMode??'puzzles';
        if(!['puzzles','sea-battle','chameleon'].includes(mode))return json({error:'Choose a valid mini-game mode.'},400);
        if(mode==='sea-battle'||mode==='chameleon'){
          if(m.teams.length<2||m.teams.length%2!==0)return json({error:'Team duels need an even number of teams: 2, 4, 6, 8 or 10. Create a mission with an even team count.'},400);
          if(b.pairs!==undefined){
            const pairs=b.pairs;
            if(!Array.isArray(pairs)||pairs.length!==m.teams.length/2||pairs.some((p:any)=>!Array.isArray(p)||p.length!==2||p.some((id:any)=>typeof id!=='string'||!m.teams.some(t=>t.id===id)))||new Set(pairs.flat()).size!==m.teams.length)return json({error:'Assign every team exactly once, with two different teams in each duel.'},400);
            const teams=pairs.flat().map((id:string)=>m.teams.find(t=>t.id===id)!);
            if(mode==='sea-battle'&&JSON.stringify(m.seaBattles?.map(g=>g.teams))!==JSON.stringify(pairs))m.seaBattles=pairBattles(teams);
            if(mode==='chameleon'&&JSON.stringify(m.chameleonBattles?.map(g=>g.teams))!==JSON.stringify(pairs))m.chameleonBattles=createCamBattles(teams);
          }else if(mode==='sea-battle'&&!m.seaBattles)m.seaBattles=pairBattles(m.teams);
          else if(mode==='chameleon'&&!m.chameleonBattles)m.chameleonBattles=createCamBattles(m.teams);
        }
        m.miniGameMode=mode;
        if(b.puzzles!==undefined){
        if(!Array.isArray(b.puzzles)||b.puzzles.length!==2)return json({error:'Provide exactly two mini games.'},400);
        const fields=['title','question','hint','answer'];
        if(b.puzzles.some((p:any)=>!p||fields.some(k=>typeof p[k]!=='string'||!p[k].trim()||p[k].length>(k==='question'?1500:300))))return json({error:'Complete every field. Questions allow 1500 characters; other fields allow 300.'},400);
        m.puzzles=b.puzzles.map((p:any,i:number)=>({title:p.title.trim(),type:i===0?'RIDDLE':'LOGIC',question:p.question.trim(),hint:p.hint.trim(),answer:p.answer.toLowerCase().trim().replace(/^a /,'')}));
        }
      }
      if(action==='start'){if(m.phase!=='lobby')return json({error:'This round has already started.'},400);if((m.miniGameMode==='sea-battle'&&(!m.seaBattles||m.seaBattles.length*2!==m.teams.length))||(m.miniGameMode==='chameleon'&&(!m.chameleonBattles||m.chameleonBattles.length*2!==m.teams.length)))return json({error:'Pair every team in Round setup before starting.'},400);m.phase='games';m.startedAt=now;}
      if(action==='caution'){if(m.phase!=='games')return json({error:'Start the mini games first.'},400);m.phase='hunt';}
      if(action==='pause'){if(!m.startedAt||m.phase==='ended')return json({error:'No active round to pause.'},400);m.pausedAt??=now;}
      if(action==='resume'&&m.pausedAt){m.startedAt!+=now-m.pausedAt;m.pausedAt=null;}
      if(action==='end'){m.phase='ended';}
      if(action==='winner') {const winner=m.teams.find(t=>t.id===b.teamId);if(!winner?.readyAt)return json({error:'Choose a team that has verified its number.'},400);if(m.winner)return json({error:'A winner is already confirmed.'},400);m.winner=winner.id;m.phase='ended';}
      if(action==='rename'){if(m.phase!=='lobby')return json({error:'Rename teams before starting.'},400);const team=m.teams.find(t=>t.id===b.teamId);if(team)team.name=String(b.name||team.name).slice(0,40);}
      m.log.unshift({at:now,text:action==='winner'?'First call confirmed: '+m.teams.find(t=>t.id===m.winner)?.name:'Organiser: '+action});
      result={mission:m,message:'Control updated.'};
    } else {
      if(!t)return json({error:'A valid team code is required.'},403);
      result=applyPlayer(m,t,action,b);if(result.error)return json(result,400);
      result={...result,player:playerView(m,t)};
    }
    m.log=m.log.slice(0,150);
    const saved=await db.prepare('UPDATE missions SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(m),id,row.version).run();
    if(saved.meta.changes)return json(result);
  }
  return json({error:'The desk is busy. Try again.'},409);
 }catch(e){console.error('Game request failed',e);return json({error:'Unable to reach mission control. Please retry.'},500);}
}
