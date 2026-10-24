import * as THREE from 'three';
import { Peer } from 'peerjs';
import { MockPeer } from './mockpeer.js';
import { buildWorld, preloadTextures, A, srg, srnd } from './world.js';
import { loadCats, makeCat as buildCat } from './cat.js';
import { buildRat, buildKrasue } from './enemies.js';
import { createPost } from './post.js';
import { LEADERBOARD } from './config.js';
import { buildGuns } from './guns.js';
const $=s=>document.querySelector(s);
const TAU=Math.PI*2,rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,pick=a=>a[(Math.random()*a.length)|0];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ======================= SAVE ======================= */
const SAVE_KEY='aritat-doom-save-v1';
let save={coins:0,up:{},best:{wave:0,kills:0,gk:0},runs:0,sens:1,quality:'high',music:true,bright:1};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s)save=Object.assign(save,s);}catch(e){}
if(save.brightV!==2){save.bright=1;save.brightV=2;}
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}};
const upLv=id=>save.up[id]||0;
const SHOP=[
 {id:'reload',name:'ฝึกเปลี่ยนแม็กกับทหารพราน',icon:'⏱️',desc:'รีโหลดเร็วขึ้น 10% ต่อเลเวล',max:5,cost:120},
 {id:'holster',name:'ซองหนังเก็บปืน',icon:'🧰',desc:'ปืนที่ไม่ได้ถืออยู่รีโหลดตัวเองอัตโนมัติ (เลเวล 2 เร็วขึ้น)',max:2,cost:380},
 {id:'hp',name:'ข้าวไข่เจียวตอนเช้า',icon:'🍳',desc:'พลังชีวิตเริ่มต้น +15',max:5,cost:120},
 {id:'dmg',name:'ฝึกยิงที่สนามวัด',icon:'🎯',desc:'ดาเมจทุกปืน +5%',max:6,cost:180},
 {id:'armor',name:'เสื้อกั๊กวินมอเตอร์ไซค์',icon:'🦺',desc:'เริ่มรอบพร้อมเกราะ +25',max:4,cost:150},
 {id:'ammo',name:'กระเป๋ากระสุนลายพราง',icon:'🎒',desc:'กระสุนสำรองจุเพิ่ม +15%',max:4,cost:140},
 {id:'crit',name:'ตะกรุดนำโชค',icon:'🍀',desc:'โอกาสคริติคอล +5% (ดาเมจ x2.5)',max:3,cost:260},
 {id:'greed',name:'กระปุกออมสิน',icon:'🐷',desc:'เหรียญที่ได้ +12%',max:6,cost:160},
 {id:'magnet',name:'แม่เหล็กติดรองเท้า',icon:'🧲',desc:'ดูดของรอบตัวไกลขึ้น 40%',max:2,cost:120},
 {id:'dash',name:'รองเท้าวิ่งมาราธอน',icon:'💨',desc:'แดชคูลดาวน์ลด 10%',max:3,cost:140},
 {id:'reroll',name:'ใบ้หวยงวดนี้',icon:'🎟️',desc:'สุ่มการ์ดอัปเกรดใหม่ฟรีเพิ่ม 1 ครั้งต่อเวฟ',max:2,cost:300},
 {id:'start',name:'ของขวัญจากแม่',icon:'🎁',desc:'เริ่มรอบด้วยอัปเกรดฟรี 1 อย่าง',max:2,cost:420},
 {id:'revive',name:'พระเครื่องของยาย',icon:'📿',desc:'ฟื้นคืนชีพ 1 ครั้งต่อรอบ',max:1,cost:900},
 {id:'u_ak',name:'ตู้เซฟพ่อ: AK-47',icon:'🔫',desc:'เริ่มทุกรอบพร้อม AK-47',max:1,cost:650},
 {id:'u_m79',name:'ตู้เซฟพ่อ: เอ็ม 79',icon:'💣',desc:'เริ่มทุกรอบพร้อมเครื่องยิงลูกระเบิด M79',max:1,cost:800},
 {id:'u_fl',name:'ตู้เซฟพ่อ: ปืนพ่นไฟ',icon:'🔥',desc:'เริ่มทุกรอบพร้อมปืนพ่นไฟ',max:1,cost:950},
 {id:'u_bar',name:'ตู้เซฟพ่อ: บาร์เรตต์ .50',icon:'🎯',desc:'เริ่มทุกรอบพร้อมสไนเปอร์ .50',max:1,cost:1100},
];
const CHARS=[
 {id:'aritat',name:'อาริทัต',role:'สายลุยประชิด',icon:'🧑‍🦱',cost:0,col:'#ff9a3a',passive:'กลอรี่คิลดรอปเลือดเพิ่ม 50% · หมัดแรง 2 เท่า',active:'ตะโกนลั่นซอย',activeDesc:'ศัตรูรอบตัว 12 ม. มึนงงทันที พร้อมโดนกลอรี่คิล',cd:22,abIcon:'📣'},
 {id:'jaem',name:'ป้าแจ่ม แม่ค้าส้มตำ',role:'สายถึก ฮีลทีม',icon:'👵',cost:900,col:'#9be15d',passive:'พลังชีวิต +40 · เกราะฟื้นเองถึง 60% · เริ่มพร้อมลูกซองเต็มกระเป๋า',active:'ยาหม่องตราเทพ',activeDesc:'ฟื้นพลังชีวิต 50 ให้ตัวเองและเพื่อนในระยะ 12 ม.',cd:26,abIcon:'🫙'},
 {id:'win',name:'พี่วินเสื้อส้ม',role:'สายซิ่ง',icon:'🏍️',cost:1300,col:'#ffb020',passive:'วิ่งไว +20% · แดชไวขึ้น 40% · กระโดดสองชั้นได้เลย',active:'บิดสุดคันเร่ง',activeDesc:'พุ่งชนทะลุฝูง 14 ม. ดาเมจ 250 ไม่โดนตีระหว่างพุ่ง',cd:12,abIcon:'💥'},
 {id:'chalerm',name:'จ่าเฉลิม ทหารพราน',role:'สายปืน',icon:'🎖️',cost:1700,col:'#58c8ff',passive:'รีโหลดไว 30% · แม็กใหญ่ +25% · เริ่มพร้อม AK-47',active:'ยิงกดหัว',activeDesc:'7 วิ กระสุนในแม็กไม่ลดและยิงเร็วขึ้น 30%',cd:30,abIcon:'🔥'},
 {id:'khlang',name:'อาจารย์ขลัง หมอผี',role:'สายเวทมนตร์',icon:'🧙',cost:2200,col:'#c070ff',passive:'มีผีพี่เลี้ยงตั้งแต่เริ่ม · โอกาสเกิดเวลาช้า (Zed Time) 2 เท่า',active:'สาดน้ำมนต์',activeDesc:'กรวยน้ำมนต์ข้างหน้า 12 ม. ดาเมจ 220 ตัวที่รอดมึนงง',cd:20,abIcon:'💧'},
];
if(!Array.isArray(save.chars))save.chars=['aritat'];if(!save.char||!save.chars.includes(save.char))save.char='aritat';if(!Array.isArray(save.hist))save.hist=[];
const curChar=()=>CHARS.find(c=>c.id===save.char)||CHARS[0];
const isChar=id=>save.char===id;
const shopCost=s=>Math.round(s.cost*Math.pow(1.75,upLv(s.id)));

/* ======================= AUDIO ======================= */
let zedF=null,compN=null,bakedBus=null,irBuf=null,baking=false,voices=0;const BAKED={};
let AC=null,master=null,sfxBus=null,musicBus=null,revSend=null,noiseBuf=null,muted=false,distCurve=null,lastMeow=0;
function makeCurve(k){const n=2048,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i*2/n-1;c[i]=(3+k)*x*20*Math.PI/180/(Math.PI+k*Math.abs(x));}return c;}
function audio(){
 if(!AC){try{
  AC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'balanced'});
  const n=AC.sampleRate;noiseBuf=AC.createBuffer(1,n*2,n);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const comp=AC.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=6;comp.attack.value=0.003;comp.release.value=0.2;
  master=AC.createGain();master.gain.value=0.9;zedF=AC.createBiquadFilter();zedF.type='lowpass';zedF.frequency.value=20000;comp.connect(zedF).connect(master).connect(AC.destination);compN=comp;bakedBus=AC.createGain();bakedBus.connect(comp);
  sfxBus=AC.createGain();sfxBus.connect(comp);musicBus=AC.createGain();musicBus.gain.value=save.music?0.32:0;musicBus.connect(comp);
  const conv=AC.createConvolver();const len=Math.round(n*1.3),ir=AC.createBuffer(2,len,n);irBuf=ir;for(let ch=0;ch<2;ch++){const b=ir.getChannelData(ch);for(let i=0;i<len;i++)b[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}conv.buffer=ir;
  revSend=AC.createGain();revSend.gain.value=0.35;revSend.connect(conv).connect(comp);
  distCurve=makeCurve(400);
  setTimeout(bakeAll,50);
 }catch(e){AC=null;}}
 if(AC&&AC.state==='suspended')AC.resume();
}
function env(g,t,a,v,d){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);}
function out(node,rev=0.2,bus){node.connect(bus||sfxBus);if(rev>0){const s=AC.createGain();s.gain.value=rev;node.connect(s).connect(revSend);}}
function nz(t,dur,type,freq,vol,q=1,rev=0.2,f2,bus){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type=type;f.frequency.setValueAtTime(freq,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);f.Q.value=q;env(g,t,0.002,vol,dur);s.connect(f).connect(g);out(g,rev,bus);s.start(t,Math.random());s.stop(t+dur+0.05);}
function osc(t,type,f1,f2,dur,vol,rev=0.1,dist=false,bus){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);env(g,t,0.002,vol,dur);
 if(dist){const w=AC.createWaveShaper();w.curve=distCurve;o.connect(w).connect(g);}else o.connect(g);out(g,rev,bus);o.start(t);o.stop(t+dur+0.05);}
const S={
 ssg(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.05,'highpass',3000,0.6,0.7,0.1);nz(t,0.55,'lowpass',2400,1.0,0.8,0.45,300);osc(t,'sine',95,32,0.45,1.0,0.1);osc(t,'square',60,30,0.2,0.3,0,true);
  nz(t+0.42,0.05,'bandpass',2500,0.25,4,0.05);nz(t+0.55,0.06,'bandpass',1800,0.28,4,0.05);nz(t+0.7,0.05,'bandpass',3200,0.22,5,0.05);},
 cg(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.07,'bandpass',1600,0.55,0.9,0.18);osc(t,'sine',150,55,0.08,0.55,0.05);nz(t,0.02,'highpass',5000,0.25,1,0);},
 spin(on){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sawtooth',on?200:700,on?700:150,0.35,0.05,0);},
 rocket(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sine',120,40,0.3,0.7,0.1);nz(t,0.6,'bandpass',600,0.45,0.7,0.3,2200);},
 boom(vol=1){if(!AC||muted)return;const t=AC.currentTime;nz(t,1.4,'lowpass',1400,1.1*vol,0.6,0.6,120);osc(t,'sine',70,24,1.0,1.2*vol,0.2);osc(t,'square',50,25,0.4,0.35*vol,0,true);nz(t+0.05,0.8,'highpass',2500,0.18*vol,0.5,0.4);},
 plasma(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'square',1500,500,0.09,0.12,0.2);osc(t,'sine',2600,1300,0.06,0.1,0.1);nz(t,0.05,'highpass',6000,0.12,1,0.05);},
 zap(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.1,'bandpass',3000,0.2,3,0.1);},
 punch(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sine',120,40,0.18,0.9,0.05);nz(t,0.08,'lowpass',900,0.5,1,0.1);},
 swoosh(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.15,'bandpass',800,0.2,1.5,0,3000);},
 squish(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.12,'bandpass',rand(350,650),0.55,3,0.08,180);osc(t,'sine',90,40,0.1,0.35,0);},
 gib(){if(!AC||muted)return;const t=AC.currentTime;for(let i=0;i<4;i++)nz(t+i*0.04+rand(0,0.03),0.16,'bandpass',rand(300,900),0.55,2.5,0.15,150);osc(t,'sine',80,30,0.3,0.7,0.1);nz(t,0.05,'highpass',2000,0.3,1,0.05);},
 crunch(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.25,'bandpass',500,0.9,1.2,0.2,120);osc(t,'square',90,30,0.25,0.5,0.05,true);for(let i=0;i<5;i++)nz(t+0.03*i,0.06,'highpass',2500,0.3,2,0);},
 tick(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'square',1700,0,0.03,0.05,0);},
 head(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'triangle',1900,0,0.08,0.12,0.05);osc(t+0.045,'triangle',2700,0,0.1,0.1,0.05);},
 hurt(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'square',160,60,0.25,0.25,0.1,true);nz(t,0.15,'lowpass',700,0.3,1,0.1);},
 pick(f=900){if(!AC||muted)return;const t=AC.currentTime;osc(t,'triangle',f,f*1.5,0.1,0.12,0.05);},
 ammo(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.04,'bandpass',2600,0.3,5,0);nz(t+0.07,0.04,'bandpass',3400,0.3,5,0);},
 empty(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.03,'bandpass',3000,0.2,8,0);},
 jump(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.1,'bandpass',500,0.12,1,0);},
 dash(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.25,'bandpass',900,0.35,0.8,0.1,3500);},
 wave(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sawtooth',82.4,0,1.2,0.35,0.5,true);osc(t,'sawtooth',123.5,0,1.2,0.25,0.5,true);osc(t,'sine',41,0,1.2,0.6,0.3);nz(t,1.2,'lowpass',500,0.4,1,0.6);},
 bossRoar(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sawtooth',140,50,1.8,0.6,0.6,true);osc(t,'sawtooth',210,70,1.6,0.35,0.6,true);nz(t,1.8,'bandpass',700,0.6,1.5,0.6,200);},
 slam(){S.boom(1.2);},
 fireball(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.4,'bandpass',900,0.3,1,0.2,300);},
 coin(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'square',1320,0,0.07,0.05,0.1);osc(t+0.06,'square',1760,0,0.09,0.05,0.1);},
 sniper(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.04,'highpass',2600,0.9,0.7,0.1);nz(t,1.0,'lowpass',3200,1.1,0.7,0.65,350);osc(t,'sine',130,34,0.55,1.2,0.15);osc(t,'square',80,30,0.25,0.4,0,true);
  nz(t+0.38,0.05,'bandpass',2200,0.3,5,0.05);nz(t+0.52,0.06,'bandpass',1500,0.32,5,0.05);},
 toss(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'triangle',2300,3100,0.07,0.06,0.1);nz(t,0.04,'highpass',6000,0.08,1,0);},
 ting(c=0){if(!AC||muted)return;const t=AC.currentTime,f=3000*(1+c*0.12);osc(t,'triangle',f,0,0.5,0.16,0.5);osc(t,'sine',f*1.5,0,0.35,0.08,0.4);nz(t,0.03,'highpass',7000,0.2,1,0.1);},
 zoom(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.05,'bandpass',1400,0.08,4,0);},
 rank(i){if(!AC||muted)return;const t=AC.currentTime,f=82.4*Math.pow(2,(i*2)/12);osc(t,'sawtooth',f*2,0,0.35,0.12,0.4,true);osc(t,'sawtooth',f*3,0,0.35,0.08,0.4,true);osc(t+0.06,'triangle',f*8,0,0.25,0.06,0.3);},
 bfg(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sawtooth',90,900,0.5,0.25,0.5,true);osc(t+0.4,'sine',1200,60,0.8,0.6,0.4);nz(t+0.35,0.9,'bandpass',1200,0.5,0.8,0.5,300);osc(t,'square',45,30,1.2,0.3,0.3,true);},
 berserk(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'sawtooth',70,140,0.9,0.5,0.5,true);osc(t,'sawtooth',105,210,0.9,0.35,0.5,true);nz(t,0.9,'lowpass',600,0.5,1,0.5);},
 glory(){if(!AC||muted)return;const t=AC.currentTime;S.crunch();osc(t,'sawtooth',82,0,0.6,0.3,0.5,true);osc(t,'sawtooth',61.7,0,0.6,0.25,0.5,true);},
};
let softCurve=null;
function nzx(t,dur,type,freq,vol,q=1,rev=0.2,f2){if(!softCurve)softCurve=makeCurve(60);const s=AC.createBufferSource(),f=AC.createBiquadFilter(),w=AC.createWaveShaper(),g=AC.createGain();s.buffer=noiseBuf;f.type=type;f.frequency.setValueAtTime(freq,t);if(f2)f.frequency.exponentialRampToValueAtTime(f2,t+dur);f.Q.value=q;w.curve=softCurve;env(g,t,0.001,vol,dur);s.connect(f).connect(w).connect(g);out(g,rev);s.start(t,Math.random());s.stop(t+dur+0.05);}
// per-gun layered shot: crack + distorted body + thump (+sub) + long tail + slap-back echo off the shophouses + mechanics
const GSND={
 dg:{crack:[3000,0.035,0.9],body:[950,0.16,1.0,1.1,300],thump:[170,42,0.24,1.3],tail:[1900,200,0.9,0.42],slap:0.13,mech:'slide',ping:1},
 ssg:{crack:[2400,0.05,0.85],body:[700,0.3,1.25,0.8,170],thump:[115,32,0.45,1.45],sub:[55,0.45,0.7],tail:[1600,150,1.4,0.55],slap:0.15},
 ak:{crack:[3400,0.025,0.75],body:[1250,0.09,0.9,1.2,500],thump:[190,60,0.1,1.0],tail:[2200,300,0.5,0.3],slap:0.11,mech:'ak',ping:0.35},
 m79:{thoonk:1},
 bar:{crack:[2100,0.06,1.15],body:[600,0.38,1.35,0.7,140],thump:[95,26,0.75,1.65],sub:[42,0.7,1.0],tail:[1300,110,2.2,0.65],slap:0.2,brake:1,mech:'bar',ping:1},
};
Object.assign(S,{
 gun(id,vol=1){if(!AC||muted)return;const t=AC.currentTime,c=GSND[id];if(!c)return;
  if(c.thoonk){osc(t,'sine',260,70,0.14,1.1*vol,0.1);nzx(t,0.1,'bandpass',420,0.8*vol,1.2,0.15,160);nz(t,0.03,'highpass',2500,0.25*vol,1,0.05);nz(t+0.05,0.4,'lowpass',900,0.25*vol,0.7,0.4,200);return;}
  nz(t,c.crack[1],'highpass',c.crack[0],c.crack[2]*vol,0.7,0.08);
  nzx(t,c.body[1],'bandpass',c.body[0],c.body[2]*vol,c.body[3],0.3,c.body[4]);
  osc(t,'sine',c.thump[0],c.thump[1],c.thump[2],c.thump[3]*vol,0.12);osc(t,'triangle',c.thump[0]*1.5,c.thump[1]*1.5,c.thump[2]*0.6,c.thump[3]*0.35*vol,0,true);
  if(c.sub)osc(t,'sine',c.sub[0],c.sub[0]*0.6,c.sub[1],c.sub[2]*vol,0.1);
  nz(t+0.012,c.tail[2],'lowpass',c.tail[0],c.tail[3]*vol,0.6,0.85,c.tail[1]);
  if(c.slap)nz(t+c.slap,c.tail[2]*0.6,'lowpass',c.tail[0]*0.7,c.tail[3]*0.45*vol,0.6,0.6,c.tail[1]);
  if(c.brake)nz(t+0.006,0.05,'bandpass',1800,0.6*vol,1.5,0.2);
  if(c.mech==='slide'){nz(t+0.05,0.02,'bandpass',3200,0.22*vol,6,0);nz(t+0.085,0.025,'bandpass',2400,0.26*vol,6,0);}
  if(c.mech==='ak')nz(t+0.02,0.015,'bandpass',2800,0.15*vol,7,0);
  if(c.mech==='bar'){nz(t+0.09,0.03,'bandpass',1800,0.3*vol,5,0);nz(t+0.14,0.03,'bandpass',1400,0.3*vol,5,0);}
  if(c.ping&&vol>0.6&&Math.random()<c.ping)S.casing(0.3+Math.random()*0.15);},
 casing(d){if(!AC||muted)return;const t=AC.currentTime+d;osc(t,'triangle',4200+rand(-300,300),0,0.12,0.05,0.2);osc(t+0.09,'triangle',5200+rand(-300,300),0,0.08,0.035,0.2);osc(t+0.16,'triangle',4700,0,0.06,0.025,0.1);},
 rl(k){if(!AC||muted)return;const t=AC.currentTime;
  if(k==='out'){nz(t,0.03,'bandpass',1800,0.3,5,0);osc(t,'square',260,180,0.04,0.05,0);}
  else if(k==='in'){nz(t,0.025,'bandpass',2600,0.35,5,0);nz(t+0.04,0.05,'bandpass',1300,0.45,4,0.05);osc(t+0.04,'sine',160,90,0.06,0.3,0);}
  else if(k==='slide'){nz(t,0.02,'bandpass',3600,0.3,6,0);nz(t+0.07,0.03,'bandpass',2600,0.45,5,0.05);}
  else if(k==='charge'){nz(t,0.04,'bandpass',2200,0.3,4,0);nz(t+0.12,0.035,'bandpass',3000,0.5,5,0.05);osc(t+0.12,'sine',200,120,0.05,0.3,0);}
  else if(k==='break'){nz(t,0.06,'bandpass',1500,0.4,3,0.05);osc(t,'sine',300,150,0.05,0.25,0);osc(t,'triangle',900,0,0.2,0.04,0.2);}
  else if(k==='eject'){nz(t,0.05,'bandpass',900,0.3,3,0);nz(t+0.05,0.05,'bandpass',800,0.3,3,0);osc(t+0.25,'sine',700,0,0.06,0.12,0.1);osc(t+0.33,'sine',650,0,0.06,0.1,0.1);}
  else if(k==='shell'){nz(t,0.04,'bandpass',1100,0.3,4,0);osc(t,'sine',400,250,0.04,0.2,0);}
  else if(k==='close'){nz(t,0.05,'bandpass',1800,0.5,4,0.05);osc(t,'sine',220,90,0.08,0.4,0.05);osc(t,'triangle',1200,0,0.15,0.04,0.2);}},
 dry(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.02,'bandpass',3500,0.3,8,0);nz(t+0.03,0.02,'bandpass',2000,0.2,8,0);},
 boom(vol=1){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.05,'highpass',1800,0.9*vol,0.7,0.1);nzx(t,0.5,'lowpass',2200,1.2*vol,0.7,0.5,180);osc(t,'sine',85,22,1.1,1.5*vol,0.25);osc(t,'square',50,25,0.4,0.35*vol,0,true);
  nz(t+0.05,1.6,'lowpass',900,0.6*vol,0.6,0.8,90);nz(t+0.22,0.9,'lowpass',700,0.3*vol,0.6,0.6,90);for(let i=0;i<5;i++)nz(t+0.25+rand(0,0.6),0.04,'bandpass',rand(1500,4000),0.08*vol,4,0.1);},
 squeak(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'square',2200,3400,0.07,0.06,0.1);osc(t+0.08,'square',2800,2000,0.06,0.05,0.1);},
 bark(g){if(!AC||muted)return;const t=AC.currentTime;for(let i=0;i<(g?1:2);i++){const s=t+i*0.18;nzx(s,0.12,'bandpass',g?380:620,0.6,1.4,0.2,g?200:300);osc(s,'sawtooth',g?160:300,g?90:170,g?0.5:0.12,0.25,0.2,true);}},
 shriek(d){if(!AC||muted)return;const t=AC.currentTime;const o=AC.createOscillator(),gn=AC.createGain(),vib=AC.createOscillator(),vg=AC.createGain();o.type='sawtooth';o.frequency.setValueAtTime(d?1400:900,t);o.frequency.exponentialRampToValueAtTime(d?220:1700,t+(d?1.2:0.5));vib.frequency.value=11;vg.gain.value=60;vib.connect(vg).connect(o.frequency);env(gn,t,0.03,0.12,d?1.2:0.5);o.connect(gn);out(gn,0.6);o.start(t);vib.start(t);o.stop(t+1.4);vib.stop(t+1.4);nz(t,d?1:0.4,'bandpass',2500,0.15,2,0.5);},
 acid(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.3,'bandpass',1800,0.25,2,0.2,600);osc(t,'sine',500,180,0.2,0.15,0.1);},
 sizzle(){if(!AC||muted)return;const t=AC.currentTime;nz(t,0.5,'highpass',3500,0.12,1,0.2);},
 shield(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'triangle',1500,900,0.25,0.2,0.4);osc(t,'sine',2400,1800,0.3,0.12,0.4);},
 crit(){if(!AC||muted)return;const t=AC.currentTime;osc(t,'square',2600,0,0.06,0.08,0.05);osc(t+0.03,'triangle',3900,0,0.12,0.1,0.1);},
});
// ---- pre-rendered SFX: each shot becomes one buffer source instead of ~12 live nodes ----
function bakeAll(){if(!AC||!window.OfflineAudioContext||baking)return;baking=true;const sr=AC.sampleRate;
 const jobs=[];for(const id of ['dg','ssg','ak','m79','bar'])jobs.push(['gun_'+id,()=>LIVE.gun(id,1),id==='bar'?3:id==='ssg'?2.4:1.8,3]);
 jobs.push(['boom_1',()=>LIVE.boom(1),3,2],['boom_0.8',()=>LIVE.boom(0.8),3,1]);
 for(const k of ['out','in','slide','charge','break','eject','shell','close'])jobs.push(['rl_'+k,()=>LIVE.rl(k),0.7,1]);
 for(const k of ['head','tick','hurt','squish','gib','crunch','punch','zap','fireball','acid','ammo','dry','crit','sizzle','swoosh','jump','dash','coin','toss'])if(LIVE[k])jobs.push([k,()=>LIVE[k](),k==='gib'||k==='crunch'?1.2:0.8,k==='tick'||k==='squish'||k==='head'?2:1]);
 (async()=>{for(const [key,fn,dur,n] of jobs){const list=[];for(let v=0;v<n;v++){const off=new OfflineAudioContext(2,Math.ceil(sr*dur),sr);const bus=off.createGain();bus.connect(off.destination);
   const conv=off.createConvolver();conv.buffer=irBuf;const rs=off.createGain();rs.gain.value=0.35;rs.connect(conv).connect(off.destination);
   const sv=[AC,sfxBus,revSend,muted];AC=off;sfxBus=bus;revSend=rs;muted=false;try{fn();}catch(e){}AC=sv[0];sfxBus=sv[1];revSend=sv[2];muted=sv[3];
   try{list.push(await off.startRendering());}catch(e){}}if(list.length)BAKED[key]=list;}})();}
window.__bk=BAKED;function playBaked(key,vol=1){const list=BAKED[key];if(!list||!AC||muted)return !!list;if(voices>40)return true;
 const src=AC.createBufferSource();src.buffer=list[(Math.random()*list.length)|0];src.playbackRate.value=rand(0.95,1.05);let node=src;
 if(vol!==1){const g=AC.createGain();g.gain.value=vol;src.connect(g);node=g;}node.connect(bakedBus);voices++;src.onended=()=>{voices--;};src.start(AC.currentTime+0.004);return true;}
const LIVE=Object.assign({},S);
S.gun=(id,vol=1)=>{if(!AC||muted)return;if(playBaked('gun_'+id,vol))return;LIVE.gun(id,vol);};
S.boom=(vol=1)=>{if(!AC||muted)return;if(playBaked('boom_'+(vol<0.9?'0.8':'1'),vol<0.9?1:Math.min(1.4,vol)))return;LIVE.boom(vol);};
S.rl=(k)=>{if(!AC||muted)return;if(playBaked('rl_'+k))return;LIVE.rl(k);};
for(const k of ['head','tick','hurt','squish','gib','crunch','punch','zap','fireball','acid','ammo','dry','crit','sizzle','swoosh','jump','dash','coin','toss'])if(LIVE[k]&&LIVE[k].length===0)S[k]=()=>{if(!AC||muted)return;if(playBaked(k))return;LIVE[k]();};
S.slam=()=>S.boom(1.2);
S.zedIn=()=>{if(!AC)return;const t=AC.currentTime;zedF.frequency.cancelScheduledValues(t);zedF.frequency.setTargetAtTime(650,t,0.08);if(muted)return;nz(t,0.6,'bandpass',300,0.5,0.8,0.5,3000);osc(t,'sine',60,40,0.5,0.6,0.3);osc(t+0.45,'sine',55,40,0.25,0.5,0);};
S.zedOut=()=>{if(!AC)return;const t=AC.currentTime;zedF.frequency.cancelScheduledValues(t);zedF.frequency.setTargetAtTime(20000,t,0.15);if(muted)return;nz(t,0.5,'bandpass',2500,0.35,0.8,0.4,300);};
S.beat=()=>{if(!AC||muted)return;const t=AC.currentTime;osc(t,'sine',58,40,0.18,0.55,0);osc(t+0.2,'sine',52,38,0.15,0.4,0);};
let flameN=null;
function flameSound(on){if(!AC)return;if(muted)on=false;
 if(!flameN){if(!on)return;const s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=AC.createBiquadFilter();f.type='bandpass';f.frequency.value=480;f.Q.value=0.55;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2300;
  const g=AC.createGain();g.gain.value=0;const lfo=AC.createOscillator();lfo.frequency.value=13;const lg=AC.createGain();lg.gain.value=0.1;lfo.connect(lg).connect(g.gain);s.connect(f).connect(lp).connect(g);out(g,0.25);s.start();lfo.start();flameN={g,on:false};}
 if(on!==flameN.on){flameN.on=on;const t=AC.currentTime;flameN.g.gain.cancelScheduledValues(t);flameN.g.gain.setTargetAtTime(on?0.85:0,t,on?0.04:0.08);if(on)nz(t,0.25,'bandpass',300,0.45,0.8,0.2,2500);else nz(t,0.15,'lowpass',600,0.25,1,0.1);}}
function demonMeow(p=1,growl=false){if(!AC||muted)return;const now=AC.currentTime;if(now-lastMeow<0.08)return;lastMeow=now;
 const o=AC.createOscillator(),o2=AC.createOscillator(),f=AC.createBiquadFilter(),w=AC.createWaveShaper(),g=AC.createGain();o.type='sawtooth';o2.type='sawtooth';w.curve=distCurve;f.type='bandpass';f.frequency.value=900*p;f.Q.value=1.2;
 const k=p*rand(0.85,1.1);[o,o2].forEach((x,i)=>{const m=i?0.5:1;x.frequency.setValueAtTime(420*k*m,now);x.frequency.linearRampToValueAtTime((growl?300:820)*k*m,now+0.09);x.frequency.linearRampToValueAtTime(220*k*m,now+0.45);});
 env(g,now,0.03,0.22,0.45);o.connect(w);o2.connect(w);w.connect(f).connect(g);out(g,0.4);o.start(now);o2.start(now);o.stop(now+0.55);o2.stop(now+0.55);}
