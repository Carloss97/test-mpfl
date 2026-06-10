/**
 * Emociones Básicas v4 — Balanceado
 *
 * Cambios:
 *  - Boost moderado 1.25x (compensa subestimación de MediaPipe sin exagerar)
 *  - Neutral es el default fuerte (1 - suma de emociones)
 *  - Cada emoción escala linealmente con sus AUs
 *  - Sin multipliers rotos ni requisitos de "N+ AUs activas"
 *  - Baseline subtraction: resta el 70% del valor de calibración
 */

function clamp(v, l=0,h=1){return Math.min(h,Math.max(l,Number.isFinite(v)?v:l))}
function round(v,d=4){if(!Number.isFinite(v))return 0;const f=10**d;return Math.round(v*f)/f}

let auBaseline={};
export function setEmotionBaseline(aus={}){auBaseline={};for(const[c,a]of Object.entries(aus))auBaseline[c]=a?.intensity??a??0}
export function clearEmotionBaseline(){auBaseline={}}

function auVal(aus,code){
  const raw=aus?.[code]?.intensity??0;
  const base=auBaseline[code]??0;
  const net=Math.max(0,raw-base*0.7);
  return clamp(net*1.25);
}

export function classifyBasicEmotions(auScores={}){
  const a1=auVal(auScores,'AU1'), a2=auVal(auScores,'AU2'), a4=auVal(auScores,'AU4');
  const a5=auVal(auScores,'AU5'), a6=auVal(auScores,'AU6'), a7=auVal(auScores,'AU7');
  const a9=auVal(auScores,'AU9'), a12=auVal(auScores,'AU12'), a15=auVal(auScores,'AU15');
  const a17=auVal(auScores,'AU17'), a20=auVal(auScores,'AU20'), a23=auVal(auScores,'AU23');
  const a26=auVal(auScores,'AU26');
  const l12=auVal(auScores,'AU_L12'),r12=auVal(auScores,'AU_R12');
  const l14=auVal(auScores,'AU_L14'),r14=auVal(auScores,'AU_R14');

  // Happiness: AU6 + AU12
  const hap=clamp((a6+a12)/2);
  // Sadness: AU1 + AU4 + AU15
  const sad=clamp((a1+a4+a15)/3);
  // Surprise: AU1+2+5+26
  const sur=clamp((a1+a2+a5+a26)/4);
  // Fear: AU1+2+4+5+7+20+26
  const fea=clamp((a1+a2+a4+a5+a7+a20+a26)/7);
  // Anger: AU4+5+7+23
  const ang=clamp((a4+a5+a7+a23)/4);
  // Disgust: AU9+15+17
  const dis=clamp((a9+a15+a17)/3);
  // Contempt: unilateral AU12 or AU14
  const con=clamp(Math.max(Math.abs(l12-r12),Math.abs(l14-r14)));

  const all=hap+sad+sur+fea+ang+dis+con;
  const neu=clamp(1-all);

  const scores={happiness:hap,sadness:sad,surprise:sur,fear:fea,anger:ang,disgust:dis,contempt:con,neutral:neu};
  const sorted=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const [domName,domScore]=sorted[0];
  const runnerScore=sorted[1]?.[1]??0;
  const margin=domScore-runnerScore;
  const conf=clamp(domName==='neutral'?neu*0.9:domScore*0.7+margin*0.3);

  return{
    probabilities:Object.fromEntries(sorted.map(([k,v])=>[k,round(v)])),
    dominant:domName,dominantScore:round(domScore),confidence:round(conf),
  };
}