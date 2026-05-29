// ── Storage ───────────────────────────────────────────────
const SK='household_v1';
function loadSt(){try{const r=localStorage.getItem(SK);if(r)return JSON.parse(r);}catch(e){}return null;}
function saveSt(){try{localStorage.setItem(SK,JSON.stringify(st));}catch(e){}}

let st=loadSt()||{paidItems:{},extraIncome:{},livingOverride:{},earlyMoves:{},debtStrategy:'avalanche',debtPayments:{}};
['paidItems','extraIncome','livingOverride','earlyMoves','debtPayments'].forEach(k=>{if(!st[k])st[k]={};});
if(!st.debtStrategy)st.debtStrategy='avalanche';

// ── Household income sources ──────────────────────────────
// Spouse 1: biweekly every other Thursday starting 6/11/2025
// Husband: semi-monthly on 7th and 21st of each month

// ── Bills ────────────────────────────────────────────────
const BILLS=[
  {id:'b0', name:'Car Ins. (Spouse 1)',    day:1,  amt:132.00,  type:'other'},
  {id:'b1', name:'House',              day:1,  amt:2174.45, type:'loan'},
  {id:'b2', name:'Kids Insurance',     day:1,  amt:50.00,   type:'other'},
  {id:'b3', name:'Car Insurance',      day:1,  amt:228.00,  type:'other'},
  {id:'b4', name:'Rental Insurance',   day:1,  amt:140.00,  type:'other'},
  {id:'b5', name:'Capital One',        day:7,  amt:240.00,  type:'cc'},
  {id:'b6', name:'Ideateck (Internet)',day:10, amt:92.95,   type:'sub'},
  {id:'b7', name:'Chase',              day:14, amt:150.00,  type:'cc'},
  {id:'b8', name:'Water',              day:15, amt:200.00,  type:'other'},
  {id:'b9', name:'YMCA',               day:16, amt:59.50,   type:'sub'},
  {id:'b10',name:'Phone',              day:20, amt:120.00,  type:'other'},
  {id:'b11',name:'Electric',           day:21, amt:20.00,   type:'other'},
  {id:'b12',name:'Braces',             day:22, amt:127.00,  type:'other'},
  {id:'b13',name:'Car Pmt (Spouse 1)',     day:22, amt:180.00,  type:'loan'},
  {id:'b14',name:'Solar',              day:22, amt:309.49,  type:'other'},
  {id:'b15',name:'Capital One 2',      day:27, amt:185.00,  type:'cc'},
  {id:'b16',name:'Car Payment',        day:28, amt:375.00,  type:'loan'},
  {id:'b17',name:'Kansas Gas',         day:30, amt:40.00,   type:'other'},
];

// Default living expenses per biweekly period
const DEF_LIVING={groceries:250,eating_out:100,gas:125};

// Credit cards
const CC_DEBTS=[
  {id:'cc0',name:'Capital One',   balance:6800,apr:28,min:240,dueDay:7},
  {id:'cc1',name:'Capital One 2', balance:5100,apr:28,min:185,dueDay:27},
  {id:'cc2',name:'Chase',         balance:3000,apr:28,min:150,dueDay:14},
];

// ── Period generation ─────────────────────────────────────
function mkPeriods(){
  const events=[];
  const endDate=new Date(2027,11,31);

  // Spouse 1 biweekly starting 6/11/2025 (Thursday)
  let ed=new Date(2025,5,11);
  while(ed<=endDate){
    events.push({date:new Date(ed),income:1000,source:'Spouse 1',color:'pk'});
    ed.setDate(ed.getDate()+14);
  }
  // Husband: 7th and 21st each month from June 2025
  for(let y=2025;y<=2027;y++){
    const startM=y===2025?5:0;
    for(let m=startM;m<12;m++){
      const d7=new Date(y,m,7),d21=new Date(y,m,21);
      if(d7>=new Date(2025,5,7)&&d7<=endDate)events.push({date:d7,income:1790,source:'Husband',color:'bl'});
      if(d21<=endDate)events.push({date:d21,income:1790,source:'Husband',color:'bl'});
    }
  }
  events.sort((a,b)=>a.date-b.date);

  // Build periods: each event covers from pay date to day before next pay date
  const periods=[];
  events.forEach((ev,i)=>{
    const nextDate=i<events.length-1?new Date(events[i+1].date):new Date(endDate);
    nextDate.setDate(nextDate.getDate()-1);
    periods.push({
      s:new Date(ev.date),
      e:new Date(nextDate),
      income:ev.income,
      source:ev.source,
      color:ev.color,
    });
  });
  return periods;
}