// ---- procedural metal soundtrack ----
const music={on:save.music,step:0,next:0,timer:null,bpm:168,riff:0,intense:0};
const RIFFS=[[0,0,null,0,0,null,3,null,0,0,null,0,5,null,6,5],[0,0,0,null,0,0,7,null,0,0,0,null,10,null,8,7],[0,null,0,0,12,null,0,0,10,null,0,0,7,null,5,3],[0,0,null,0,0,null,1,null,0,0,null,0,3,null,1,0]];
const KICK=[1,0,0,1,0,0,1,0,1,0,1,1,0,0,1,0],SNARE=[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1];
function guitar(t,semi,dur,accent){const f=82.41*Math.pow(2,semi/12);const g=AC.createGain(),w=AC.createWaveShaper(),lp=AC.createBiquadFilter();w.curve=distCurve;lp.type='lowpass';lp.frequency.value=accent?3200:1500;
 for(const m of [1,1.4983,2]){const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f*m;o.detune.value=rand(-8,8);o.connect(w);o.start(t);o.stop(t+dur+0.05);}
 env(g,t,0.004,accent?0.16:0.11,dur);w.connect(lp).connect(g);g.connect(musicBus);}
function schedule(){if(!AC)return;const spb=60/music.bpm/4;
 while(music.next<AC.currentTime+0.32){const t=music.next,s=music.step%16;const bar=Math.floor(music.step/16);
  if(state==='play'||state==='upgrade'){
   const r=RIFFS[(Math.floor(bar/2)+music.riff)%RIFFS.length][s];
   if(KICK[s]||(music.intense>0.5&&s%2===0)){osc(t,'sine',140,42,0.16,0.75,0,false,musicBus);nz(t,0.02,'highpass',3000,0.1,1,0,null,musicBus);}
   if(SNARE[s]){nz(t,0.18,'bandpass',1800,0.45,0.6,0.25,null,musicBus);osc(t,'triangle',220,140,0.08,0.25,0,false,musicBus);}
   nz(t,0.03,'highpass',8000,s%2?0.05:0.09,1,0,null,musicBus);
   if(r!==null&&r!==undefined)guitar(t,r,r===0?spb*0.8:spb*1.6,r!==0);
  }else{ // menu: slow drone
   if(s===0&&bar%2===0){guitar(t,0,spb*14,false);osc(t,'sine',41.2,0,spb*15,0.25,0.3,false,musicBus);}
   if(s===8&&bar%4===3)guitar(t,1,spb*6,false);
  }
  music.step++;music.next+=spb;}
}
function startMusic(){if(!AC||music.timer)return;music.next=AC.currentTime+0.1;music.timer=setInterval(schedule,25);}
function setMusic(on){music.on=on;save.music=on;persist();if(musicBus)musicBus.gain.setTargetAtTime(on&&!muted?0.32:0,AC.currentTime,0.1);['#musicBtn','#musicBtn2'].forEach(s=>$(s).textContent='เพลง: '+(on?'เปิด':'ปิด'));}

/* ======================= RENDERER ======================= */
const cv=$('#game');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance',stencil:false});
renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(80,1,0.05,700);camera.rotation.order='YXZ';scene.add(camera);
if(save.quality!=='high'&&save.quality!=='medium'&&save.quality!=='low')save.quality='high';
let post=null;
function setupPost(){if(post){post.dispose();post=null;}post=createPost(renderer,scene,camera,save.quality);applyBright();}
const QNAME={high:'สูง',medium:'กลาง',low:'ต่ำ (ลื่นกว่า)'};
function applyQuality(){const q=save.quality,dpr=devicePixelRatio||1;renderer.setPixelRatio(q==='high'?Math.min(1.5,dpr):q==='medium'?Math.min(1,dpr):Math.min(1,dpr)*0.75);
 renderer.shadowMap.enabled=q!=='low';W.setShadows(q!=='low');scene.traverse(o=>{if(o.material&&o.material.needsUpdate!==undefined)o.material.needsUpdate=true;});setupPost();resize();
 ['#qBtn','#qBtn2'].forEach(s=>$(s).textContent='กราฟิก: '+QNAME[q]);}
const splatCv=$('#splat'),sctx=splatCv.getContext('2d');
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(post)post.setSize(w,h);splatCv.width=Math.round(w/2);splatCv.height=Math.round(h/2);}
addEventListener('resize',resize);

/* ======================= TEXTURES ======================= */
function cvTex(w,h,draw,rep){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=8;t.redraw=()=>{draw(c.getContext('2d'),w,h);t.needsUpdate=true;};return t;}
const glowTex=cvTex(64,64,(g,w)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.25,'rgba(255,255,255,.7)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,w);});
const smokeTex=cvTex(128,128,(g,w)=>{for(let i=0;i<26;i++){const x=rand(34,94),y=rand(34,94),rr=rand(14,34);const r=g.createRadialGradient(x,y,0,x,y,rr);r.addColorStop(0,'rgba(255,255,255,.28)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,w);}});
const splatTex=cvTex(128,128,(g,w)=>{g.fillStyle='#fff';g.beginPath();g.arc(64,64,30,0,TAU);g.fill();for(let i=0;i<16;i++){const a=rand(0,TAU),d=rand(26,56),r=rand(3,11);g.beginPath();g.arc(64+Math.cos(a)*d,64+Math.sin(a)*d,r,0,TAU);g.fill();g.lineWidth=r*0.9;g.strokeStyle='#fff';g.beginPath();g.moveTo(64,64);g.lineTo(64+Math.cos(a)*d,64+Math.sin(a)*d);g.stroke();}});

/* ======================= WORLD ======================= */
$('#loading').textContent='กำลังสร้างซอยนรก…';
await Promise.all([preloadTextures(),loadCats('assets/'),document.fonts?document.fonts.ready:0]);
const W=buildWorld(scene,renderer,save.quality);
const statics=W.statics,obstacles=W.obstacles;
const GEO={box:new THREE.BoxGeometry(1,1,1),cone:new THREE.ConeGeometry(1,1,6),cone4:new THREE.ConeGeometry(1,1,4),sph:new THREE.SphereGeometry(1,14,10),cyl:new THREE.CylinderGeometry(1,1,1,14)};
const mc={};
const std=(c,o={})=>{const k=c+JSON.stringify(o);return mc[k]||(mc[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.75,metalness:0.05},o)));};
const bas=(c,o={})=>{const k='b'+c+JSON.stringify(o);return mc[k]||(mc[k]=new THREE.MeshBasicMaterial(Object.assign({color:c},o)));};
function part(geo,mat,sx,sy,sz,x,y,z,parent){const m=new THREE.Mesh(geo,mat);m.scale.set(sx,sy,sz);m.position.set(x,y,z);parent.add(m);return m;}
function freeSpot(x,z,r){return W.free(x,z,r);}
// LPG gas tanks (explosive) — seeded spots, identical for both co-op peers
const barrels=[];const BARREL_POS=[];for(let i=0;i<400&&BARREL_POS.length<22;i++){const x=srg(-A+5,A-5),z=srg(-A+5,A-5);if(freeSpot(x,z,1.5))BARREL_POS.push([+x.toFixed(2),+z.toFixed(2)]);}
const tankRed=new THREE.MeshStandardMaterial({color:0xb01212,roughness:0.32,metalness:0.55});
const tankGeo=(()=>{const pts=[];for(let i=0;i<=16;i++){const t=i/16;const y=t*1.25;let r=0.36;if(y<0.12)r=0.3+y*0.5;if(y>1.0)r=0.36*Math.sqrt(Math.max(0,1-((y-1.0)/0.26)**2))+0.02;pts.push(new THREE.Vector2(r,y));}return new THREE.LatheGeometry(pts,20);})();
function spawnBarrels(){for(const b of barrels)removeBarrel(b,false);barrels.length=0;
 BARREL_POS.forEach(([x,z],idx)=>{if(NET.mode!=='client'&&P&&Math.hypot(P.pos.x-x,P.pos.z-z)<3)return;const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const body=new THREE.Mesh(tankGeo,tankRed);body.castShadow=true;g.add(body);
  part(GEO.cyl,std(0x9a9aa0,{metalness:0.9,roughness:0.25}),0.07,0.18,0.07,0,1.32,0,g);part(GEO.cyl,std(0x2a2a2e,{metalness:0.6,roughness:0.4}),0.2,0.05,0.2,0,1.24,0,g);
  part(GEO.cyl,std(0xf0f0f0,{roughness:0.5}),0.365,0.12,0.365,0,0.75,0,g);
  const hit=part(GEO.box,new THREE.MeshBasicMaterial({visible:false}),0.75,1.3,0.75,0,0.65,0,g);
  g.updateMatrixWorld(true);
  const o={x,z,hw:0.42,hd:0.42,h:1.3,mesh:hit,g,hp:25,barrel:true,idx};hit.userData.barrel=o;obstacles.push(o);statics.push(hit);barrels.push(o);});}
function removeBarrel(b){scene.remove(b.g);const i=obstacles.indexOf(b);if(i>=0)obstacles.splice(i,1);const j=statics.indexOf(b.mesh);if(j>=0)statics.splice(j,1);b.dead=true;}

/* ======================= GORE SYSTEMS ======================= */
const dummy=new THREE.Object3D(),ZERO=new THREE.Matrix4().makeScale(0,0,0),tmpC=new THREE.Color();
function inst(geo,mat,n){const m=new THREE.InstancedMesh(geo,mat,n);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;for(let i=0;i<n;i++){m.setMatrixAt(i,ZERO);m.setColorAt(i,tmpC.setRGB(1,1,1));}scene.add(m);return m;}
// blood droplets
const BD=900;const bloodI=inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:0.2,metalness:0.1,emissive:0x220000}),BD);
const bd={p:new Float32Array(BD*3),v:new Float32Array(BD*3),l:new Float32Array(BD),s:new Float32Array(BD),i:0};
const BLOODC=[0x8a0303,0x6e0202,0xa80a0a,0x520000,0xb51414];
function blood(x,y,z,n,spd=5,size=0.07,dir){for(let k=0;k<n;k++){const i=bd.i++%BD;bd.p[i*3]=x;bd.p[i*3+1]=y;bd.p[i*3+2]=z;
 let vx=rand(-1,1)*spd,vy=rand(0.2,1.2)*spd,vz=rand(-1,1)*spd;if(dir){vx+=dir.x*spd*1.3;vy+=Math.max(0,dir.y)*spd;vz+=dir.z*spd*1.3;}
 bd.v[i*3]=vx;bd.v[i*3+1]=vy;bd.v[i*3+2]=vz;bd.l[i]=rand(0.6,1.4);bd.s[i]=size*rand(0.5,1.6);bloodI.setColorAt(i,tmpC.setHex(pick(BLOODC)));}bloodI.instanceColor.needsUpdate=true;}
// decals (blood pools / scorch)
const DC=260;const decalGeo=new THREE.PlaneGeometry(1,1);decalGeo.rotateX(-Math.PI/2);
const decalI=inst(decalGeo,new THREE.MeshStandardMaterial({map:splatTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:0.15,metalness:0.2,alphaTest:0.02}),DC);decalI.renderOrder=1;
let dcI=0;function decal(x,z,size,hex){const i=dcI++%DC;dummy.position.set(x,0.012+(i%40)*0.0004,z);dummy.rotation.set(0,rand(0,TAU),0);dummy.scale.set(size,1,size*rand(0.7,1.3));dummy.updateMatrix();decalI.setMatrixAt(i,dummy.matrix);decalI.setColorAt(i,tmpC.setHex(hex||pick(BLOODC)));decalI.instanceMatrix.needsUpdate=true;decalI.instanceColor.needsUpdate=true;}
// gibs
const GB=220;const gibI=inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:0.45,metalness:0.1}),GB);
const gb={p:new Float32Array(GB*3),v:new Float32Array(GB*3),r:new Float32Array(GB*3),w:new Float32Array(GB*3),l:new Float32Array(GB),s:new Float32Array(GB*3),i:0};
function gibs(x,y,z,n,colors,scale=1,force=8,dir){for(let k=0;k<n;k++){const i=gb.i++%GB;gb.p[i*3]=x+rand(-0.3,0.3)*scale;gb.p[i*3+1]=y+rand(-0.2,0.4)*scale;gb.p[i*3+2]=z+rand(-0.3,0.3)*scale;
 let vx=rand(-1,1)*force,vy=rand(0.4,1.4)*force,vz=rand(-1,1)*force;if(dir){vx+=dir.x*force*0.8;vz+=dir.z*force*0.8;}gb.v[i*3]=vx;gb.v[i*3+1]=vy;gb.v[i*3+2]=vz;
 for(let a=0;a<3;a++){gb.r[i*3+a]=rand(0,TAU);gb.w[i*3+a]=rand(-14,14);gb.s[i*3+a]=rand(0.08,0.28)*scale;}gb.l[i]=rand(7,11);
 const c=k%3===0?pick([0x7a0a0a,0x5a0505,0x9a1515]):k%7===0?0xe8dcc8:pick(colors);gibI.setColorAt(i,tmpC.setHex(c));}gibI.instanceColor.needsUpdate=true;}
// sprite FX pool
const FXN=480;const fxs=[];for(let i=0;i<FXN;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.visible=false;scene.add(s);fxs.push({s,l:0,m:1,v:new THREE.Vector3(),s0:1,s1:1,o:1,add:true,rot:0});}
let fxI=0;
function fx(x,y,z,o){const f=fxs[fxI++%FXN];const s=f.s;s.position.set(x,y,z);f.v.set(o.vx||0,o.vy||0,o.vz||0);f.l=f.m=o.life||0.5;f.s0=o.s0||0.5;f.s1=o.s1||1;f.o=o.op===undefined?1:o.op;f.g=o.g||0;f.rot=o.rot||0;
 const add=o.add!==false;if(f.add!==add){s.material.blending=add?THREE.AdditiveBlending:THREE.NormalBlending;s.material.needsUpdate=true;f.add=add;}
 s.material.map=o.tex||glowTex;s.material.color.setHex(o.color||0xffffff);s.material.rotation=rand(0,TAU);s.visible=true;}
const boomLight=new THREE.PointLight(0xff7a2a,0,40,2);scene.add(boomLight);
// screen blood splats (2D)
const scrSplats=[];
function screenSplat(n,big){for(let i=0;i<n;i++)scrSplats.push({x:rand(0.05,0.95),y:rand(0.05,0.8),r:rand(0.02,big?0.075:0.05),l:rand(1.1,2),m:2,d:rand(0.05,0.25),seed:Math.random()*1000});}
function drawSplats(dt){const w=splatCv.width,h=splatCv.height;sctx.clearRect(0,0,w,h);if(!scrSplats.length)return;
 for(const s of scrSplats){s.l-=dt;const a=clamp(s.l/1.0,0,0.62);const r=s.r*w;const x=s.x*w,y=s.y*h+(1-s.l/s.m)*s.d*h;
  sctx.globalAlpha=a;sctx.fillStyle='#6a0000';sctx.beginPath();sctx.arc(x,y,r,0,TAU);sctx.fill();
  let sd=s.seed;const R=()=>{sd=(sd*9301+49297)%233280;return sd/233280;};
  for(let k=0;k<6;k++){const ang=R()*TAU,dd=r*(0.8+R()*0.8);sctx.beginPath();sctx.arc(x+Math.cos(ang)*dd,y+Math.sin(ang)*dd,r*(0.15+R()*0.3),0,TAU);sctx.fill();}
  sctx.fillRect(x-r*0.12,y,r*0.24,r*(1.2+(1-s.l/s.m)*3));
  sctx.fillStyle='rgba(180,20,20,.5)';sctx.beginPath();sctx.arc(x-r*0.3,y-r*0.3,r*0.35,0,TAU);sctx.fill();}
 sctx.globalAlpha=1;for(let i=scrSplats.length-1;i>=0;i--)if(scrSplats[i].l<=0)scrSplats.splice(i,1);}

/* ======================= CATS ======================= */
const CATS={
 tabby:  {name:'แมวส้มนรก',hp:45,spd:6.2,dmg:9,s:1.45,coin:1,body:0xe0701e,dark:0x6a2a08,belly:0xffc890,eye:0xffe14a,stripes:1},
 kitten: {name:'ลูกแมวปีศาจ',hp:16,spd:8.8,dmg:5,s:1.0,coin:0,body:0xc89868,dark:0x5a3418,belly:0xffe8cc,eye:0xff3a2a,stripes:0.7},
 siamese:{name:'วิเชียรมาศสิง',hp:35,spd:9.8,dmg:8,s:1.38,coin:1,body:0xe8d8b8,dark:0x2a1810,belly:0xfff4e0,eye:0x3ab0ff,points:true},
 black:  {name:'แมวดำนรก',hp:60,spd:6.6,dmg:13,s:1.45,coin:2,body:0x2a2230,dark:0x110c16,belly:0x3a3044,eye:0xffd23f,horns:true},
 khao:   {name:'ขาวมณีพ่นไฟ',hp:65,spd:5,dmg:12,s:1.4,coin:2,body:0xeeeae4,dark:0xb8b0a4,belly:0xffffff,eye:0x3ab0ff,eye2:0xffb020},
 korat:  {name:'สีสวาดหุ้มเกราะ',hp:150,spd:5.2,dmg:15,s:1.7,coin:3,body:0x6a7890,dark:0x3a4458,belly:0x8a96aa,eye:0x8aff3a,horns:true,armor:true},
 persian:{name:'เปอร์เซียพุ่งชน',hp:340,spd:4,dmg:24,s:1.95,coin:5,body:0xd0c4c8,dark:0x6a5058,belly:0xffffff,eye:0xff5a10,fluffy:true,horns:true},
 bat:    {name:'แมวค้างคาวนรก',hp:28,spd:9,dmg:8,s:1.15,coin:2,body:0x2a1a2e,dark:0x120a14,belly:0x3a2a3e,eye:0xff2a6a,horns:true,wings:true,fly:true},
 rat:    {name:'หนูท่อนรก',kind:'rat',hp:14,spd:10.5,dmg:4,s:1.5,coin:0,body:0x5a4a40,dark:0x2a2018,belly:0x8a7a6a,eye:0xff2010,hy:0.13,rad:0.3},
 dog:    {name:'หมาวัดคลั่ง',kind:'dog',hp:120,spd:9.4,dmg:15,s:1.75,coin:3,body:0xa87444,dark:0x3a2210,belly:0xe8d0a8,eye:0xffd23f,spots:0.55,nose:0x1a1010},
 krasue: {name:'กระสือ',kind:'krasue',hp:80,spd:6.5,dmg:12,s:1.35,coin:3,body:0xd8c4b0,dark:0x9a1418,belly:0xc86a72,eye:0x8aff6a,fly:true,hy:0.85,rad:0.5},
 boss:   {name:'ราชาแมวนรก',boss:true,tip:'ยิงหัวมัน · กระโดดหลบคลื่นกระแทก',hp:3600,spd:4.4,dmg:30,s:4.4,coin:50,body:0xb83a10,dark:0x2a0804,belly:0xff9a50,eye:0xff1a0a,crown:true,horns:true,stripes:0.9},
 bossDog:{name:'พ่อหมาวัดนรก',kind:'dog',boss:true,tip:'หลบไฟจากปาก · กระโดดหลบตอนมันกระแทกพื้น',hp:3300,spd:6.2,dmg:28,s:4.0,coin:50,body:0x3a2216,dark:0x120804,belly:0x8a6040,eye:0xff2a0a,horns:true,spots:0.8,nose:0x0a0505},
 bossKrasue:{name:'ราชินีกระสือ',kind:'krasue',boss:true,tip:'หลบห่ากรด · ยิงหัวตอนมันโฉบลงมา',hp:2900,spd:5.5,dmg:22,s:3.4,coin:50,body:0xd8c4b0,dark:0x9a1418,belly:0xc86a72,eye:0xd8ff4a,fly:true,hy:0.85,rad:0.45},
};
function makeCat(type){const C=CATS[type];return C.kind==='rat'?buildRat(C):C.kind==='krasue'?buildKrasue(C):buildCat(type,C);}
const HY=e=>(e.C.hy||0.65)*e.s;

/* ======================= WEAPONS / VIEWMODEL ======================= */
const AMMO_TYPES=['shells','762','gren','bmg','fuel'];
const AMMO_NAME={ae:'.50 AE',shells:'ลูกซอง',762:'7.62 มม.',gren:'ลูก 40 มม.',bmg:'.50 BMG',fuel:'น้ำมัน'};
const AMMO_MAX={ae:Infinity,shells:36,'762':270,gren:20,bmg:30,fuel:400},AMMO_START={ae:Infinity,shells:16,'762':90,gren:6,bmg:10,fuel:160},AMMO_PICK={shells:8,'762':45,gren:3,bmg:5,fuel:70};
// rev: [progress, sound] events during reload
const GUNS=[
 {id:'dg',name:'ดีเซิร์ทอีเกิล .50',short:'DE .50',desc:'ปืนพกกระสุนไม่จำกัด ยิงหัวแรงพิเศษ',ammo:'ae',mag:7,reload:1.0,dmg:62,rate:3.6,semi:1,pellets:1,spread:0.012,ads:0.002,knock:5,kick:0.07,vk:0.09,head:1.35,color:0xffe0a0,flash:0.45,shake:0.12,rev:[[0.15,'out'],[0.55,'in'],[0.85,'slide']]},
 {id:'ssg',name:'ลูกซองสองลำกล้อง',short:'2 ลำกล้อง',desc:'ประชิดตัวแมวแตกเป็นชิ้น',ammo:'shells',mag:2,reload:1.2,dmg:12,rate:3.4,semi:1,pellets:12,spread:0.085,ads:0.05,knock:10,kick:0.075,vk:0.14,falloff:1,color:0xffd090,flash:0.6,shake:0.22,rev:[[0.08,'break'],[0.3,'eject'],[0.48,'shell'],[0.62,'shell'],[0.88,'close']]},
 {id:'ak',name:'AK-47',short:'AK-47',desc:'ไรเฟิลอัตโนมัติ 30 นัด ทะลุ 1 ตัว',ammo:'762',mag:30,reload:1.6,dmg:24,rate:10,pellets:1,spread:0.016,ads:0.005,bloom:0.006,pierce:1,knock:2.4,kick:0.016,vk:0.03,hk:0.008,color:0xffe0a0,flash:0.36,shake:0.06,rev:[[0.15,'out'],[0.55,'in'],[0.82,'charge']]},
 {id:'m79',name:'เอ็ม 79',short:'M79',desc:'ยิงลูกระเบิดโค้ง ระเบิดเมื่อกระทบ',ammo:'gren',mag:1,reload:0.85,dmg:200,rate:1.2,semi:1,proj:'gren',kick:0.08,vk:0.1,color:0xff8a3a,flash:0.3,shake:0.12,rev:[[0.1,'break'],[0.5,'shell'],[0.88,'close']]},
 {id:'bar',name:'บาร์เรตต์ .50',short:'.50 BMG',desc:'สไนเปอร์ทะลุทั้งแถว ไม่สนเกราะ',ammo:'bmg',mag:5,reload:2.0,dmg:280,rate:1.25,semi:1,pellets:1,spread:0.03,ads:0,pierce:99,knock:16,kick:0.15,vk:0.16,armorPen:1,color:0xcff4ff,flash:0.7,shake:0.3,rev:[[0.15,'out'],[0.55,'in'],[0.85,'charge']]},
 {id:'fl',name:'ปืนพ่นไฟ',short:'พ่นไฟ',desc:'ย่างทั้งฝูง ศัตรูติดไฟลุกลาม',ammo:'fuel',mag:0,dmg:7,rate:16,flame:1,kick:0,vk:0.004,color:0xff8a3a},
];
const vm=new THREE.Group();camera.add(vm);
const vmLight=new THREE.PointLight(0xffc070,0,14,2);camera.add(vmLight);const torch=new THREE.PointLight(0xffe0c8,20,24,1.4);torch.position.set(0,1.1,1.4);camera.add(torch);const vmFill=new THREE.PointLight(0xffd8c0,0.5,2.5,2);vmFill.position.set(0.1,0.25,0.1);camera.add(vmFill);vmLight.position.set(0.25,-0.1,-0.9);
const gunModels=[];
const GB_=buildGuns();GB_.guns.forEach(g=>gunModels.push(g));const fist=GB_.fist;vm.add(fist);fist.visible=false;
gunModels.forEach(g=>vm.add(g));
const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffd090,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));flash.visible=false;vm.add(flash);
const flash2=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex,color:0xffa040,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));flash2.visible=false;vm.add(flash2);
// tracers
const tracers=[];for(let i=0;i<50;i++){const m=new THREE.Mesh(GEO.box,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));m.visible=false;scene.add(m);tracers.push({m,l:0,max:0.06});}
let trI=0;const _a=new THREE.Vector3(),_b=new THREE.Vector3(),_c=new THREE.Vector3(),_d=new THREE.Vector3(),_e=new THREE.Vector3();
function tracer(from,to,color,w,life){const t=tracers[trI++%tracers.length];const len=from.distanceTo(to);t.m.position.copy(from).lerp(to,0.5);t.m.lookAt(to);t.m.scale.set(w,w,len);t.m.material.color.setHex(color);t.m.material.opacity=1;t.m.visible=true;t.l=t.max=life;}

/* ======================= STATE ======================= */
let zedT=0,zedCd=0,zedBeat=0,slowT=0,coinObjs=[],style=0,styleEvents=[],lastRank=0,streakT=0;
let state='menu',P,enemies,hitMeshes,projs,eprojs,rings,pickups,timers,wave,queue,spawnT,kills,coinsRun,combo,comboT,shake,waveClearT,timeScale=1,gkCount=0,lastTime=performance.now();
const keys=new Set();let firing=false,locked=false,dragLook=false,expectUnlock=false,isTouch=matchMedia('(pointer: coarse)').matches,mouseDown=false;
const RAR={c:{n:'ธรรมดา',col:'#c8b8ae',w:10},r:{n:'หายาก',col:'#58c8ff',w:4.5},l:{n:'ตำนาน',col:'#ffb020',w:1.3},x:{n:'ต้องสาป',col:'#c070ff',w:1.5},g:{n:'อาวุธใหม่',col:'#9be15d',w:0}};
const UPS=[
 {id:'dmg',r:'c',name:'เลือดเดือด',icon:'🩸',desc:'ดาเมจทุกปืน +12%',max:8},
 {id:'rate',r:'c',name:'กาแฟดำสามช็อต',icon:'☕',desc:'ยิงเร็วขึ้น 10%',max:6},
 {id:'hp',r:'c',name:'ข้าวมันไก่จานพิเศษ',icon:'🍗',desc:'พลังชีวิตสูงสุด +25 และฟื้นเต็มหลอด',max:6},
 {id:'armor',r:'c',name:'เกราะฝาหม้อ',icon:'🛡️',desc:'เกราะสูงสุด +25 และเติมเต็ม',max:4},
 {id:'speed',r:'c',name:'รองเท้าแตะติดไฟ',icon:'👟',desc:'วิ่งเร็วขึ้น 8%',max:4},
 {id:'reload',r:'c',name:'มือไวเหมือนแม่ค้า',icon:'🤲',desc:'รีโหลดเร็วขึ้น 20%',max:4},
 {id:'mag',r:'c',name:'แม็กพันเทปพันสายไฟ',icon:'🧷',desc:'แม็กใหญ่ขึ้น 35% (ปืนที่จุเกิน 2 นัด)',max:3},
 {id:'ammo',r:'c',name:'สายกระสุนคาดอก',icon:'🎒',desc:'กระสุนสำรองจุ +40% และเติมเต็ม',max:4},
 {id:'head',r:'c',name:'แว่นตาเหยี่ยว',icon:'🎯',desc:'ยิงโดนหัวแรงขึ้นอีก 40%',max:4},
 {id:'dash',r:'c',name:'ขาไว',icon:'💨',desc:'แดชคูลดาวน์ลด 25%',max:3},
 {id:'leech',r:'r',name:'ดื่มเลือดศัตรู',icon:'🧛',desc:'ฆ่าได้ 1 ตัว ฟื้นพลังชีวิต 3',max:4},
 {id:'pellet',r:'r',name:'ลูกปรายพิเศษ',icon:'🔫',desc:'ลูกซองยิงเพิ่ม 4 เม็ด',max:3},
 {id:'radius',r:'r',name:'ดินปืนเกินขนาด',icon:'💥',desc:'รัศมีระเบิด M79 และถังแก๊ส +25%',max:3},
 {id:'incend',r:'r',name:'กระสุนเพลิง',icon:'🔥',desc:'กระสุนทุกนัดมีโอกาส 20% ทำให้ศัตรูติดไฟ',max:3},
 {id:'chain',r:'r',name:'สายฟ้าฟาดต่อ',icon:'⚡',desc:'ฆ่าแล้วสายฟ้ากระโดดไปช็อตตัวข้างๆ',max:3},
 {id:'bomb',r:'r',name:'ศพระเบิด',icon:'☠️',desc:'ศพมีโอกาส 25% ระเบิดเลือดใส่ตัวรอบๆ',max:3},
 {id:'frost',r:'r',name:'ลมหนาวดอยอินทนนท์',icon:'❄️',desc:'ยิงโดนแล้วศัตรูช้าลง 35% ชั่วครู่',max:2},
 {id:'shield',r:'r',name:'พระผงกันกระสุน',icon:'🔰',desc:'กันการโจมตีได้ 1 ครั้งทุก 10 วิ (ยิ่งเลเวลยิ่งไว)',max:3},
 {id:'djump',r:'r',name:'สลิปเปอร์ติดจรวด',icon:'🚀',desc:'กระโดดกลางอากาศได้อีก 1 ครั้ง',max:1},
 {id:'wallet',r:'r',name:'กระเป๋าสตางค์ใบใหญ่',icon:'🪙',desc:'เหรียญสิบบาทพกได้ +2 และคืนเร็วขึ้น',max:2},
 {id:'focus',r:'r',name:'สมาธิมือปืน',icon:'🧘',desc:'โบนัสยิงหัวติดกันแรงขึ้นอีกเท่าตัว',max:2},
 {id:'magnet',r:'r',name:'ถุงมือแม่เหล็ก',icon:'🧲',desc:'ดูดของจากไกล 2.5 เท่า',max:1},
 {id:'ghost',r:'l',name:'ผีพี่เลี้ยง',icon:'👻',desc:'ลูกไฟผีลอยรอบตัว ช็อตศัตรูใกล้ๆ ให้เอง',max:3},
 {id:'lastmag',r:'l',name:'นัดสุดท้ายของแม็ก',icon:'🎇',desc:'นัดสุดท้ายในแม็กแรง 3 เท่าและระเบิด',max:1},
 {id:'vamp',r:'l',name:'ร่างทรงเจ้าพ่อ',icon:'🗿',desc:'ฆ่าครบทุก 30 ตัว ฟื้นเต็มหลอดและคลั่ง 6 วิ',max:1},
 {id:'timestop',r:'l',name:'นาฬิกาปลุกของยาย',icon:'⏰',desc:'เลือดต่ำกว่า 30% เวลาหยุดเกือบนิ่ง 4 วิและฟื้น 30 (เวฟละครั้ง)',max:1},
 {id:'rico',r:'l',name:'กระสุนสะท้อนกำแพง',icon:'🪃',desc:'ยิงโดนกำแพงแล้วกระสุนเด้งเข้าหาศัตรูใกล้สุด',max:1},
 {id:'glass',r:'x',name:'ปืนแก้วเจียระไน',icon:'💎',desc:'ดาเมจ +60% แต่พลังชีวิตสูงสุด -40%',max:1},
 {id:'tiny',r:'x',name:'ยาย่อส่วน',icon:'🐜',desc:'ตัวเตี้ยลง วิ่งไว +15% โดนตีเบาลง 20%',max:1},
 {id:'moon',r:'x',name:'แรงโน้มถ่วงดวงจันทร์',icon:'🌙',desc:'โดดสูงลอยนาน ยิงกลางอากาศแรง +30%',max:1},
 {id:'bighead',r:'x',name:'คำสาปหัวโต',icon:'🎈',desc:'หัวศัตรูใหญ่ 1.7 เท่า แต่เกราะสูงสุดเหลือครึ่ง',max:1},
 {id:'lotto',r:'x',name:'หวยรางวัลที่ 1',icon:'🎰',desc:'ได้เหรียญ x2.5 แต่โดนตีแรงขึ้น 25%',max:1},
];
function newRun(){
 P={pos:new THREE.Vector3(0,0,4),vy:0,yaw:0,pitch:0,onGround:true,jumps:0,hp:0,maxHp:0,armor:0,maxArmor:0,cur:0,last:1,cd:0,dashCd:0,dashT:0,dashDir:new THREE.Vector3(),
  ups:{},berserk:0,abT:0,infT:0,ramT:0,ramHit:null,own:GUNS.map((g,i)=>i<2||upLv('u_'+g.id)>0||(isChar('chalerm')&&g.id==='ak')),mag:GUNS.map(g=>g.mag),shotT:GUNS.map(()=>9),reloadT:0,reloadDur:1,reloadGi:0,reloadEv:0,trigger:false,bloom:0,flameAcc:0,flameNet:0,shieldT:0,tsT:0,tsUsed:false,vampN:0,ghostT:0,rerolls:0,revives:upLv('revive'),down:false,revT:0,ads:false,coinCh:4,coinT:0,hsStreak:0,boltT:0,stat:{shots:0,hits:0,heads:0,longest:0,bestStreak:0,bestRank:0},bob:0,kick:0,recoil:0,switchT:0,hurtT:0,fov:80,spin:0,spinSnd:false,meleeCd:0,meleeT:0,ammo:{},face:{t:0,look:0,mode:'idle',mt:0}};
 rec();P.hp=P.maxHp;P.armor=upLv('armor')*25;P.ammo.ae=Infinity;for(const k of AMMO_TYPES)P.ammo[k]=GUNS.some((g,i)=>P.own[i]&&g.ammo===k)?Math.round(AMMO_START[k]*P.ammoMul):0;
 P.mag=GUNS.map((g,i)=>magSize(i));if(isChar('jaem'))P.ammo.shells=amax('shells');
 if(enemies)enemies.forEach(e=>disposeCat(e));
 coinObjs.forEach(c=>scene.remove(c.m));coinObjs=[];style=0;styleEvents=[];lastRank=0;streakT=0;
 if(projs)projs.forEach(p=>scene.remove(p.m));if(eprojs)eprojs.forEach(p=>scene.remove(p.m));if(rings)rings.forEach(r=>scene.remove(r.m));if(pickups)pickups.forEach(p=>scene.remove(p.m));
 if(typeof pools!=='undefined'){pools.forEach(a=>scene.remove(a.m));pools=[];}ghosts.forEach(g=>g.visible=false);
 enemies=[];hitMeshes=[];projs=[];eprojs=[];rings=[];pickups=[];timers=[];wave=0;queue=[];spawnT=0;kills=0;coinsRun=0;combo=0;comboT=0;shake=0;waveClearT=-1;timeScale=1;gkCount=0;
 for(let i=0;i<BD;i++){bd.l[i]=0;bloodI.setMatrixAt(i,ZERO);}for(let i=0;i<GB;i++){gb.l[i]=0;gibI.setMatrixAt(i,ZERO);}for(let i=0;i<DC;i++)decalI.setMatrixAt(i,ZERO);
 bloodI.instanceMatrix.needsUpdate=gibI.instanceMatrix.needsUpdate=decalI.instanceMatrix.needsUpdate=true;
 $('#feed').innerHTML='';scrSplats.length=0;spawnBarrels();
}
const U=id=>P.ups[id]||0;
function rec(){const old=P.maxHp;P.maxHp=Math.round((100+upLv('hp')*15+U('hp')*25)*(U('glass')?0.6:1));if(old&&P.maxHp>old)P.hp=P.maxHp;P.hp=Math.min(P.hp||P.maxHp,P.maxHp);
 P.maxArmor=Math.round((100+U('armor')*25)*(U('bighead')?0.5:1));P.armor=Math.min(P.armor||0,P.maxArmor);
 P.speed=10.2*(1+U('speed')*0.08)*(U('tiny')?1.15:1)*(isChar('win')?1.2:1);if(isChar('jaem'))P.maxHp+=40,P.hp=Math.min(P.hp+0,P.maxHp);P.dmgMul=(1+upLv('dmg')*0.05)*Math.pow(1.12,U('dmg'))*(U('glass')?1.6:1);P.rateMul=Math.pow(1.1,U('rate'));
 P.reloadMul=Math.pow(0.9,upLv('reload'))*Math.pow(0.8,U('reload'))*(isChar('chalerm')?0.7:1);P.dashMax=1.1*Math.pow(0.75,U('dash'))*Math.pow(0.9,upLv('dash'))*(isChar('win')?0.6:1);P.headMul=2+U('head')*0.4;P.radMul=1+U('radius')*0.25;
 P.ammoMul=(1+upLv('ammo')*0.15)*(1+U('ammo')*0.4);P.crit=upLv('crit')*0.05;P.magnet=4*(1+upLv('magnet')*0.4)*(U('magnet')?2.5:1);
 P.dmgTaken=(U('tiny')?0.8:1)*(U('lotto')?1.25:1);P.coinMul=U('lotto')?2.5:1;P.grav=U('moon')?0.45:1;}
