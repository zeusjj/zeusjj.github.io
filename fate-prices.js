export const fatePrices=[
  {grade:'일반',kind:'normal',prices:[null,null,10,15,22,30,40,60,90,125,175,250],flows:[10,12,20,30,45,60,80,120,180,250,350,500]},
  {grade:'고급',kind:'advanced',prices:[10,12,20,30,45,60,80,120,180,250,350,500],flows:[20,24,40,60,90,120,160,240,360,500,700,1000]},
  {grade:'희귀 T1',kind:'rare',prices:[50,60,100,150,225,300,400,600,900,1250,1750,2500],flows:[100,120,200,300,450,600,800,1200,1800,2500,3500,5000]},
  {grade:'희귀 T2',kind:'rare',prices:[52,62,104,156,234,312,416,624,936,1300,1820,2600],flows:[104,125,208,312,468,624,832,1248,1872,2600,3640,5200]},
  {grade:'희귀 T3',kind:'rare',prices:[54,65,108,162,243,324,432,648,972,1350,1890,2700],flows:[108,130,216,324,486,648,864,1296,1944,2700,3780,5400]},
  {grade:'희귀 T4',kind:'rare',prices:[56,67,112,168,252,336,448,672,1008,1400,1960,2800],flows:[112,134,224,336,504,672,896,1344,2016,2800,3920,5600]},
  {grade:'희귀 T5',kind:'rare',prices:[58,70,116,174,261,348,464,696,1044,1450,2030,2900],flows:[116,139,232,348,522,696,928,1392,2088,2900,4060,5800]},
  {grade:'희귀 T6',kind:'rare',prices:[60,72,120,180,270,360,480,720,1080,1500,2100,3000],flows:[120,144,240,360,540,720,960,1440,2160,3000,4200,6000]},
  {grade:'영웅',kind:'heroic',prices:[100,120,200,300,450,600,800,1200,1800,2500,3500,5000],flows:[200,240,400,600,900,1200,1600,2400,3600,5000,7000,10000]},
];

export function isFateNew(now=Date.now()){
  return now>=Date.parse('2026-10-17T00:00:00+09:00')&&now<Date.parse('2026-10-24T00:00:00+09:00');
}

if(typeof document!=='undefined'){
  const badge=document.getElementById('fate-menu-new');
  const refreshBadge=()=>{badge.hidden=!isFateNew();};
  refreshBadge();
  const remaining=Date.parse('2026-10-24T00:00:00+09:00')-Date.now();
  if(remaining>0)setTimeout(refreshBadge,remaining+50);
  document.addEventListener('visibilitychange',refreshBadge);
  const body=document.querySelector('#fate-price-table tbody'),number=new Intl.NumberFormat('ko-KR');
  for(const {grade,kind,prices,flows} of fatePrices){
    const row=document.createElement('tr'),heading=document.createElement('th');heading.scope='row';heading.textContent=grade;heading.className='fate-grade-'+kind;row.append(heading);
    prices.forEach((price,index)=>{
      const cell=document.createElement('td');
      if(price===null){cell.textContent='-';cell.className='fate-unavailable';}
      else{
        const amount=document.createElement('strong');amount.textContent=number.format(price);
        const flow=document.createElement('small');flow.textContent='흐름 '+number.format(flows[index]);cell.append(amount,flow);
      }
      row.append(cell);
    });
    body.append(row);
  }
}