const PERIODS=mkPeriods();

// ── Helpers ───────────────────────────────────────────────
function fD(d){return(d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2);}
function fM(d){return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getDate();}
function $f(n){return'$'+Math.abs(n).toFixed(2);}
function $0(n){return'$'+Math.abs(n).toFixed(0);}
function tl(t){return{loan:'Loan',cc:'Credit',sub:'Sub',other:'Bill'}[t]||'Bill';}
function bCls(b){return b>100?'pos':b>=0?'tight':'neg';}
function dCls(b){return b>100?'g':b>=0?'a':'r';}
function cbS(){return'<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
function curPi(){const now=new Date();let r=0;PERIODS.forEach((p,i)=>{if(now>=p.s&&now<=p.e)r=i;});return r;}

function getBillsInPeriod(pi){
  const p=PERIODS[pi];const bills=[];
  let d=new Date(p.s);
  while(d<=p.e){
    const day=d.getDate(),mo=d.getMonth(),yr=d.getFullYear();
    // Handle day 30 for months with fewer days (Kansas Gas)
    BILLS.forEach(b=>{
      let dueDay=b.day;
      const daysInMonth=new Date(yr,mo+1,0).getDate();
      if(dueDay>daysInMonth)dueDay=daysInMonth;
      if(dueDay===day){
        const uid=b.id+'_'+yr+'_'+mo;
        bills.push({...b,dd:new Date(d),uid});
      }
    });
    d.setDate(d.getDate()+1);
  }
  return bills.sort((a,b)=>a.dd-b.dd);
}

function getLiving(pi){
  const ov=st.livingOverride[pi];
  if(ov&&Object.keys(ov).some(k=>ov[k]>0))return Object.values(ov).reduce((s,v)=>s+(parseFloat(v)||0),0);
  // Only apply living defaults to Spouse 1 checks (biweekly)
  if(PERIODS[pi]&&PERIODS[pi].source==='Spouse 1')return Object.values(DEF_LIVING).reduce((s,v)=>s+v,0);
  return 0;
}

function calcP(pi){
  const bills=getBillsInPeriod(pi);
  let billTotal=0,incoming=0;
  bills.forEach(it=>{if(st.earlyMoves[it.uid+'_'+pi]===undefined)billTotal+=it.amt;});
  Object.keys(st.earlyMoves).forEach(k=>{
    if(st.earlyMoves[k]===pi){
      const from=parseInt(k.split('_').slice(-1)[0]);
      if(from!==pi){const fb=getBillsInPeriod(from),uid=k.split('_').slice(0,-1).join('_'),f=fb.find(x=>x.uid===uid);if(f)incoming+=f.amt;}
    }
  });
  const extra=parseFloat(st.extraIncome[pi]||0)||0;
  const living=getLiving(pi);
  const income=(PERIODS[pi]?PERIODS[pi].income:0)+extra;
  const total=billTotal+incoming+living;
  const bal=income-total;
  const pc=bills.filter(b=>st.paidItems[b.uid+'_'+pi]).length;
  return{billTotal,incoming,living,total,income,bal,extra,pc,tc:bills.length};
}

// ── Card builder ──────────────────────────────────────────
let openP={},openIS={};
function togP(i){openP[i]=!openP[i];const b=document.getElementById('pb'+i),c=document.getElementById('ch'+i);if(b)b.classList.toggle('open',!!openP[i]);if(c)c.classList.toggle('open',!!openP[i]);}
function togIS(pi,s){const k=pi+'_'+s;openIS[k]=!openIS[k];rRC(pi);}
function togPaid(uid,pi){const k=uid+'_'+pi;st.paidItems[k]=!st.paidItems[k];saveSt();rRC(pi);}
function updExtra(pi,v){st.extraIncome[pi]=parseFloat(v)||0;saveSt();rRC(pi);}
function moveEarly(uid,from,to){
  const k=uid+'_'+from;if(st.earlyMoves[k]!==undefined)delete st.earlyMoves[k];else st.earlyMoves[k]=to;
  saveSt();const snap=Object.assign({},openP);render();
  Object.keys(snap).forEach(i=>{if(snap[i]){const b=document.getElementById('pb'+i),c=document.getElementById('ch'+i);if(b)b.classList.add('open');if(c)c.classList.add('open');}});
}
function rRC(pi){const el=document.getElementById('pc'+pi);if(el)el.outerHTML=buildCard(pi);}

function buildCard(pi){
  if(!PERIODS[pi])return'';
  const p=PERIODS[pi],{billTotal,incoming,living,total,income,bal,extra,pc,tc}=calcP(pi);
  const bills=getBillsInPeriod(pi);
  const isOpen=!!openP[pi],incOpen=!!openIS[pi+'_inc'];
  const hasPaid=pc>0,allPaid=pc===tc&&tc>0,isCur=pi===curPi();
  const cardCls=bal>100?'surplus-card':bal<0?'deficit-card':'tight-card';

  let h=`<div class="card ${cardCls}" id="pc${pi}">
    <div class="phdr" onclick="togP(${pi})">
      <div class="dot ${dCls(bal)}"></div>
      <div class="pi">
        <div class="pt">Pay ${fD(p.s)}<span class="src-badge src-${p.color}">${p.source}</span>${isCur?'<span style="font-size:9px;background:var(--ac);color:#fff;font-family:monospace;padding:1px 5px;border-radius:3px;margin-left:3px">NOW</span>':''}</div>
        <div class="pd">${fM(p.s)}–${fM(p.e)}
          ${hasPaid?`<span style="font-size:10px;padding:1px 4px;border-radius:3px;background:${allPaid?'var(--gnd)':'var(--s3)'};color:${allPaid?'var(--gn)':'var(--t3)'};font-family:monospace">${allPaid?'✓ all':pc+'/'+tc}</span>`:''}
        </div>
      </div>
      <div class="pm"><div class="pb ${bCls(bal)}">${bal>=0?'+':'-'}${$f(bal)}</div><div class="pdue">${$f(income)} income</div></div>
      <svg class="chv ${isOpen?'open':''}" id="ch${pi}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="pbody ${isOpen?'open':''}" id="pb${pi}">
      <div class="sgrid">
        <div class="scell"><div class="slbl">income</div><div class="sval">${$f(income)}</div></div>
        <div class="scell"><div class="slbl">bills out</div><div class="sval">${$f(total)}</div></div>
        <div class="scell"><div class="slbl">${bal>=0?'left over':'deficit'}</div><div class="sval ${bCls(bal)}">${bal>=0?'+':'-'}${$f(bal)}</div></div>
      </div>`;

  // Extra income toggle
  h+=`<div style="border-bottom:.5px solid var(--b)">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;cursor:pointer;background:var(--s2)" onclick="togIS(${pi},'inc')">
      <span style="font-size:11px;font-weight:500;color:var(--t2);font-family:monospace;text-transform:uppercase;letter-spacing:.4px">💰 Extra income</span>
      <span style="font-family:monospace;font-size:11px;color:${extra>0?'var(--am)':'var(--t3)'}">${extra>0?'+'+$f(extra):'none'}</span>
    </div>
    <div style="${incOpen?'':'display:none'}">
      <div style="display:flex;align-items:center;gap:9px;padding:8px 14px 8px 18px;border-top:.5px solid var(--b);background:var(--s)">
        <span style="font-size:14px">💵</span>
        <div style="font-size:12px;color:var(--t2);flex:1">Overtime / side income<span style="display:block;font-size:10px;color:var(--t3)">this check only</span></div>
        <div class="iwrap"><span class="idollar">$</span><input class="finp" type="number" inputmode="decimal" placeholder="0.00" value="${extra>0?extra:''}" onchange="updExtra(${pi},this.value)" oninput="updExtra(${pi},this.value)"></div>
      </div>
    </div>
  </div>`;

  // Progress bar
  const pct=Math.min(100,income>0?(total/income)*100:0),pc2=bal>100?'var(--gn)':bal>=0?'var(--am)':'var(--rd)';
  h+=`<div class="pwrap"><div class="pmeta"><span>bills ${$f(billTotal+incoming)}${living>0?' · living '+$f(living):''}</span><span>${Math.round(pct)}%</span></div><div class="ptrack"><div class="pfill" style="width:${pct.toFixed(1)}%;background:${pc2}"></div></div></div>`;

  // Moved-in items
  const movedIn=[];Object.keys(st.earlyMoves).forEach(k=>{if(st.earlyMoves[k]===pi){const from=parseInt(k.split('_').slice(-1)[0]);if(from!==pi){const fb=getBillsInPeriod(from),uid=k.split('_').slice(0,-1).join('_'),f=fb.find(x=>x.uid===uid);if(f)movedIn.push({...f,from});}}});
  if(movedIn.length){
    h+=`<div class="slbl2">paid early ↑</div>`;
    movedIn.forEach(it=>{const ip=!!st.paidItems[it.uid+'_'+it.from+'_mi'];
      h+=`<div class="irow2 ${ip?'paid':''}"><div class="cbw" onclick="togPaidMI('${it.uid}',${it.from},${pi})"><div class="cb ${ip?'chk':''}">${cbS()}</div></div><span class="idate">${it.dd.getMonth()+1}/${it.dd.getDate()}</span><span class="iname">${it.name}</span><span class="badge t-${it.type}">${tl(it.type)}</span><span style="font-size:10px;color:var(--am);font-family:monospace;background:var(--amd);border-radius:3px;padding:1px 4px;flex-shrink:0">early</span><span class="iamt">${$f(it.amt)}</span><button style="font-size:11px;background:var(--amd);border:.5px solid rgba(240,168,67,.3);border-radius:4px;padding:2px 6px;cursor:pointer;color:var(--am);white-space:nowrap;font-family:monospace;flex-shrink:0" onclick="moveEarly('${it.uid}',${it.from},${pi})">undo</button></div>`;
    });
  }

  // Bills due
  if(bills.length){
    const bpc=bills.filter(it=>st.paidItems[it.uid+'_'+pi]).length;
    h+=`<div class="slbl2">bills due<span style="font-size:10px;color:${bpc===bills.length?'var(--gn)':'var(--t3)'};font-family:monospace">${bpc}/${bills.length} paid</span></div>`;
    bills.forEach(it=>{const k3=it.uid+'_'+pi,isMoved=st.earlyMoves[k3]!==undefined,isPaid=!!st.paidItems[k3];
      h+=`<div class="irow2 ${isPaid?'paid':''}" style="${isMoved?'opacity:.35':''}"><div class="cbw" onclick="togPaid('${it.uid}',${pi})"><div class="cb ${isPaid?'chk':''}">${cbS()}</div></div><span class="idate">${it.dd.getMonth()+1}/${it.dd.getDate()}</span><span class="iname">${it.name}</span><span class="badge t-${it.type}">${tl(it.type)}</span><span class="iamt">${$f(it.amt)}</span>${pi>0?`<button style="font-size:11px;background:var(--s3);border:.5px solid var(--b2);border-radius:4px;padding:2px 6px;cursor:pointer;color:var(--t2);white-space:nowrap;font-family:monospace;flex-shrink:0" onclick="moveEarly('${it.uid}',${pi},${pi-1})">${isMoved?'undo':'↑'}</button>`:''}</div>`;
    });
  }

  // Living expenses note for Spouse 1 checks
  if(living>0){
    h+=`<div style="padding:8px 14px;border-top:.5px solid var(--b);background:var(--s2)">
      <div style="font-size:11px;color:var(--t3);font-family:monospace">🛒 Groceries $250 · 🍔 Eating out $100 · ⛽ Gas $125 = ${$f(living)} reserved</div>
    </div>`;
  }

  return h+'</div></div>';
}

function togPaidMI(uid,from,to){const k=uid+'_'+from+'_mi';st.paidItems[k]=!st.paidItems[k];saveSt();if(to!==undefined)rRC(to);}

// ── Checks tab ────────────────────────────────────────────
let activeTab='checks';
function T(t){
  activeTab=t;
  document.querySelectorAll('.tab').forEach((el,i)=>{el.classList.toggle('active',['checks','overview','debt','stats','setup'][i]===t);});
  render();
}

function renderChecks(){
  // Alert about the 6/25 and similar checks
  let h=`<div class="info-box amber"><div class="ib-title a">⚠ Some checks look negative — here's why</div><div class="ib-body">The five 1st-of-month bills (House, both car insurance payments, kids insurance, rental insurance = $2,724) fall near the end of each month. The check before the 7th covers them but the next husband's check on the 7th immediately follows. Use ↑ to move bills to the next check when the window is tight.</div></div>`;
  const cp=curPi(),order=[cp];for(let i=cp+1;i<PERIODS.length;i++)order.push(i);for(let i=cp-1;i>=0;i--)order.push(i);
  order.forEach(i=>{h+=buildCard(i);});
  return h;
}

// ── Overview ──────────────────────────────────────────────
function renderOverview(){
  let h='',yr=null;
  PERIODS.forEach((p,i)=>{
    const y=p.s.getFullYear();
    if(y!==yr){yr=y;h+=`<div class="yrhdr">${y}</div><div class="sec"><table class="otbl"><thead><tr><th>Pay date</th><th>Source</th><th>Income</th><th>Bills</th><th>Left</th></tr></thead><tbody>`;}
    const{total,income,bal}=calcP(i);
    h+=`<tr><td><span class="odate">${fD(p.s)}</span></td><td><span class="src-badge src-${p.color}" style="font-size:11px">${p.source}</span></td><td>${$f(income)}</td><td>${$f(total)}</td><td class="obal ${bCls(bal)}">${bal>=0?'+':'-'}${$f(bal)}</td></tr>`;
    if(i===PERIODS.length-1||PERIODS[i+1].s.getFullYear()!==y)h+=`</tbody></table></div>`;
  });
  return h;
}

// ── Debt payoff ───────────────────────────────────────────
function simPayoff(extra){
  let ds=CC_DEBTS.map(c=>({...c,bal:c.balance}));
  let months=0,interest=0;
  const strategy=st.debtStrategy||'avalanche';
  while(ds.some(d=>d.bal>0)&&months<600){
    months++;
    if(strategy==='avalanche')ds.sort((a,b)=>b.apr-a.apr||a.bal-b.bal);
    else ds.sort((a,b)=>a.bal-b.bal);
    let xtra=extra;
    ds.forEach(d=>{if(d.bal<=0)return;const int=d.bal*(d.apr/100/12);interest+=int;d.bal+=int;const pmt=Math.min(d.bal,d.min+xtra);d.bal=Math.max(0,d.bal-pmt);if(d.bal===0)xtra=0;else xtra=0;});
    ds=ds.filter(d=>d.bal>0);
  }
  return{months,interest};
}

function freeDate(months){if(!months)return null;const d=new Date();d.setMonth(d.getMonth()+months);return d.toLocaleDateString('en-US',{month:'long',year:'numeric'});}

function setStrategy(s){st.debtStrategy=s;saveSt();render();}

function updDebtCalc(v){
  const extra=parseFloat(v)||0,el=document.getElementById('debt-results');if(!el)return;
  if(extra<=0){el.innerHTML='';return;}
  const base=simPayoff(0),with_extra=simPayoff(extra);
  const saved=base.months-with_extra.months,savedInt=base.interest-with_extra.interest;
  el.innerHTML=`<div class="crow"><div class="clbl">Months to debt-free</div><div class="cval g">${with_extra.months}</div></div>
    <div class="crow"><div class="clbl">Months sooner</div><div class="cval g">-${saved} months</div></div>
    <div class="crow"><div class="clbl">Interest saved</div><div class="cval g">-${$0(savedInt)}</div></div>
    <div class="crow" style="background:var(--gnd)"><div class="clbl" style="color:var(--gn);font-weight:500">Debt-free date</div><div class="cval g">${freeDate(with_extra.months)||'—'}</div></div>`;
}

function renderDebt(){
  const totalBal=CC_DEBTS.reduce((s,c)=>s+c.balance,0);
  const totalMin=CC_DEBTS.reduce((s,c)=>s+c.min,0);
  const base=simPayoff(0);
  const extra200=simPayoff(200);

  let h=`<div class="debt-hero">
    <div style="font-size:11px;color:var(--t3);font-family:monospace;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">total credit card debt</div>
    <div style="font-family:monospace;font-size:32px;font-weight:500;color:var(--rd);margin-bottom:3px">${$f(totalBal)}</div>
    <div style="font-size:12px;color:var(--t2)">at minimums, debt-free by <strong style="color:var(--gn)">${freeDate(base.months)}</strong></div>
    <div style="font-size:11px;color:var(--t3);margin-top:3px">+$200/mo extra → <strong style="color:var(--gn)">${freeDate(extra200.months)}</strong> (${base.months-extra200.months} months sooner)</div>
  </div>`;

  // Strategy selector
  h+=`<div style="display:flex;gap:8px;margin-bottom:10px">
    <div class="strategy-btn ${st.debtStrategy==='avalanche'?'sel':''}" onclick="setStrategy('avalanche')">⚡ Avalanche<div style="font-size:10px;font-weight:400;margin-top:2px">highest rate first<br>saves most money</div></div>
    <div class="strategy-btn ${st.debtStrategy==='snowball'?'sel':''}" onclick="setStrategy('snowball')">⛄ Snowball<div style="font-size:10px;font-weight:400;margin-top:2px">lowest balance first<br>fastest motivation</div></div>
  </div>`;

  // Stats
  h+=`<div class="s2col">
    <div class="sc"><div class="cl">months to free</div><div class="cv r">${base.months}</div><div class="cs">at minimums only</div></div>
    <div class="sc"><div class="cl">total interest</div><div class="cv r">${$0(base.interest)}</div><div class="cs">cost of minimums only</div></div>
    <div class="sc"><div class="cl">+$200/mo extra</div><div class="cv g">${extra200.months} mo</div><div class="cs">saves ${$0(base.interest-extra200.interest)}</div></div>
    <div class="sc"><div class="cl">min payments</div><div class="cv a">${$f(totalMin)}/mo</div><div class="cs">total obligation</div></div>
  </div>`;

  // Warning about near break-even
  h+=`<div class="info-box amber"><div class="ib-title a">⚠ The household runs nearly break-even</div><div class="ib-body">Total monthly income averages $5,747 and fixed bills plus living expenses total $5,773. There is very little natural surplus to throw at debt. Even $50–100 extra per month toward the cards makes a meaningful difference — see the calculator below.</div></div>`;

  // What-if calculator
  h+=`<div class="sec"><div class="sec-hdr"><div class="sec-title">💡 What if we pay extra?</div><div class="sec-sub">per month toward debt</div></div>
    <div style="padding:10px 14px"><input class="calc-inp" type="number" inputmode="decimal" placeholder="Extra per month ($)" id="debt-extra" oninput="updDebtCalc(this.value)"></div>
    <div id="debt-results"></div>
    <div style="padding:6px 14px 10px"><button class="add-btn" onclick="document.getElementById('debt-extra').value='';document.getElementById('debt-results').innerHTML=''">↺ Reset</button></div>
  </div>`;

  // Individual cards
  const sorted=[...CC_DEBTS].sort((a,b)=>st.debtStrategy==='avalanche'?b.apr-a.apr:a.balance-b.balance);
  h+=`<div class="sec"><div class="sec-hdr"><div class="sec-title">Cards — ${st.debtStrategy==='avalanche'?'highest rate first':'lowest balance first'}</div></div>`;
  const maxBal=Math.max(...sorted.map(c=>c.balance));
  sorted.forEach((c,idx)=>{
    const indiv=simPayoff(0);
    h+=`<div class="brow">
      <div style="width:20px;height:20px;border-radius:50%;background:var(--acd);color:var(--ac);font-size:11px;font-family:monospace;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0">${idx+1}</div>
      <div class="binfo">
        <div class="bname">${c.name} <span style="font-size:10px;color:var(--rd);font-family:monospace">${c.apr}% APR</span></div>
        <div class="bmeta">min ${$f(c.min)}/mo · due day ${c.dueDay}</div>
        <div class="debt-bar"><div class="debt-fill" style="width:${((c.balance/maxBal)*100).toFixed(0)}%;background:var(--rd)"></div></div>
      </div>
      <div class="bright"><div class="bamt" style="color:var(--rd)">${$f(c.balance)}</div><div style="font-size:10px;color:var(--t3);font-family:monospace">balance</div></div>
    </div>`;
  });
  h+=`</div>`;

  // Payoff tip
  h+=`<div class="info-box green"><div class="ib-title g">💡 Highest impact action</div><div class="ib-body">All three cards are at 28% APR — which is very high. Call each card and ask for a rate reduction. Banks grant these ~60% of the time. Even dropping one card to 20% saves hundreds over the payoff period. Do this before making any extra payments.</div></div>`;
  return h;
}

// ── Stats ─────────────────────────────────────────────────
function renderStats(){
  let tS=0,tD=0,sC=0,dC=0,bv=-Infinity,bi=-1,wv=Infinity,wi=-1,tSpouse1=0,tHusband=0;
  PERIODS.forEach((_,i)=>{const{bal,income}=calcP(i);if(PERIODS[i].source==='Spouse 1')tSpouse1+=income;else tHusband+=income;if(bal>=0){tS+=bal;sC++;}else{tD+=Math.abs(bal);dC++;}if(bal>bv){bv=bal;bi=i;}if(bal<wv){wv=bal;wi=i;}});
  const net=tS-tD;const bp=PERIODS[bi],wp=PERIODS[wi];
  return`<div class="sgrid2">
    <div class="scard"><div class="sl">net balance</div><div class="sv ${net>=0?'pos':'neg'}">${net>=0?'+':'-'}$${Math.abs(net).toFixed(0)}</div><div class="ss">all checks</div></div>
    <div class="scard"><div class="sl">total CC debt</div><div class="sv neg">$${CC_DEBTS.reduce((s,c)=>s+c.balance,0).toFixed(0)}</div><div class="ss">28% APR</div></div>
    <div class="scard"><div class="sl">surplus checks</div><div class="sv pos">${sC}</div><div class="ss">of ${PERIODS.length}</div></div>
    <div class="scard"><div class="sl">deficit checks</div><div class="sv ${dC>0?'neg':'pos'}">${dC}</div><div class="ss">need attention</div></div>
    <div class="scard"><div class="sl">best check</div><div class="sv pos">+${$f(bv)}</div><div class="ss">${bp?fD(bp.s):'—'}</div></div>
    <div class="scard"><div class="sl">tightest check</div><div class="sv ${wv<0?'neg':'a'}">${wv<0?'-':'+'}${$f(Math.abs(wv))}</div><div class="ss">${wp?fD(wp.s):'—'}</div></div>
  </div>
  <div class="info-box amber"><div class="ib-title a">Monthly income breakdown</div><div class="ib-body">Spouse 1 (biweekly avg): $2,167/mo<br>Husband (semi-monthly): $3,580/mo<br>Total average: $5,747/mo<br>Fixed bills: $4,823/mo<br>Living est. (Spouse 1 checks): $950/mo<br>Average monthly gap: <strong style="color:var(--rd)">-$27</strong><br><br>The budget is extremely tight. Any unexpected expense requires debt. Getting even one card paid off would add $150–240/mo of breathing room.</div></div>`;
}

// ── Setup ─────────────────────────────────────────────────
function renderSetup(){
  let ok=false;try{localStorage.setItem('_t','1');localStorage.removeItem('_t');ok=true;}catch(e){}
  return`<div class="sec"><div class="sec-hdr"><div class="sec-title">💵 Income</div></div>
    <div class="setup-row"><div class="slabel">Spouse 1 (biweekly)<span>every 2 weeks, Thu</span></div><div style="font-family:monospace;font-size:14px;color:var(--gn)">$1,000</div></div>
    <div class="setup-row"><div class="slabel">Husband (semi-monthly)<span>7th and 21st each month</span></div><div style="font-family:monospace;font-size:14px;color:var(--bl)">$1,790</div></div>
    <div style="padding:8px 14px;font-size:11px;color:var(--t3)">To change income amounts, contact your budget advisor to update the app.</div>
  </div>
  <div class="sec"><div class="sec-hdr"><div class="sec-title">🏠 Living expense defaults</div><div class="sec-sub">per Spouse 1 check</div></div>
    <div class="setup-row"><div class="slabel">🛒 Groceries</div><div style="font-family:monospace;font-size:14px;color:var(--t2)">$250</div></div>
    <div class="setup-row"><div class="slabel">🍔 Eating out</div><div style="font-family:monospace;font-size:14px;color:var(--t2)">$100</div></div>
    <div class="setup-row"><div class="slabel">⛽ Gas</div><div style="font-family:monospace;font-size:14px;color:var(--t2)">$125</div></div>
  </div>
  <div class="sec"><div class="sec-hdr"><div class="sec-title">📱 Storage</div></div>
    <div class="setup-row"><div style="display:flex;align-items:center;gap:7px;font-size:13px;color:var(--t2)"><div style="width:8px;height:8px;border-radius:50%;background:${ok?'var(--gn)':'var(--rd)'}"></div>${ok?'Your check-offs and entries save automatically':'Open in Safari for data to save'}</div></div>
  </div>
  <button class="danger-btn" onclick="clearAll()">🗑 Clear all check-offs and entries</button>`;
}

function clearAll(){if(confirm('Clear all paid marks, extra income, and moves? Cannot be undone.')){['paidItems','extraIncome','livingOverride','earlyMoves'].forEach(k=>st[k]={});saveSt();render();}}

// ── Main render ───────────────────────────────────────────
function render(){
  const c=document.getElementById('content');if(!c)return;
  if(activeTab==='checks')        c.innerHTML=renderChecks();
  else if(activeTab==='overview') c.innerHTML=renderOverview();
  else if(activeTab==='debt')     c.innerHTML=renderDebt();
  else if(activeTab==='stats')    c.innerHTML=renderStats();
  else                            c.innerHTML=renderSetup();
}

// Auto-open current period
const cp=curPi();openP[cp]=true;
render();