const amax=k=>k==='ae'?Infinity:Math.round(AMMO_MAX[k]*P.ammoMul);
function magSize(gi){const G=GUNS[gi];if(!G.mag)return 0;return G.mag>2?Math.round(G.mag*(1+U('mag')*0.35)*(isChar('chalerm')?1.25:1)):G.mag;}

/* ======================= WAVES ======================= */
function buildWave(n){const q=[],total=Math.round((6+n*3.4)*(1+0.5*(pN()-1)));const pool=[['tabby',10],['kitten',4]];
 if(n>=2)pool.push(['siamese',6]);if(n>=3)pool.push(['bat',3+n*0.4]);if(n>=3)pool.push(['black',5]);if(n>=3)pool.push(['khao',4]);if(n>=5)pool.push(['korat',5]);if(n>=6)pool.push(['persian',2+n*0.25]);if(n>=3)pool.push(['dog',2.5+n*0.25]);if(n>=4)pool.push(['krasue',2+n*0.3]);
 let tot=0;for(const p of pool)tot+=p[1];
 for(let i=0;i<total;i++){let r=Math.random()*tot,t='tabby';for(const p of pool){r-=p[1];if(r<=0){t=p[0];break;}}if(t==='kitten')q.push('kitten','kitten','kitten');else if(t==='rat')q.push('rat','rat','rat','rat','rat');else if(t==='dog')q.push('dog','dog');else q.push(t);}
 if(n%5===0)q.splice(Math.min(4,q.length),0,bossFor(n));return q;}
function bossFor(n){return ['boss','bossDog','bossKrasue'][(Math.round(n/5)-1)%3];}
function startWave(){if(P.down){P.down=false;P.hp=P.maxHp*0.3;}wave++;P.tsUsed=false;queue=buildWave(wave);spawnT=1.2;showBanner('WAVE '+wave,wave%5===0?CATS[bossFor(wave)].name+' กำลังขึ้นมาจากประตูนรก':'ศัตรู '+queue.length+' ตัว');S.wave();music.riff=(music.riff+1)%4;waveClearT=-1;if(wave>1)spawnBarrels();}
function aliveTargets(){const T=[];if(P&&!P.down&&P.hp>0)T.push({x:P.pos.x,y:P.pos.y,z:P.pos.z,local:true});if(NET.mode==='host')for(const m of MATES.values())if(m.on&&!m.down)T.push({x:m.x,y:m.y,z:m.z,local:false,pid:m.pid});return T;}
function spawnPoint(){const T=aliveTargets();const c=T.length?T[(Math.random()*T.length)|0]:{x:0,z:0};
 for(let k=0;k<40;k++){const a=Math.random()*TAU,r=rand(24,44);const x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r;if(Math.abs(x)>A-3||Math.abs(z)>A-3)continue;if(insideObstacle(x,z,1.3))continue;let ok=true;for(const t of T)if(Math.hypot(t.x-x,t.z-z)<18)ok=false;if(ok)return [x,z];}
 return [clamp(c.x+28,-A+3,A-3),clamp(c.z,-A+3,A-3)];}
function insideObstacle(x,z,r){for(const o of obstacles)if(Math.abs(x-o.x)<o.hw+r&&Math.abs(z-o.z)<o.hd+r)return true;return false;}
function insideObstacleH(x,z,y){for(const o of obstacles)if(y<o.h&&Math.abs(x-o.x)<o.hw&&Math.abs(z-o.z)<o.hd)return o;return null;}
let nextEid=1;
function spawnEnemy(type,x,z,net){
 if(x===undefined)[x,z]=spawnPoint();const C=CATS[type],m=makeCat(type);m.g.position.set(x,0,z);scene.add(m.g);
 const hpS=(1+(wave-1)*0.14)*(1+0.35*(pN()-1)),dS=1+(wave-1)*0.06;
 const e=Object.assign(m,{burn:0,slowT:0,id:net?net.id:nextEid++,onG:true,side:Math.random()<0.5?1:-1,stuck:0,landed:false,baseEm:new THREE.Color(C.body).multiplyScalar(0.14),type,C,hp:C.hp*hpS,max:C.hp*hpS,spd:C.spd*rand(0.92,1.1),dmg:C.dmg*dS,s:C.s,rad:(C.rad||0.42)*C.s,y:0,vy:0,st:'run',t:rand(1.5,3),atkCd:0.6,flash:0,knock:new THREE.Vector3(),phase:Math.random()*10,lunge:0,dead:false,slamCd:4,sumCd:6,stagger:0,canStagger:!C.boss,corpse:0,baseCol:new THREE.Color(C.body)});
 if(net){e.tx=x;e.tz=z;e.ty=net.y;e.tr=0;e.y=net.y;m.g.position.y=net.y;}
 else if(C.fly){e.y=C.kind==='krasue'?rand(1.0,2.0):rand(3.5,6);e.ty=e.y;e.ang=Math.atan2(z-P.pos.z,x-P.pos.x);e.dirSign=Math.random()<0.5?1:-1;e.st='orbit';m.g.position.y=e.y;}
 m.body.userData.e=e;m.head.userData.e=e;m.head.userData.head=true;if(U&&P&&P.ups&&U('bighead'))bigHead(e);hitMeshes.push(m.body,m.head);m.g.updateMatrixWorld(true);
 // spawn burst
 fx(x,1,z,{color:0xff3010,s0:0.5,s1:4*C.s,life:0.5});for(let i=0;i<6;i++)fx(x,rand(0.2,1.5),z,{tex:smokeTex,add:false,color:0x1a0505,s0:1,s1:3,life:1,vy:1.5,vx:rand(-1,1),vz:rand(-1,1),op:0.7});
 if(C.boss){showBanner(C.name,C.tip||'');S.bossRoar();shake=0.6;}
 if(type==='krasue'&&Math.random()<0.5)S.shriek(false);
 enemies.push(e);return e;}
function bigHead(e){if(e.bigHead)return;e.bigHead=true;e.head.scale.multiplyScalar(1.7);if(e.hg)e.hg.scale.multiplyScalar(1.35);}
function disposeCat(e){scene.remove(e.g);e.mats.forEach(m=>m.dispose());if(e.mesh&&e.mesh.skeleton)e.mesh.skeleton.dispose();}

/* ======================= COMBAT ======================= */
const ray=new THREE.Raycaster();
function curGun(){return GUNS[P.cur];}
function canReload(gi){const G=GUNS[gi];return !!G.mag&&P.mag[gi]<magSize(gi)&&(G.ammo==='ae'||P.ammo[G.ammo]>0);}
function startReload(){const gi=P.cur;if(P.reloadT>0||!canReload(gi)||P.switchT>0||P.meleeT>0||P.down)return;P.reloadDur=GUNS[gi].reload*P.reloadMul;P.reloadT=P.reloadDur;P.reloadGi=gi;P.reloadEv=0;}
function reloadTick(dt){if(P.reloadT<=0)return;const gi=P.reloadGi,G=GUNS[gi];if(gi!==P.cur){P.reloadT=0;return;}
 P.reloadT-=dt;const k=1-P.reloadT/P.reloadDur;while(P.reloadEv<G.rev.length&&k>=G.rev[P.reloadEv][0]){S.rl(G.rev[P.reloadEv][1]);P.reloadEv++;}
 if(P.reloadT<=0){P.reloadT=0;const need=magSize(gi)-P.mag[gi];const take=G.ammo==='ae'?need:Math.min(need,P.ammo[G.ammo]);P.mag[gi]+=take;if(G.ammo!=='ae')P.ammo[G.ammo]-=take;}}
function useAbility(){if(state!=='play'||P.down||P.abT>0)return;const C=curChar();P.abT=C.cd;camera.getWorldDirection(_b);const dir=_b.clone().setY(0).normalize();
 if(C.id==='aritat'){S.bossRoar();shake=Math.max(shake,0.35);const ring=new THREE.Mesh(new THREE.RingGeometry(0.85,1,48),new THREE.MeshBasicMaterial({color:0xffb040,transparent:true,opacity:0.9,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(P.pos.x,P.pos.y+0.15,P.pos.z);scene.add(ring);rings.push({m:ring,r:0.5,max:12,x:P.pos.x,z:P.pos.z,vis:true,speed:30});
  if(NET.mode==='client')NET.send({t:'ab',k:'shout',x:P.pos.x,z:P.pos.z});else abShout(P.pos.x,P.pos.z);showBanner('ตะโกนลั่นซอย!','เข้าไปกด F กลอรี่คิลเลย');}
 else if(C.id==='jaem'){P.hp=Math.min(P.maxHp,P.hp+50);S.shield();for(let i=0;i<20;i++)fx(P.pos.x+rand(-2,2),P.pos.y+rand(0.2,2),P.pos.z+rand(-2,2),{color:0x9be15d,s0:0.4,s1:0.05,life:0.8,vy:2});
  if(NET.mode==='client')NET.send({t:'ab',k:'heal',x:P.pos.x,z:P.pos.z});else if(NET.mode==='host')healMates(P.pos.x,P.pos.z,-1);showBanner('ยาหม่องตราเทพ!','+50 พลังชีวิต');}
 else if(C.id==='win'){P.dashDir.copy(dir);P.dashT=0.47;P.ramT=0.47;P.ramHit=new Set();S.dash();S.boom(0.5);showBanner('บิดสุดคันเร่ง!','');}
 else if(C.id==='chalerm'){P.infT=7;S.berserk();showBanner('ยิงกดหัว!','7 วิ กระสุนไม่ลด');}
 else if(C.id==='khlang'){S.acid();const o=camera.getWorldPosition(_c).clone();camera.getWorldDirection(_b);const d3=_b.clone();
  for(let i=0;i<40;i++){const sp=rand(10,18);fx(o.x+d3.x,o.y-0.3,o.z+d3.z,{color:pick([0x8ad8ff,0xd8f4ff,0x5ab0ff]),s0:0.2,s1:1.2,life:rand(0.4,0.7),vx:d3.x*sp+rand(-3,3),vy:d3.y*sp+rand(-1,2),vz:d3.z*sp+rand(-3,3),g:6});}
  for(const e of enemies){if(e.dead)continue;_d.copy(e.g.position);_d.y+=HY(e);_e.subVectors(_d,o);const dist=_e.length();if(dist>12+e.rad)continue;if(_e.normalize().dot(d3)<0.72)continue;hitE(e,220*P.dmgMul,_e.clone(),10,false,'น้ำมนต์',{stun:true,point:_d.clone()});}
  showBanner('สาดน้ำมนต์!','');}}
function abShout(x,z){for(const e of enemies){if(e.dead||!e.canStagger)continue;if(Math.hypot(e.g.position.x-x,e.g.position.z-z)<12){e.stagger=4.5;e.staggered=true;_e.set(e.g.position.x-x,0,e.g.position.z-z).normalize();e.knock.addScaledVector(_e,8);}}}
function healMates(x,z,skip){for(const m of MATES.values())if(m.pid!==skip&&m.on&&Math.hypot(m.x-x,m.z-z)<12)NET.sendTo(m.pid,{t:'heal',v:50});}
function abilityTick(dt){P.abT=Math.max(0,P.abT-dt);P.infT=Math.max(0,P.infT-dt);
 if(isChar('jaem')&&P.armor<P.maxArmor*0.6)P.armor=Math.min(P.maxArmor*0.6,P.armor+3*dt);
 if(P.ramT>0){P.ramT-=dt;for(const e of enemies){if(e.dead||P.ramHit.has(e))continue;if(Math.hypot(e.g.position.x-P.pos.x,e.g.position.z-P.pos.z)<1.8+e.rad){P.ramHit.add(e);shake=Math.max(shake,0.3);hitE(e,250*P.dmgMul,P.dashDir.clone(),22,false,'ซิ่งชน',{explosive:true,point:e.g.position.clone().setY(HY(e))});}}}}
function holsterTick(dt){const lv=upLv('holster');if(!lv)return;P.hol=P.hol||GUNS.map(()=>0);for(let i=0;i<GUNS.length;i++){const G=GUNS[i];if(i===P.cur||!P.own[i]||!G.mag||P.mag[i]>=magSize(i)||(G.ammo!=='ae'&&P.ammo[G.ammo]<=0)){P.hol[i]=0;continue;}
 P.hol[i]+=dt;if(P.hol[i]>=G.reload*(lv>1?1.5:2.5)){P.hol[i]=0;const need=magSize(i)-P.mag[i];const take=G.ammo==='ae'?need:Math.min(need,P.ammo[G.ammo]);P.mag[i]+=take;if(G.ammo!=='ae')P.ammo[G.ammo]-=take;}}}
function shotDmgMul(){return (U('moon')&&!P.onGround?1.3:1)*(P.berserk>0?1.25:1);}
function ejectCasing(gi){const ej=gunModels[gi].userData.ej;if(!ej)return;ej.getWorldPosition(_d);right.set(Math.cos(P.yaw),0,-Math.sin(P.yaw));
 fx(_d.x,_d.y,_d.z,{color:0xd6a64a,s0:0.05,s1:0.04,life:0.55,vx:right.x*rand(2.5,4)+rand(-0.5,0.5),vy:rand(2.5,4),vz:right.z*rand(2.5,4)+rand(-0.5,0.5),g:14});}
function fire(dt){
 const gi=P.cur,G=GUNS[gi];if(P.switchT>0||P.meleeT>0||P.down)return;
 if(G.flame){flameTick(dt);return;}
 if(P.reloadT>0||P.cd>0)return;
 if(G.semi&&P.trigger&&!isTouch)return;
 if(G.mag&&P.mag[gi]<=0){P.trigger=true;if(canReload(gi))startReload();else{S.dry();P.cd=0.3;autoSwitch();}return;}
 P.trigger=true;if(P.infT<=0)P.mag[gi]--;
 P.cd=1/(G.rate*P.rateMul*(P.berserk>0?1.25:1)*(P.infT>0?1.3:1));P.stat.shots++;P.shotT[gi]=0;
 const last=G.mag>2&&P.mag[gi]===0&&U('lastmag');
 const mz=gunModels[gi].userData.mz;mz.getWorldPosition(_a);camera.getWorldDirection(_b);const origin=camera.getWorldPosition(_c).clone();
 const scoped=isScoped();
 S.gun(G.id);
 if(G.proj){
  const dir=_b.clone();fireProj(G.proj,_a.clone(),dir,G.dmg*P.dmgMul*shotDmgMul()*(last?3:1));
 }else{
  const pellets=G.pellets+(G.id==='ssg'?U('pellet')*4:0),pierceN=G.pierce||0;const targets=statics.concat(hitMeshes);
  let sp=G.spread*(P.onGround?1:1.4)+P.bloom;if(P.ads)sp=G.id==='bar'?(scoped?0:0.01):G.ads+P.bloom*0.4;
  const streakMul=1+Math.min(0.6*(1+U('focus')*0.5),P.hsStreak*0.04*(1+U('focus')));
  let shotHead=false,shotHit=false,crit=false;const k0=kills;const trEnds=[];
  for(let p=0;p<pellets;p++){const dir=_b.clone();if(sp>0){dir.x+=rand(-sp,sp);dir.y+=rand(-sp,sp)*0.8;dir.z+=rand(-sp,sp);dir.normalize();}
   ray.set(origin,dir);ray.far=170;const hits=ray.intersectObjects(targets,false);
   const firstD=hits.length?hits[0].distance:170;let coinHit=null,ct=1e9;
   for(const c of coinObjs){if(c.dead)continue;_e.subVectors(c.m.position,origin);const t=_e.dot(dir);if(t<=0.5||t>firstD||t>ct)continue;if(_e.lengthSq()-t*t<0.2){coinHit=c;ct=t;}}
   if(coinHit){tracer(_a,coinHit.m.position.clone(),0xffd166,0.03,0.12);ricochet(coinHit,G,0);shotHit=true;shotHead=true;continue;}
   let end=origin.clone().addScaledVector(dir,90),left=pierceN;const hitSet=new Set();
   for(const h of hits){const e=h.object.userData.e,br=h.object.userData.barrel;
    if(br){end=h.point;hitBarrelAny(br,G.dmg);sparks(h.point,4);break;}
    if(!e){end=h.point;sparks(h.point,G.id==='ssg'?2:3);if(U('rico')&&p<2)wallRico(h.point,G.dmg*P.dmgMul*0.6);if(last)miniBlast(h.point,2.6,70*P.dmgMul);break;}
    if(e.dead||hitSet.has(e))continue;hitSet.add(e);
    const head=!!h.object.userData.head;let d=G.dmg*P.dmgMul*shotDmgMul()*(head?P.headMul*(G.head||1):1)*streakMul;const dist=h.distance;
    if(G.falloff&&dist>10)d*=clamp(1-(dist-10)/25,0.3,1);
    if(G.id==='bar')d*=1+U('scope')*0.25;
    if(e.C.armor&&!head&&!G.armorPen)d*=0.5;
    if(save.sharp)d*=head?1.5:0.4;
    if(P.crit&&Math.random()<P.crit){d*=2.5;crit=true;}
    if(last)d*=3;
    shotHit=true;if(head)shotHead=true;
    hitE(e,d,dir,G.knock,head,G.name,{point:h.point,close:G.id==='ssg'&&dist<5,dist,burn:U('incend')&&Math.random()<0.2*U('incend'),slow:U('frost')>0,big:G.id==='bar'});end=h.point;
    if(last&&left<=0)miniBlast(h.point,2.6,70*P.dmgMul);
    if(left--<=0)break;}
   if(G.id!=='ssg'||p%3===0){tracer(_a,end,G.color,G.id==='bar'?0.05:G.id==='ssg'?0.018:0.025,G.id==='bar'?0.25:0.05);if(trEnds.length<4)trEnds.push([+end.x.toFixed(2),+end.y.toFixed(2),+end.z.toFixed(2)]);}}
  if(NET.mode&&trEnds.length)NET.send({t:'tr',a:[+_a.x.toFixed(2),+_a.y.toFixed(2),+_a.z.toFixed(2)],e:trEnds,g:G.id});
  const shotKills=kills-k0;
  if(shotHit)P.stat.hits++;if(crit)S.crit();
  if(shotHead){P.stat.heads++;P.hsStreak++;P.stat.bestStreak=Math.max(P.stat.bestStreak,P.hsStreak);if(P.hsStreak>=3)streakT=1.6;if(P.hsStreak%5===0)styleAdd(40,'หัวติดกัน x'+P.hsStreak);}
  else if(P.hsStreak>0){if(P.hsStreak>=3){streakT=0.9;}P.hsStreak=0;}
  if(shotKills>=2)styleAdd(40*(shotKills-1),(G.id==='bar'?'ทะลุ':'มัลติคิล')+' x'+shotKills);
  if(G.id!=='ssg')ejectCasing(gi);
 }
 if(G.bloom)P.bloom=Math.min(0.06,P.bloom+G.bloom);
 // muzzle flash
 const mzp=gunModels[gi].userData.mz;mzp.getWorldPosition(_d);vm.worldToLocal(_d);
 flash.position.copy(_d);flash.scale.setScalar(G.flash||0.4);flash.material.color.setHex(last?0xff6a30:0xffc070);flash.material.rotation=rand(0,TAU);flash.visible=!scoped;flash.userData.t=G.id==='ssg'||G.id==='bar'?0.06:0.035;
 flash2.position.copy(_d);flash2.scale.setScalar((G.flash||0.4)*1.6);flash2.material.color.setHex(0xff8020);flash2.material.rotation=rand(0,TAU);flash2.visible=G.id!=='m79'&&!scoped;flash2.userData.t=0.05;
 vmLight.intensity=G.id==='ssg'||G.id==='bar'?45:G.id==='m79'?10:26;vmLight.color.setHex(0xffb060);
 P.kick=Math.min(0.16,P.kick+G.kick);P.recoil=Math.min(0.22,P.recoil+G.vk*(reduceMotion?0.4:1));if(G.hk)P.yaw+=rand(-1,1)*G.hk;
 shake=Math.max(shake,G.shake||0.05);if(post&&G.id==='bar')post.hit(0.35);
 if(G.mag&&P.mag[gi]===0&&canReload(gi))timers.push({t:0.22,fn:()=>{if(P.cur===gi&&P.mag[gi]===0)startReload();}});
}
// flamethrower: continuous cone damage + sets things on fire
function flameTick(dt){const gi=P.cur,G=GUNS[gi];
 if(P.ammo.fuel<=0){if(!P.trigger){S.dry();P.trigger=true;}flameSound(false);autoSwitch();return;}
 P.flameOn=0.1;flameSound(true);
 const mz=gunModels[gi].userData.mz;mz.getWorldPosition(_a);camera.getWorldDirection(_b);const origin=camera.getWorldPosition(_c).clone();const dir=_b.clone();
 // visuals
 for(let i=0;i<3;i++){const sp=rand(11,16);fx(_a.x,_a.y,_a.z,{color:pick([0xff7a20,0xffb040,0xff4a10,0xffd080]),s0:rand(0.15,0.3),s1:rand(1.4,2.2),life:rand(0.35,0.55),vx:dir.x*sp+rand(-1.2,1.2),vy:dir.y*sp+rand(-0.6,1.6),vz:dir.z*sp+rand(-1.2,1.2)});}
 if(Math.random()<0.4)fx(_a.x+dir.x*6,_a.y+dir.y*6+0.5,_a.z+dir.z*6,{tex:smokeTex,add:false,color:0x241612,s0:0.8,s1:2.6,life:1.1,vy:1.6,op:0.45});
 vmLight.intensity=Math.max(vmLight.intensity,18+Math.random()*10);vmLight.color.setHex(0xff8a30);
 P.flameNet-=dt;if(NET.mode&&P.flameNet<=0){P.flameNet=0.12;const e2=origin.clone().addScaledVector(dir,9);NET.send({t:'tr',a:[+_a.x.toFixed(2),+_a.y.toFixed(2),+_a.z.toFixed(2)],e:[[+e2.x.toFixed(2),+e2.y.toFixed(2),+e2.z.toFixed(2)]],g:'fl'});}
 P.flameAcc+=dt;
 while(P.flameAcc>=1/G.rate){P.flameAcc-=1/G.rate;if(P.infT<=0)P.ammo.fuel=Math.max(0,P.ammo.fuel-1);P.stat.shots++;let hit=false;
  for(const e of enemies){if(e.dead)continue;_d.copy(e.g.position);_d.y+=HY(e);_e.subVectors(_d,origin);const dist=_e.length();if(dist>10+e.rad)continue;_e.normalize();if(_e.dot(dir)<0.9-Math.min(0.3,e.rad/Math.max(dist,1)))continue;if(!clearLine(origin,_d))continue;
   hit=true;hitE(e,G.dmg*P.dmgMul*shotDmgMul()*(1-dist/16),dir,0.5,false,G.name,{burn:1,flame:1,point:_d.clone(),dist,slow:U('frost')>0});}
  for(const b of barrels){if(b.dead)continue;_d.set(b.x,0.7,b.z);_e.subVectors(_d,origin);const dist=_e.length();if(dist<9&&_e.normalize().dot(dir)>0.9)hitBarrelAny(b,6);}
  if(hit)P.stat.hits++;}
}
function wallRico(pt,dmg){let best=null,bd=20;for(const e of enemies){if(e.dead)continue;e.head.getWorldPosition(_d);const d=_d.distanceTo(pt);if(d<bd&&clearLine(pt,_d)){bd=d;best=e;}}
 if(!best)return;best.head.getWorldPosition(_d);const tp=_d.clone();tracer(pt.clone(),tp,0xfff0a0,0.03,0.15);S.ting(0);hitE(best,dmg,tp.clone().sub(pt).normalize(),3,true,'กระสุนสะท้อน',{point:tp});}
function miniBlast(pt,r,dmg){explodeFx(pt.clone(),r,true);for(const e of enemies){if(e.dead)continue;_d.copy(e.g.position);_d.y+=HY(e);const d=_d.distanceTo(pt)-e.rad;if(d<r){_e.subVectors(_d,pt).normalize();hitE(e,dmg*(1-clamp(d/r,0,1)*0.6),_e.clone(),8,false,'นัดสุดท้าย',{explosive:true});}}}
function isScoped(){return P&&P.ads&&GUNS[P.cur].id==='bar'&&P.switchT<=0&&P.reloadT<=0&&P.fov<35;}
// ---- coin toss & ricochet (aim skill) ----
const coinGeo=new THREE.CylinderGeometry(0.12,0.12,0.02,18);const coinMat=new THREE.MeshStandardMaterial({color:0xffc23d,metalness:1,roughness:0.2,emissive:0x553300});
function coinMax(){return 4+U('wallet')*2;}
function tossCoin(){
 if(state!=='play'||P.coinCh<1||P.down)return;P.coinCh--;S.toss();
 const g=new THREE.Group();g.add(new THREE.Mesh(coinGeo,coinMat));const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffc040,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.8}));gl.scale.setScalar(0.55);g.add(gl);
 camera.getWorldDirection(_b);right.set(Math.cos(P.yaw),0,-Math.sin(P.yaw));
 g.position.copy(camera.position).addScaledVector(_b,0.7).addScaledVector(right,0.18);g.position.y-=0.15;scene.add(g);
 const v=_b.clone().multiplyScalar(6.5);v.y+=6.5;coinObjs.push({m:g,v,life:3.5,dead:false,spin:rand(10,16)});}
