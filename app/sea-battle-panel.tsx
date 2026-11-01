'use client';
import {useEffect,useState} from 'react';
import {Anchor,Crosshair,RotateCw,Shuffle,ShieldCheck,Check,Radio,Flag} from 'lucide-react';
import {SEA_SHIPS,SEA_SIZE,randomFleet,type Fleet,type SeaView} from './sea-battle';
import type {Mission} from './game';

const coordinate=(cell:number)=>String.fromCharCode(65+Math.floor(cell/SEA_SIZE))+(cell%SEA_SIZE+1);
type BoardProps={fleet?:Fleet|null;shots:{cell:number;hit:boolean;sunk:boolean}[];onCell?:(cell:number)=>void;disabled?:boolean;target?:number|null;preview?:number[];onHover?:(cell:number|null)=>void;label:string};
function Board({fleet,shots,onCell,disabled,target,preview=[],onHover,label}:BoardProps){
  const occupied=new Set(fleet?.flat()??[]);
  return <div className="sea-board" role="group" aria-label={label}>
    <span className="sea-axis"/>{Array.from({length:10},(_,i)=><span className="sea-axis" key={'col'+i}>{i+1}</span>)}
    {Array.from({length:10},(_,row)=><div className="sea-row" key={row}><span className="sea-axis">{String.fromCharCode(65+row)}</span>{Array.from({length:10},(_,col)=>{
      const cell=row*10+col,shot=shots.find(s=>s.cell===cell),ship=occupied.has(cell),selected=target===cell;
      const status=shot?(shot.hit?'Hit':'Miss'):ship?'Your ship':'Water';
      return <button type="button" key={cell} className={'sea-cell'+(ship?' ship':'')+(shot?(shot.hit?' hit':' miss'):'')+(selected?' target':'')+(preview.includes(cell)?' preview':'')} aria-label={`${coordinate(cell)}: ${status}${selected?', selected target':''}`} aria-pressed={onCell?selected:undefined} disabled={disabled||!!shot||!onCell} onClick={()=>onCell?.(cell)} onMouseEnter={()=>onHover?.(cell)} onMouseLeave={()=>onHover?.(null)}>{shot?(shot.hit?'×':'·'):selected?<Crosshair size={18}/>:ship?<span className="sea-hull"/>:null}</button>;
    })}</div>)}
  </div>;
}

