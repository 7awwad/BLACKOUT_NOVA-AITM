'use client';
import {useCallback,useEffect,useState} from 'react';
import {Lock,ArrowRight,X} from 'lucide-react';
import SeaBattlePanel from './sea-battle-panel';
import ChameleonPanel from './chameleon-panel';
import type {Mission} from './game';

// This organiser-launched option supports two teams sharing one device.
// Each request still uses the current team's code and receives only its view.
export default function SeaPassPlay({mission,battleId,onClose,onRefresh,kind='sea-battle'}:{mission:Mission;battleId:string;onClose:()=>void;onRefresh:()=>Promise<void>;kind?:'sea-battle'|'chameleon'}){
  const seaMatch=mission.seaBattles?.find(g=>g.id===battleId);
  const camMatch=mission.chameleonBattles?.find(g=>g.id===battleId);
  const match=(kind==='chameleon'?camMatch:seaMatch)!;
  const teams=match.teams.map(id=>mission.teams.find(t=>t.id===id)!);
  const camHider=camMatch?.legs[camMatch.leg].hider;
  const camActive=camMatch?.phase==='seek'?camMatch.teams.find(id=>id!==camHider):camHider;
  const initial=kind==='chameleon'?teams.findIndex(t=>t.id===camActive):teams.findIndex(t=>!seaMatch!.fleets[t.id]);
  const [side,setSide]=useState(initial>=0?initial:Math.max(0,teams.findIndex(t=>t.id===seaMatch?.turn)));
  const [curtain,setCurtain]=useState(true),[player,setPlayer]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[offline,setOffline]=useState(false);
  const team=teams[side];
  const fetchView=useCallback(async()=>{
    const response=await fetch('/api/game?'+new URLSearchParams({action:'player',id:mission.id}),{headers:{Authorization:'Bearer '+team.code}});
    if(!response.ok)throw new Error('Unable to load the battle. Reconnect and try again.');
    return response.json() as Promise<any>;
  },[mission.id,team.code]);
  useEffect(()=>{let stopped=false;const update=async()=>{try{const p=await fetchView();if(!stopped){const active=p.chameleon?.activeTeamId;const next=teams.findIndex(t=>t.id===active);if(kind==='chameleon'&&p.phase==='games'&&next>=0&&next!==side){setCurtain(true);setPlayer(null);setSide(next);}else setPlayer(p);setOffline(false)}}catch{if(!stopped)setOffline(true)}};setPlayer(null);update();const interval=setInterval(update,3000);return()=>{stopped=true;clearInterval(interval)}},[fetchView,kind,side]);
  useEffect(()=>{const hide=()=>{if(document.hidden)setCurtain(true)};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
  const act=async(action:string,body:any)=>{
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+team.code},body:JSON.stringify({action,id:mission.id,...body})});
      const data=await response.json() as {error?:string;player:any};if(!response.ok)throw new Error(data.error||'Could not save your move.');
      if(kind==='chameleon'){
        const next=teams.findIndex(t=>t.id===data.player.chameleon?.activeTeamId);
        if(next>=0&&next!==side){setCurtain(true);setPlayer(null);setSide(next)}
        else {if(data.player.chameleon?.leg!==player?.chameleon?.leg)setCurtain(true);setPlayer(data.player)}
      }else{
        setCurtain(true);setPlayer(null);
        if(action==='sea-deploy'&&data.player.seaBattle.started)setSide(data.player.seaBattle.yourTurn?side:1-side);
        else setSide(1-side);
      }
      await onRefresh();
    }catch(e:any){setError(e.message)}finally{setBusy(false)}
  };
  const interrupted=player&&player.phase!=='games';
  const expired=player?.startedAt&&((player.pausedAt??Date.now())-player.startedAt)>=player.duration*60000;
  return <div className="modal-backdrop sea-local-backdrop"><div className="sea-local-modal" role="dialog" aria-modal="true" aria-label={kind==='chameleon'?'Chameleon Hunt pass and play':'Sea Battle pass and play'}><div className="sea-local-top"><span className="eyebrow">BLACKOUT / PASS & PLAY</span><button type="button" className="secondary" onClick={onClose}><X size={16}/>Return to desk</button></div>
    {interrupted?<div className="waiting"><h2>{player.phase==='hunt'?'BLACKOUT — the hunt is open.':'This round has closed.'}</h2><p>The mini game has stopped. Teams should open their own team links to continue the mission.</p><button type="button" className="primary" onClick={onClose}>Return to mission control</button></div>:curtain?<div className="sea-handover"><Lock size={45}/><span className="eyebrow">PRIVATE BOARD HIDDEN</span><h2>Hand the device to<br/><span>{team.name}</span>.</h2><p>The other team should look away. Only reveal the board when your team has the device.</p><button type="button" className="primary" disabled={!player||offline||busy} onClick={()=>setCurtain(false)}>Reveal {team.name}’s board <ArrowRight size={18}/></button>{offline&&<p role="status">Reconnecting to mission control…</p>}</div>:player?<><button type="button" className="text-btn" onClick={()=>setCurtain(true)}><Lock size={14}/>Hide board</button>{error&&<div className="warning" role="alert">{error}</div>}{kind==='chameleon'?<ChameleonPanel key={battleId+team.id+player.chameleon?.leg+player.chameleon?.role} battle={player.chameleon} teamId={team.id} closed={!!player.pausedAt||!!expired} busy={busy} offline={offline} onAction={act}/>:<SeaBattlePanel key={battleId+team.id} battle={player.seaBattle} teamId={team.id} closed={!!player.pausedAt||!!expired} busy={busy} offline={offline} onAction={act}/>}</>:<div className="waiting"><p>Connecting to the battle…</p></div>}
  </div></div>;
}