function clearLine(from,to){_e.subVectors(to,from);const dist=_e.length();ray.set(from,_e.normalize());ray.far=dist;const h=ray.intersectObjects(statics,false);return !h.length||h[0].distance>dist-0.4;}
function ricochet(c,G,chain){
 if(c.dead)return;c.dead=true;scene.remove(c.m);const from=c.m.position.clone();
 S.ting(chain);timeScale=Math.min(timeScale,0.4);
 for(let i=0;i<8;i++)fx(from.x,from.y,from.z,{color:0xffd166,s0:0.25,s1:0.02,life:0.4,vx:rand(-6,6),vy:rand(-2,6),vz:rand(-6,6),g:10});fx(from.x,from.y,from.z,{color:0xffe8a0,s0:0.2,s1:1.6,life:0.2});
 let next=null,bd=1e9;for(const o of coinObjs){if(o.dead)continue;const d=o.m.position.distanceTo(from);if(d<bd&&d<45){bd=d;next=o;}}
 if(next&&chain<6){tracer(from,next.m.position.clone(),0xffd166,0.05,0.25);styleAdd(25,'ส่งต่อเหรียญ');timers.push({t:0.07,fn:()=>ricochet(next,G,chain+1)});return;}
 let best=null;bd=1e9;for(const e of enemies){if(e.dead)continue;e.head.getWorldPosition(_d);const d=_d.distanceTo(from);if(d<bd&&d<75&&clearLine(from,_d)){bd=d;best=e;}}
 if(!best){_e.set(rand(-1,1),rand(-0.2,0.6),rand(-1,1)).normalize();tracer(from,from.clone().addScaledVector(_e,25),0xffd166,0.04,0.2);return;}
 best.head.getWorldPosition(_d);const tp=_d.clone();tracer(from,tp,0xffd166,0.06,0.3);
 const base=G.id==='bar'?G.dmg*2.2:G.id==='ssg'?120:G.id==='dg'?110:75;const dmg=base*(1+0.6*chain)*P.dmgMul*(save.sharp?1.5:1);
 const dir=tp.clone().sub(from).normalize();styleAdd(55+chain*30,'ริโคเชต์!'+(chain?' x'+(chain+1):''));
 hitE(best,dmg,dir,6,true,'ริโคเชต์',{point:tp,dist:tp.distanceTo(P.pos)+from.distanceTo(P.pos)});}
// ---- style meter ----
const RANKS=[[0,'D','#8a7a70'],[90,'C','#9be15d'],[200,'B','#58c8ff'],[340,'A','#ffd166'],[500,'S','#ff7a1a'],[680,'SS','#ff3a2a'],[880,'SSS','#ff2a8a']];
function rankIdx(){let r=0;for(let i=0;i<RANKS.length;i++)if(style>=RANKS[i][0])r=i;return r;}
function styleAdd(n,label,neg){if(n>0)style=Math.min(1100,style+n*(save.sharp?1.3:1));else style=Math.max(0,style+n);
 if(label){styleEvents.unshift({t:2.2,label,neg:!!neg});if(styleEvents.length>5)styleEvents.pop();}
 const r=rankIdx();if(r>lastRank){S.rank(r);const el=$('#rank');el.classList.add('pop');setTimeout(()=>el.classList.remove('pop'),160);}lastRank=r;if(P)P.stat.bestRank=Math.max(P.stat.bestRank,r);}
function hasAmmo(i){const G=GUNS[i];return P.own[i]&&(G.ammo==='ae'||P.ammo[G.ammo]>0||(G.mag&&P.mag[i]>0));}
function autoSwitch(){for(const i of [2,1,4,3,5,0]){if(i!==P.cur&&hasAmmo(i)){switchGun(i);return;}}}
function sparks(pt,n){for(let i=0;i<n;i++)fx(pt.x,pt.y,pt.z,{color:0xffc060,s0:0.18,s1:0.02,life:0.25,vx:rand(-4,4),vy:rand(0,5),vz:rand(-4,4),g:12});fx(pt.x,pt.y,pt.z,{tex:smokeTex,add:false,color:0x2a2020,s0:0.2,s1:0.8,life:0.6,vy:0.6,op:0.5});}
function makeProj(kind,from,dir){return makeGren(from,dir);}
function fireProj(kind,from,dir,dmg){
 const p=makeProj(kind,from,dir);p.dmg=dmg;p.r=5*P.radMul;p.by=undefined;p.visual=NET.mode==='client';projs.push(p);
 if(NET.mode)NET.send({t:'pj',k:kind,x:from.x,y:from.y,z:from.z,vx:p.v.x,vy:p.v.y,vz:p.v.z,dmg,r:p.r});}
function spawnNetProj(m){const dir=new THREE.Vector3(m.vx,m.vy,m.vz).normalize();const from=new THREE.Vector3(m.x,m.y,m.z);const p=makeProj(m.k,from,dir);p.v.set(m.vx,m.vy,m.vz);
 p.dmg=m.dmg;p.r=m.r;p.by=m.from;p.visual=NET.mode==='client';p.mate=true;projs.push(p);S.gun('m79',0.5);}
const grenMat=new THREE.MeshStandardMaterial({color:0x5a6a32,metalness:0.4,roughness:0.5}),grenBrass=new THREE.MeshStandardMaterial({color:0xd0a040,metalness:1,roughness:0.3});
function makeGren(from,dir){const g=new THREE.Group();part(GEO.sph,grenMat,0.045,0.045,0.065,0,0,-0.02,g);part(GEO.cyl,grenBrass,0.045,0.05,0.045,0,0,0.03,g).rotation.x=Math.PI/2;
 const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffa040,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.6}));gl.scale.setScalar(0.4);g.add(gl);
 g.position.copy(from);scene.add(g);const v=dir.clone().multiplyScalar(36);v.y+=2.2;return {m:g,v,kind:'gren',life:4,age:0,trail:0};}
function hitBarrel(b,d,by){if(b.dead)return;b.hp-=d;if(b.hp<=0){removeBarrel(b);timers.push({t:0.05,fn:()=>explode(_e.set(b.x,0.8,b.z).clone(),5.5*P.radMul,170,true,'ถังแก๊ส',by)});}}
function hitBarrelAny(b,d){if(NET.mode==='client'){NET.send({t:'bh',i:b.idx,d});sparks(new THREE.Vector3(b.x,0.8,b.z),3);}else hitBarrel(b,d);}
function explode(pos,radius,dmg,fromPlayer,src,by){
 explodeFx(pos,radius,fromPlayer);
 by=ownBy(by);if(NET.mode==='host')NET.send({t:'x',x:pos.x,y:pos.y,z:pos.z,r:radius,f:fromPlayer?1:0,s:src,by:by===undefined?NET.me:by});
 let nHit=0;const k0=kills;const mul=(fromPlayer&&by===undefined&&src!=='ถังแก๊ส')?P.dmgMul:1;
 for(const e of enemies){if(e.dead)continue;_d.copy(e.g.position);_d.y+=HY(e);const d=_d.distanceTo(pos)-e.rad;if(d<radius){nHit++;const f=1-clamp(d/radius,0,1)*0.7;_e.subVectors(_d,pos).normalize();_e.y=0.6;damage(e,dmg*f*mul,_e,14*f,false,src,{explosive:true,by});}}
 if(kills-k0>=3){styleAdd(25*(kills-k0),'ระเบิดหมู่ x'+(kills-k0));if(NET.mode!=='client')triggerZed(3.2);}
 for(const b of barrels.slice()){if(b.dead)continue;const d=Math.hypot(b.x-pos.x,b.z-pos.z);if(d<radius*0.9&&d>0.3)hitBarrel(b,999,by);}
 selfBlast(pos,radius,src==='ถังแก๊ส'?'env':(by===undefined?'own':'mate'));
 return nHit;
}
function selfBlast(pos,radius,kind){if(P.down)return;const pd=Math.hypot(P.pos.x-pos.x,P.pos.z-pos.z),vd=Math.abs((P.pos.y+0.8)-pos.y);if(pd<radius&&vd<radius){const f=1-pd/radius;hurt((kind==='own'?18:kind==='mate'?10:45)*f,true,pos.x,pos.z);P.vy=Math.max(P.vy,9*f+2);_e.set(P.pos.x-pos.x,0,P.pos.z-pos.z).normalize();P.pushV=(P.pushV||new THREE.Vector3()).copy(_e).multiplyScalar(14*f);}}
function explodeFx(pos,radius,fromPlayer){
 S.boom(fromPlayer?1:0.8);const dP=pos.distanceTo(camera.position);shake=Math.max(shake,clamp(1.2-dP/25,0.1,0.9));
 boomLight.position.copy(pos);boomLight.position.y+=1;boomLight.intensity=260;
 for(let i=0;i<22;i++)fx(pos.x,pos.y,pos.z,{color:pick([0xff6a10,0xffa030,0xff3a08,0xffe080]),s0:rand(0.6,1.4),s1:rand(2.5,4.5)*radius/4.5,life:rand(0.35,0.7),vx:rand(-1,1)*radius*1.6,vy:rand(0,1.5)*radius,vz:rand(-1,1)*radius*1.6});
 for(let i=0;i<14;i++)fx(pos.x,pos.y,pos.z,{tex:smokeTex,add:false,color:0x1c1210,s0:1,s1:rand(4,7),life:rand(1.2,2.2),vx:rand(-2,2),vy:rand(1,3),vz:rand(-2,2),op:0.85});
 for(let i=0;i<14;i++)fx(pos.x,pos.y,pos.z,{color:0xffd080,s0:0.15,s1:0.02,life:rand(0.5,1),vx:rand(-12,12),vy:rand(2,12),vz:rand(-12,12),g:18});
 decal(pos.x,pos.z,radius*0.9,0x0a0505);
 const ring=new THREE.Mesh(new THREE.RingGeometry(0.8,1,48),new THREE.MeshBasicMaterial({color:0xffa040,transparent:true,opacity:0.9,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(pos.x,0.1,pos.z);scene.add(ring);rings.push({m:ring,r:0.5,max:radius*1.3,x:pos.x,z:pos.z,vis:true,speed:radius*5});
}
function damage(e,d,dir,knock,head,src,o={}){
 if(e.dead)return;
 if(e.stagger>0&&!o.explosive)d*=1.5;
 e.hp-=d;if(!o.tick)e.flash=0.06;const mine=o.by===undefined||o.by===NET.me;
 if(o.burn){e.burn=Math.max(e.burn||0,3);e.burnBy=o.by;}if(o.slow)e.slowT=1.6;if(o.stun&&e.canStagger&&e.hp>0){e.stagger=4.5;e.staggered=true;}
 if(!e.C.boss&&dir){e.knock.x+=dir.x*knock*(6/e.s);e.knock.z+=dir.z*knock*(6/e.s);}
 const pt=o.point||new THREE.Vector3(e.g.position.x,0.7*e.s,e.g.position.z);
 if(!o.tick&&!o.flame)blood(pt.x,pt.y,pt.z,head?14:7,head?5:3.5,0.06,dir);if(!o.tick&&Math.random()<(o.flame?0.04:0.25))decal(e.g.position.x+rand(-0.6,0.6),e.g.position.z+rand(-0.6,0.6),rand(0.4,1.1));
 // wounds & tint
 const hr=clamp(e.hp/e.max,0,1);e.setHurt(1-hr);
 if(mine&&!o.tick){hitmark(e.hp<=0?'#ff2a2a':head?'#ffd166':'#f1e3cf');if(head)S.head();else if(!o.flame&&Math.random()<0.5)S.tick();}
 if(e.hp<=0){killCat(e,head,src,{gib:o.explosive||o.close||o.glory||o.big||d>=e.max*0.55||(e.type==='kitten'||e.type==='rat')&&d>20,burnt:o.flame||o.tick,dir,glory:o.glory,dist:o.dist,ric:src==='ริโคเชต์',by:o.by});return;}
 if(head&&src!=='ริโคเชต์'&&mine)styleAdd(6);
 if(e.canStagger&&e.stagger<=0&&e.hp<=e.max*0.35&&!e.staggered&&!o.tick){e.stagger=4.5;e.staggered=true;voice(e,'atk');}
}
function killCat(e,head,src,o={}){
 const mine=o.by===undefined||o.by===NET.me;
 e.dead=true;e.vy=0;e.burn=0;if(e.setXray)e.setXray(false);hitMeshes=hitMeshes.filter(m=>m!==e.body&&m!==e.head);
 if(NET.mode==='host')NET.send({t:'k',i:e.id,g:o.gib?1:0,dx:o.dir?+o.dir.x.toFixed(2):0,dz:o.dir?+o.dir.z.toFixed(2):0,gl:o.glory?1:0,h:head?1:0,by:o.by===undefined?NET.me:o.by,d:+(o.dist||0).toFixed(1),s:src||''});
 if(mine){kills++;combo++;comboT=3;}
 if(wave>0){const left=NET.mode==='client'?snapN-1:enemies.filter(x=>!x.dead).length+queue.length;if(left<=0&&state==='play'){timeScale=0.12;slowT=1;if(mine){styleAdd(40,'ปิดเวฟ!');}}}
 if(mine){let sAdd=18,lbl=null;if(o.glory){sAdd+=60;lbl='กลอรี่คิล';}else if(head&&!o.ric){sAdd+=30;lbl='หัว!';}
  if(o.gib&&!o.glory)sAdd+=10;
  if(!P.onGround&&src&&src!=='ถังแก๊ส'&&src!=='ศพระเบิด'){sAdd+=25;styleAdd(0,'กลางอากาศ');}
  const dist=o.dist||0;if(dist>25){sAdd+=35;styleAdd(0,'ระยะไกล '+Math.round(dist)+' ม.');}if(dist>P.stat.longest)P.stat.longest=dist;
  if(e.C.fly&&e.y>1.5){sAdd+=25;styleAdd(0,'สอยร่วง!');}
  if(src==='ถังแก๊ส'){sAdd+=15;}
  styleAdd(sAdd,lbl);}
 if(mine){const mult=(1+Math.floor(combo/5)*0.5)*(1+rankIdx()*0.15)*(save.sharp?1.5:1);const c=Math.round((e.C.coin+(head?1:0)+(o.glory?2:0))*mult*P.coinMul);coinsRun+=c;
 if(U('leech'))P.hp=Math.min(P.maxHp,P.hp+3*U('leech'));
 if(U('vamp')){P.vampN++;if(P.vampN>=30){P.vampN=0;P.hp=P.maxHp;P.berserk=Math.max(P.berserk,6);S.berserk();showBanner('เจ้าพ่อเข้าร่าง!','ฟื้นเต็มหลอด · คลั่ง 6 วิ');}}
 if(U('chain'))chainZap(e.g.position.clone().setY(HY(e)),1+U('chain'),30*U('chain')*P.dmgMul,e);}
 const gp=e.g.position,cy=HY(e);
 if(o.gib){
  S.gib();gibs(gp.x,cy,gp.z,Math.round(10+e.s*7),[e.C.body,e.C.dark,e.C.belly],e.s,7+e.s,o.dir);blood(gp.x,cy,gp.z,60+e.s*20,7,0.08,o.dir);
  for(let i=0;i<4;i++)decal(gp.x+rand(-1.5,1.5)*e.s,gp.z+rand(-1.5,1.5)*e.s,rand(0.8,1.8)*e.s);
  fx(gp.x,cy,gp.z,{color:0x8a0000,add:false,tex:smokeTex,s0:0.5*e.s,s1:2.5*e.s,life:0.5,op:0.9});
  if(gp.distanceTo(P.pos)<5){screenSplat(o.glory?8:4,o.glory);}
  if(o.ric||(head&&o.dist>20)){e.head.getWorldPosition(_d);blood(_d.x,_d.y,_d.z,40,6,0.07);}
  disposeCat(e);e.gone=true;
 }else{
  S.squish();e.corpse=10;e.vy=0;e.fallDir=Math.random()<0.5?1:-1;blood(gp.x,cy,gp.z,24,4,0.07,o.dir);decal(gp.x,gp.z,1.4*e.s);if(o.burnt){e.charred=1;e.setHurt&&e.setHurt(1);}
 }
 voice(e,'die');
 if(NET.mode!=='client'&&wave>0){let ch=0.035+(head?0.045:0)+(o.glory?0.15:0)+(o.gib?0.02:0);if(mine&&isChar('khlang'))ch*=2;if(e.C.boss)ch=1;if(zedT>0||Math.random()<ch)triggerZed(3.2);}
 feed(`<b style="color:${pColor(mine?NET.me:o.by)}">${esc(mine?myName():nameOf(o.by))}</b> ${src?'['+src+']':''} ${e.C.name}${o.glory?' <em>· กลอรี่คิล!</em>':o.gib?' <em>· กระจุย!</em>':head?' <em>· หัว!</em>':''}`);
 // drops
 if(o.glory){const n=Math.round(5*(1+U('glory')*0.5)*(isChar('aritat')&&mine?1.5:1));for(let i=0;i<n;i++)spawnPickup(gp.x,gp.z,'hp',10);if(U('glory'))for(let i=0;i<2+U('glory');i++)spawnPickup(gp.x,gp.z,'ar',5);}
 if(Math.random()<0.5)spawnPickup(gp.x,gp.z,'ammo');
 if((Math.random()<(o.glory?0.22:0.025)||e.type==='persian'&&Math.random()<0.3||e.C.boss))spawnPickup(gp.x,gp.z,'bz');
 if(Math.random()<0.08)spawnPickup(gp.x,gp.z,'ar',10);
 if(Math.random()<0.06)spawnPickup(gp.x,gp.z,'hp',25);
 if(e.C.boss){coinsRun+=20;showBanner(e.C.name+' ตายแล้ว!','+'+e.C.coin+' เหรียญ · เลือดสาดทั้งซอย');for(let i=0;i<8;i++)spawnPickup(gp.x,gp.z,'hp',25);for(let i=0;i<4;i++)spawnPickup(gp.x,gp.z,'ammo');gibs(gp.x,2,gp.z,60,[e.C.body,e.C.dark],2.5,14);blood(gp.x,2,gp.z,200,10,0.1);}
 if(mine&&NET.mode!=='client'&&U('bomb')&&!o.bomb&&Math.random()<0.25){const pos=gp.clone();pos.y=0.6;timers.push({t:0.15,fn:()=>bloodBomb(pos)});}
}
function triggerZed(dur,net){if(zedT>0){zedT=Math.min(zedT+0.7,5.5);return;}if(zedCd>0&&!net)return;zedT=dur;zedBeat=0;S.zedIn();if(post)post.zed(1);$('#zed').classList.add('on');if(NET.mode==='host'&&!net)NET.send({t:'zt',d:dur});}
function endZed(){zedT=0;zedCd=8;S.zedOut();if(post)post.zed(0);$('#zed').classList.remove('on');}
function voice(e,k){const t=e.C.kind;if(t==='rat'){if(k==='die'||Math.random()<0.5)S.squeak();return;}if(t==='dog'){S.bark(k==='die');return;}if(t==='krasue'){S.shriek(k==='die');return;}
 demonMeow(e.type==='kitten'?1.5:e.type==='persian'?0.7:e.type==='boss'?0.4:k==='atk'?0.9:1,k!=='die');}
function chainZap(from,n,dmg,skip){const hit=[];for(let k=0;k<n;k++){let best=null,bd=9;for(const e of enemies){if(e.dead||e===skip||hit.includes(e))continue;_d.copy(e.g.position);_d.y+=HY(e);const d=_d.distanceTo(from);if(d<bd){bd=d;best=e;}}
 if(!best)break;hit.push(best);_d.copy(best.g.position);_d.y+=HY(best);const to=_d.clone();
 for(let i=0;i<2;i++){const mid=from.clone().lerp(to,0.5);mid.x+=rand(-0.5,0.5);mid.y+=rand(-0.4,0.6);mid.z+=rand(-0.5,0.5);tracer(from,mid,0x9ad8ff,0.03,0.12);tracer(mid,to,0x9ad8ff,0.03,0.12);}
 S.zap();hitE(best,dmg,null,0,false,'สายฟ้า',{point:to});from=to;}}
function bloodBomb(pos){S.gib();blood(pos.x,pos.y,pos.z,80,9,0.09);decal(pos.x,pos.z,3);fx(pos.x,pos.y,pos.z,{color:0xa00000,add:false,tex:smokeTex,s0:1,s1:5,life:0.6,op:0.9});
 for(const e of enemies){if(e.dead)continue;if(e.g.position.distanceTo(pos)<3.5)hitE(e,40*U('bomb')*P.dmgMul,null,0,false,'ศพระเบิด',{explosive:true});}}
function hurt(d,explosive,fx_,fz_){if(window.__god)return;
 if((state!=='play'&&state!=='paused')||P.down||(P.dashT>0&&!explosive))return;
 if(fx_!==undefined)dmgDir(fx_,fz_);
 d*=P.dmgTaken;
 if(U('shield')&&P.shieldT<=0){P.shieldT=Math.max(4,10-2*(U('shield')-1));S.shield();for(let i=0;i<12;i++)fx(P.pos.x,P.pos.y+1.2,P.pos.z,{color:0xffd166,s0:0.3,s1:0.05,life:0.4,vx:rand(-5,5),vy:rand(-2,5),vz:rand(-5,5)});styleAdd(10,'พระผงกันไว้!');return;}
 if(U('timestop')&&!P.tsUsed&&P.hp-d<P.maxHp*0.3){P.tsUsed=true;P.tsT=4;P.hp=Math.min(P.maxHp,P.hp+30);showBanner('นาฬิกาปลุกของยาย!','เวลาเกือบหยุด 4 วิ');S.ting(3);}
 if(P.armor>0){const ab=Math.min(P.armor,d*0.6);P.armor-=ab;d-=ab;}
 P.hp-=d;P.hurtT=0.4;shake=Math.max(shake,0.3);S.hurt();if(d>1)styleAdd(-110,'โดนข่วน',true);P.face.mode='ouch';P.face.mt=0.6;if(d>8)screenSplat(2,false);
 if(P.hp<=0){if(P.revives>0){P.revives--;P.hp=P.maxHp*0.6;showBanner('พระเครื่องคุ้มครอง!','แมวรอบตัวแหลกหมด');
   for(const e of enemies){if(e.dead)continue;if(e.g.position.distanceTo(P.pos)<10){hitE(e,e.C.boss?300:99999,null,0,false,'พระเครื่อง',{explosive:true});}}}
  else if(NET.mode&&NET.connected){P.hp=0;P.down=true;P.revT=0;firing=false;P.ads=false;showBanner('ล้มแล้ว!','รอเพื่อนมาช่วย');S.hurt();}
  else endRun();}
}
// melee & glory kill
function gloryReload(){for(let i=0;i<GUNS.length;i++){if(P.own[i]&&GUNS[i].mag)P.mag[i]=Math.max(P.mag[i],magSize(i));}const G=GUNS[P.cur];if(G.ammo!=='ae')P.ammo[G.ammo]=Math.min(amax(G.ammo),P.ammo[G.ammo]+Math.ceil(amax(G.ammo)*0.25));P.reloadT=0;S.rl('in');styleAdd(0,'เติมกระสุนเต็มแม็ก!');}
function melee(){
 if(state!=='play'||P.meleeCd>0||P.down)return;P.meleeCd=P.berserk>0?0.32:0.55;P.meleeT=0.28;S.swoosh();
 camera.getWorldDirection(_b);_b.y=0;_b.normalize();let best=null,bd_=1e9;
 for(const e of enemies){if(e.dead)continue;_d.subVectors(e.g.position,P.pos);_d.y=0;const dist=_d.length()-e.rad;if(dist>(e.stagger>0?5.5:2.2))continue;_d.normalize();if(_d.dot(_b)<(e.stagger>0?0.25:0.45))continue;if(dist<bd_){bd_=dist;best=e;}}
 if(!best)return;
 if(P.berserk>0&&best.stagger<=0){S.punch();S.gib();shake=Math.max(shake,0.45);timeScale=Math.min(timeScale,0.5);hitE(best,best.C.boss?260*P.dmgMul:9999,_b.clone(),30,false,'หมัดคลั่ง',{close:true,glory:false,explosive:!best.C.boss});screenSplat(3,true);return;}
 if(best.stagger>0){ // GLORY KILL
  gkCount++;timeScale=0.25;S.glory();P.face.mode='grin';P.face.mt=1.4;shake=0.5;
  const toE=_d.subVectors(best.g.position,P.pos);toE.y=0;const len=toE.length();if(len>1.2)P.pos.addScaledVector(toE.normalize(),len-1.2);
  P.fov=96;showBanner('กลอรี่คิล!','');bannerT=0.8;
  hitE(best,99999,toE.normalize(),12,true,'มือเปล่า',{glory:true,close:true});gloryReload();
 }else{S.punch();hitE(best,35*P.dmgMul*(isChar('aritat')?2:1),_b.clone(),16,false,'หมัด',{});shake=Math.max(shake,0.15);}
}

/* ======================= PICKUPS ======================= */
const bottleGeo=(()=>{const pts=[[0,0],[0.11,0],[0.12,0.02],[0.12,0.22],[0.06,0.3],[0.045,0.38],[0.05,0.42],[0,0.42]].map(([r,y])=>new THREE.Vector2(r,y));const g=new THREE.LatheGeometry(pts,16);g.translate(0,-0.2,0);return g;})();
const pickGeo={bz:bottleGeo,hp:new THREE.OctahedronGeometry(0.2),ar:new THREE.OctahedronGeometry(0.18),ammo:new THREE.BoxGeometry(0.34,0.24,0.34)};
const AMMO_COL={shells:0xff3020,'762':0xffc030,gren:0x9be15d,bmg:0xe0e8ff,fuel:0xff7a1a};
function spawnPickup(x,z,kind,val){if(pickups.length>90){const old=pickups.shift();scene.remove(old.m);}
 let type=null,col;if(kind==='ammo'){const types=AMMO_TYPES.filter(k=>GUNS.some((g,i)=>P.own[i]&&g.ammo===k));if(!types.length)kind='hp',val=5;else{const w=types.map(k=>Math.max(0.05,1-P.ammo[k]/amax(k)));let tot=w.reduce((a,b)=>a+b,0),r=Math.random()*tot;type=types[types.length-1];for(let i=0;i<types.length;i++){r-=w[i];if(r<=0){type=types[i];break;}}col=AMMO_COL[type];}}
 if(kind!=='ammo')col=kind==='bz'?0xff2a2a:kind==='hp'?(val>=25?0x40a0ff:0x3aa0ff):0x60ff60;
 const g=new THREE.Group();const core=new THREE.Mesh(pickGeo[kind],new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:kind==='ammo'?0.6:kind==='bz'?2.6:1.6,metalness:0.4,roughness:0.3}));g.add(core);
 if(kind==='ammo'){part(GEO.box,std(0x2a2a2a,{metalness:0.7}),0.36,0.05,0.36,0,0.1,0,g);}
 const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:col,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.6}));gl.scale.setScalar(kind==='ammo'?0.9:0.8);g.add(gl);
 if(val>=25)g.scale.setScalar(1.6);if(kind==='bz'){g.scale.setScalar(1.8);gl.scale.setScalar(1.4);}
 g.position.set(x,0.6,z);scene.add(g);pickups.push({m:g,kind,type,val:val||0,t:0,v:new THREE.Vector3(rand(-4,4),rand(4,7),rand(-4,4)),y:0.6,age:0});}

/* ======================= HUD ======================= */
let hitT=0,bannerT=0;
function hitmark(c){const h=$('#hitm');h.style.color=c;h.style.opacity=1;hitT=0.12;}
function showBanner(t,s){const b=$('#banner');b.innerHTML=t+(s?`<small>${s}</small>`:'');b.style.opacity=1;bannerT=2.2;}
function feed(html){const f=$('#feed'),d=document.createElement('div');d.innerHTML=html;f.prepend(d);while(f.children.length>5)f.lastChild.remove();setTimeout(()=>d.remove(),3100);}
const hc={};function setT(id,v,prop='innerHTML'){if(hc[id]!==v){hc[id]=v;$(id)[prop]=v;}}
let hlOn=false;const arrowEls=[];
function drawArrows(on){const box=$('#arrows');const list=on?enemies.filter(e=>!e.dead).slice(0,10):[];
 while(arrowEls.length<list.length){const i=document.createElement('i');box.appendChild(i);arrowEls.push(i);}
 const W=innerWidth,H=innerHeight;
 arrowEls.forEach((el,k)=>{const e=list[k];if(!e){el.style.display='none';return;}
  _d.copy(e.g.position);_d.y+=HY(e);_e.copy(_d).project(camera);let x=_e.x,y=_e.y;const behind=_e.z>1;if(behind){x=-x;y=-y;}
  if(!behind&&Math.abs(x)<0.95&&Math.abs(y)<0.9){el.style.display='none';return;}
  const ang=Math.atan2(y,x);const m=Math.max(Math.abs(x)/0.9,Math.abs(y)/0.8,1e-3);x/=m;y/=m;
  el.style.display='block';el.style.left=((x*0.5+0.5)*W-10)+'px';el.style.top=((-y*0.5+0.5)*H-10)+'px';el.style.transform=`rotate(${Math.PI/2-ang}rad)`;});}
