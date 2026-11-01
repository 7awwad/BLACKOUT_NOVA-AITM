import type {Mission,Team} from './game';
import {camScene,defaultFigures,pickCam,validFigures,type CamFigure} from './chameleon-scene';
export const CAM_HIDE_MS=90000,CAM_SEEK_MS=60000,CAM_MAX_SHOTS=15,CAM_COOLDOWN_MS=2500;
export type CamLeg={hider:string;figures:CamFigure[];found:number[];shots:{x:number;y:number;hit:boolean;at:number}[];score:number};
export type CamBattle={id:string;teams:[string,string];leg:number;phase:'hide'|'seek'|'complete';phaseStarted:number;legs:[CamLeg,CamLeg];winner:string|null;draw:boolean};
export type CamView={id:string;phase:CamBattle['phase'];leg:number;role:'hider'|'seeker';opponent:string;hiderName:string;seekerName:string;activeTeamId:string|null;left:number;serverNow:number;paused:boolean;cooldown:number;shotsLeft:number;found:number;scene:string|null;figures?:CamFigure[];foundFigures?:number[];shots:{x:number;y:number;hit:boolean}[];scores:{team:string;score:number}[];winner:string|null;won:boolean;draw:boolean};
export function camElapsed(m:Mission,now=Date.now()){return m.startedAt===null?0:Math.max(0,(m.pausedAt??now)-m.startedAt);}
export function createCamBattles(teams:Team[]):CamBattle[]{
  const out:CamBattle[]=[];
  for(let i=0;i+1<teams.length;i+=2){const first=crypto.getRandomValues(new Uint8Array(1))[0]%2;const a=teams[i+first].id,b=teams[i+1-first].id;
    out.push({id:crypto.randomUUID(),teams:[teams[i].id,teams[i+1].id],leg:0,phase:'hide',phaseStarted:0,legs:[{hider:a,figures:defaultFigures(),found:[],shots:[],score:0},{hider:b,figures:defaultFigures(),found:[],shots:[],score:0}],winner:null,draw:false});
  }return out;
}
function finishLeg(g:CamBattle,at:number):boolean{
  if(g.leg===0){g.leg=1;g.phase='hide';g.phaseStarted=at;return false;}
  g.phase='complete';
  // Each leg's points belong to its seeker, so both teams get one hunt.
  const first=g.legs[0],second=g.legs[1];
  g.draw=first.score===second.score;
  g.winner=g.draw?null:first.score>second.score?second.hider:first.hider;
  return true;
}
export function advanceCam(m:Mission,now=Date.now()):boolean{
  if(m.miniGameMode!=='chameleon'||m.phase!=='games'||m.startedAt===null||m.pausedAt||(now-m.startedAt)>=m.duration*60000)return false;
  let changed=false;const elapsed=camElapsed(m,now);
  for(const g of m.chameleonBattles??[]){
    for(let i=0;i<4&&g.phase!=='complete';i++){
      const deadline=g.phaseStarted+(g.phase==='hide'?CAM_HIDE_MS:CAM_SEEK_MS);if(elapsed<deadline)break;
      changed=true;
      if(g.phase==='hide'){g.phase='seek';g.phaseStarted=deadline;}else finishLeg(g,deadline);
    }
  }return changed;
}
export function camView(m:Mission,t:Team,now=Date.now()):CamView|null{
  const g=m.chameleonBattles?.find(g=>g.teams.includes(t.id));if(!g)return null;
  const leg=g.legs[g.leg],opponentId=g.teams.find(id=>id!==t.id)!,seekerId=g.teams.find(id=>id!==leg.hider)!;
  const name=(id:string)=>m.teams.find(t=>t.id===id)?.name??'Team';const role=leg.hider===t.id?'hider':'seeker',elapsed=camElapsed(m,now);
  const figures=role==='hider'?{figures:leg.figures,foundFigures:leg.found}:{};
  const activeTeamId=g.phase==='complete'?null:g.phase==='hide'?leg.hider:seekerId;
  return {id:g.id,phase:g.phase,leg:g.leg,role,opponent:name(opponentId),hiderName:name(leg.hider),seekerName:name(seekerId),activeTeamId,left:g.phase==='complete'?0:Math.max(0,Math.ceil((g.phaseStarted+(g.phase==='hide'?CAM_HIDE_MS:CAM_SEEK_MS)-elapsed)/1000)),serverNow:now,paused:!!m.pausedAt,cooldown:Math.max(0,CAM_COOLDOWN_MS-(elapsed-(leg.shots.at(-1)?.at??-CAM_COOLDOWN_MS))),shotsLeft:CAM_MAX_SHOTS-leg.shots.length,found:leg.found.length,scene:g.phase==='seek'?camScene(leg.figures,leg.found):null,...figures,shots:leg.shots.map(({x,y,hit})=>({x,y,hit})),scores:g.teams.map(id=>({team:name(id),score:g.legs.filter(l=>l.hider!==id).reduce((s,l)=>s+l.score,0)})),winner:g.winner?name(g.winner):null,won:g.winner===t.id,draw:g.draw};
}
export function applyCam(m:Mission,t:Team,action:string,body:any,now:number):{error?:string;message?:string}{
  if(m.miniGameMode!=='chameleon'||m.phase!=='games')return {error:'Chameleon Hunt is not active in this mission.'};
  advanceCam(m,now);const g=m.chameleonBattles?.find(g=>g.teams.includes(t.id));if(!g)return {error:'Your team has no Chameleon matchup.'};
  if(g.phase==='complete')return {error:'Both hunts have finished. Wait for BLACKOUT.'};
  const leg=g.legs[g.leg],elapsed=camElapsed(m,now),hider=t.id===leg.hider;
  if(action==='cam-save'||action==='cam-lock'){
    if(g.phase!=='hide'||!hider)return {error:'Only the hiding team can edit camouflage during preparation.'};
    if(!validFigures(body.figures))return {error:'Place three chameleons in different spots and use the available poses and paint colours.'};
    leg.figures=body.figures.map((f:CamFigure)=>({spot:f.spot,pose:f.pose,colors:[...f.colors]}));
    if(action==='cam-lock'){g.phase='seek';g.phaseStarted=elapsed;m.log.unshift({at:now,text:t.name+' locked their Chameleon camouflage'});}
    return {message:action==='cam-lock'?'Camouflage locked. The other team has 60 seconds to seek.':'Camouflage saved.'};
  }
  if(action!=='cam-fire')return {error:'Unknown camouflage action.'};
  if(g.phase!=='seek'||hider)return {error:'Only the seeking team can fire during a hunt.'};
  if(leg.shots.length>=CAM_MAX_SHOTS)return {error:'No shots left in this hunt.'};
  if(leg.shots.length&&elapsed-leg.shots.at(-1)!.at<CAM_COOLDOWN_MS)return {error:'Your scanner is recharging. Wait a moment.'};
  const {x,y}=body;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>800||y<0||y>540)return {error:'Aim inside the arena.'};
  const found=pickCam(leg.figures,leg.found,x,y),hit=found!==null;
  leg.shots.push({x,y,hit,at:elapsed});
  if(found!==null){leg.found.push(found);leg.score+=100+Math.max(0,Math.floor((g.phaseStarted+CAM_SEEK_MS-elapsed)/1000));}
  if(leg.found.length===3||leg.shots.length===CAM_MAX_SHOTS){const complete=finishLeg(g,elapsed);if(complete)m.log.unshift({at:now,text:g.draw?'Chameleon Hunt ended in a draw':'Chameleon Hunt won by '+m.teams.find(t=>t.id===g.winner)?.name});}
  return {message:hit?'Chameleon found!':'Empty scenery. Look for a painted silhouette.'};
}
