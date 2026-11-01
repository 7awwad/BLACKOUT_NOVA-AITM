'use client';
import {useEffect,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {Eye,Paintbrush,Crosshair,Clock,Lock,Save,Flag,Check} from 'lucide-react';
import {CAM_COLORS,CAM_PARTS,CAM_POSES,CAM_SPOTS,camScene,defaultFigures,surfaceColor,validFigures,type CamFigure} from './chameleon-scene';
import type {CamView} from './chameleon';
import type {Mission} from './game';

export default function ChameleonPanel({battle,teamId,busy,closed,offline,onAction}:{battle:CamView|null;teamId:string;busy:boolean;closed:boolean;offline:boolean;onAction:(a:string,b:any)=>Promise<void>}){
  const [figures,setFigures]=useState<CamFigure[]>(()=>battle?.figures?structuredClone(battle.figures):defaultFigures());
  const [selected,setSelected]=useState(0),[part,setPart]=useState(-1),[aim,setAim]=useState<{x:number;y:number}|null>(null),[warning,setWarning]=useState(''),[now,setNow]=useState(Date.now()),[receivedAt,setReceivedAt]=useState(Date.now());
  const [zoom,setZoom]=useState(1),[camera,setCamera]=useState({x:400,y:270});
  const key='blackout-camo:'+battle?.id+':'+battle?.leg+':'+teamId;
  useEffect(()=>{try{const stored=JSON.parse(sessionStorage.getItem(key)||'null');if(validFigures(stored))setFigures(stored)}catch{}},[key]);
  useEffect(()=>{setReceivedAt(Date.now())},[battle?.serverNow]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer)},[]);
  useEffect(()=>setAim(null),[battle?.shots.length,battle?.phase,battle?.leg]);
  if(!battle)return <section className="panel waiting"><Eye size={40}/><h2>Waiting for a Chameleon matchup.</h2><p>The organiser will assign your opponent before the mini games begin.</p></section>;
  const stopped=busy||closed||offline;
  const delta=closed||battle.paused?0:Math.max(0,now-receivedAt);
  const left=Math.max(0,battle.left-Math.floor(delta/1000)),cooldown=Math.max(0,battle.cooldown-delta);
  const hiding=battle.phase==='hide'&&battle.role==='hider',seeking=battle.phase==='seek'&&battle.role==='seeker';
  const canShoot=seeking&&!stopped&&left>0&&cooldown===0&&battle.shotsLeft>0;
  const change=(next:CamFigure[])=>{setFigures(next);setWarning('');try{sessionStorage.setItem(key,JSON.stringify(next))}catch{}};
  const paint=(color:string)=>change(figures.map((f,i)=>i===selected?{...f,colors:f.colors.map((c,p)=>part===-1||part===p?color:c)}:f));
  const spot=(n:number)=>{if(figures.some((f,i)=>i!==selected&&f.spot===n)){setWarning('Another chameleon is already in that spot. Choose an empty one.');return;}change(figures.map((f,i)=>i===selected?{...f,spot:n}:f));};
  const fire=()=>{if(canShoot&&aim)onAction('cam-fire',aim)};
  const clickArena=(e:PointerEvent<SVGSVGElement>)=>{
    if(hiding&&!stopped){const marker=(e.target as Element).closest('[data-spot]');if(marker)spot(Number(marker.getAttribute('data-spot')));return;}
    if(!canShoot)return;const matrix=e.currentTarget.getScreenCTM();if(!matrix)return;
    const p=e.currentTarget.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(matrix.inverse());setAim({x:Math.max(0,Math.min(800,q.x)),y:Math.max(0,Math.min(540,q.y))});
  };
  const keyboard=(e:KeyboardEvent<SVGSVGElement>)=>{
    if(!canShoot)return;if(e.key==='Enter'){e.preventDefault();fire();return;}
    const direction:{[key:string]:[number,number]}={ArrowLeft:[-6,0],ArrowRight:[6,0],ArrowUp:[0,-6],ArrowDown:[0,6]};
    if(direction[e.key]){e.preventDefault();const [dx,dy]=direction[e.key];setAim(p=>({x:Math.max(0,Math.min(800,(p?.x??400)+dx)),y:Math.max(0,Math.min(540,(p?.y??270)+dy))}));}
  };
  const scene=hiding?camScene(figures,[],true,selected):battle.scene??camScene([]);
  const latest=battle.shots.at(-1);
  const width=800/zoom,height=540/zoom;
  const viewX=Math.max(0,Math.min(800-width,camera.x-width/2)),viewY=Math.max(0,Math.min(540-height,camera.y-height/2));
  return <section className="panel cam-panel">
    <div className="sea-heading"><div><span className="eyebrow"><Eye size={15}/> MINI GAME / CHAMELEON HUNT</span><h2>Paint. Pose. Disappear.</h2><p>Against <strong>{battle.opponent}</strong> · Hunt {battle.leg+1} of 2 · Teams swap roles</p></div><div className="cam-timer"><span className="eyebrow"><Clock size={13}/>{battle.phase==='hide'?'HIDING TIME':battle.phase==='seek'?'HUNT CLOCK':'RESULT'}</span><strong>{battle.phase==='complete'?'END':String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0')}</strong></div></div>
    <div className="cam-score-strip">{battle.scores.map(s=><div key={s.team}><span>{s.team}</span><strong>{s.score}<small>PTS</small></strong></div>)}<span className="badge">{battle.phase==='complete'?'BOTH HUNTS COMPLETE':battle.role.toUpperCase()}</span></div>
    {battle.phase==='complete'?<div className="sea-result won"><Flag size={30}/><div><h3>{battle.draw?'A perfect tie.':battle.winner+' wins Chameleon Hunt.'}</h3><p>Both teams have taken a hiding and seeking turn. Stay ready for the organiser’s BLACKOUT signal. The final call decides the event winner.</p></div></div>:<>
      <div className="cam-instruction" role="status">{hiding?<>Hide three figures. Pick spots, paint their body parts to match the walls or props, choose a pose, then lock the scene.</>:battle.phase==='hide'?<><Lock size={17}/>{battle.hiderName} is painting and hiding. The positions stay hidden until the hunt starts.</>:seeking?<>Find three painted figures in the scenery. Select a suspicious shape, then fire. You have {battle.shotsLeft} shots; each shot recharges for 2.5 seconds.</>:<>Your camouflage is locked. Watch {battle.seekerName} search. Found {battle.found} of 3.</>}</div>
      <div className={'cam-layout '+(hiding?'editing':'')}><div className="cam-arena-card"><svg viewBox={`${viewX} ${viewY} ${width} ${height}`} role="img" aria-label={hiding?'3D camouflage arena with numbered hiding spots':seeking?'Find painted figures. Use arrow keys to aim and Enter to fire.':'Camouflage arena'} tabIndex={seeking?0:undefined} className={seeking?'cam-arena seek':'cam-arena'} onPointerDown={clickArena} onKeyDown={keyboard}><g dangerouslySetInnerHTML={{__html:scene}}/>{battle.phase==='seek'&&battle.shots.map((s,i)=><g key={i} pointerEvents="none"><circle cx={s.x} cy={s.y} r={s.hit?8:4} fill="none" stroke={s.hit?'#e4ef65':'#d68f77'} strokeWidth="1.5"/></g>)}{aim&&seeking&&<g pointerEvents="none" stroke="#e4ef65" strokeWidth="1.5"><circle cx={aim.x} cy={aim.y} r="12" fill="none"/><path d={`M${aim.x-20} ${aim.y}h40 M${aim.x} ${aim.y-20}v40`}/></g>}</svg><div className="cam-arena-footer"><span>{hiding?'NUMBERED CIRCLES = HIDING SPOTS':battle.phase==='hide'?'SCENE PREVIEW / TARGETS HIDDEN':`${battle.found} / 3 FOUND`}</span><span>ISOMETRIC VIEW</span></div><div className="cam-camera"><label>Zoom<select value={zoom} onChange={e=>{setZoom(Number(e.target.value));setCamera({x:400,y:270})}}><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>{zoom>1&&<div>{[['Left',-90,0,'←'],['Up',0,-60,'↑'],['Down',0,60,'↓'],['Right',90,0,'→']].map(([label,dx,dy,icon])=><button type="button" key={String(label)} aria-label={'Pan '+label} onClick={()=>setCamera(c=>({x:Math.max(width/2,Math.min(800-width/2,c.x+Number(dx))),y:Math.max(height/2,Math.min(540-height/2,c.y+Number(dy)))}))}>{icon}</button>)}</div>}<small>Magnify the scenery to inspect shapes.</small></div></div>
      {hiding&&<div className="cam-editor"><span className="eyebrow"><Paintbrush size={14}/> CAMOUFLAGE STUDIO</span><div className="cam-figure-tabs">{figures.map((_,i)=><button type="button" key={i} className={selected===i?'selected':''} disabled={stopped} onClick={()=>setSelected(i)}>Figure {i+1}</button>)}</div><label>Hiding spot<select value={figures[selected].spot} disabled={stopped} onChange={e=>spot(Number(e.target.value))}>{CAM_SPOTS.map((_,i)=><option key={i} value={i}>Spot {i+1}{figures.some((f,n)=>n!==selected&&f.spot===i)?' — occupied':''}</option>)}</select></label><label>Pose<select disabled={stopped} value={figures[selected].pose} onChange={e=>change(figures.map((f,i)=>i===selected?{...f,pose:Number(e.target.value)}:f))}>{CAM_POSES.map((p,i)=><option value={i} key={p}>{p}</option>)}</select></label><label>Paint area<select disabled={stopped} value={part} onChange={e=>setPart(Number(e.target.value))}><option value={-1}>Whole body</option>{CAM_PARTS.map((p,i)=><option value={i} key={p}>{p}</option>)}</select></label><div className="cam-palette">{CAM_COLORS.map((c,i)=><button type="button" key={c} aria-label={'Paint '+['ivory','sage','stone','rust','sand','slate','charcoal','yellow'][i]} title={c} style={{background:c}} disabled={stopped} onClick={()=>paint(c)}/>)}</div><button type="button" className="secondary wide" disabled={stopped} onClick={()=>paint(surfaceColor(figures[selected].spot))}>Sample nearby surface</button>{warning&&<p className="sea-error" role="alert">{warning}</p>}<div className="controls"><button type="button" className="secondary" disabled={stopped||left===0} onClick={()=>onAction('cam-save',{figures})}><Save size={15}/>Save paint</button><button type="button" className="primary" disabled={stopped||left===0} onClick={()=>onAction('cam-lock',{figures})}><Lock size={15}/>Lock & start hunt</button></div><p className="small muted">Save before time runs out. When time expires, the last saved scene becomes the hunt.</p></div>}
      </div>
      {battle.phase==='seek'&&<div className="cam-hunt-controls"><div className="cam-found">{[0,1,2].map(i=><span className={i<battle.found?'found':''} key={i}>{i<battle.found?<Check size={16}/>:<Eye size={16}/>}</span>)}<small>{battle.found} of 3 found</small></div>{seeking&&<button type="button" className="primary" disabled={!canShoot||!aim} onClick={fire}><Crosshair size={18}/>{cooldown>0?'Recharging…':'Fire scanner'}</button>}{latest&&<span className="cam-last-shot">Last shot: <strong>{latest.hit?'FOUND':'MISS'}</strong></span>}</div>}
    </>}
    <p className="cam-footnote">Original BLACKOUT adaptation: fixed-camera 3D scenery, three painted figures, and two timed hunts. Score 100 per find plus one point for each full second left when found. Equal scores are a draw.</p>
  </section>;
}

