// Original orthographic 3D arena. All geometry and hit detection share this
// projection; seekers receive flattened artwork, never the hidden placements.
export const CAM_COLORS=['#e8e6cf','#687b75','#a7b1a1','#8c654d','#b3976b','#485c69','#344249','#b5a740'] as const;
export const CAM_PARTS=['Head','Torso','Left arm','Right arm','Left leg','Right leg'];
export const CAM_POSES=['Stand','Crouch','Stretch'];
export const CAM_SPOTS=[
  {x:1,y:1.7},{x:1,y:3.4},{x:1,y:5.3},{x:1,y:7.3},{x:1,y:9.3},
  {x:2.2,y:1},{x:4.2,y:1},{x:6.3,y:1},{x:8.3,y:1},{x:10.3,y:1},
  {x:3.2,y:5.2},{x:5.5,y:3.5},{x:7.6,y:5.5},{x:4.4,y:8.3},{x:8.8,y:8.6},{x:10.7,y:6.4},
];
export type CamFigure={spot:number;pose:number;colors:string[]};
type Point={x:number;y:number};
type Face={points:Point[];fill:string;depth:number;owner?:number};
export function projectCam(x:number,y:number,z=0):Point{return {x:400+(x-y)*28,y:150+(x+y)*13-z*34};}
function shade(hex:string,factor:number){const n=parseInt(hex.slice(1),16);return '#'+[16,8,0].map(shift=>Math.min(255,Math.round(((n>>shift)&255)*factor)).toString(16).padStart(2,'0')).join('');}
function box(x:number,y:number,z:number,w:number,d:number,h:number,color:string,owner?:number):Face[]{
  const corners=[[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z],[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]];
  return [{ids:[4,5,6,7],factor:1},{ids:[1,2,6,5],factor:.82},{ids:[2,3,7,6],factor:.68}].map(({ids,factor})=>({points:ids.map(i=>projectCam(...corners[i] as [number,number,number])),fill:shade(color,factor),depth:ids.reduce((sum,i)=>sum+corners[i][0]+corners[i][1],0)/4+(z+h)*.015,owner}));
}
export function surfaceColor(spot:number){return CAM_COLORS[spot<5?1:spot<10?3:spot%2?5:4];}
function figureFaces(f:CamFigure,owner:number):Face[]{
  const {x,y}=CAM_SPOTS[f.spot],c=f.colors;const low=f.pose===1;
  const pieces=[
    [x-.18,y-.17,low?.84:1.48,.36,.34,.36,c[0]],
    [x-.22,y-.14,low?.42:.81,.44,.28,low?.43:.64,c[1]],
    [x-(f.pose===2?.86:.4),y-.1,low?.38:1.02,f.pose===2?.63:.16,.2,f.pose===2?.17:low?.4:.59,c[2]],
    [x+.24,y-.1,low?.38:1.02,f.pose===2?.63:.16,.2,f.pose===2?.17:low?.4:.59,c[3]],
    [x-.2,y-.13,0,.17,low?.43:.26,low?.43:.8,c[4]],
    [x+.03,y-.13,0,.17,low?.43:.26,low?.43:.8,c[5]],
  ] as [number,number,number,number,number,number,string][];
  return pieces.flatMap(p=>box(...p,owner));
}
function environment():Face[]{
  const out:Face[]=[];
  const crates=[[2.4,3,0,1.2,1,1.15,4],[4.9,6.5,0,1.4,1.1,.7,3],[8,3,0,1.5,.8,1.3,5],[7,8,0,1,1.3,1.15,1],[10.2,9.8,0,1,.8,.75,3],[2.2,9.5,0,.9,1.2,1.4,5],[10.1,4.2,0,.7,.8,1.6,4]];
  for(const [x,y,z,w,d,h,color] of crates){out.push(...box(x,y,z,w,d,h,CAM_COLORS[color]));out.push(...box(x-.025,y-.025,h*.55,w+.05,d+.05,.09,'#b3976b'));}
  // Benches, ducts and shelving provide shapes that poses can blend into.
  out.push(...box(3,2.3,0,2.1,.25,1.65,CAM_COLORS[3]),...box(3,2.1,.45,2.1,.6,.14,CAM_COLORS[4]),...box(3,2.1,1.2,2.1,.6,.14,CAM_COLORS[4]));
  for(let i=0;i<5;i++)out.push(...box(.28,1.2+i*2,0,.2,.26,2.5,CAM_COLORS[1]));
  for(let i=0;i<6;i++)out.push(...box(1.5+i*1.8,.28,.75,.65,.22,.82,CAM_COLORS[i%2?3:4]));
  out.push(...box(6,10.5,0,2.6,.2,.8,CAM_COLORS[5]),...box(6,10.5,.8,2.6,.55,.12,CAM_COLORS[1]));
  return out;
}
function faces(figures:CamFigure[],found:number[]):Face[]{return [...environment(),...figures.flatMap((f,i)=>found.includes(i)?[]:figureFaces(f,i))].sort((a,b)=>a.depth-b.depth);}
function polygon(face:Face,stroke=false){return `<polygon points="${face.points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="${face.fill}"${stroke?' stroke="#26373b" stroke-width="0.6"':''}/>`;}
export function camScene(figures:CamFigure[],found:number[]=[],markers=false,selected=-1):string{
  let out='<rect width="800" height="540" fill="#101b22"/>';
  for(let x=0;x<12;x++)for(let y=0;y<12;y++)out+=polygon({points:[projectCam(x,y),projectCam(x+1,y),projectCam(x+1,y+1),projectCam(x,y+1)],fill:(x+y)%2?'#485c69':'#435660',depth:0},true);
  // Backdrop walls are drawn before the foreground solids.
  for(let i=0;i<12;i++){
    out+=polygon({points:[projectCam(0,i),projectCam(0,i+1),projectCam(0,i+1,3.1),projectCam(0,i,3.1)],fill:i%2?'#687b75':'#62756f',depth:0},true);
    out+=polygon({points:[projectCam(i,0),projectCam(i+1,0),projectCam(i+1,0,3.1),projectCam(i,0,3.1)],fill:i%2?'#8c654d':'#986e51',depth:0},true);
  }
  out+='<text x="400" y="26" text-anchor="middle" fill="#a4b4b8" font-family="monospace" font-size="11" letter-spacing="5">NOVA // SIGNAL STORAGE</text>';
  for(const face of faces(figures,found))out+=polygon(face,face.owner===undefined);
  if(markers)CAM_SPOTS.forEach((s,i)=>{const p=projectCam(s.x,s.y);out+=`<g data-spot="${i}" style="cursor:pointer"><ellipse cx="${p.x}" cy="${p.y+4}" rx="15" ry="7" fill="${figures[selected]?.spot===i?'#e4ef65':'#0a1723'}" fill-opacity=".8" stroke="#c1d15b" stroke-width="1"/><text x="${p.x}" y="${p.y+7}" text-anchor="middle" font-family="monospace" font-size="9" fill="${figures[selected]?.spot===i?'#102017':'#e4ef65'}">${i+1}</text></g>`;});
  found.forEach(i=>{const s=CAM_SPOTS[figures[i].spot],p=projectCam(s.x,s.y);out+=`<circle cx="${p.x}" cy="${p.y-16}" r="16" fill="none" stroke="#e4ef65" stroke-width="2"/><path d="M${p.x-6} ${p.y-16}l4 4 8-9" fill="none" stroke="#e4ef65" stroke-width="2"/>`;});
  out+='<text x="400" y="511" text-anchor="middle" fill="#94a7b0" font-family="monospace" font-size="10" letter-spacing="2">SECTOR 04 / CAMOUFLAGE ARENA</text>';
  return out;
}
function inside(p:Point,points:Point[]):boolean{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
export function pickCam(figures:CamFigure[],found:number[],x:number,y:number):number|null{
  const ordered=faces(figures,found);for(let i=ordered.length-1;i>=0;i--)if(inside({x,y},ordered[i].points))return ordered[i].owner??null;
  return null;
}
export function validFigures(value:unknown):value is CamFigure[]{
  return Array.isArray(value)&&value.length===3&&new Set(value.map(f=>f?.spot)).size===3&&value.every(f=>f&&Number.isInteger(f.spot)&&f.spot>=0&&f.spot<CAM_SPOTS.length&&Number.isInteger(f.pose)&&f.pose>=0&&f.pose<3&&Array.isArray(f.colors)&&f.colors.length===6&&f.colors.every((c:unknown)=>typeof c==='string'&&(CAM_COLORS as readonly string[]).includes(c)));
}
export function defaultFigures():CamFigure[]{return [0,1,2].map((_,i)=>({spot:[2,7,13][i],pose:0,colors:Array(6).fill(CAM_COLORS[0])}));}
