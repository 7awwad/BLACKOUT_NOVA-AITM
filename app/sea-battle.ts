import type {Mission,Team} from './game';

export const SEA_SIZE=10;
export const SEA_SHIPS=[{name:'Carrier',size:5},{name:'Battleship',size:4},{name:'Cruiser',size:3},{name:'Submarine',size:3},{name:'Destroyer',size:2}];
export type Fleet=number[][];
export type SeaShot={by:string;cell:number;hit:boolean;sunk:boolean;at:number};
export type SeaBattle={id:string;teams:[string,string];fleets:Record<string,Fleet>;shots:SeaShot[];turn:string;winner:string|null;startedAt:number|null;finishedAt:number|null};
export type SeaView={id:string;opponent:string;opponentId:string;ownFleet:Fleet|null;opponentReady:boolean;shots:SeaShot[];incoming:SeaShot[];yourTurn:boolean;winner:string|null;won:boolean;remaining:number;opponentRemaining:number;started:boolean};

export function pairBattles(teams:Team[]):SeaBattle[]{
  const matches:SeaBattle[]=[];
  for(let i=0;i+1<teams.length;i+=2)matches.push({id:crypto.randomUUID(),teams:[teams[i].id,teams[i+1].id],fleets:{},shots:[],turn:teams[i+(crypto.getRandomValues(new Uint8Array(1))[0]%2)].id,winner:null,startedAt:null,finishedAt:null});
  return matches;
}
export function validFleet(fleet:unknown):fleet is Fleet{
  if(!Array.isArray(fleet)||fleet.length!==SEA_SHIPS.length)return false;
  const used=new Set<number>();
  return fleet.every((ship,i)=>{
    if(!Array.isArray(ship)||ship.length!==SEA_SHIPS[i].size)return false;
    if(ship.some(c=>!Number.isInteger(c)||c<0||c>=SEA_SIZE*SEA_SIZE||used.has(c)))return false;
    const cells=[...ship].sort((a,b)=>a-b);
    if(new Set(cells).size!==cells.length)return false;
    const horizontal=cells.every((c,n)=>Math.floor(c/SEA_SIZE)===Math.floor(cells[0]/SEA_SIZE)&&c===cells[0]+n);
    const vertical=cells.every((c,n)=>c===cells[0]+n*SEA_SIZE);
    if(!horizontal&&!vertical)return false;
    cells.forEach(c=>used.add(c));return true;
  });
}
export function randomFleet():Fleet{
  const fleet:Fleet=[];const used=new Set<number>();
  for(const {size} of SEA_SHIPS){
    let cells:number[]=[];
    do{const vertical=Math.random()<.5;const row=Math.floor(Math.random()*(vertical?SEA_SIZE-size+1:SEA_SIZE));const col=Math.floor(Math.random()*(vertical?SEA_SIZE:SEA_SIZE-size+1));cells=Array.from({length:size},(_,i)=>(row+(vertical?i:0))*SEA_SIZE+col+(vertical?0:i));}while(cells.some(c=>used.has(c)));
    fleet.push(cells);cells.forEach(c=>used.add(c));
  }
  return fleet;
}
export function seaBattleView(m:Mission,t:Team):SeaView|null{
  const g=m.seaBattles?.find(g=>g.teams.includes(t.id));if(!g)return null;
  const opponentId=g.teams.find(id=>id!==t.id)!;
  const shots=g.shots.filter(s=>s.by===t.id),incoming=g.shots.filter(s=>s.by!==t.id);
  return {id:g.id,opponent:m.teams.find(t=>t.id===opponentId)?.name??'Opponent',opponentId,ownFleet:g.fleets[t.id]??null,opponentReady:!!g.fleets[opponentId],shots,incoming,yourTurn:g.turn===t.id,winner:m.teams.find(t=>t.id===g.winner)?.name??null,won:g.winner===t.id,remaining:5-incoming.filter(s=>s.sunk).length,opponentRemaining:5-shots.filter(s=>s.sunk).length,started:g.startedAt!==null};
}
export function applySeaBattle(m:Mission,t:Team,action:string,body:any,now:number):{error?:string;message?:string}{
  if(m.miniGameMode!=='sea-battle')return {error:'Sea Battle is not selected for this mission.'};
  if(m.phase!=='games')return {error:'Sea Battle is closed. Follow the current mission phase.'};
  const g=m.seaBattles?.find(g=>g.teams.includes(t.id));if(!g)return {error:'The organiser has not assigned an opponent to your team.'};
  if(g.winner)return {error:'This battle has finished.'};
  const opponent=g.teams.find(id=>id!==t.id)!;
  if(action==='sea-deploy'){
    if(g.fleets[t.id])return {error:'Your fleet is already locked.'};
    if(!validFleet(body.fleet))return {error:'Place all five straight ships inside the grid without overlaps.'};
    g.fleets[t.id]=body.fleet.map((s:number[])=>[...s]);
    if(g.fleets[opponent]){g.startedAt=now;m.log.unshift({at:now,text:`Sea Battle started: ${m.teams.find(x=>x.id===g.teams[0])?.name} vs ${m.teams.find(x=>x.id===g.teams[1])?.name}`});}
    return {message:g.startedAt?'Both fleets locked. Battle begins.':'Fleet locked. Waiting for your opponent.'};
  }
  if(action!=='sea-fire')return {error:'Unknown naval action.'};
  if(!g.startedAt||!g.fleets[t.id]||!g.fleets[opponent])return {error:'Both teams must lock their fleets first.'};
  if(g.turn!==t.id)return {error:'Wait for your opponent to fire.'};
  const cell=body.cell;
  if(!Number.isInteger(cell)||cell<0||cell>=SEA_SIZE*SEA_SIZE)return {error:'Choose a valid grid square.'};
  if(g.shots.some(s=>s.by===t.id&&s.cell===cell))return {error:'You already fired at that square. Choose another.'};
  const ship=g.fleets[opponent].find(s=>s.includes(cell));
  const previousHits=new Set(g.shots.filter(s=>s.by===t.id&&s.hit).map(s=>s.cell));previousHits.add(cell);
  const sunk=!!ship&&ship.every(c=>previousHits.has(c));
  g.shots.push({by:t.id,cell,hit:!!ship,sunk,at:now});
  // Every shot passes the turn, including a hit or a sunk ship.
  g.turn=opponent;
  if(g.fleets[opponent].every(s=>s.every(c=>previousHits.has(c)))){
    g.winner=t.id;g.finishedAt=now;m.log.unshift({at:now,text:t.name+' won Sea Battle'});
    return {message:'Enemy fleet destroyed. You win Sea Battle!'};
  }
  return {message:sunk?'SUNK. Turn passed to your opponent.':ship?'HIT. Turn passed to your opponent.':'MISS. Turn passed to your opponent.'};
}