export default function SeaBattlePanel({battle,teamId,closed,busy,offline,onAction}:{battle:SeaView|null;teamId:string;closed:boolean;busy:boolean;offline:boolean;onAction:(action:string,body:any)=>Promise<void>}){
  const [fleet,setFleet]=useState<Fleet>(SEA_SHIPS.map(()=>[])),[ship,setShip]=useState(0),[vertical,setVertical]=useState(false),[hover,setHover]=useState<number|null>(null),[target,setTarget]=useState<number|null>(null),[error,setError]=useState('');
  const draftKey='blackout-sea-draft:'+battle?.id+':'+teamId;
  useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(Array.isArray(saved)&&saved.length===5&&saved.every(s=>Array.isArray(s)&&s.every(c=>Number.isInteger(c)&&c>=0&&c<100)))setFleet(saved);}catch{}},[draftKey]);
  useEffect(()=>{setTarget(null)},[battle?.shots.length,battle?.yourTurn]);
  const changeFleet=(next:Fleet)=>{setFleet(next);setError('');try{sessionStorage.setItem(draftKey,JSON.stringify(next))}catch{}};
  if(!battle)return <section className="panel waiting"><Anchor size={42}/><h2>Waiting for a matchup.</h2><p>Your organiser needs to pair your team before the battle can begin.</p></section>;
  const locked=!!battle.ownFleet,disabled=closed||busy||offline,canFire=locked&&battle.started&&battle.yourTurn&&!battle.winner&&!disabled;
  const cellsAt=(cell:number)=>Array.from({length:SEA_SHIPS[ship].size},(_,i)=>cell+i*(vertical?10:1));
  const fits=(cells:number[])=>cells.every(c=>c>=0&&c<100)&&(vertical||cells.every(c=>Math.floor(c/10)===Math.floor(cells[0]/10)));
  const overlaps=(cells:number[])=>fleet.some((s,i)=>i!==ship&&s.some(c=>cells.includes(c)));
  const place=(cell:number)=>{
    const cells=cellsAt(cell);if(!fits(cells)||overlaps(cells)){setError('That ship needs a clear straight space inside the grid.');return;}
    const next=fleet.map((s,i)=>i===ship?cells:s);changeFleet(next);const empty=next.findIndex(s=>!s.length);if(empty!==-1)setShip(empty);
  };
  const preview=hover!==null?cellsAt(hover):[];
  const last=battle.shots.at(-1),incoming=battle.incoming.at(-1);
  return <section className="panel sea-panel">
    <div className="sea-heading"><div><span className="eyebrow"><Anchor size={15}/> MINI GAME / SEA BATTLE</span><h2>Your fleet. Their next move.</h2><p>Against <strong>{battle.opponent}</strong> · One shot per turn · Turn passes after every shot</p></div><span className={'badge '+(battle.won?'green':'')}>{battle.winner?(battle.won?'VICTORY':'BATTLE FINISHED'):closed?'BATTLE PAUSED':!locked?'DEPLOY YOUR FLEET':!battle.started?'OPPONENT DEPLOYING':battle.yourTurn?'YOUR TURN':'OPPONENT’S TURN'}</span></div>
    <div className="sea-rules"><span><Crosshair size={14}/> Single-square shots</span><span><ShieldCheck size={14}/> Secret fleets</span><span><Radio size={14}/> Live team duel</span></div>
    {battle.winner&&<div className={'sea-result '+(battle.won?'won':'')}><Flag size={27}/><div><h3>{battle.winner} wins Sea Battle.</h3><p>This is your mini-game result. Stay here until the organiser triggers the QR hunt; the final winning call is separate.</p></div></div>}
    {!locked?<>
      <div className="sea-deploy-layout"><div><div className="section-header"><h3>Place your fleet</h3><span className="badge">{fleet.filter(s=>s.length).length} / 5 PLACED</span></div><p className="small muted">Select a ship, then tap its starting square. Ships can touch, but cannot overlap. Your layout locks when you press Ready.</p><div className="sea-ship-list">{SEA_SHIPS.map((s,i)=><button type="button" className={ship===i?'selected':''} key={s.name} disabled={disabled} onClick={()=>{setShip(i);setError('')}}><span>{s.name}<small>{s.size} squares</small></span><span className="sea-ship-dots">{Array.from({length:s.size},(_,n)=><i key={n}/>)}{fleet[i].length>0&&<Check size={15}/>}</span></button>)}</div><div className="controls"><button type="button" className="secondary" disabled={disabled} onClick={()=>setVertical(v=>!v)}><RotateCw size={15}/>{vertical?'Vertical':'Horizontal'}</button><button type="button" className="secondary" disabled={disabled} onClick={()=>changeFleet(randomFleet())}><Shuffle size={15}/>Random layout</button></div>{error&&<p className="sea-error" role="alert">{error}</p>}<button type="button" className="primary wide sea-ready" disabled={disabled||fleet.some((s,i)=>s.length!==SEA_SHIPS[i].size)} onClick={()=>onAction('sea-deploy',{fleet})}><ShieldCheck size={17}/>Ready — lock fleet</button><p className="small muted">Both teams must be ready. The first attacker is chosen randomly.</p></div><div className="sea-board-card"><span className="eyebrow">YOUR PRIVATE WATERS</span><Board label="Place your ships" fleet={fleet} shots={[]} onCell={place} disabled={disabled} preview={fits(preview)&&!overlaps(preview)?preview:[]} onHover={setHover}/></div></div>
    </>:<>
      <div className="sea-battle-status" role="status">{battle.winner?'Battle complete. Awaiting BLACKOUT.':closed?'The organiser has paused or closed the round.':!battle.started?'Fleet secured. Waiting for your opponent to press Ready.':battle.yourTurn?'Your turn: select one square on the enemy grid, then press Fire.':`${battle.opponent} is choosing a shot. Your screen updates automatically.`}</div>
      <div className="sea-combat-layout"><div className="sea-board-card"><div className="row"><span className="eyebrow">ENEMY WATERS</span><span className="small">{battle.opponentRemaining} ships afloat</span></div><Board label="Enemy waters — select your attack coordinate" shots={battle.shots} disabled={!canFire} target={target} onCell={setTarget}/><div className="sea-fire-row"><span>{target!==null?<>Target <strong>{coordinate(target)}</strong></>:'Select a target'}</span><button type="button" className="primary" disabled={!canFire||target===null} onClick={()=>{if(target!==null)onAction('sea-fire',{cell:target})}}><Crosshair size={17}/>Fire one shot</button></div>{last&&<p className="sea-shot-report">Last shot: <strong>{coordinate(last.cell)} — {last.sunk?'SUNK':last.hit?'HIT':'MISS'}</strong></p>}</div><div className="sea-board-card"><div className="row"><span className="eyebrow">YOUR FLEET / PRIVATE</span><span className="small">{battle.remaining} ships afloat</span></div><Board label="Your fleet and incoming shots" fleet={battle.ownFleet} shots={battle.incoming}/>{incoming&&<p className="sea-shot-report">Incoming: <strong>{coordinate(incoming.cell)} — {incoming.sunk?'SUNK':incoming.hit?'HIT':'MISS'}</strong></p>}<div className="sea-legend"><span><i className="legend-ship"/>Your ship</span><span><b>×</b>Hit</span><span><b>·</b>Miss</span></div></div></div>
    </>}
  </section>;
}

export function SeaBattleDesk({mission,onLocal}:{mission:Mission;onLocal?:(battleId:string)=>void}){
  if(mission.miniGameMode!=='sea-battle')return null;
  return <section className="panel sea-desk"><div className="section-header"><div><span className="eyebrow">LIVE MINI GAMES</span><h2>Sea Battle matchups</h2></div><Anchor size={22}/></div><p className="small muted">Two teams per duel. Fleets stay private to players. BLACKOUT stops every unfinished battle.</p><div className="sea-match-list">{mission.seaBattles?.map((g,i)=>{
    const names=g.teams.map(id=>mission.teams.find(t=>t.id===id)?.name),winner=mission.teams.find(t=>t.id===g.winner)?.name;
    const status=winner?winner+' wins':mission.phase==='hunt'||mission.phase==='ended'?'Stopped by mission control':mission.pausedAt?'Paused':g.startedAt?'Turn: '+mission.teams.find(t=>t.id===g.turn)?.name:mission.phase==='lobby'?'Starts with mini games':`${Object.keys(g.fleets).length}/2 fleets ready`;
    return <div key={g.id}><span className="sea-match-index">{String(i+1).padStart(2,'0')}</span><div><strong>{names[0]} <span className="muted">vs</span> {names[1]}</strong><small>{status} · {g.shots.length} shots fired</small></div><span className={'badge '+(winner?'green':'')}>{winner?'FINISHED':g.startedAt&&mission.phase==='games'?'IN BATTLE':'STANDBY'}</span>{onLocal&&mission.phase==='games'&&<button type="button" className="secondary" onClick={()=>onLocal(g.id)}>Pass & play</button>}</div>;
  })}</div><p className="small muted">Sea Battle results are recorded here. No automatic abilities are awarded.</p></section>;
}