function updateHud(){
 const G=curGun(),gi=P.cur;
 const hpR=clamp(P.hp/P.maxHp,0,1),arR=P.maxArmor?clamp(P.armor/P.maxArmor,0,1):0;
 setT('#hpNum',String(Math.max(0,Math.ceil(P.hp))));$('#hpFill').style.transform=`scaleX(${hpR})`;$('#hpGhost').style.transform=`scaleX(${hpR})`;
 setT('#arNum',String(Math.ceil(P.armor)));$('#arFill').style.transform=`scaleX(${arR})`;
 $('#vitals').classList.toggle('low',hpR<0.3);
 const dashK=P.dashCd>0?clamp(1-P.dashCd/P.dashMax,0,1):1;
 const ch=[`<span class="chip${dashK<1?' cd':''}"><kbd>Shift</kbd>แดช<i class="cdf" style="width:${Math.round(dashK*100)}%"></i></span>`,
  `<span class="chip"><kbd>C</kbd><em>${'●'.repeat(P.coinCh)}${'○'.repeat(Math.max(0,coinMax()-P.coinCh))}</em></span>`,
  `<span class="chip"><kbd>F</kbd>ฟาด</span>`];
 {const C=curChar();ch.unshift(`<span class="chip ab${P.abT>0?' cd':' ok'}"><kbd>G</kbd>${C.abIcon} ${C.active}${P.abT>0?' '+Math.ceil(P.abT):''}</span>`);if(P.infT>0)ch.push(`<span class="chip hot">🔥 กดหัว ${Math.ceil(P.infT)}</span>`);}
 if(U('shield'))ch.push(`<span class="chip${P.shieldT>0?' cd':' ok'}">🔰 ${P.shieldT>0?Math.ceil(P.shieldT)+' วิ':'พร้อม'}</span>`);
 if(P.berserk>0)ch.push(`<span class="chip hot">🍶 คลั่ง ${Math.ceil(P.berserk)}</span>`);
 if(U('vamp'))ch.push(`<span class="chip">🗿 ${P.vampN}/30</span>`);
 if(P.tsT>0)ch.push(`<span class="chip hot">⏰ ${P.tsT.toFixed(1)}</span>`);
 setT('#chips',ch.join(''));
 setT('#wName',G.name);
 const ms=magSize(gi);
 if(G.flame){setT('#magNum',String(Math.ceil(P.ammo.fuel)));setT('#resNum','/ '+amax('fuel'));}
 else{setT('#magNum',String(P.mag[gi]));setT('#resNum',G.ammo==='ae'?'/ ∞':'/ '+P.ammo[G.ammo]);}
 const low=G.flame?P.ammo.fuel<40:P.mag[gi]<=Math.max(0,Math.floor(ms*0.25));$('#magNum').classList.toggle('low',low);
 const pk=G.flame?'f'+Math.round(P.ammo.fuel/amax('fuel')*20):gi+'|'+P.mag[gi]+'|'+ms;
 if(hc.pips!==pk){hc.pips=pk;const box=$('#magPips');box.className=G.flame?'fuel':ms<=7?'big':'';
  if(G.flame){const n=Math.round(P.ammo.fuel/amax('fuel')*20);box.innerHTML=Array.from({length:20},(_,i)=>`<i class="${i<n?'':'e'}"></i>`).join('');}
  else box.innerHTML=Array.from({length:ms},(_,i)=>`<i class="${i<P.mag[gi]?'':'e'}"></i>`).join('');}
 const rk=P.reloadT>0?1-P.reloadT/P.reloadDur:-1;$('#rldBar').classList.toggle('on',rk>=0);if(rk>=0)$('#rldFill').style.transform=`scaleX(${rk.toFixed(3)})`;
 setT('#slots',GUNS.map((g,i)=>`<div class="${i===gi?'cur':''}${P.own[i]?'':' lock'}${P.own[i]&&!hasAmmo(i)?' empty':''}"><b>${i+1}</b><span>${P.own[i]?g.short:'ล็อก'}</span></div>`).join(''));
 const warn=P.reloadT>0?'':G.mag&&P.mag[gi]===0?(G.ammo!=='ae'&&P.ammo[G.ammo]<=0?'กระสุนหมด · เปลี่ยนปืน (1–6)':'กด R รีโหลด'):G.flame&&P.ammo.fuel<=0?'น้ำมันหมด · เปลี่ยนปืน':'';
 setT('#ammoWarn',warn);$('#ammoWarn').style.opacity=warn?1:0;
 setT('#wave','WAVE '+wave);const alive=enemies.filter(e=>!e.dead).length;const remain=NET.mode==='client'?snapN:alive+queue.length;
 const hl=wave>0&&waveClearT<0&&remain>0&&remain<10&&state==='play';
 setT('#left',waveClearT>=0?'เคลียร์แล้ว!':`ศัตรูเหลือ ${remain} ตัว`+(hl?' · มองทะลุแล้ว':''));
 if(hl!==hlOn){hlOn=hl;if(hl){feed('<em>ศัตรูเหลือไม่ถึง 10 ตัว · มองทะลุกำแพงได้แล้ว</em>');S.ting(1);}}
 for(const e of enemies)if(!e.dead&&e.setXray)e.setXray(hl);
 drawArrows(hl);drawRadar();coopHud();
 setT('#kills','☠ '+kills);setT('#coinHud','🪙 '+coinsRun);
 const boss=enemies.find(e=>e.C.boss&&!e.dead);$('#bossbar').hidden=!boss;if(boss){$('#bossfill').style.width=clamp(boss.hp/boss.max*100,0,100)+'%';const bs=$('#bossbar span');if(bs.textContent!==boss.C.name)bs.textContent=boss.C.name;}
 {const r=rankIdx(),R0=RANKS[r],R1=RANKS[r+1];const el=$('#rank');setT('#rank',R0[1]);el.style.color=R0[2];
  const f=R1?(style-R0[0])/(R1[0]-R0[0]):1;$('#sfill').style.width=(clamp(f,0,1)*100).toFixed(1)+'%';$('#sfill').style.background=R0[2];
  setT('#smul',`เหรียญ x${((1+Math.floor(combo/5)*0.5)*(1+r*0.15)*(save.sharp?1.5:1)*P.coinMul).toFixed(2)}`+(combo>=3?` · คอมโบ ${combo}`:''));
  setT('#sevents',styleEvents.map(ev=>`<span class="${ev.neg?'neg':''}" style="opacity:${Math.min(1,ev.t*1.5).toFixed(2)}">${ev.neg?'−':'+'} ${ev.label}</span>`).join(''));}
 $('#sharpBadge').hidden=!save.sharp;
 {const sc=isScoped();$('#scope').hidden=!sc;$('#cross').style.opacity=sc?0:1;}
 {const st=$('#streak');if(streakT>0){st.style.opacity=Math.min(1,streakT*2);setT('#streak',P.hsStreak>=3?`หัวติดกัน x${P.hsStreak} · ดาเมจ +${Math.round(Math.min(0.6*(1+U('focus')*0.5),P.hsStreak*0.04*(1+U('focus')))*100)}%`:'สตรีคขาด');st.style.color=P.hsStreak>=3?'#ffd166':'#ff5a5a';}else st.style.opacity=0;}
 const sp=(G.flame?0.03:G.id==='bar'?(P.ads?0.004:0.03):((P.ads?G.ads:G.spread)||0.02)+P.bloom)*700+6+P.kick*60;$('#cross').style.setProperty('--gap',sp.toFixed(1)+'px');
 $('#vig').style.opacity=Math.max(P.hurtT*2.2,P.hp/P.maxHp<0.3?0.4+Math.sin(performance.now()/160)*0.15:0);
 $('#glow').style.opacity=timeScale<0.9?0.9:0;
 {const bz=$('#bz');if(P.berserk>0){bz.style.opacity=(0.55+0.25*Math.sin(performance.now()/120)).toFixed(2);setT('#bzT','คลั่ง '+Math.ceil(P.berserk));}else if(bz.style.opacity!=='0'){bz.style.opacity=0;setT('#bzT','');}}
 let gk=false;camera.getWorldDirection(_b);_b.y=0;_b.normalize();for(const e of enemies){if(e.dead||e.stagger<=0)continue;_d.subVectors(e.g.position,P.pos);_d.y=0;const d=_d.length()-e.rad;if(d<5.5&&_d.normalize().dot(_b)>0.25){gk=true;break;}}
 $('#gk').style.opacity=gk?1:0;
}

/* ======================= UPDATE ======================= */
const fwd=new THREE.Vector3(),right=new THREE.Vector3();
function groundAt(x,z){let h=0;for(const o of obstacles)if(Math.abs(x-o.x)<o.hw&&Math.abs(z-o.z)<o.hd)h=Math.max(h,o.h);return h;}
function pushOut(pos,r,feetY){let hit=false;for(const o of obstacles){if(feetY!==undefined&&feetY>=o.h-0.05)continue;const dx=pos.x-o.x,dz=pos.z-o.z,ox=o.hw+r-Math.abs(dx),oz=o.hd+r-Math.abs(dz);
 if(ox>0&&oz>0){hit=true;if(ox<oz)pos.x+=Math.sign(dx)*ox;else pos.z+=Math.sign(dz)*oz;}}pos.x=clamp(pos.x,-A+r,A-r);pos.z=clamp(pos.z,-A+r,A-r);return hit;}
function update(rdt){
 if(slowT>0){slowT-=rdt;timeScale=Math.min(timeScale,0.18);}
 if(P.tsT>0){P.tsT-=rdt;timeScale=Math.min(timeScale,0.22);}
 zedCd=Math.max(0,zedCd-rdt);if(zedT>0){zedT-=rdt;zedBeat-=rdt;if(zedBeat<=0){zedBeat=0.8;S.beat();}if(zedT<=0)endZed();}
 timeScale+=(1-timeScale)*Math.min(1,rdt*3.5);if(zedT>0)timeScale=Math.min(timeScale,0.28);const dt=rdt*timeScale;
 // timers
 for(const t of timers){t.t-=dt;if(t.t<=0&&!t.done){t.done=true;t.fn();}}timers=timers.filter(t=>!t.done);
 // ----- player -----
 fwd.set(-Math.sin(P.yaw),0,-Math.cos(P.yaw));right.set(Math.cos(P.yaw),0,-Math.sin(P.yaw));
 let mx=0,mz=0;if(keys.has('w')||keys.has('arrowup'))mz++;if(keys.has('s')||keys.has('arrowdown'))mz--;if(keys.has('d')||keys.has('arrowright'))mx++;if(keys.has('a')||keys.has('arrowleft'))mx--;
 if(tMove.id!==null){const jx=tMove.x-tMove.ox,jy=tMove.y-tMove.oy,l=Math.hypot(jx,jy);if(l>8){mx=jx/Math.max(l,50);mz=-jy/Math.max(l,50);}}
 const wish=_a.set(0,0,0).addScaledVector(fwd,mz).addScaledVector(right,mx);if(wish.lengthSq()>1)wish.normalize();if(P.down)wish.set(0,0,0);
 P.dashCd-=rdt;
 if(P.berserk>0){P.berserk-=rdt;if(P.berserk<=0)showBanner('สร่างแล้ว','');}
 if(P.dashT>0){P.dashT-=rdt;P.pos.addScaledVector(P.dashDir,30*rdt);}else P.pos.addScaledVector(wish,P.speed*rdt*(P.ads?0.65:1)*(P.berserk>0?1.25:1));
 if(P.pushV){P.pos.addScaledVector(P.pushV,rdt);P.pushV.multiplyScalar(Math.max(0,1-rdt*4));}
 P.vy-=26*P.grav*rdt;P.pos.y+=P.vy*rdt;pushOut(P.pos,0.4,P.pos.y);
 const gh=groundAt(P.pos.x,P.pos.z);if(P.pos.y<=gh){if(P.vy<-12)shake=Math.max(shake,0.15);P.pos.y=gh;P.vy=0;P.onGround=true;P.jumps=0;}else P.onGround=false;
 const moving=wish.lengthSq()>0.01&&P.onGround;P.bob+=moving?rdt*12:0;
 P.hurtT=Math.max(0,P.hurtT-rdt);P.meleeCd-=rdt;P.meleeT=Math.max(0,P.meleeT-rdt);
 // face
 P.face.t-=rdt;if(P.face.t<=0){P.face.t=rand(0.8,1.6);P.face.look=pick([-1,0,0,1]);}P.face.mt-=rdt;if(P.face.mt<=0)P.face.mode=combo>=8?'grin':'idle';
 // weapon
 P.cd-=rdt;P.switchT=Math.max(0,P.switchT-rdt);reloadTick(rdt);abilityTick(rdt);
 const G=curGun();
 if(firing)fire(dt);else P.trigger=false;
 P.flameOn=Math.max(0,(P.flameOn||0)-rdt);if(P.flameOn<=0)flameSound(false);
 P.bloom=Math.max(0,P.bloom-rdt*(firing?0.02:0.12));
 if(G.mag&&P.mag[P.cur]===0&&P.reloadT<=0&&P.cd<=0&&!firing&&canReload(P.cur))startReload();
 P.shieldT=Math.max(0,P.shieldT-rdt);holsterTick(dt);for(let i=0;i<P.shotT.length;i++)P.shotT[i]+=dt;
 ghostTick(dt);
 P.kick=Math.max(0,P.kick-rdt*0.6);
 P.recoil=Math.max(0,P.recoil-rdt*(0.15+P.recoil*7));P.pitch=clamp(P.pitch,-1.45,1.45);camera.rotation.set(clamp(P.pitch+P.recoil,-1.5,1.5),P.yaw,0);
 const sh=reduceMotion?shake*0.2:shake;camera.position.set(P.pos.x+rand(-sh,sh)*0.25,P.pos.y+(P.down?0.45:U('tiny')?1.0:1.6)+Math.sin(P.bob)*0.06+rand(-sh,sh)*0.25,P.pos.z+rand(-sh,sh)*0.25);camera.rotation.z=rand(-sh,sh)*0.03;
 shake=Math.max(0,shake-rdt*1.4);
 const bfov=+save.fov||80;let tf=P.dashT>0?bfov+16:bfov;if(P.ads&&P.switchT<=0&&P.reloadT<=0)tf=G.id==='bar'?22:G.id==='dg'?64:58;P.fov+=(tf-P.fov)*Math.min(1,rdt*(P.ads?14:8));camera.fov=P.fov;camera.updateProjectionMatrix();
 // coins: recharge + flight
 if(P.coinCh<coinMax()){P.coinT+=dt;if(P.coinT>=1.4*Math.pow(0.75,U('wallet'))){P.coinT=0;P.coinCh++;}}
 for(const c of coinObjs){if(c.dead)continue;c.life-=dt;c.v.y-=16*dt;c.m.position.addScaledVector(c.v,dt);c.m.rotation.x+=c.spin*dt;c.m.rotation.z+=c.spin*0.3*dt;
  if(c.m.position.y<0.06||c.life<=0||insideObstacleH(c.m.position.x,c.m.position.z,c.m.position.y)){c.dead=true;scene.remove(c.m);}}
 coinObjs=coinObjs.filter(c=>!c.dead);
 // style decay
 style=Math.max(0,style-dt*(10+style*0.03));for(const ev of styleEvents)ev.t-=rdt;styleEvents=styleEvents.filter(ev=>ev.t>0);lastRank=Math.min(lastRank,rankIdx());
 streakT=Math.max(0,streakT-rdt);P.boltT=Math.max(0,P.boltT-dt);
 // viewmodel anim
 gunModels.forEach((g,i)=>g.visible=i===P.cur&&P.meleeT<=0);fist.visible=P.meleeT>0;vm.visible=!isScoped();
 const sw=P.switchT>0?P.switchT/0.3:0;const ax=0.24*Math.min(1,camera.aspect/1.4);
 const rk=P.reloadT>0?1-P.reloadT/P.reloadDur:-1,rt=rk>=0?Math.sin(rk*Math.PI):0,brk=G.id==='ssg'||G.id==='m79';
 const adsK=P.ads&&P.reloadT<=0?1:0;vm.position.set(ax*(1-adsK*0.85)+Math.cos(P.bob*0.5)*0.015*(1-adsK),-0.25+Math.abs(Math.sin(P.bob*0.5))*0.015-sw*0.35-rt*0.05,-0.42+P.kick*0.8);
 vm.rotation.set(P.kick*1.2+rt*(brk?0.3:-0.15),rt*0.2,rt*(brk?-0.15:0.5));
 if(P.meleeT>0){const k=Math.sin((1-P.meleeT/0.28)*Math.PI);fist.position.set(-0.05,-0.05+k*0.05,-0.15-k*0.45);fist.rotation.set(0,0,-0.3);}
 {const ud=gunModels[P.cur].userData;if(ud.anim)ud.anim({shotT:P.shotT[P.cur],reloadK:rk,firing:!!(G.flame&&P.flameOn>0),dt:rdt,t:performance.now()/1000,mag:P.mag[P.cur]});}
 if(flash.visible){flash.userData.t-=rdt;if(flash.userData.t<=0)flash.visible=false;}if(flash2.visible){flash2.userData.t-=rdt;if(flash2.userData.t<=0)flash2.visible=false;}
 vmLight.intensity=Math.max(0,vmLight.intensity-rdt*400);boomLight.intensity=Math.max(0,boomLight.intensity-rdt*520);

 // ----- co-op: revive, network ticks -----
 if(NET.mode){
  if(P.down){let helper=null;for(const m of MATES.values())if(m.on&&!m.down&&Math.hypot(m.x-P.pos.x,m.z-P.pos.z)<2.8){helper=m;break;}
   if(helper){P.revT+=rdt;if(P.revT>=3){P.down=false;P.hp=P.maxHp*0.4;P.revT=0;showBanner('ลุกแล้ว!',esc(helper.name)+' ช่วยไว้');S.pick(900);}}else P.revT=Math.max(0,P.revT-rdt*0.5);}
  netT+=rdt;if(netT>=0.05){netT=0;NET.send({t:'p',x:+P.pos.x.toFixed(2),y:+P.pos.y.toFixed(2),z:+P.pos.z.toFixed(2),yw:+P.yaw.toFixed(3),pt:+P.pitch.toFixed(3),c:P.cur,hp:Math.ceil(P.hp),mh:P.maxHp,dn:P.down?1:0,rv:+P.revT.toFixed(2)});if(NET.mode==='host')NET.send(buildSnap());}
  if(NET.mode==='host'&&P.down&&[...MATES.values()].every(m=>!m.on||m.down)){NET.send({t:'over'});endRun();return;}
 }
 updateAvatar(rdt);
 // ----- spawning -----
 if(NET.mode!=='client'&&queue.length){spawnT-=dt;const alive=enemies.filter(e=>!e.dead).length;if(spawnT<=0&&alive<(20+wave)*(1+0.2*(pN()-1))){spawnEnemy(queue.shift());spawnT=Math.max(0.12,0.7-wave*0.035)/(1+0.25*(pN()-1));}}
 // ----- enemies -----
 const px=P.pos.x,pz=P.pos.z;
 if(NET.mode==='client')clientEnemies(dt);else hostEnemies(dt);
 // corpse limit
 const corpses=enemies.filter(e=>e.dead&&!e.gone);if(corpses.length>22)corpses.slice(0,corpses.length-22).forEach(c=>{if(c.corpse>2)c.corpse=2;});
 enemies=enemies.filter(e=>!e.gone);
 if(NET.mode!=='client'){
  // separation
  for(let i=0;i<enemies.length;i++){const a=enemies[i];if(a.dead)continue;for(let j=i+1;j<enemies.length;j++){const b=enemies[j];if(b.dead||!!a.C.fly!==!!b.C.fly)continue;
   const dx=a.g.position.x-b.g.position.x,dz=a.g.position.z-b.g.position.z,r=a.rad+b.rad,dd=dx*dx+dz*dz;if(dd<r*r&&dd>1e-6&&Math.abs(a.y-b.y)<1){const d=Math.sqrt(dd),o=(r-d)/d*0.5;const wa=a.C.boss?0:b.C.boss?1:0.5,wb=1-wa;
    a.g.position.x+=dx*o*wa*2;a.g.position.z+=dz*o*wa*2;b.g.position.x-=dx*o*wb*2;b.g.position.z-=dz*o*wb*2;}}}
  const pls=[[px,pz,P.pos.y]];if(NET.mode==='host')for(const m of MATES.values())if(m.on)pls.push([m.x,m.z,m.y]);
  for(const e of enemies){if(e.dead||e.C.fly)continue;for(const [qx,qz,qy] of pls){const gp=e.g.position,dx=gp.x-qx,dz=gp.z-qz,r=e.rad+0.4,dd=dx*dx+dz*dz;if(dd<r*r&&dd>1e-6&&Math.abs(qy-e.y)<1.2*e.s){const d=Math.sqrt(dd);gp.x+=dx/d*(r-d);gp.z+=dz/d*(r-d);}}}
 }else{
  for(const e of enemies){if(e.dead||e.C.fly)continue;const gp=e.g.position,dx=P.pos.x-gp.x,dz=P.pos.z-gp.z,r=e.rad+0.4,dd=dx*dx+dz*dz;if(dd<r*r&&dd>1e-6&&Math.abs(P.pos.y-gp.y)<1.2*e.s){const d=Math.sqrt(dd);P.pos.x+=dx/d*(r-d)*0.6;P.pos.z+=dz/d*(r-d)*0.6;}}
 }
 // player grenades
 for(const p of projs){const steps=3;for(let s=0;s<steps&&p.life>0;s++){const h=dt/steps;p.v.y-=16*h;p.m.position.addScaledVector(p.v,h);p.age+=h;const q=p.m.position;let hitE=null;
   for(const e of enemies){if(e.dead)continue;_d.copy(e.g.position);_d.y+=HY(e);if(_d.distanceTo(q)<0.55*e.s+0.2){hitE=e;break;}}
   const ob=insideObstacleH(q.x,q.z,q.y);
   if(hitE||ob||q.y<0.06||Math.abs(q.x)>A||Math.abs(q.z)>A){
    if(!hitE&&!ob&&p.age<0.12&&q.y<0.06){q.y=0.06;p.v.y=Math.abs(p.v.y)*0.3;p.v.x*=0.5;p.v.z*=0.5;continue;}
    p.life=0;
    if(!p.visual){if(ob&&ob.barrel)hitBarrel(ob,999,p.by);if(explode(q.clone().setY(Math.max(0.35,q.y)),p.r||5,p.dmg,true,'เอ็ม 79',p.by)>0&&!p.mate)P.stat.hits++;}}}
  if(p.life>0){p.m.lookAt(_e.copy(p.m.position).add(p.v));p.trail-=dt;if(p.trail<=0){p.trail=0.02;fx(p.m.position.x,p.m.position.y,p.m.position.z,{tex:smokeTex,add:false,color:0x6a6460,s0:0.12,s1:0.7,life:0.6,vy:0.3,op:0.5});}}
  p.life-=dt;if(p.life<=0)scene.remove(p.m);}
 projs=projs.filter(p=>p.life>0);
 // acid pools left by the Krasue
 for(const a of pools){a.t-=dt;a.m.material.opacity=Math.min(0.75,a.t*0.4);if(Math.random()<dt*6)fx(a.x+rand(-1,1)*a.r,0.1,a.z+rand(-1,1)*a.r,{color:0x8aff6a,s0:0.25,s1:0.05,life:0.6,vy:1.2});
  if(NET.mode!=='client'){a.tick-=dt;if(a.tick<=0){a.tick=0.5;if(!P.down&&Math.hypot(P.pos.x-a.x,P.pos.z-a.z)<a.r&&P.pos.y<0.6+groundAt(P.pos.x,P.pos.z)){hurt(5,false);S.sizzle();}
    if(NET.mode==='host')for(const m of MATES.values())if(m.on&&!m.down&&Math.hypot(m.x-a.x,m.z-a.z)<a.r)NET.sendTo(m.pid,{t:'hurt',d:5,fx:a.x,fz:a.z});}}
  if(a.t<=0){scene.remove(a.m);a.m.material.dispose();}}
 pools=pools.filter(a=>a.t>0);
 // enemy fireballs
 if(NET.mode!=='client')for(const s of eprojs){s.life-=dt;s.m.position.addScaledVector(s.v,dt);const p=s.m.position;s.trail-=dt;if(s.trail<=0){s.trail=0.03;fx(p.x,p.y,p.z,{color:s.acid?0x6aff4a:0xff5a10,s0:0.6*s.size,s1:0.1,life:0.3});}
  if(p.y<0.1||insideObstacleH(p.x,p.z,p.y)||Math.abs(p.x)>A||Math.abs(p.z)>A)s.life=0;
  const dy=p.y-(P.pos.y+0.9);if(!P.down&&Math.hypot(p.x-px,p.z-pz)<0.5+0.25*s.size&&Math.abs(dy)<1.1){hurt(s.dmg,false,p.x-s.v.x,p.z-s.v.z);s.life=0;}
  if(s.life>0&&NET.mode==='host')for(const m of MATES.values()){if(m.on&&!m.down&&Math.hypot(p.x-m.x,p.z-m.z)<0.5+0.25*s.size&&Math.abs(p.y-(m.y+0.9))<1.1){NET.sendTo(m.pid,{t:'hurt',d:s.dmg,fx:p.x-s.v.x,fz:p.z-s.v.z});s.life=0;break;}}
  if(s.life<=0){if(s.acid)acidPool(p.x,p.z,true);for(let i=0;i<8;i++)fx(p.x,p.y,p.z,{color:s.acid?pick([0x6aff4a,0xbfff8a]):pick([0xff5a10,0xffa030]),s0:0.6,s1:0.1,life:0.4,vx:rand(-4,4),vy:rand(0,4),vz:rand(-4,4)});scene.remove(s.m);}}
 eprojs=eprojs.filter(s=>s.life>0);
 // shockwave rings
 for(const r of rings){r.r+=dt*(r.speed||14);r.m.scale.set(r.r,r.r,1);r.m.material.opacity=clamp(1-r.r/r.max,0,1)*0.9;
  if(r.dmg){const dd=Math.hypot(px-r.x,pz-r.z);if(!r.hit&&!P.down&&Math.abs(dd-r.r)<0.9&&P.pos.y<0.45+groundAt(px,pz)&&P.dashT<=0){r.hit=true;hurt(r.dmg,false,r.x,r.z);P.vy=6;}}
  if(r.r>=r.max){scene.remove(r.m);r.m.material.dispose();r.done=true;}}
 rings=rings.filter(r=>!r.done);
 // pickups
 for(const p of pickups){p.age+=dt;p.t+=dt;const q=p.m.position;
  if(p.v){q.addScaledVector(p.v,dt);p.v.y-=20*dt;if(q.y<0.45){q.y=0.45;p.v=null;}}else{q.y=0.55+Math.sin(p.t*3)*0.12;}
  p.m.rotation.y+=dt*2.5;const dd=Math.hypot(q.x-px,q.z-pz);
  const need=p.kind==='bz'?true:p.kind==='hp'?P.hp<P.maxHp:p.kind==='ar'?P.armor<P.maxArmor:P.ammo[p.type]<amax(p.type);
  if(need&&dd<P.magnet&&!p.v){q.x+=(px-q.x)*Math.min(1,dt*8);q.z+=(pz-q.z)*Math.min(1,dt*8);}
  if(need&&dd<1.1&&Math.abs(P.pos.y-q.y)<2.2){
   if(p.kind==='bz'){P.berserk=15;P.hp=P.maxHp;S.berserk();showBanner('คลั่ง!','เหล้าขาวนรก · หมัดเดียวแมวกระจุย 15 วิ');styleAdd(30,'คลั่ง!');P.face.mode='grin';P.face.mt=2;}
   else if(p.kind==='hp'){P.hp=Math.min(P.maxHp,P.hp+p.val);S.pick(700);}else if(p.kind==='ar'){P.armor=Math.min(P.maxArmor,P.armor+p.val);S.pick(1100);}
   else{P.ammo[p.type]=Math.min(amax(p.type),P.ammo[p.type]+Math.round(AMMO_PICK[p.type]*(1+U('ammo')*0.2)));S.ammo();}
   scene.remove(p.m);p.got=true;}
  if(p.age>(p.kind==='bz'?40:25)){scene.remove(p.m);p.got=true;}}
 pickups=pickups.filter(p=>!p.got);
 updateFxAndGore(dt);
 // combo / hud timers
 comboT-=dt;if(comboT<=0)combo=0;
 if(hitT>0){hitT-=rdt;if(hitT<=0)$('#hitm').style.opacity=0;}
 if(bannerT>0){bannerT-=rdt;if(bannerT<=0)$('#banner').style.opacity=0;}
 music.intense=enemies.filter(e=>!e.dead).length>12||enemies.some(e=>e.C.boss&&!e.dead)?1:0;
 // wave flow
 if(NET.mode!=='client'&&!queue.length&&!enemies.some(e=>!e.dead)&&waveClearT<0&&wave>0){waveClearT=1.6;showBanner('เคลียร์!','+'+(5+wave)+' เหรียญ');coinsRun+=5+wave;if(NET.mode==='host')NET.send({t:'clr',w:wave});}
 if(waveClearT>=0){waveClearT-=rdt;if(waveClearT<0)openUpgrade();}
}
function fireball(e,dx,dz,speed,size,tg,acid){const g=new THREE.Group();part(GEO.sph,bas(acid?0xd8ffb0:0xffd080),0.14*size,0.14*size,0.14*size,0,0,0,g);const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:acid?0x4aff3a:0xff4a10,blending:THREE.AdditiveBlending,depthWrite:false}));gl.scale.setScalar(1.1*size);g.add(gl);
 g.position.set(e.g.position.x+dx*0.6*e.s,e.y+1.0*e.s*0.8,e.g.position.z+dz*0.6*e.s);scene.add(g);const T=tg||{x:P.pos.x,y:P.pos.y,z:P.pos.z};const ty=T.y+1.1;const dist=Math.hypot(T.x-g.position.x,T.z-g.position.z)||1;
 eprojs.push({m:g,v:new THREE.Vector3(dx*speed,(ty-g.position.y)/dist*speed,dz*speed),dmg:e.dmg,life:5,size,trail:0,acid:!!acid});if(!acid)S.fireball();}
let pools=[];const poolGeo=new THREE.CircleGeometry(1,28);poolGeo.rotateX(-Math.PI/2);
function acidPool(x,z,host){const m=new THREE.Mesh(poolGeo,new THREE.MeshStandardMaterial({color:0x2a6a10,emissive:0x3aff2a,emissiveIntensity:1.2,transparent:true,opacity:0.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4}));const r=1.9;m.scale.setScalar(r);m.position.set(x,0.03+groundAt(x,z),z);scene.add(m);pools.push({m,x,z,r,t:4.5,tick:0});S.sizzle();if(host&&NET.mode==='host')NET.send({t:'ac',x:+x.toFixed(2),z:+z.toFixed(2)});}
function fireBreath(e,dx,dz,host){const h=e.hg;h.getWorldPosition(_d);const o=_d.clone();
 for(let i=0;i<5;i++){const sp=rand(12,17);fx(o.x+dx*0.6*e.s*0.3,o.y-0.2,o.z+dz*0.6*e.s*0.3,{color:pick([0xff7a20,0xffb040,0xff4a10,0xffe080]),s0:0.5,s1:rand(2.4,3.6),life:rand(0.45,0.7),vx:dx*sp+rand(-1.5,1.5),vy:rand(-2.5,0.5),vz:dz*sp+rand(-1.5,1.5)});}
 if(!host)return;if(NET.mode==='host')NET.send({t:'fb',x:+o.x.toFixed(2),y:+o.y.toFixed(2),z:+o.z.toFixed(2),dx:+dx.toFixed(2),dz:+dz.toFixed(2)});
 const inCone=(x,z)=>{const vx=x-e.g.position.x,vz=z-e.g.position.z,l=Math.hypot(vx,vz);return l<12&&(vx*dx+vz*dz)/Math.max(l,0.01)>0.8;};
 if(!P.down&&inCone(P.pos.x,P.pos.z))hurt(6,false,e.g.position.x,e.g.position.z);
 if(NET.mode==='host')for(const m of MATES.values())if(m.on&&!m.down&&inCone(m.x,m.z))NET.sendTo(m.pid,{t:'hurt',d:6,fx:e.g.position.x,fz:e.g.position.z});}