export function ChameleonDesk({mission,onLocal}:{mission:Mission;onLocal?:(id:string)=>void}){
  if(mission.miniGameMode!=='chameleon')return null;
  const name=(id:string)=>mission.teams.find(t=>t.id===id)?.name;
  return <section className="panel sea-desk"><div className="section-header"><div><span className="eyebrow">LIVE MINI GAMES</span><h2>Chameleon Hunt matchups</h2></div><Eye size={22}/></div><p className="small muted">90 seconds to paint and hide, 60 seconds to seek, then roles swap. Each team uses its own private link, or share a device with Pass & play.</p><div className="sea-match-list">{mission.chameleonBattles?.map((g,i)=>{const leg=g.legs[g.leg];return <div key={g.id}><span className="sea-match-index">0{i+1}</span><div><strong>{name(g.teams[0])} <span className="muted">vs</span> {name(g.teams[1])}</strong><small>{g.phase==='complete'?(g.draw?'Draw':name(g.winner!)+' wins'):mission.phase!=='games'?'Waiting for mission control':`Hunt ${g.leg+1}/2 · ${g.phase==='hide'?name(leg.hider)+' hiding':'Seeking'}`}</small></div><span className="badge">{g.phase.toUpperCase()}</span>{onLocal&&mission.phase==='games'&&<button type="button" className="secondary" onClick={()=>onLocal(g.id)}>Pass & play</button>}</div>})}</div></section>;
}
