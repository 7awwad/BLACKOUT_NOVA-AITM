import {applySeaBattle,pairBattles,seaBattleView,type SeaBattle} from './sea-battle';
import {applyCam,camView,type CamBattle} from './chameleon';
export type Team = {id:string; name:string; code:string; solved:number[]; clues:number[]; readyAt:number|null; lastTry:number; hints:number};
export type Puzzle = {title:string;type:string;question:string;hint:string;answer:string};
export type Mission = {miniGameMode?:'puzzles'|'sea-battle'|'chameleon';chameleonBattles?:CamBattle[];seaBattles?:SeaBattle[];puzzles?:Puzzle[];id:string; name:string; phone:string; demo:boolean; phase:'lobby'|'games'|'hunt'|'ended'; duration:number; startedAt:number|null; pausedAt:number|null; winner:string|null; teams:Team[]; qr:string[]; log:{at:number;text:string}[]};
export const puzzles = [
  {title:'The silent witness',type:'RIDDLE',question:'I have cities, but no houses. Mountains, but no trees. Water, but no fish. What am I?',hint:'You might unfold one to find your way.',answer:'map'},
  {title:'Repair the sequence',type:'LOGIC',question:'One value is missing from the signal: 3 · 7 · 15 · 31 · ?\nRecover the next number.',hint:'Double the previous value, then add one.',answer:'63'}
];
export const fragments = [
  {name:'ECHO',position:2,start:3,end:6,hint:'I stand between the beginning and the end.'},
  {name:'NOVA',position:1,start:0,end:3,hint:'Every connection begins with me.'},
  {name:'VOID',position:3,start:6,end:10,hint:'My four digits close the number. Nothing follows me.'}
];
export function createMission(name:string,phone:string,count:number,duration:number,demo:boolean):Mission {
  const m:Mission={id:crypto.randomUUID(),name,phone,demo,phase:'lobby',duration,startedAt:null,pausedAt:null,winner:null,
    teams:Array.from({length:count},(_,i)=>({id:crypto.randomUUID(),name:'Team '+String(i+1).padStart(2,'0'),code:crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),solved:[],clues:[],readyAt:null,lastTry:0,hints:0})),
    qr:fragments.map(()=>crypto.randomUUID()),log:[{at:Date.now(),text:demo?'Practice mission created':'Mission created'}]};
  m.miniGameMode=count>=2&&count%2===0?'sea-battle':'puzzles';
  if(m.miniGameMode==='sea-battle')m.seaBattles=pairBattles(m.teams);
  return m;
}
export function timeLeft(m:Mission,now=Date.now()) {return m.startedAt===null?m.duration*60:Math.max(0,Math.ceil((m.duration*60000-((m.pausedAt??now)-m.startedAt))/1000));}
export function playerView(m:Mission,t:Team) {
  return {id:m.id,name:m.name,demo:m.demo,phase:m.phase,duration:m.duration,startedAt:m.startedAt,pausedAt:m.pausedAt,left:timeLeft(m),serverNow:Date.now(),winner:m.teams.find(x=>x.id===m.winner)?.name??null,
    team:{id:t.id,name:t.name,solved:t.solved,readyAt:t.readyAt,hints:t.hints},
    miniGameMode:m.miniGameMode??'puzzles',seaBattle:m.miniGameMode==='sea-battle'?seaBattleView(m,t):null,
    chameleon:m.miniGameMode==='chameleon'?camView(m,t):null,
    puzzles:(m.puzzles??puzzles).map(({answer,...p})=>({...p,hint:undefined})),
    clues:t.clues.map(i=>({...fragments[i],digits:m.phone.slice(fragments[i].start,fragments[i].end),index:i})),
    phone:t.readyAt?m.phone:undefined,
    demoScans:m.demo?m.qr:undefined};
}
export function applyPlayer(m:Mission,t:Team,a:string,b:any,now=Date.now()):{error?:string;message?:string;hint?:string} {
  if(m.phase==='lobby')return {error:'The organiser has not started the round yet.'};
  if(m.phase==='ended'||m.winner||timeLeft(m,now)<=0)return {error:'This round has closed.'};
  if(m.pausedAt)return {error:'The organiser has paused the clock.'};
  if(a.startsWith('cam-'))return applyCam(m,t,a,b,now);
  if(a.startsWith('sea-'))return applySeaBattle(m,t,a,b,now);
  if(m.miniGameMode==='sea-battle'&&(a==='answer'||a==='hint'))return {error:'Play Sea Battle in this mission.'};
  if(m.miniGameMode==='chameleon'&&(a==='answer'||a==='hint'))return {error:'Play Chameleon Hunt in this mission.'};
  if(a==='scan') {
    if(m.phase!=='hunt')return {error:'Wait for the organiser to trigger the caution alert.'};
    const i=m.qr.indexOf(b.token); if(i<0)return {error:'This clue does not belong to this mission.'};
    if(!t.clues.includes(i)){t.clues.push(i);m.log.unshift({at:now,text:t.name+' recovered '+fragments[i].name});}
    return {message:'Signal fragment recovered.'};
  }
  if((a==='answer'||a==='hint')&&m.phase!=='games')return {error:'Mini games have stopped. Continue with the QR hunt.'};
  if(now-t.lastTry<3000)return {error:'Wait a few seconds before trying again.'};
  t.lastTry=now;
  if(a==='hint') {const p=(m.puzzles??puzzles)[b.index];if(!p)return {error:'Unknown puzzle.'};t.hints++;return {hint:p.hint,message:'Hint revealed. Hint use is logged; no automatic time penalty.'};}
  if(a==='answer') {
    const i=Number(b.index);const p=(m.puzzles??puzzles)[i];if(!p)return {error:'Unknown puzzle.'};
    if(String(b.answer??'').toLowerCase().trim().replace(/^a /,'')!==p.answer)return {message:'Not quite. Check your answer and try again.'};
    if(!t.solved.includes(i)){t.solved.push(i);m.log.unshift({at:now,text:t.name+' solved '+p.title});}
    return {message:'Challenge cleared.'};
  }
  if(a==='decode') {
    if(m.phase!=='hunt'||t.clues.length!==3)return {error:'Recover all three fragments first.'};
    if(String(b.number??'').replace(/\s/g,'')!==m.phone)return {message:'That combination does not connect. Recheck the order.'};
    if(!t.readyAt){t.readyAt=now;m.log.unshift({at:now,text:t.name+' decoded the number — ready to call'});}
    return {message:m.demo?'Practice number recovered. Simulate the call at the control desk.':'Number verified. Call the coordinator now.'};
  }
  return {error:'Unknown action.'};
}