function slam(e){if(NET.mode==='host')NET.send({t:'sl',x:e.g.position.x,z:e.g.position.z,d:e.dmg*0.9});slamAt(e.g.position.x,e.g.position.z,e.dmg*0.9);}
function slamAt(x,z,dmg){const e={g:{position:new THREE.Vector3(x,0,z)},dmg:dmg/0.9};S.slam();shake=Math.max(shake,0.7);const m=new THREE.Mesh(new THREE.RingGeometry(0.85,1,64),new THREE.MeshBasicMaterial({color:0xff5a10,transparent:true,opacity:0.9,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.set(e.g.position.x,0.1,e.g.position.z);scene.add(m);rings.push({m,r:1,max:24,x:e.g.position.x,z:e.g.position.z,dmg:e.dmg*0.9,hit:false,speed:13});
 for(let i=0;i<24;i++)fx(e.g.position.x+rand(-3,3),0.3,e.g.position.z+rand(-3,3),{tex:smokeTex,add:false,color:0x3a2018,s0:1,s1:4,life:1.2,vy:2,op:0.8});decal(e.g.position.x,e.g.position.z,8,0x080303);}
function updateFxAndGore(dt){if(window.__noFx)return;
 // blood droplets
 for(let i=0;i<BD;i++){if(bd.l[i]<=0)continue;bd.l[i]-=dt;const j=i*3;bd.v[j+1]-=22*dt;bd.p[j]+=bd.v[j]*dt;bd.p[j+1]+=bd.v[j+1]*dt;bd.p[j+2]+=bd.v[j+2]*dt;
  if(bd.p[j+1]<0.02){bd.l[i]=0;if(Math.random()<0.12)decal(bd.p[j],bd.p[j+2],rand(0.15,0.45));}
  if(bd.l[i]<=0){bloodI.setMatrixAt(i,ZERO);continue;}
  dummy.position.set(bd.p[j],bd.p[j+1],bd.p[j+2]);dummy.rotation.set(0,0,0);const s=bd.s[i];dummy.scale.set(s,s*(1+Math.abs(bd.v[j+1])*0.15),s);dummy.updateMatrix();bloodI.setMatrixAt(i,dummy.matrix);}
 bloodI.instanceMatrix.needsUpdate=true;
 // gibs
 for(let i=0;i<GB;i++){if(gb.l[i]<=0)continue;gb.l[i]-=dt;const j=i*3;const sy=gb.s[j+1]*0.5;
  if(gb.p[j+1]>sy+0.001||gb.v[j+1]>0){gb.v[j+1]-=22*dt;gb.p[j]+=gb.v[j]*dt;gb.p[j+1]+=gb.v[j+1]*dt;gb.p[j+2]+=gb.v[j+2]*dt;for(let a=0;a<3;a++)gb.r[j+a]+=gb.w[j+a]*dt;
   if(Math.random()<dt*14)blood(gb.p[j],gb.p[j+1],gb.p[j+2],1,0.6,0.05);
   if(gb.p[j+1]<sy){gb.p[j+1]=sy;if(Math.abs(gb.v[j+1])>3){gb.v[j+1]*=-0.3;gb.v[j]*=0.6;gb.v[j+2]*=0.6;if(Math.random()<0.5)decal(gb.p[j],gb.p[j+2],rand(0.3,0.7));}else{gb.v[j]=gb.v[j+1]=gb.v[j+2]=0;for(let a=0;a<3;a++)gb.w[j+a]=0;}}
   const q=Math.abs(gb.p[j])>A-0.2||Math.abs(gb.p[j+2])>A-0.2;if(q){gb.v[j]*=-0.5;gb.v[j+2]*=-0.5;gb.p[j]=clamp(gb.p[j],-A+0.2,A-0.2);gb.p[j+2]=clamp(gb.p[j+2],-A+0.2,A-0.2);}}
  const k=gb.l[i]<1?gb.l[i]:1;dummy.position.set(gb.p[j],gb.p[j+1],gb.p[j+2]);dummy.rotation.set(gb.r[j],gb.r[j+1],gb.r[j+2]);dummy.scale.set(gb.s[j]*k,gb.s[j+1]*k,gb.s[j+2]*k);dummy.updateMatrix();gibI.setMatrixAt(i,gb.l[i]>0?dummy.matrix:ZERO);}
 gibI.instanceMatrix.needsUpdate=true;
 // sprite fx
 for(const f of fxs){if(f.l<=0)continue;f.l-=dt;if(f.l<=0){f.s.visible=false;continue;}const t=1-f.l/f.m;f.v.y-=f.g*dt;f.s.position.addScaledVector(f.v,dt);f.s.scale.setScalar(f.s0+(f.s1-f.s0)*t);f.s.material.opacity=f.o*(1-t*t);}
 for(const t of tracers){if(t.l<=0)continue;t.l-=dt;t.m.material.opacity=Math.max(0,t.l/t.max);if(t.l<=0)t.m.visible=false;}
}
function ambient(dt,now){W.ambient(dt,now,camera);}

/* ======================= FLOW ======================= */
let lockPending=false;
function lock(){if(isTouch||dragLook||locked||lockPending)return;if(navigator.userActivation&&!navigator.userActivation.isActive){const h=$('#hint');h.hidden=false;h.textContent='คลิกที่จอเพื่อเล็ง';setTimeout(()=>h.hidden=true,3000);return;}lockPending=true;setTimeout(()=>lockPending=false,1500);try{const r=cv.requestPointerLock();if(r&&r.catch)r.catch(()=>{lockPending=false;enableDrag();});}catch(e){lockPending=false;enableDrag();}}
function enableDrag(){dragLook=true;const h=$('#hint');h.hidden=false;h.textContent='เบราว์เซอร์นี้ล็อกเมาส์ไม่ได้ กดเมาส์ค้างแล้วลากเพื่อหัน (คลิกคือยิง)';setTimeout(()=>h.hidden=true,6000);}
function unlock(){if(document.pointerLockElement){expectUnlock=true;document.exitPointerLock();}}
document.addEventListener('pointerlockchange',()=>{lockPending=false;locked=document.pointerLockElement===cv;if(!locked){firing=false;if(state==='play'&&!expectUnlock)pause();expectUnlock=false;}});
document.addEventListener('pointerlockerror',enableDrag);
function hideAll(){['#menu','#shop','#upgrade','#pause','#over','#coop','#wait','#lb'].forEach(s=>$(s).hidden=true);$('#chatBar').hidden=true;}
let pendingFree=0,upOpts=[];
function startGame(){audio();startMusic();hideAll();clearMenuCats();newRun();state='play';$('#hud').hidden=false;$('#touch').hidden=!isTouch;lastTime=performance.now();lock();
 readyLocal=false;for(const m of MATES.values())m.wready=false;if(NET.mode){NET.started=true;const k=NET.me;P.pos.set(((k%3)-1)*2.2,0,4+Math.floor(k/3)*2.2);}
 const fr=upLv('start');if(fr>0){pendingFree=fr;openUpgrade(true);}else readyUp();}
let readyLocal=false;
function readyUp(){if(!NET.mode){state='play';lastTime=performance.now();lock();startWave();return;}
 readyLocal=true;state='wait';unlock();$('#wait').hidden=false;waitText();
 if(NET.mode==='client')NET.send({t:'rdy'});else tryStartWave();}
function waitText(){if(NET.mode==='host'){const notR=[...MATES.values()].filter(m=>!m.wready).map(m=>m.name);$('#waitText').textContent=notR.length?'รอ '+notR.join(', ')+' เลือกอัปเกรด…':'กำลังเริ่ม…';}else $('#waitText').textContent='รอเพื่อนทุกคนพร้อม แล้วหัวห้องจะเริ่มเวฟต่อไป…';}
function tryStartWave(){if(NET.mode!=='host'||!readyLocal)return;if([...MATES.values()].some(m=>!m.wready)){if(state==='wait')waitText();return;}readyLocal=false;for(const m of MATES.values())m.wready=false;beginWave();startWave();NET.send({t:'wave',w:wave});}
function beginWave(){$('#wait').hidden=true;state='play';lastTime=performance.now();lock();if(P.down){P.down=false;P.hp=P.maxHp*0.3;}}
let upFree=false;
function weaponCards(){const ic={ak:'🔫',m79:'💣',bar:'🎯',fl:'🔥'};return GUNS.map((g,i)=>({g,i})).filter(o=>!P.own[o.i]).map(o=>({id:'gun_'+o.g.id,r:'g',name:o.g.name,icon:ic[o.g.id]||'🔫',desc:o.g.desc,gun:o.i,max:1}));}
function rollCards(){const pool=UPS.filter(u=>U(u.id)<u.max);const opts=[];const wc=weaponCards();
 if(wc.length&&(wave<=1||Math.random()<0.35))opts.push(pick(wc));
 while(opts.length<3&&pool.length){let tot=0;for(const u of pool)tot+=RAR[u.r].w;let r=Math.random()*tot,k=0;for(;k<pool.length-1;k++){r-=RAR[pool[k].r].w;if(r<=0)break;}opts.push(pool.splice(k,1)[0]);}
 return opts;}
function rerollCost(){return 15+wave*3;}
function renderCards(){const box=$('#upCards');box.innerHTML='';
 upOpts.forEach((u,i)=>{const b=document.createElement('button');b.className='card r-'+u.r;const R=RAR[u.r];b.style.setProperty('--rc',R.col);const l=u.gun!==undefined?0:U(u.id);
  b.innerHTML=`<span class="rar">${R.n}</span><span class="ic">${u.icon}</span><span class="tag">${u.gun!==undefined?'ปืนใหม่ + กระสุนเต็มแม็ก':l?'เลเวล '+(l+1)+' / '+u.max:u.max>1?'ใหม่ · สูงสุด '+u.max+' เลเวล':'ใหม่'}</span><span class="nm">${u.name}</span><span class="ds">${u.desc}</span><span class="key">กด ${i+1}</span>`;
  b.onclick=()=>pickUp(u);box.appendChild(b);});
 const rb=$('#rerollBtn');const fr=P.rerolls>0;rb.textContent=fr?`🎲 สุ่มการ์ดใหม่ (ฟรีอีก ${P.rerolls} ครั้ง)`:`🎲 สุ่มการ์ดใหม่ · 🪙 ${rerollCost()}`;rb.disabled=!fr&&coinsRun<rerollCost();}
function openUpgrade(free){state='upgrade';firing=false;unlock();flameSound(false);upFree=!!free;
 if(!free)P.rerolls=1+upLv('reroll');upOpts=rollCards();
 $('#upTitle').textContent=free?'ของขวัญจากแม่':'เคลียร์เวฟ '+wave;$('#upSub').textContent=free?'เลือกอัปเกรดฟรีก่อนลงนรก':'เลือก 1 ใบ · พลังชีวิตฟื้น 20% · การ์ดสีม่วงคือคำสาป ได้ของแรงแต่มีราคาต้องจ่าย';
 renderCards();$('#upgrade').hidden=false;setTimeout(()=>{const c=$('#upCards .card');c&&c.focus();},30);}
$('#rerollBtn').onclick=()=>{if(state!=='upgrade')return;if(P.rerolls>0)P.rerolls--;else{const c=rerollCost();if(coinsRun<c)return;coinsRun-=c;}S.coin();upOpts=rollCards();renderCards();};
function pickUp(u){if(state!=='upgrade')return;
 if(u.gun!==undefined){const i=u.gun,G=GUNS[i];P.own[i]=true;P.mag[i]=magSize(i);if(G.ammo!=='ae')P.ammo[G.ammo]=Math.max(P.ammo[G.ammo],Math.round(AMMO_START[G.ammo]*P.ammoMul));P.last=P.cur;P.cur=i;P.switchT=0.3;showBanner('ได้ปืนใหม่!',G.name);}
 else{P.ups[u.id]=U(u.id)+1;rec();
  if(u.id==='ammo')for(const k of AMMO_TYPES)if(GUNS.some((g,i)=>P.own[i]&&g.ammo===k))P.ammo[k]=amax(k);
  if(u.id==='armor')P.armor=P.maxArmor;if(u.id==='hp')P.hp=P.maxHp;
  if(u.id==='bighead')enemies.forEach(e=>{if(!e.dead)bigHead(e);});}
 S.pick(800);$('#upgrade').hidden=true;
 if(pendingFree>0){pendingFree--;if(pendingFree>0){openUpgrade(true);return;}readyUp();return;}
 P.hp=Math.min(P.maxHp,P.hp+P.maxHp*0.2);readyUp();}
function pause(){if(state!=='play')return;state='paused';firing=false;keys.clear();
 P.ads=false;$('#pauseStats').innerHTML=statHtml([['เวฟ',wave],['พลังชีวิต',Math.ceil(P.hp)+'/'+P.maxHp],['ไล่แมวไป',kills],['ความแม่น',accPct()+'%'],['หัวติดกันสูงสุด',P.stat.bestStreak],['แรงค์สูงสุด',RANKS[P.stat.bestRank][1]]]);$('#pause').hidden=false;}
function accPct(){return P.stat.shots?Math.round(P.stat.hits/P.stat.shots*100):0;}
function resume(){if(state!=='paused')return;$('#pause').hidden=true;state='play';lastTime=performance.now();lock();}
function endRun(){if(state==='over')return;if(zedT>0)endZed();state='over';firing=false;unlock();flameSound(false);ghosts.forEach(g=>g.visible=false);drawArrows(false);hlOn=false;enemies.forEach(e=>e.setXray&&e.setXray(false));$('#wait').hidden=true;$('#upgrade').hidden=true;$('#pause').hidden=true;
 const earned=Math.round((coinsRun+wave*3)*(1+upLv('greed')*0.15));P.ads=false;save.coins+=earned;save.runs++;const nb=wave>save.best.wave;
 if(nb)save.best.wave=wave;if(kills>save.best.kills)save.best.kills=kills;if(gkCount>save.best.gk)save.best.gk=gkCount;persist();
 $('#overTitle').textContent=nb?'สถิติใหม่ · เวฟ '+wave:'คุณตายแล้ว';
 $('#overText').textContent='Aritat ล้มลงกลางซอยนรกที่เวฟ '+wave+' ฝูงแมวปีศาจรุมแทะจนเหลือแต่รองเท้า เก็บเหรียญไปซื้อของแล้วกลับมาล้างแค้น';
 $('#overStats').innerHTML=statHtml([['ถึงเวฟ',wave],['ไล่แมวไป',kills],['ความแม่น',accPct()+'%'],['ยิงโดนหัว',P.stat.heads+' นัด'],['หัวติดกันสูงสุด',P.stat.bestStreak],['ยิงไกลสุด',Math.round(P.stat.longest)+' ม.'],['แรงค์สูงสุด',RANKS[P.stat.bestRank][1]],['เหรียญที่ได้','+'+earned]]);
 if(P.stat.bestRank>(save.best.rank||0))save.best.rank=P.stat.bestRank;if(P.stat.bestStreak>(save.best.streak||0))save.best.streak=P.stat.bestStreak;persist();
 $('#hud').hidden=true;$('#touch').hidden=true;$('#over').hidden=false;demonMeow(0.5,true);screenSplat(10,true);
 recordScore();
 $('#againBtn').textContent=NET.mode?'กลับห้อง Lobby':NET.wasOnline?'กลับไปหน้าเล่นออนไลน์':'ลงนรกอีกรอบ';if(NET.mode){NET.started=false;removeAvatars();if(NET.mode==='host')dirSendReg();}}
// ---------- characters & leaderboard ----------
function renderChars(){const box=$('#charList');if(!box)return;box.innerHTML='';
 for(const C of CHARS){const own=save.chars.includes(C.id),sel=save.char===C.id;const d=document.createElement('div');d.className='ch'+(sel?' sel':'')+(own?'':' locked');d.style.setProperty('--cc',C.col);
  d.innerHTML=`<span class="ci">${C.icon}</span><b>${C.name}</b><small>${C.role}</small><p>${C.passive}</p><p class="ac"><kbd>G</kbd> ${C.abIcon} <b>${C.active}</b> · ${C.activeDesc} (คูลดาวน์ ${C.cd} วิ)</p>`;
  const b=document.createElement('button');b.className='b'+(sel?' alt':'');b.textContent=sel?'ใช้อยู่':own?'เลือก':'ซื้อ 🪙 '+C.cost;b.disabled=sel||(!own&&save.coins<C.cost);
  b.onclick=()=>{if(!own){if(save.coins<C.cost)return;save.coins-=C.cost;save.chars.push(C.id);S.coin();}save.char=C.id;persist();renderChars();$('#menuCoins').textContent='🪙 '+save.coins;};
  d.appendChild(b);box.appendChild(d);}
 const pn=$('#pname');if(pn&&document.activeElement!==pn)pn.value=save.name||'';}
const lbOn=()=>!!(LEADERBOARD.url&&LEADERBOARD.key);
const lbHeaders=()=>({apikey:LEADERBOARD.key,Authorization:'Bearer '+LEADERBOARD.key,'Content-Type':'application/json'});
function recordScore(){if(!P||wave<1)return;const en={name:myName(),wave,kills,char:save.char,mode:NET.mode?'coop':'solo',acc:accPct()};
 save.hist.push(Object.assign({t:Date.now()},en));save.hist.sort((a,b)=>b.wave-a.wave||b.kills-a.kills);save.hist=save.hist.slice(0,20);persist();
 if(lbOn())fetch(LEADERBOARD.url.replace(/\/$/,'')+'/rest/v1/scores',{method:'POST',headers:Object.assign({Prefer:'return=minimal'},lbHeaders()),body:JSON.stringify(en)}).catch(()=>{});}
async function lbFetch(){const r=await fetch(LEADERBOARD.url.replace(/\/$/,'')+'/rest/v1/scores?select=name,wave,kills,char,mode,acc,created_at&order=wave.desc,kills.desc&limit=300',{headers:lbHeaders()});
 if(!r.ok)throw new Error('HTTP '+r.status);const rows=await r.json();const seen=new Set(),out=[];for(const x of rows){const k=String(x.name||'').toLowerCase();if(seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=50)break;}return out;}
const charIcon=id=>(CHARS.find(c=>c.id===id)||CHARS[0]).icon;
function lbTable(rows,me){if(!rows.length)return '<p class="hint">ยังไม่มีสถิติ เล่นให้จบสักรอบก่อน</p>';
 return `<table class="lbt"><thead><tr><th>#</th><th>ผู้เล่น</th><th>เวฟ</th><th>ไล่ไป</th><th>แม่น</th><th>โหมด</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${me&&String(r.name).toLowerCase()===myName().toLowerCase()?'me':''}"><td>${i<3?['🥇','🥈','🥉'][i]:i+1}</td><td>${charIcon(r.char)} ${esc(r.name)}</td><td>${r.wave}</td><td>${r.kills}</td><td>${r.acc??'-'}%</td><td>${r.mode==='coop'?'ทีม':'เดี่ยว'}</td></tr>`).join('')}</tbody></table>`;}
let lbTab='g';
async function renderLb(){const body=$('#lbBody');$('#lbTabG').classList.toggle('on',lbTab==='g');$('#lbTabL').classList.toggle('on',lbTab==='l');
 if(lbTab==='l'){body.innerHTML=lbTable(save.hist,false);return;}
 if(!lbOn()){body.innerHTML='<p class="hint">อันดับรวมทุกคนยังไม่ได้เชื่อมฐานข้อมูล ตอนนี้ดูสถิติของตัวเองได้ที่แท็บ "ของฉัน"</p>';return;}
 body.innerHTML='<p class="hint">กำลังโหลด…</p>';try{body.innerHTML=lbTable(await lbFetch(),true);}catch(e){body.innerHTML='<p class="hint">โหลดอันดับไม่สำเร็จ ('+esc(e.message)+')</p>';}}
$('#lbBtn').onclick=()=>{audio();hideAll();$('#lb').hidden=false;renderLb();};$('#lbBack').onclick=showMenu;
$('#lbTabG').onclick=()=>{lbTab='g';renderLb();};$('#lbTabL').onclick=()=>{lbTab='l';renderLb();};
$('#pname').addEventListener('keydown',e=>e.stopPropagation());$('#pname').addEventListener('input',e=>{save.name=e.target.value.trim().slice(0,14);persist();});
const statHtml=a=>a.map(([k,v])=>`<div>${k}<b>${v}</b></div>`).join('');
function showMenu(){state='menu';hideAll();removeAvatars();if(enemies){enemies.forEach(e=>{if(!e.gone)disposeCat(e);});enemies=[];}unlock();$('#hud').hidden=true;$('#touch').hidden=true;$('#menu').hidden=false;$('#menuCoins').textContent='🪙 '+save.coins;renderChars();
 $('#bestLine').textContent=save.runs?`สถิติดีที่สุด: เวฟ ${save.best.wave} · ไล่แมว ${save.best.kills} ตัว · แรงค์ ${RANKS[save.best.rank||0][1]} · หัวติดกัน ${save.best.streak||0} นัด`:'';}
let shopFrom='menu';
function openShop(from){shopFrom=from;hideAll();$('#shop').hidden=false;renderShop();}
function renderShop(){$('#shopCoins').textContent='🪙 '+save.coins;const box=$('#shopList');box.innerHTML='';
 for(const s of SHOP){const l=upLv(s.id),c=shopCost(s),maxed=l>=s.max;const d=document.createElement('div');d.className='card';
  d.innerHTML=`<span class="ic">${s.icon}</span><span class="nm">${s.name}</span><span class="ds">${s.desc}</span><span class="pips">${Array.from({length:s.max},(_,i)=>`<i class="${i<l?'on':''}"></i>`).join('')}</span>`;
  const b=document.createElement('button');b.className='b'+(maxed||save.coins<c?' alt':'');b.textContent=maxed?'เต็มแล้ว':'ซื้อ 🪙 '+c;b.disabled=maxed||save.coins<c;
  b.onclick=()=>{if(save.coins>=c&&!maxed){save.coins-=c;save.up[s.id]=l+1;persist();S.coin();renderShop();}};d.appendChild(b);box.appendChild(d);}}
$('#startBtn').onclick=()=>{netClose();startGame();};$('#againBtn').onclick=()=>{if(NET.mode)backToLobby();else if(NET.wasOnline){NET.wasOnline=false;openCoop();}else startGame();};$('#menuBtn').onclick=showMenu;
$('#shopBtn').onclick=()=>{audio();startMusic();openShop('menu');};$('#overShopBtn').onclick=()=>openShop('over');
$('#shopBack').onclick=()=>{if(shopFrom==='over'){hideAll();$('#over').hidden=false;}else showMenu();};
$('#resumeBtn').onclick=resume;$('#quitBtn').onclick=()=>{$('#pause').hidden=true;state='play';if(NET.mode){NET.send({t:'bye'});netClose();}endRun();};
$('#menuBtn').addEventListener('click',()=>{if(NET.mode){NET.send({t:'bye'});netClose();}});
$('#overText').addEventListener('click',()=>{});
function toggleMute(){muted=!muted;$('#muteBtn').textContent=muted?'เปิดเสียง':'ปิดเสียง';if(master)master.gain.setTargetAtTime(muted?0:0.9,AC.currentTime,0.05);}
$('#muteBtn').onclick=toggleMute;
function refreshSharp(){$('#sharpBtn').textContent='โหมดมือแม่น: '+(save.sharp?'เปิด (ยิงตัวเบา ยิงหัวแรง เหรียญ x1.5)':'ปิด');}
$('#sharpBtn').onclick=()=>{save.sharp=!save.sharp;persist();refreshSharp();};refreshSharp();
const toggleQ=()=>{save.quality=save.quality==='high'?'medium':save.quality==='medium'?'low':'high';persist();applyQuality();};
$('#qBtn').onclick=toggleQ;$('#qBtn2').onclick=toggleQ;
const toggleMusic=()=>{audio();startMusic();setMusic(!music.on);};$('#musicBtn').onclick=toggleMusic;$('#musicBtn2').onclick=toggleMusic;
function applyBright(){const b=clamp(+save.bright||1,0.4,2.2);renderer.toneMappingExposure=1.3*b;if(post)post.setBright(b);}
['#bright','#bright2'].forEach(id=>{const el=$(id);el.value=save.bright||1;el.oninput=()=>{save.bright=+el.value;['#bright','#bright2'].forEach(o=>$(o).value=save.bright);applyBright();persist();};});
applyBright();
{const f=$('#fov');f.value=save.fov||80;$('#fovVal').textContent=f.value;f.oninput=()=>{save.fov=+f.value;$('#fovVal').textContent=f.value;persist();};}
const sensEl=$('#sens');sensEl.value=save.sens;$('#sensVal').textContent=(+save.sens).toFixed(1);
sensEl.oninput=()=>{save.sens=+sensEl.value;$('#sensVal').textContent=save.sens.toFixed(1);persist();};
if(isTouch)document.body.classList.add('touch');

/* ======================= INPUT ======================= */
function switchGun(i){if(!P||i===P.cur||i<0||i>=GUNS.length||!P.own[i])return;P.last=P.cur;P.cur=i;P.switchT=0.3;P.reloadT=0;P.ads=false;P.trigger=false;flameSound(false);S.ammo();}
function cycleGun(d){for(let k=1;k<GUNS.length;k++){const i=(P.cur+d*k+GUNS.length*3)%GUNS.length;if(P.own[i]){switchGun(i);return;}}}
function jump(){if(state!=='play'||P.down)return;if(P.onGround){P.vy=9;P.onGround=false;P.jumps=1;S.jump();}else if((U('djump')||isChar('win'))&&P.jumps<2){P.vy=8.5;P.jumps=2;S.jump();for(let i=0;i<6;i++)fx(P.pos.x,P.pos.y,P.pos.z,{color:0xff7a20,s0:0.5,s1:0.1,life:0.3,vx:rand(-2,2),vy:-3,vz:rand(-2,2)});}}
function dash(){if(P.dashCd>0||state!=='play'||P.down)return;const d=_c.set(0,0,0);fwd.set(-Math.sin(P.yaw),0,-Math.cos(P.yaw));right.set(Math.cos(P.yaw),0,-Math.sin(P.yaw));
 if(keys.has('w'))d.add(fwd);if(keys.has('s'))d.sub(fwd);if(keys.has('d'))d.add(right);if(keys.has('a'))d.sub(right);
 if(tMove.id!==null){const jx=tMove.x-tMove.ox,jy=tMove.y-tMove.oy;d.addScaledVector(right,jx).addScaledVector(fwd,-jy);}
 if(d.lengthSq()<0.01)d.copy(fwd);d.normalize();P.dashDir.copy(d);P.dashT=0.16;P.dashCd=P.dashMax;S.dash();}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(e.repeat&&k===' ')return;keys.add(k);
 if(state==='play'){if(k===' ')jump();if('123456'.includes(k)&&k.length===1)switchGun(+k-1);if(k==='c')tossCoin();if(k==='r')startReload();if(k==='g')useAbility();if(k==='q')switchGun(P.last);if(k==='shift')dash();if(k==='f'||k==='e'||k==='v')melee();if(k==='p'||(k==='escape'&&dragLook))pause();}
 else if(state==='paused'&&k==='p')resume();
 else if(state==='upgrade'){const n=parseInt(k);if(n>=1&&n<=upOpts.length)pickUp(upOpts[n-1]);}
 if(k==='m')toggleMute();
 if(NET.mode&&inGame()&&(k==='t'||k==='enter')&&$('#chatBar').hidden){e.preventDefault();keys.clear();firing=false;$('#chatBar').hidden=false;setTimeout(()=>$('#chatBarIn').focus(),0);}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();firing=false;if(P)P.ads=false;if(state==='play'&&(dragLook||isTouch))pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pause();});
cv.addEventListener('mousedown',e=>{if(isTouch||state!=='play')return;if(!locked&&!dragLook){lock();return;}if(e.button===0){firing=true;mouseDown=true;}if(e.button===2){P.ads=true;S.zoom();}if(e.button===1){e.preventDefault();tossCoin();}});
addEventListener('mouseup',e=>{if(e.button===0){firing=false;mouseDown=false;}if(e.button===2&&P)P.ads=false;});
document.addEventListener('mousemove',e=>{if(state!=='play'||isTouch||!P)return;if(Math.abs(e.movementX)>250||Math.abs(e.movementY)>250)return;if(locked||(dragLook&&mouseDown)){const s=0.0022*save.sens*(P.fov/(+save.fov||80));P.yaw-=e.movementX*s;P.pitch-=e.movementY*s;}});
addEventListener('wheel',e=>{if(state==='play')cycleGun(e.deltaY>0?1:-1);},{passive:true});
cv.addEventListener('contextmenu',e=>e.preventDefault());
const tMove={id:null,ox:0,oy:0,x:0,y:0},tLook={id:null,x:0,y:0};
cv.addEventListener('touchstart',e=>{isTouch=true;document.body.classList.add('touch');if(state==='play')$('#touch').hidden=false;e.preventDefault();
 for(const t of e.changedTouches){if(t.clientX<innerWidth*0.45&&tMove.id===null){tMove.id=t.identifier;tMove.ox=tMove.x=t.clientX;tMove.oy=tMove.y=t.clientY;}else if(tLook.id===null){tLook.id=t.identifier;tLook.x=t.clientX;tLook.y=t.clientY;}}},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){if(t.identifier===tMove.id){tMove.x=t.clientX;tMove.y=t.clientY;}else if(t.identifier===tLook.id&&state==='play'){const s=0.005*save.sens*(P.fov/(+save.fov||80));P.yaw-=(t.clientX-tLook.x)*s;P.pitch-=(t.clientY-tLook.y)*s;tLook.x=t.clientX;tLook.y=t.clientY;}}},{passive:false});
const tEnd=e=>{for(const t of e.changedTouches){if(t.identifier===tMove.id)tMove.id=null;if(t.identifier===tLook.id)tLook.id=null;}};
cv.addEventListener('touchend',tEnd);cv.addEventListener('touchcancel',tEnd);
function tbtn(id,down,up){const b=$(id);b.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();down();},{passive:false});b.addEventListener('touchend',e=>{e.preventDefault();up&&up();},{passive:false});b.addEventListener('click',()=>{if(!isTouch)down();});}
tbtn('#tFire',()=>{firing=true;},()=>firing=false);tbtn('#tJump',jump);tbtn('#tDash',dash);tbtn('#tMelee',melee);tbtn('#tSwap',()=>cycleGun(1));tbtn('#tAbility',useAbility);tbtn('#tReload',startReload);tbtn('#tZoom',()=>{P.ads=!P.ads;S.zoom();});tbtn('#tCoin',tossCoin);tbtn('#tPause',pause);

/* ======================= ONLINE (up to 6 players, host-authoritative star) ======================= */
let netT=0,snapN=0;
const MAXP=6;
const PCOLS=['#ff9a3a','#58c8ff','#9be15d','#ff6ad5','#ffd23f','#b48aff'];
const pColor=pid=>PCOLS[(pid||0)%PCOLS.length];
const MATES=new Map();   // pid -> remote player
const TYPES=Object.keys(CATS);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function myName(){return (save.name||'Aritat').slice(0,14);}
function nameOf(pid){if(pid===undefined||pid===NET.me)return myName();const m=MATES.get(pid);return m?m.name:'เพื่อน';}
function pN(){return NET.mode?1+[...MATES.values()].length:1;}
function ownBy(b){return (b===undefined||b===null||b===NET.me)?undefined:b;}
function newMate(pid,name){return {pid,name:String(name||'เพื่อน').slice(0,14),ready:false,wready:false,on:false,x:0,y:0,z:0,tx:0,ty:0,tz:0,yaw:0,pitch:0,cur:0,hp:100,mh:100,down:false,rev:0,av:null};}
const NET={mode:null,me:0,code:'',title:'',pub:true,peer:null,conn:null,conns:new Map(),joined:false,started:false,ready:false,local:false,pidN:1,
 get connected(){return this.mode==='host'||(this.mode==='client'&&this.joined);},
 send(o){o.from=this.me;if(this.mode==='host'){for(const c of this.conns.values())if(c.open)try{c.send(o);}catch(e){}}else if(this.conn&&this.conn.open&&this.joined)try{this.conn.send(o);}catch(e){}},
 sendTo(pid,o){o.from=this.me;const c=this.conns.get(pid);if(c&&c.open)try{c.send(o);}catch(e){}},
 relay(o,except){for(const [pid,c] of this.conns)if(pid!==except&&c.open)try{c.send(o);}catch(e){}}};
function PeerImpl(){return NET.local?MockPeer:Peer;}
function netStatus(t){$('#coopStatus').textContent=t||'';}
function genCode(){const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<5;i++)c+=a[(Math.random()*a.length)|0];return c;}
const PEER_OPT={debug:0,config:{iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478']},{urls:['turn:openrelay.metered.ca:80','turn:openrelay.metered.ca:443','turn:openrelay.metered.ca:443?transport=tcp'],username:'openrelayproject',credential:'openrelayproject'}]}};
function inviteLink(c){return /^https?:/.test(location.protocol)?location.origin+location.pathname+'#r='+c:'';}
function onlineOK(){return NET.local||(typeof RTCPeerConnection!=='undefined'&&!!Peer);}
function inGame(){return ['play','paused','wait','upgrade'].includes(state);}
function saveName(){const n=$('#coopName').value.trim();if(n){save.name=n.slice(0,14);persist();}}
function netClose(){if(NET.mode==='host'&&NET.code)dirUnreg();
 try{if(NET.conn)NET.conn.close();}catch(e){}for(const c of NET.conns.values())try{c.close();}catch(e){}try{if(NET.peer)NET.peer.destroy();}catch(e){}
 NET.mode=null;NET.me=0;NET.joined=false;NET.started=false;NET.ready=false;NET.conn=null;NET.peer=null;NET.conns.clear();removeAvatars();MATES.clear();$('#mates').hidden=true;}
// ---------- lobby screens ----------
function showEntry(msg){$('#coopEntry').hidden=false;$('#coopRoom').hidden=true;netStatus(msg||'');dirEnsure();dirRefresh();}
function showRoom(){$('#coopEntry').hidden=true;$('#coopRoom').hidden=false;renderRoom();}
function openCoop(){NET.wasOnline=false;audio();startMusic();hideAll();$('#coop').hidden=false;state='menu';$('#coopName').value=save.name||'';if(!$('#roomTitle').value)$('#roomTitle').placeholder='ซอยของ '+myName();
 if(NET.mode&&NET.connected)showRoom();else{if(NET.mode)netClose();showEntry(onlineOK()?'':'เบราว์เซอร์นี้ไม่รองรับการเล่นออนไลน์ ลองใช้ Chrome หรือ Edge');}}
function renderRoom(){
 $('#roomHead').textContent=NET.title||'ห้อง';$('#roomCode').textContent=NET.code;$('#copyLink').hidden=!inviteLink(NET.code);
 const list=[];if(NET.mode==='host')list.push({pid:NET.me,name:myName(),host:true,ready:true,me:true});
 else{list.push({pid:0,name:NET.hostName||'หัวห้อง',host:true,ready:true});}
 for(const m of MATES.values())if(m.pid!==0)list.push({pid:m.pid,name:m.name,ready:m.ready});
 if(NET.mode==='client')list.push({pid:NET.me,name:myName(),ready:NET.ready,me:true});
 list.sort((a,b)=>a.pid-b.pid);
 $('#playerList').innerHTML=list.map(p=>`<li><i style="background:${pColor(p.pid)}"></i>${esc(p.name)}${p.me?' <small>(คุณ)</small>':''}<span class="st ${p.host||p.ready?'ok':''}">${p.host?'👑 หัวห้อง':p.ready?'✔ พร้อม':'ยังไม่พร้อม'}</span>${NET.mode==='host'&&!p.me?`<button class="linkbtn kick" data-k="${p.pid}">เตะ</button>`:''}</li>`).join('');
 $('#playerList').querySelectorAll('.kick').forEach(b=>b.onclick=()=>kick(+b.dataset.k));
 $('#pCount').textContent=list.length+'/'+MAXP;
 const notReady=[...MATES.values()].filter(m=>!m.ready).length;
 $('#coopStart').hidden=NET.mode!=='host';$('#readyBtn').hidden=NET.mode!=='client';
 $('#readyBtn').textContent=NET.ready?'ยกเลิกพร้อม':'พร้อม!';
 $('#coopStart').textContent=MATES.size===0?'เริ่มเล่นคนเดียว':notReady?'เริ่มเกม (รออีก '+notReady+' คน)':'เริ่มเกม!';
 $('#coopStart').disabled=notReady>0;}
function broadcastRoster(){if(NET.mode!=='host')return;NET.send({t:'roster',h:myName(),title:NET.title,pl:[...MATES.values()].map(m=>[m.pid,m.name,m.ready?1:0])});renderRoom();dirSendReg();}
function chatLine(pid,text,sys){const log=$('#chatLog');const d=document.createElement('div');if(sys){d.className='sys';d.textContent=text;}else d.innerHTML=`<b style="color:${pColor(pid)}">${esc(nameOf(pid))}:</b> ${esc(text)}`;log.appendChild(d);while(log.children.length>80)log.firstChild.remove();log.scrollTop=1e9;
 if(inGame()||state==='over'){const h=$('#chatHud');const e=d.cloneNode(true);h.appendChild(e);while(h.children.length>6)h.firstChild.remove();setTimeout(()=>e.remove(),8000);}}
function sysChat(t){chatLine(0,t,true);if(NET.mode==='host')NET.send({t:'sys',x:t});}
function sendChat(text){text=String(text||'').trim().slice(0,120);if(!text||!NET.mode)return;NET.send({t:'chat',x:text});chatLine(NET.me,text);}
function kick(pid){const c=NET.conns.get(pid);if(!c)return;c.send({t:'deny',r:'หัวห้องเชิญคุณออกจากห้อง',from:0});setTimeout(()=>{try{c.close();}catch(e){}},200);}
function backToLobby(){hideAll();$('#coop').hidden=false;state='menu';$('#hud').hidden=true;$('#touch').hidden=true;removeAvatars();if(enemies){enemies.forEach(e=>{if(!e.gone)disposeCat(e);});enemies=[];}
 NET.ready=false;if(NET.mode==='client')NET.send({t:'lrdy',v:0});if(NET.mode&&NET.connected)showRoom();else showEntry('การเชื่อมต่อหลุด');}
// ---------- host ----------
function netHost(){netClose();saveName();if(!onlineOK()){netStatus('เบราว์เซอร์นี้ไม่รองรับการเล่นออนไลน์');return;}
 NET.mode='host';NET.me=0;NET.pidN=1;NET.code=genCode();NET.title=($('#roomTitle').value.trim()||('ซอยของ '+myName())).slice(0,24);NET.pub=$('#roomPublic').checked;
 MATES.clear();$('#chatLog').innerHTML='';showRoom();netStatus('กำลังเปิดห้อง…');
 const peer=new (PeerImpl())('aritat-soi-'+NET.code,PEER_OPT);NET.peer=peer;
 peer.on('open',()=>{if(NET.peer!==peer)return;netStatus(NET.pub?'เปิดห้องแล้ว ห้องนี้โชว์ในรายชื่อห้อง หรือส่งลิงก์ชวนให้เพื่อน':'เปิดห้องแล้ว (ห้องส่วนตัว) ส่งลิงก์ชวนหรือรหัสห้องให้เพื่อน');sysChat('เปิดห้อง '+NET.code+' แล้ว');dirEnsure();dirSendReg();});
 peer.on('connection',c=>{c.on('data',m=>hostOnData(c,m));c.on('close',()=>hostOnClose(c));c.on('error',()=>hostOnClose(c));});
 peer.on('error',err=>{if(NET.peer!==peer)return;if(err.type==='unavailable-id'&&!peer.open){netHost();return;}if(err.type==='peer-unavailable')return;netStatus('เปิดห้องไม่สำเร็จ ('+(err.type||'error')+') ลองกดสร้างห้องใหม่');});
 peer.on('disconnected',()=>{try{if(NET.peer===peer&&!peer.destroyed)peer.reconnect();}catch(e){}});}
function hostOnData(c,m){if(!m||!m.t||NET.mode!=='host')return;
 if(m.t==='hello'){if(c.pid!==undefined)return;
  if(NET.started){c.send({t:'deny',r:'ห้องนี้กำลังเล่นอยู่ รอจบรอบแล้วค่อยเข้าใหม่',from:0});setTimeout(()=>{try{c.close();}catch(e){}},300);return;}
  if(MATES.size>=MAXP-1){c.send({t:'deny',r:'ห้องเต็มแล้ว ('+MAXP+' คน)',from:0});setTimeout(()=>{try{c.close();}catch(e){}},300);return;}
  const pid=NET.pidN++;c.pid=pid;NET.conns.set(pid,c);const mt=newMate(pid,m.n);MATES.set(pid,mt);
  c.send({t:'welcome',you:pid,code:NET.code,title:NET.title,h:myName(),from:0});broadcastRoster();sysChat(mt.name+' เข้าห้อง');S.coin();return;}
 if(c.pid===undefined||!MATES.has(c.pid))return;
 m.from=c.pid;
 if(m.t==='p'||m.t==='pj'||m.t==='tr'||m.t==='chat')NET.relay(m,c.pid);
 onNet(m);}
function hostOnClose(c){if(c.pid===undefined||!MATES.has(c.pid))return;const mt=MATES.get(c.pid);NET.conns.delete(c.pid);MATES.delete(c.pid);removeAvatar(mt);
 broadcastRoster();sysChat(mt.name+' ออกจากห้อง');if(inGame()){feed('<em>'+esc(mt.name)+' หลุดจากห้อง</em>');tryStartWave();}}
// ---------- client ----------
function netJoin(code){netClose();saveName();code=String(code||$('#joinCode').value).trim().toUpperCase();if(code.length<4){netStatus('ใส่รหัสห้อง 5 ตัวก่อน');return;}
 if(!onlineOK()){netStatus('เบราว์เซอร์นี้ไม่รองรับการเล่นออนไลน์');return;}
 NET.mode='client';NET.code=code;MATES.clear();$('#chatLog').innerHTML='';netStatus('กำลังเชื่อมต่อห้อง '+code+'…');
 const peer=new (PeerImpl())(PEER_OPT);NET.peer=peer;
 peer.on('open',()=>{if(NET.peer!==peer)return;const c=peer.connect('aritat-soi-'+code,{reliable:true,serialization:'json'});NET.conn=c;
  const to=setTimeout(()=>{if(NET.conn===c&&!NET.joined)netStatus('ต่อไม่ติด เน็ตของใครสักคนอาจบล็อกการต่อตรง ลองเปลี่ยนไปใช้ Wi-Fi อื่นหรือแชร์เน็ตมือถือ แล้วลองใหม่');},15000);
  c.on('open',()=>{clearTimeout(to);c.send({t:'hello',n:myName()});});
  c.on('data',m=>{if(m&&m.t)onNet(m);});
  c.on('close',()=>{if(NET.conn===c)onHostLost();});});
 peer.on('error',err=>{if(NET.peer!==peer)return;netStatus(err.type==='peer-unavailable'?'ไม่พบห้อง '+code+' ห้องอาจปิดไปแล้ว':'เชื่อมต่อไม่สำเร็จ ('+(err.type||'error')+')');});}
function onHostLost(msg){if(NET.mode!=='client')return;const was=inGame();netClose();NET.wasOnline=true;
 if(was){endRun();$('#overText').textContent=msg||'หัวห้องปิดห้องหรือหลุดไป รอบนี้จบแค่นี้ เหรียญที่เก็บได้ยังอยู่';}
 else if(!$('#coop').hidden)showEntry(msg||'หัวห้องปิดห้องแล้ว');}
// ---------- messages ----------
function onNet(m){if(!m||!m.t)return;
 switch(m.t){
  case 'welcome':if(NET.mode!=='client')return;NET.me=m.you;NET.joined=true;NET.title=m.title;NET.hostName=m.h;NET.code=m.code;showRoom();netStatus('เข้าห้องแล้ว กด "พร้อม!" แล้วรอหัวห้องเริ่มเกม');S.coin();break;
  case 'deny':onHostLost(m.r);if(!$('#coop').hidden)showEntry(m.r);break;
  case 'roster':if(NET.mode!=='client')return;{NET.hostName=m.h;NET.title=m.title;const seen=new Set();
   for(const [pid,name,rd] of m.pl){if(pid===NET.me)continue;seen.add(pid);let mt=MATES.get(pid);if(!mt){mt=newMate(pid,name);MATES.set(pid,mt);}mt.name=name;mt.ready=!!rd;}
   if(!MATES.has(0))MATES.set(0,newMate(0,m.h));seen.add(0);MATES.get(0).name=m.h;
   for(const [pid,mt] of [...MATES])if(!seen.has(pid)){removeAvatar(mt);MATES.delete(pid);}
   renderRoom();}break;
  case 'lrdy':if(NET.mode==='host'){const mt=MATES.get(m.from);if(mt){mt.ready=!!m.v;broadcastRoster();}}break;
  case 'chat':chatLine(m.from,m.x);break;
  case 'sys':if(NET.mode==='client')chatLine(0,m.x,true);break;
  case 'start':if(NET.mode==='client'){NET.ready=false;NET.started=true;startGame();}break;
  case 'p':{let mt=MATES.get(m.from);if(!mt){if(NET.mode==='host')return;mt=newMate(m.from,'เพื่อน');MATES.set(m.from,mt);}
   if(!mt.on){mt.x=m.x;mt.y=m.y;mt.z=m.z;}mt.on=true;mt.tx=m.x;mt.ty=m.y;mt.tz=m.z;mt.yaw=m.yw;mt.pitch=m.pt;mt.cur=m.c;mt.hp=m.hp;mt.mh=m.mh;mt.down=!!m.dn;mt.rev=m.rv||0;}break;
  case 's':if(NET.mode==='client'&&P&&inGame())applySnap(m);break;
  case 'd':if(NET.mode==='host'){const e=enemies.find(x=>x.id===m.i);if(e&&!e.dead){if(m.gl&&!(e.stagger>0))return;damage(e,m.d,new THREE.Vector3(m.dx,0,m.dz),m.k,!!m.h,m.s,{point:new THREE.Vector3(m.px,m.py,m.pz),dist:m.ds,close:!!m.c,glory:!!m.gl,explosive:!!m.ex,stun:!!m.st,by:m.from,burn:!!m.b,slow:!!m.sl,flame:!!m.fl,big:!!m.bg});}}break;
  case 'k':if(NET.mode==='client'){const e=enemies.find(x=>x.id===m.i);if(!e||e.dead)return;if(e.tx!==undefined)e.g.position.set(e.tx,e.ty,e.tz);killCat(e,!!m.h,m.s,{gib:!!m.g,dir:new THREE.Vector3(m.dx,0,m.dz),glory:!!m.gl,dist:m.d,by:m.by,ric:m.s==='ริโคเชต์'});}break;
  case 'x':if(NET.mode==='client'){const pos=new THREE.Vector3(m.x,m.y,m.z);explodeFx(pos,m.r,!!m.f);selfBlast(pos,m.r,m.s==='ถังแก๊ส'?'env':(m.by===NET.me?'own':'mate'));}break;
  case 'pj':spawnNetProj(m);break;
  case 'bx':break;
  case 'ab':if(NET.mode==='host'){if(m.k==='shout')abShout(m.x,m.z);else if(m.k==='heal'){if(Math.hypot(P.pos.x-m.x,P.pos.z-m.z)<12&&P.hp>0&&!P.down){P.hp=Math.min(P.maxHp,P.hp+50);showBanner('ได้ยาหม่อง!','+50 จาก '+esc(nameOf(m.from)));}healMates(m.x,m.z,m.from);}}break;
  case 'heal':if(P&&!P.down){P.hp=Math.min(P.maxHp,P.hp+m.v);S.pick(700);showBanner('ได้ยาหม่อง!','+'+m.v+' พลังชีวิต');}break;
  case 'zt':if(NET.mode==='client')triggerZed(m.d,true);break;
  case 'fb':if(NET.mode==='client'){const e={hg:{getWorldPosition:v=>v.set(m.x,m.y,m.z)},s:4};fireBreath(e,m.dx,m.dz,false);}break;
  case 'ac':if(NET.mode==='client')acidPool(m.x,m.z,false);break;
  case 'tr':remoteShot(m);break;
  case 'hurt':if(P&&state!=='over'){hurt(m.d,false,m.fx,m.fz);}break;
  case 'sl':if(NET.mode==='client')slamAt(m.x,m.z,m.d);break;
  case 'bh':if(NET.mode==='host'){const b=barrels.find(o=>o.idx===m.i&&!o.dead);if(b)hitBarrel(b,m.d,m.from);}break;
  case 'clr':if(NET.mode==='client'){waveClearT=1.6;showBanner('เคลียร์!','+'+(5+m.w)+' เหรียญ');coinsRun+=5+m.w;}break;
  case 'rdy':if(NET.mode==='host'){const mt=MATES.get(m.from);if(mt)mt.wready=true;tryStartWave();}break;
  case 'wave':if(NET.mode==='client'){readyLocal=false;beginWave();wave=m.w;showBanner('WAVE '+wave,'ลุยด้วยกัน '+pN()+' คน');S.wave();spawnBarrels();}break;
  case 'over':if(state!=='over'&&state!=='menu')endRun();break;
  case 'bye':if(NET.mode==='client'&&m.from===0)onHostLost();break;
 }}
// ---------- public room directory (one browser volunteers to keep the list) ----------
const DIR_ID='aritat-soi-dir-v2';
const DIR={browse:null,conn:null,peer:null,isDir:false,becoming:false,rooms:new Map(),last:[]};
function dirEnsure(){if(DIR.isDir||DIR.becoming)return;if(DIR.conn&&DIR.conn.open)return;
 if(DIR.browse&&(DIR.browse.destroyed||DIR.browse._local!==NET.local)){try{DIR.browse.destroy();}catch(e){}DIR.browse=null;}
 if(!DIR.browse){if(!onlineOK())return;const b=new (PeerImpl())(PEER_OPT);b._local=NET.local;DIR.browse=b;b.on('open',dirConnect);
  b.on('error',e=>{if(e.type==='peer-unavailable'&&String(e.message||'').includes(DIR_ID))dirBecome();});b.on('disconnected',()=>{try{b.reconnect();}catch(e){}});}
 else if(DIR.browse.open)dirConnect();}
function dirConnect(){if(DIR.isDir||!DIR.browse||!DIR.browse.open)return;if(DIR.conn&&!DIR.conn._dead)return;
 const c=DIR.browse.connect(DIR_ID,{reliable:true,serialization:'json'});DIR.conn=c;
 c.on('open',()=>{dirSendReg();try{c.send({t:'list'});}catch(e){}});
 c.on('data',m=>{if(m&&m.t==='rooms')renderRooms(m.rooms);});
 c.on('close',()=>{c._dead=true;if(DIR.conn===c){DIR.conn=null;setTimeout(dirEnsure,400+Math.random()*1200);}});}
function dirBecome(){if(DIR.isDir||DIR.becoming)return;DIR.becoming=true;if(DIR.conn){DIR.conn._dead=true;DIR.conn=null;}
 const p=new (PeerImpl())(DIR_ID,PEER_OPT);
 p.on('open',()=>{DIR.becoming=false;DIR.isDir=true;DIR.peer=p;DIR.rooms.clear();dirSendReg();renderRooms(dirList());});
 p.on('connection',c=>{c.on('data',m=>dirHandle(c,m));c.on('close',()=>{for(const [k,r] of DIR.rooms)if(r.c===c)DIR.rooms.delete(k);});});
 p.on('error',e=>{if(e.type==='unavailable-id'){DIR.becoming=false;try{p.destroy();}catch(_){}setTimeout(dirEnsure,300+Math.random()*900);}});
 p.on('disconnected',()=>{try{p.reconnect();}catch(e){}});}
function dirHandle(c,m){if(!m)return;if(m.t==='reg'&&m.r&&m.r.code){DIR.rooms.set(m.r.code,Object.assign({},m.r,{c,ts:Date.now()}));}
 else if(m.t==='unreg')DIR.rooms.delete(m.code);else if(m.t==='list')try{c.send({t:'rooms',rooms:dirList()});}catch(e){}}
function dirList(){const now=Date.now();for(const [k,r] of DIR.rooms)if(now-r.ts>12000)DIR.rooms.delete(k);
 return [...DIR.rooms.values()].map(r=>({code:r.code,title:r.title,host:r.host,n:r.n,max:r.max,st:r.st,w:r.w})).slice(0,40);}
function dirSendReg(){if(NET.mode!=='host'||!NET.peer||!NET.peer.open)return;
 if(!NET.pub){dirUnreg();return;}
 const r={code:NET.code,title:NET.title,host:myName(),n:1+MATES.size,max:MAXP,st:NET.started?1:0,w:NET.started?wave:0};
 if(DIR.isDir)DIR.rooms.set(r.code,Object.assign({},r,{c:null,ts:Date.now()}));else if(DIR.conn&&DIR.conn.open)try{DIR.conn.send({t:'reg',r});}catch(e){}}
function dirUnreg(){if(DIR.isDir)DIR.rooms.delete(NET.code);else if(DIR.conn&&DIR.conn.open)try{DIR.conn.send({t:'unreg',code:NET.code});}catch(e){}}
function dirRefresh(){if(DIR.isDir)renderRooms(dirList());else if(DIR.conn&&DIR.conn.open)try{DIR.conn.send({t:'list'});}catch(e){}else dirEnsure();}
function renderRooms(rooms){DIR.last=rooms||[];const box=$('#roomList');if(!box)return;
 const list=DIR.last.filter(r=>r.code!==NET.code||NET.mode!=='host');
 if(!list.length){box.innerHTML='<p class="hint">ยังไม่มีห้องเปิดอยู่ สร้างห้องเองแล้วชวนเพื่อนได้เลย</p>';return;}
 box.innerHTML=list.map(r=>{const full=r.n>=r.max,busy=!!r.st;return `<div class="room"><b>${esc(r.title||'ห้อง')}</b><small>หัวห้อง ${esc(r.host||'-')} · ${r.n}/${r.max} คน · ${busy?'กำลังเล่น เวฟ '+(r.w||1):'รออยู่ในล็อบบี้'}</small><button class="b ${full||busy?'alt':''}" data-j="${esc(r.code)}" ${full||busy?'disabled':''}>${full?'เต็ม':busy?'เล่นอยู่':'เข้าห้อง'}</button></div>`;}).join('');
 box.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{$('#joinCode').value=b.dataset.j;netJoin(b.dataset.j);});}
setInterval(()=>{if(NET.mode==='host')dirSendReg();if(!$('#coop').hidden&&!$('#coopEntry').hidden)dirRefresh();},3000);
function hitE(e,d,dir,knock,head,src,o={}){
 if(NET.mode!=='client'){damage(e,d,dir,knock,head,src,o);return;}
 if(e.dead)return;e.flash=0.06;const pt=o.point||new THREE.Vector3(e.g.position.x,e.g.position.y+0.7*e.s,e.g.position.z);
 if(!o.flame)blood(pt.x,pt.y,pt.z,head?14:7,head?5:3.5,0.06,dir);
 hitmark(head?'#ffd166':'#f1e3cf');if(head)S.head();else if(!o.flame&&Math.random()<0.5)S.tick();
 if(head&&src!=='ริโคเชต์')styleAdd(6);
 NET.send({t:'d',i:e.id,d:Math.round(d),h:head?1:0,dx:dir?+dir.x.toFixed(2):0,dz:dir?+dir.z.toFixed(2):0,k:knock||0,s:src,ds:+(o.dist||0).toFixed(1),c:o.close?1:0,gl:o.glory?1:0,ex:o.explosive?1:0,st:o.stun?1:0,b:o.burn?1:0,sl:o.slow?1:0,fl:o.flame?1:0,bg:o.big?1:0,px:+pt.x.toFixed(2),py:+pt.y.toFixed(2),pz:+pt.z.toFixed(2)});}
function buildSnap(){const e=[];for(const c of enemies){if(c.dead)continue;e.push([c.id,TYPES.indexOf(c.type),+c.g.position.x.toFixed(2),+c.g.position.y.toFixed(2),+c.g.position.z.toFixed(2),+c.g.rotation.y.toFixed(2),+(c.hp/c.max).toFixed(3),(c.stagger>0?2:0)|(c.burn>0?4:0)]);}
 const f=eprojs.filter(s=>s.life>0).map(s=>[+s.m.position.x.toFixed(2),+s.m.position.y.toFixed(2),+s.m.position.z.toFixed(2),s.size,s.acid?1:0]);
 const b=BARREL_POS.map((_,i)=>barrels.some(o=>o.idx===i&&!o.dead)?1:0).join('');
 return {t:'s',e,f,b,w:wave,n:enemies.filter(c=>!c.dead).length+queue.length};}
const fbVis=[];
function applySnap(m){
 const seen=new Set();
 for(const a of m.e){const [id,ti,x,y,z,r,hp,fl]=a;seen.add(id);let e=enemies.find(q=>q.id===id);
  if(!e){e=spawnEnemy(TYPES[ti],x,z,{id,y});}
  if(e.dead)continue;e.tx=x;e.ty=y;e.tz=z;e.tr=r;
  if(e.hpF!==hp){e.hpF=hp;e.hp=hp*e.max;e.setHurt(1-hp);}
  e.stagger=(fl&2)?1:0;e.burnVis=!!(fl&4);}
 for(const e of enemies){if(!e.dead&&!seen.has(e.id)){disposeCat(e);e.gone=true;hitMeshes=hitMeshes.filter(q=>q!==e.body&&q!==e.head);}}
 wave=m.w;snapN=m.n;
 m.b.split('').forEach((v,i)=>{if(v==='0'){const b=barrels.find(o=>o.idx===i&&!o.dead);if(b)removeBarrel(b);}});
 while(fbVis.length<m.f.length){const g=new THREE.Group();part(GEO.sph,bas(0xffd080),0.14,0.14,0.14,0,0,0,g);const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff4a10,blending:THREE.AdditiveBlending,depthWrite:false}));gl.scale.setScalar(1.1);g.add(gl);scene.add(g);fbVis.push(g);}
 fbVis.forEach((g,i)=>{const f=m.f[i];g.visible=!!f;if(f){g.position.set(f[0],f[1],f[2]);g.scale.setScalar(f[3]);if(Math.random()<0.5)fx(f[0],f[1],f[2],{color:f[4]?0x6aff4a:0xff5a10,s0:0.6*f[3],s1:0.1,life:0.3});}});}
const ghosts=[];
function ghostTick(dt){const n=U('ghost')+(isChar('khlang')?1:0);while(ghosts.length<n){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x8affc0,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.setScalar(0.6);scene.add(s);ghosts.push(s);}
 const tt=performance.now()/600;ghosts.forEach((s,i)=>{s.visible=i<n;const a=tt+i*TAU/Math.max(1,n);s.position.set(P.pos.x+Math.cos(a)*1.3,P.pos.y+1.9+Math.sin(a*2)*0.15,P.pos.z+Math.sin(a)*1.3);});
 if(!n)return;P.ghostT-=dt;if(P.ghostT>0)return;P.ghostT=0.85/n;
 const s=ghosts[(Math.random()*n)|0];let best=null,bd=14;for(const e of enemies){if(e.dead)continue;_d.copy(e.g.position);_d.y+=HY(e);const d=_d.distanceTo(s.position);if(d<bd&&clearLine(s.position,_d)){bd=d;best=e;}}
 if(!best)return;_d.copy(best.g.position);_d.y+=HY(best);const to=_d.clone();tracer(s.position.clone(),to,0x8affc0,0.04,0.15);fx(to.x,to.y,to.z,{color:0x8affc0,s0:0.6,s1:0.1,life:0.25});S.zap();hitE(best,25*P.dmgMul,null,1,false,'ผีพี่เลี้ยง',{point:to});}
function burnFx(e,dt){const gp=e.g.position;if(Math.random()<dt*20)fx(gp.x+rand(-0.35,0.35)*e.s,gp.y+HY(e)+rand(-0.25,0.45)*e.s,gp.z+rand(-0.35,0.35)*e.s,{color:pick([0xff7a20,0xffb040,0xff4a10]),s0:0.45*e.s,s1:0.1,life:0.5,vy:2.4});
 if(Math.random()<dt*3)fx(gp.x,gp.y+HY(e)+0.5*e.s,gp.z,{tex:smokeTex,add:false,color:0x1a1210,s0:0.4,s1:1.6,life:1,vy:1.8,op:0.5});}
function corpseStep(e,dt){const gp=e.g.position;if(!e.posedDead){e.posedDead=true;e.setFlash(0);e.setGlow(0);e.anim(0,{dead:true});}
 e.corpse-=dt;const k=clamp((10-e.corpse)/0.35,0,1);e.g.rotation.z=e.fallDir*k*Math.PI/2*0.95;const gh=groundAt(gp.x,gp.z);
 if(e.y>gh+0.01){e.vy-=24*dt;e.y=Math.max(gh,e.y+e.vy*dt);gp.y=e.y;}else gp.y=gh+Math.max(-2,(e.corpse<2?-(2-e.corpse)*0.5:0));
 gp.x+=e.knock.x*dt;gp.z+=e.knock.z*dt;e.knock.multiplyScalar(Math.max(0,1-dt*6));
 if(Math.random()<dt*3&&e.corpse>6)blood(gp.x,gp.y+0.3*e.s,gp.z,2,1,0.05);
 if(e.corpse<=0){disposeCat(e);e.gone=true;}}
function animCat(e,dt,spd){e.lunge=Math.max(0,e.lunge-dt*4);
 e.anim(dt,{speed:spd,t:performance.now()/1000,scale:e.s,lunge:e.lunge>0?1-e.lunge:0,crouch:e.st==='crouch'||e.st==='wind',air:e.st==='leap'||(e.st==='jump'&&!e.onG),fly:!!e.C.fly,stagger:e.stagger>0});
 if(e.stagger>0){e.setGlow(0.5+0.5*Math.sin(performance.now()/70));e.wasStag=true;}
 else{if(e.wasStag){e.setGlow(0);e.wasStag=false;}e.flash-=dt;e.setFlash(e.flash>0?1:0);}}
function clientEnemies(dt){
 for(const e of enemies){const gp=e.g.position;
  if(e.dead){corpseStep(e,dt);continue;}
  if(e.tx===undefined)continue;
  const ox=gp.x,oz=gp.z;const k=Math.min(1,dt*12);gp.x+=(e.tx-gp.x)*k;gp.z+=(e.tz-gp.z)*k;gp.y+=(e.ty-gp.y)*k;e.y=gp.y;
  let dr=e.tr-e.g.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));e.g.rotation.y+=dr*k;
  if(e.burnVis)burnFx(e,dt);
  animCat(e,dt,Math.hypot(gp.x-ox,gp.z-oz)/Math.max(dt,1e-4));}}
function hostEnemies(dt){
 const T=aliveTargets();
 for(const e of enemies){
  const gp=e.g.position;
  if(e.dead){corpseStep(e,dt);continue;}
  if(e.burn>0){e.burn-=dt;e.burnT=(e.burnT||0)-dt;burnFx(e,dt);if(e.burnT<=0){e.burnT=0.25;damage(e,5,null,0,false,'ไฟคลอก',{by:e.burnBy,tick:true});if(e.dead)continue;}
   if(Math.random()<dt*0.8)for(const o of enemies){if(o!==e&&!o.dead&&!(o.burn>0)&&o.g.position.distanceTo(gp)<1.6){o.burn=2;o.burnBy=e.burnBy;break;}}}
  if(e.slowT>0)e.slowT-=dt;
  let tg=null,bd=1e9;for(const t of T){const dd=(t.x-gp.x)**2+(t.z-gp.z)**2;if(dd<bd){bd=dd;tg=t;}}
  const none=!tg;if(none)tg={x:gp.x+0.01,y:0,z:gp.z,local:true};
  const px=tg.x,pz=tg.z,py=tg.y;
  let dx=px-gp.x,dz=pz-gp.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  let vx=none?0:dx*e.spd,vz=none?0:dz*e.spd;e.atkCd-=dt;e.t-=dt;
  if(e.stagger>0){e.stagger-=dt;vx=vz=0;if(Math.random()<dt*6)blood(gp.x,gp.y+0.8*e.s,gp.z,2,1.5,0.06);}
  else if(e.type==='bat'){
   e.ang+=dt*(0.8+0.35*Math.sin(e.phase*0.3))*e.dirSign;
   if(e.st==='orbit'){const Rr=11+Math.sin(e.t*0.7)*3;const tx=px+Math.cos(e.ang)*Rr,tz=pz+Math.sin(e.ang)*Rr;vx=(tx-gp.x)*2.2;vz=(tz-gp.z)*2.2;const sp=Math.hypot(vx,vz),mx=e.spd*1.4;if(sp>mx){vx*=mx/sp;vz*=mx/sp;}
    e.ty=py+4+Math.sin(performance.now()/600+e.ang)*1.5;if(e.t<=0&&d<26&&!none){e.st='dive';e.t=1.5;demonMeow(1.6,true);}}
   else if(e.st==='dive'){vx=dx*e.spd*2;vz=dz*e.spd*2;e.ty=py+1.1;if(e.t<=0||(d<1.4&&e.atkCd>0)){e.st='orbit';e.t=rand(3,5.5);e.dirSign*=-1;}}
   e.y+=(e.ty-e.y)*Math.min(1,dt*(e.st==='dive'?4:2));
  }
  else if(e.type==='black'){
   if(e.st==='run'&&e.t<=0&&d<12&&d>3&&e.onG){e.st='crouch';e.t=0.38;e.eyeMat.color.setRGB(3,0.2,0.2);voice(e,'atk');}
   else if(e.st==='crouch'){vx=vz=0;if(e.t<=0){e.st='leap';e.vy=8+Math.max(0,py-e.y)*1.5;e.onG=false;e.ldx=dx;e.ldz=dz;}}
   else if(e.st==='leap'){vx=e.ldx*16;vz=e.ldz*16;if(e.landed){e.st='run';e.t=rand(2.5,4);e.eyeMat.color.setHex(e.C.eye).multiplyScalar(2.2);}}
  }else if(e.type==='khao'){
   if(d<11){vx=-dx*e.spd*0.7+dz*e.spd*0.6;vz=-dz*e.spd*0.7-dx*e.spd*0.6;}else if(d<18){vx=dz*e.spd*0.7;vz=-dx*e.spd*0.7;}
   if(e.t<=0&&d<34&&!none){e.t=rand(2,3);fireball(e,dx,dz,17,1,tg);}
  }else if(e.type==='persian'){
   if(e.st==='run'&&e.t<=0&&d<18&&d>4){e.st='wind';e.t=0.6;voice(e,'atk');}
   else if(e.st==='wind'){vx=vz=0;e.inner.rotation.x=-0.15;if(e.t<=0){e.st='charge';e.t=1.1;e.ldx=dx;e.ldz=dz;e.inner.rotation.x=0;}}
   else if(e.st==='charge'){vx=e.ldx*19;vz=e.ldz*19;if(Math.random()<dt*20)fx(gp.x,gp.y+0.2,gp.z,{tex:smokeTex,add:false,color:0x3a2a20,s0:0.6,s1:2,life:0.7,op:0.6});if(e.t<=0){e.st='run';e.t=rand(3,5);}}
  }else if(e.type==='rat'){const zz=Math.sin(performance.now()/160+e.phase*3)*0.7;vx=(dx-dz*zz)*e.spd;vz=(dz+dx*zz)*e.spd;
  }else if(e.type==='dog'){
   if(!e.enraged&&e.hp<e.max*0.5){e.enraged=true;e.spd*=1.35;voice(e,'atk');e.setGlow&&e.setGlow(0.35);}
   if(e.st==='run'&&e.t<=0&&d<9&&d>2.5&&e.onG){e.st='crouch';e.t=0.26;voice(e,'atk');}
   else if(e.st==='crouch'){vx=vz=0;if(e.t<=0){e.st='leap';e.vy=7+Math.max(0,py-e.y)*1.5;e.onG=false;e.ldx=dx;e.ldz=dz;}}
   else if(e.st==='leap'){vx=e.ldx*17;vz=e.ldz*17;if(e.landed){e.st='run';e.t=rand(1.6,2.8);}}
  }else if(e.type==='krasue'){
   if(e.ang===undefined){e.ang=Math.atan2(gp.z-pz,gp.x-px);e.dirSign=Math.random()<0.5?1:-1;}e.ang+=dt*0.45*e.dirSign;
   if(e.st==='dive'){vx=dx*e.spd*2.3;vz=dz*e.spd*2.3;e.ty=py+0.1;if(e.t<=0||d<1.1){e.st='orbit';e.t=rand(2.2,3.2);}}
   else{e.st='orbit';const Rr=11+Math.sin(e.phase+performance.now()/1500)*3;const tx=px+Math.cos(e.ang)*Rr,tz=pz+Math.sin(e.ang)*Rr;vx=(tx-gp.x)*1.6;vz=(tz-gp.z)*1.6;const sp=Math.hypot(vx,vz),mx=e.spd*1.2;if(sp>mx){vx*=mx/sp;vz*=mx/sp;}
    e.ty=py+0.6+Math.sin(performance.now()/700+e.phase)*0.6;
    if(e.t<=0&&!none){if(d<6&&Math.random()<0.55){e.st='dive';e.t=1.3;voice(e,'atk');}else if(d<34){e.t=rand(2.2,3.4);fireball(e,dx,dz,14,1.15,tg,true);S.acid();}else e.t=1;}}
   e.y+=(e.ty-e.y)*Math.min(1,dt*2);
  }else if(e.type==='bossDog'){
   e.slamCd-=dt;e.sumCd-=dt;e.brCd=(e.brCd===undefined?4:e.brCd)-dt;
   if(e.st==='breath'){vx=dx*0.6;vz=dz*0.6;e.bt-=dt;e.btk=(e.btk||0)-dt;if(e.btk<=0){e.btk=0.14;fireBreath(e,dx,dz,true);}if(e.bt<=0){e.st='run';e.brCd=rand(5.5,7.5);}}
   else if(e.st==='run'&&e.brCd<=0&&d<13&&!none){e.st='breath';e.bt=1.7;e.btk=0;voice(e,'atk');}
   else if(e.st==='run'&&e.slamCd<=0&&d<18&&d>5&&e.onG&&!none){e.st='jump';e.vy=11;e.onG=false;e.ldx=dx;e.ldz=dz;voice(e,'atk');}
   if(e.st==='jump'){vx=e.ldx*e.spd*1.9;vz=e.ldz*e.spd*1.9;if(e.landed){e.st='run';e.slamCd=rand(5,7);slam(e);}}
   if(e.sumCd<=0){e.sumCd=12;for(let i=0;i<3;i++){const a=i/3*TAU;const sx=gp.x+Math.cos(a)*5,sz=gp.z+Math.sin(a)*5;if(!insideObstacle(sx,sz,0.6))spawnEnemy('dog',clamp(sx,-A+2,A-2),clamp(sz,-A+2,A-2));}}
  }else if(e.type==='bossKrasue'){
   e.sumCd-=dt;if(e.ang===undefined){e.ang=Math.atan2(gp.z-pz,gp.x-px);e.dirSign=1;}e.ang+=dt*0.32*e.dirSign;
   if(e.st==='dive'){vx=dx*e.spd*2.4;vz=dz*e.spd*2.4;e.ty=py-0.4;if(e.t<=0||d<2){e.st='orbit';e.t=rand(2.4,3.2);e.dirSign*=-1;}}
   else{e.st='orbit';const Rr=15+Math.sin(performance.now()/1800)*3;const tx=px+Math.cos(e.ang)*Rr,tz=pz+Math.sin(e.ang)*Rr;vx=(tx-gp.x)*1.4;vz=(tz-gp.z)*1.4;const sp=Math.hypot(vx,vz),mx=e.spd*1.3;if(sp>mx){vx*=mx/sp;vz*=mx/sp;}
    e.ty=py+1.6+Math.sin(performance.now()/900)*0.7;
    if(e.t<=0&&!none){if(d<9&&Math.random()<0.4){e.st='dive';e.t=1.6;voice(e,'atk');}else{e.t=rand(2.3,3.1);const a0=Math.atan2(dz,dx);for(let k=-2;k<=2;k++){const a=a0+k*0.17;fireball(e,Math.cos(a),Math.sin(a),13,1.7,tg,true);}S.acid();voice(e,'atk');}}}
   if(e.sumCd<=0){e.sumCd=11;for(let i=0;i<2;i++){const k=spawnEnemy('krasue',clamp(gp.x+rand(-4,4),-A+2,A-2),clamp(gp.z+rand(-4,4),-A+2,A-2));k.y=e.y;}}
   e.y+=(e.ty-e.y)*Math.min(1,dt*1.5);
  }else if(e.type==='boss'){
   e.slamCd-=dt;e.sumCd-=dt;if(Math.random()<dt*14)fx(gp.x+rand(-2,2),gp.y+rand(0.5,4),gp.z+rand(-2,2),{color:pick([0xff4a10,0xff8a20]),s0:1,s1:0.2,life:0.8,vy:3});
   if(e.st==='run'&&e.slamCd<=0&&d<15&&e.onG){e.st='jump';e.vy=12;e.onG=false;}
   if(e.st==='jump'){vx*=0.5;vz*=0.5;if(e.landed){e.st='run';e.slamCd=rand(5,7);slam(e);}}
   if(e.sumCd<=0){e.sumCd=9;for(let i=0;i<5;i++){const a=i/5*TAU;const sx=gp.x+Math.cos(a)*5,sz=gp.z+Math.sin(a)*5;if(!insideObstacle(sx,sz,0.5))spawnEnemy('kitten',clamp(sx,-A+2,A-2),clamp(sz,-A+2,A-2));}voice(e,'atk');}
   if(e.t<=0&&d>10&&!none){e.t=3.2;for(let k=-2;k<=2;k++){const a=Math.atan2(dz,dx)+k*0.2;fireball(e,Math.cos(a),Math.sin(a),16,1.6,tg);}}
  }
  // climb after players standing on cover
  if(!e.C.fly&&!e.C.boss&&e.st==='run'&&e.onG&&e.stagger<=0&&!none&&py>e.y+0.6&&d<3.8){e.vy=Math.sqrt(2*24*(py-e.y+0.5));e.onG=false;}
  // vertical physics (stands on cover tops)
  e.landed=false;
  if(!e.C.fly){const gh=groundAt(gp.x,gp.z);if(e.y>gh+0.001||e.vy>0){e.vy-=24*dt;e.y+=e.vy*dt;e.onG=false;if(e.y<=gh&&e.vy<=0){e.y=gh;e.vy=0;e.landed=true;e.onG=true;}}else{e.y=gh;e.vy=0;e.onG=true;}}
  // steer around walls when stuck
  if(e.stuck>0.25&&!e.C.fly&&e.st==='run'){const sx=-dz*e.side,sz=dx*e.side;vx=vx*0.3+sx*e.spd;vz=vz*0.3+sz*e.spd;}
  if(e.slowT>0){vx*=0.65;vz*=0.65;}
  const ox=gp.x,oz=gp.z;
  gp.x+=(vx+e.knock.x)*dt;gp.z+=(vz+e.knock.z)*dt;const kd=Math.min(1,dt*7);e.knock.x-=e.knock.x*kd;e.knock.z-=e.knock.z*kd;
  const bumped=pushOut(gp,e.rad,e.y);
  const want=Math.hypot(vx,vz)*dt;if(bumped&&want>0.001&&Math.hypot(gp.x-ox,gp.z-oz)<want*0.35){e.stuck+=dt;if(e.stuck>2.5){e.side*=-1;e.stuck=0.3;}}else e.stuck=Math.max(0,e.stuck-dt*1.5);
  if(bumped&&e.st==='charge'){e.st='run';e.t=2;shake=Math.max(shake,0.15);}
  gp.y=e.y;
  if(e.st!=='leap'&&e.st!=='charge')e.g.rotation.y=Math.atan2(dx,dz);else e.g.rotation.y=Math.atan2(e.ldx,e.ldz);
  animCat(e,dt,Math.hypot(vx,vz));
  // attack whoever is in reach
  const reach=0.6*e.s+0.6,top=1.25*e.s+e.y;
  if(!none&&e.stagger<=0&&d<reach&&e.atkCd<=0&&py<top&&py>e.y-1.3&&(!e.C.fly||Math.abs(e.y-(py+0.9))<1.5)){
   e.atkCd=e.st==='charge'?1.5:1.1;e.lunge=1;const dv=e.st==='charge'?e.dmg*1.4:e.dmg;const ch=e.st==='charge';
   if(tg.local){hurt(dv,false,gp.x,gp.z);if(ch){P.pushV=(P.pushV||new THREE.Vector3()).set(e.ldx*16,0,e.ldz*16);P.vy=5;}}
   else NET.sendTo(tg.pid,{t:'hurt',d:dv,fx:gp.x,fz:gp.z});
   if(ch){e.st='run';e.t=3;}if(Math.random()<0.4)voice(e,'atk');}
 }}
// ---- remote player avatars ----
function makeAvatar(name,pid){const g=new THREE.Group();const col=new THREE.Color(pColor(pid));const shirt=new THREE.MeshStandardMaterial({color:col.clone().multiplyScalar(0.7),roughness:0.8}),pants=std(0x24305a),hair=std(0x140808),sk=std(0xd99a6a,{roughness:0.7});
 const legs=[];for(const sx of [-0.13,0.13]){const p=new THREE.Group();p.position.set(sx,0.85,0);g.add(p);part(GEO.box,pants,0.2,0.85,0.22,0,-0.42,0,p);legs.push(p);}
 part(GEO.box,shirt,0.56,0.72,0.32,0,1.22,0,g);
 const head=new THREE.Group();head.position.set(0,1.78,0);g.add(head);part(GEO.box,sk,0.36,0.38,0.36,0,0,0,head);part(GEO.box,hair,0.4,0.14,0.4,0,0.2,0.02,head);
 for(let i=-1;i<=1;i++)part(GEO.cone4,hair,0.07,0.16,0.07,i*0.12,0.33,0,head);part(GEO.box,bas(0x111111),0.06,0.06,0.02,-0.08,0.02,-0.185,head);part(GEO.box,bas(0x111111),0.06,0.06,0.02,0.08,0.02,-0.185,head);
 const arm=new THREE.Group();arm.position.set(0.3,1.45,0);g.add(arm);part(GEO.box,shirt,0.16,0.16,0.5,0,0,-0.2,arm);part(GEO.box,std(0x15161a,{metalness:0.8,roughness:0.3}),0.1,0.12,0.7,0,0.06,-0.6,arm);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:col,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.3}));glow.scale.setScalar(2.6);glow.position.y=1;g.add(glow);
 const c=document.createElement('canvas');c.width=256;c.height=72;const ctx=c.getContext('2d');const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
 const lbl=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));lbl.scale.set(2.2,0.62,1);lbl.position.y=2.55;lbl.renderOrder=20;g.add(lbl);
 scene.add(g);return {g,legs,head,arm,ctx,tex,lastKey:'',phase:0};}
function removeAvatar(m){if(m&&m.av){scene.remove(m.av.g);m.av=null;}}
function removeAvatars(){for(const m of MATES.values())removeAvatar(m);for(const g of fbVis)g.visible=false;}
function updateAvatar(dt){if(!NET.mode)return;for(const m of MATES.values()){if(!m.on)continue;if(!m.av)m.av=makeAvatar(m.name,m.pid);const av=m.av,g=av.g;
 const k=Math.min(1,dt*14);const ox=m.x,oz=m.z;m.x+=(m.tx-m.x)*k;m.y+=(m.ty-m.y)*k;m.z+=(m.tz-m.z)*k;
 g.position.set(m.x,m.y,m.z);g.rotation.y=m.yaw;av.head.rotation.x=m.pitch*0.6;av.arm.rotation.x=m.pitch;
 const sp=Math.hypot(m.x-ox,m.z-oz)/Math.max(dt,1e-4);av.phase+=dt*sp*1.8;av.legs.forEach((l,i)=>l.rotation.x=Math.sin(av.phase+(i?Math.PI:0))*0.6);
 g.rotation.x=m.down?-Math.PI/2*0.9:0;if(m.down)g.position.y=m.y+0.25;
 const key=m.name+'|'+m.hp+'|'+m.down+'|'+Math.round(m.rev*10);if(key!==av.lastKey){av.lastKey=key;const c=av.ctx;c.clearRect(0,0,256,72);c.font='bold 30px Itim, sans-serif';c.textAlign='center';c.lineWidth=6;c.strokeStyle='#000';c.strokeText(m.name,128,30);c.fillStyle=m.down?'#ff5a5a':pColor(m.pid);c.fillText(m.name,128,30);
  c.fillStyle='rgba(0,0,0,.7)';c.fillRect(28,44,200,14);c.fillStyle=m.down?'#ff3a3a':pColor(m.pid);c.fillRect(30,46,196*clamp(m.hp/(m.mh||100),0,1),10);av.tex.needsUpdate=true;}}}
function remoteShot(m){const a=new THREE.Vector3(m.a[0],m.a[1],m.a[2]);const dist=P?a.distanceTo(P.pos):0;const vol=clamp(1-dist/90,0.12,0.75);
 if(m.g==='fl'){const e=m.e[0];const dir=new THREE.Vector3(e[0]-a.x,e[1]-a.y,e[2]-a.z).normalize();for(let i=0;i<6;i++){const sp=rand(11,16);fx(a.x,a.y,a.z,{color:pick([0xff7a20,0xffb040,0xff4a10]),s0:0.25,s1:2,life:0.45,vx:dir.x*sp+rand(-1,1),vy:dir.y*sp+rand(-0.5,1.5),vz:dir.z*sp+rand(-1,1)});}return;}
 for(const e of m.e){const b=new THREE.Vector3(e[0],e[1],e[2]);tracer(a,b,m.g==='bar'?0xcff4ff:0xffd090,m.g==='bar'?0.05:0.025,m.g==='bar'?0.22:0.06);}
 fx(a.x,a.y,a.z,{color:0xffc070,s0:0.6,s1:0.1,life:0.07});
 if(P)S.gun(m.g,vol);}
// ---- radar & co-op HUD ----
const rctx=$('#radar').getContext('2d');let radarT=0;
function drawRadar(){radarT+=1;if(radarT%2)return;const c=rctx,W=150,H=150,cx=75,cy=75,Rr=72,sc=Rr/45;c.clearRect(0,0,W,H);
 c.fillStyle='rgba(20,6,6,.72)';c.beginPath();c.arc(cx,cy,Rr,0,TAU);c.fill();c.strokeStyle='rgba(255,120,80,.25)';c.lineWidth=1;for(const r of [Rr/3,Rr*2/3,Rr]){c.beginPath();c.arc(cx,cy,r,0,TAU);c.stroke();}
 c.beginPath();c.moveTo(cx,cy-Rr);c.lineTo(cx,cy+Rr);c.moveTo(cx-Rr,cy);c.lineTo(cx+Rr,cy);c.stroke();
 const cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);const toR=(x,z)=>{const dx=x-P.pos.x,dz=z-P.pos.z;const lx=dx*cs-dz*sn,ly=-dx*sn-dz*cs;return [cx+lx*sc,cy-ly*sc,Math.hypot(lx,ly)];};
 c.save();c.beginPath();c.arc(cx,cy,Rr-1,0,TAU);c.clip();
 for(const o of obstacles){if(o.h<4)continue;const [x,y]=toR(o.x,o.z);c.fillStyle='rgba(120,90,80,.35)';c.save();c.translate(x,y);c.rotate(-P.yaw);c.fillRect(-o.hw*sc,-o.hd*sc,o.hw*2*sc,o.hd*2*sc);c.restore();}
 for(const e of enemies){if(e.dead)continue;let [x,y,dd]=toR(e.g.position.x,e.g.position.z);if(dd>48){if(!hlOn)continue;const a=Math.atan2(y-cy,x-cx);x=cx+Math.cos(a)*(Rr-4);y=cy+Math.sin(a)*(Rr-4);}c.fillStyle=e.C.boss?'#ff7a1a':e.C.fly?'#ff5ad0':e.stagger>0?'#ffd166':'#ff2a2a';c.beginPath();c.arc(x,y,e.C.boss?5:e.C.fly?2.5:3,0,TAU);c.fill();}
 c.restore();
 if(NET.mode)for(const m of MATES.values()){if(!m.on)continue;let [x,y,dd]=toR(m.x,m.z);if(dd*sc>Rr-5){const a=Math.atan2(y-cy,x-cx);x=cx+Math.cos(a)*(Rr-5);y=cy+Math.sin(a)*(Rr-5);}c.fillStyle=m.down?'#ff3a3a':pColor(m.pid);c.beginPath();c.arc(x,y,4.5,0,TAU);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();}
 c.fillStyle='#f1e3cf';c.beginPath();c.moveTo(cx,cy-7);c.lineTo(cx-5,cy+5);c.lineTo(cx+5,cy+5);c.closePath();c.fill();}
let matesKey='';
function coopHud(){const list=NET.mode?[...MATES.values()].filter(m=>m.on):[];$('#mates').hidden=!list.length;$('#downMsg').hidden=!P.down;
 if(list.length){const key=list.map(m=>m.pid+m.name+Math.round(m.hp)+m.mh+m.down).join('|');if(key!==matesKey){matesKey=key;
  $('#mates').innerHTML=list.map(m=>`<div class="m"><span style="color:${pColor(m.pid)}">${esc(m.name)}</span><div class="bar"><i style="width:${clamp(m.hp/(m.mh||100),0,1)*100}%;background:${m.down?'#ff3a3a':pColor(m.pid)}"></i></div>${m.down?'<span class="st">ล้ม! ไปยืนข้างๆ เพื่อช่วย</span>':''}</div>`).join('');}}
 let near=null;if(!P.down)for(const m of list)if(m.down&&Math.hypot(m.x-P.pos.x,m.z-P.pos.z)<2.8){near=m;break;}
 $('#revive').hidden=!near;if(near)setT('#revive','กำลังช่วย '+esc(near.name)+' '+Math.round(clamp(near.rev/3,0,1)*100)+'%');
 if(P.down&&P.revT>0)setT('#downMsg','ล้มแล้ว!<small>เพื่อนกำลังช่วย '+Math.round(P.revT/3*100)+'%</small>');else if(P.down)setT('#downMsg','ล้มแล้ว!<small>ให้เพื่อนมายืนข้างๆ 3 วินาทีเพื่อช่วยลุก</small>');}
function dmgDir(x,z){const dx=x-P.pos.x,dz=z-P.pos.z;if(Math.hypot(dx,dz)<0.3)return;const cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);const lx=dx*cs-dz*sn,ly=-dx*sn-dz*cs;const ang=Math.atan2(lx,ly);
 const i=document.createElement('i');i.style.transform=`rotate(${ang}rad)`;$('#dmgdir').appendChild(i);setTimeout(()=>i.remove(),900);}
// lobby
$('#coopBtn').onclick=openCoop;
$('#hostBtn').onclick=()=>netHost();$('#joinBtn').onclick=()=>netJoin();
$('#localTest').onclick=()=>{NET.local=!NET.local;$('#localTest').textContent=NET.local?'โหมดทดสอบ: เปิด (กดเพื่อกลับไปออนไลน์จริง)':'โหมดทดสอบหลายแท็บในเครื่องเดียว';
 if(DIR.browse){try{DIR.browse.destroy();}catch(e){}DIR.browse=null;}if(DIR.peer){try{DIR.peer.destroy();}catch(e){}DIR.peer=null;}DIR.isDir=false;DIR.conn=null;DIR.becoming=false;
 if(NET.mode)netClose();showEntry(NET.local?'โหมดทดสอบ: เปิดเกมนี้หลายแท็บ แล้วสร้างห้อง/เข้าห้องได้เหมือนออนไลน์':'');};
$('#coopStart').onclick=()=>{if(NET.mode!=='host')return;if([...MATES.values()].some(m=>!m.ready))return;NET.started=true;dirSendReg();NET.send({t:'start'});startGame();};
$('#readyBtn').onclick=()=>{if(NET.mode!=='client'||!NET.joined)return;NET.ready=!NET.ready;NET.send({t:'lrdy',v:NET.ready?1:0});renderRoom();S.pick(NET.ready?900:600);};
$('#leaveBtn').onclick=()=>{if(NET.mode){NET.send({t:'bye'});netClose();}showEntry('ออกจากห้องแล้ว');};
$('#coopBack').onclick=()=>{if(NET.mode){NET.send({t:'bye'});netClose();}showMenu();};
$('#roomsRefresh').onclick=()=>{$('#roomList').innerHTML='<p class="hint">กำลังหาห้อง…</p>';dirRefresh();};
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();sendChat($('#chatIn').value);$('#chatIn').value='';});
$('#chatBar').addEventListener('submit',e=>{e.preventDefault();sendChat($('#chatBarIn').value);$('#chatBarIn').value='';$('#chatBar').hidden=true;lock();});
$('#chatBarIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){$('#chatBar').hidden=true;}});
['#chatIn','#roomTitle','#coopName'].forEach(id=>$(id).addEventListener('keydown',e=>e.stopPropagation()));
$('#copyLink').onclick=()=>{const t=inviteLink(NET.code);const ok=()=>netStatus('คัดลอกลิงก์แล้ว ส่งให้เพื่อนทางแชตได้เลย เพื่อนกดลิงก์แล้วกด "เข้าร่วม"');if(navigator.clipboard)navigator.clipboard.writeText(t).then(ok,()=>prompt('คัดลอกลิงก์นี้',t));else prompt('คัดลอกลิงก์นี้',t);};
$('#copyCode').onclick=()=>{const t=NET.code;if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>netStatus('คัดลอกรหัส '+t+' แล้ว'),()=>{});};
$('#joinCode').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')netJoin();});
addEventListener('pagehide',()=>{if(NET.mode)NET.send({t:'bye'});});

/* ======================= LOOP ======================= */
let menuT=0;const menuCats=[];
function menuScene(dt){menuT+=dt;
 if(!menuCats.length){[['tabby',-4.2,-7.5],['siamese',-1.8,-8.6],['black',0.6,-7.8],['khao',3.0,-8.8],['korat',5.6,-8.2],['persian',-6.8,-9.6],['boss',2.2,-17]].forEach(([t,x,z],i)=>{const m=makeCat(t);m.g.position.set(x,0,z);m.g.rotation.y=Math.atan2(-x*0.3,8);scene.add(m.g);m.menuI=i;menuCats.push(m);});}
 camera.position.set(Math.sin(menuT*0.15)*1.2,1.25,1.5);camera.rotation.set(0.02,Math.sin(menuT*0.1)*0.1,0);camera.fov=58;camera.updateProjectionMatrix();vm.visible=false;
 menuCats.forEach((m,i)=>{m.anim(dt,{speed:0,t:menuT+i*1.7,scale:m.inner.scale.x,crouch:m===menuCats[2]&&Math.sin(menuT*0.7)>0.6});m.g.rotation.y=Math.atan2(-m.g.position.x*0.3,8)+Math.sin(menuT*0.4+i)*0.25;});}
function clearMenuCats(){menuCats.forEach(m=>disposeCat(m));menuCats.length=0;}
let splatAcc=0;
function frame(now){const dt=Math.min(0.05,(now-lastTime)/1000);lastTime=now;
 ambient(dt,now);
 if(state==='menu'||(state==='over'&&!P)){menuScene(dt);}
 else{vm.visible=!window.__noVm;if(state==='play'||(state==='paused'&&NET.mode)){if(!window.__noUpd)update(dt);}else if(state==='over'||state==='upgrade'||state==='paused'||state==='wait'){updateFxAndGore(state==='paused'?0:dt*0.5);updateAvatar(dt);}if(P&&!window.__noHud)updateHud();}
 splatAcc+=dt;if(splatAcc>0.04||scrSplats.length===0){drawSplats(splatAcc);splatAcc=0;}
 if(window.__noRender){}else if(window.__noPost)renderer.render(scene,camera);else post.render(dt);
 requestAnimationFrame(frame);}
setMusic(save.music);applyQuality();W.bakeEnv();showMenu();$('#loading').hidden=true;requestAnimationFrame(frame);
if(/[?&]dbg/.test(location.search))window.__dbg={get P(){return P},get enemies(){return enemies},spawnEnemy,camera,scene,renderer,startGame,get state(){return state},set state(v){state=v},get wave(){return wave},set queue(v){queue=v},set firing(v){firing=v},get kills(){return kills},get queue(){return queue},get spawnT(){return spawnT},get timeScale(){return timeScale},hitE,W,GUNS,switchGun,useAbility,triggerZed,melee,CHARS,save,rec,newRun,get zedT(){return zedT},get timeScaleV(){return timeScale},startReload,openUpgrade,pickUp,rec,get upOpts(){return upOpts},get coinsRun(){return coinsRun},set coinsRun(v){coinsRun=v},get projs(){return projs},get eprojs(){return eprojs},get pools(){return pools},get post(){return post},get NET(){return NET},get DIR(){return DIR},get MATES(){return MATES},tick(n,dt=1/60){for(let i=0;i<n;i++){if(window.__forcePlay&&state!=='play'){hideAll();state='play';}ambient(dt,performance.now());if(state==='play')update(dt);}if(P)updateHud();return [state,wave,enemies.filter(e=>!e.dead).length,queue.length];},snap(){if(window.__noPost)renderer.render(scene,camera);else post.render(0.016);return renderer.domElement.toDataURL('image/jpeg',0.85);}};
if(/[?&]mock/.test(location.search))NET.local=true;
(()=>{const m=/[#&]r=([A-Z0-9]{4,6})/i.exec(location.hash);if(!m)return;openCoop();$('#joinCode').value=m[1].toUpperCase();netStatus('เพื่อนชวนเข้าห้อง '+m[1].toUpperCase()+' ใส่ชื่อแล้วกด "เข้าร่วม" ได้เลย');try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}})();
