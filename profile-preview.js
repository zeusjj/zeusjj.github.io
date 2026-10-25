(() => {
  const host=document.getElementById('profile-preview');if(!host)return;
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  const heading=el('div',undefined,'profile-preview-heading'),title=el('h2','내 정보 예시');title.id='profile-preview-heading';heading.append(title,el('span','가상 데이터'));host.append(heading);
  const identity=el('div',undefined,'profile-identity'),emblem=el('img');emblem.src='assets/guild-emblem.png';emblem.alt='';emblem.width=36;emblem.height=36;
  const name=el('div');name.append(el('h3','유저닉네임'),el('p','레인저 · Lv.60'));identity.append(emblem,name);host.append(identity);
  const metrics=el('dl',undefined,'overview-metrics');
  for(const [label,value,detail]of [['현재 성장도','52,400','최근 기록'],['길드 성장도 순위','15위','50명 기준'],['최근 7일 성장량','+2,400','+4.8%'],['공식 참여율','87.5%','최근 4주']]){
    const item=el('div');item.append(el('dt',label),el('dd',value),el('small',detail));metrics.append(item);
  }
  host.append(metrics);
  const goals=el('div',undefined,'profile-preview-goals');for(const text of ['성장도 목표 달성','레벨 목표 달성'])goals.append(el('span',text,'overview-badge'));host.append(goals);
  const columns=el('div',undefined,'profile-preview-columns');host.append(columns);
  const trend=el('section',undefined,'overview-section');trend.append(el('h3','성장 추이'));
  const legend=el('div',undefined,'growth-chart-legend');legend.append(el('span','내 성장도','growth-chart-personal'),el('span','길드평균','growth-chart-guild'));trend.append(legend);
  const canvas=el('canvas');canvas.id='profile-preview-chart';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','가상 성장 추이: 50,000에서 52,400으로 증가, 길드 평균과 비교');trend.append(canvas);
  const history=el('details',undefined,'overview-history');history.append(el('summary','날짜별 예시 기록'));trend.append(history);
  function table(parent,headings,rows){
    const table=el('table',undefined,'overview-table'),head=el('thead'),header=el('tr'),body=el('tbody');
    for(const label of headings){const cell=el('th',label);cell.scope='col';header.append(cell);}head.append(header);
    for(const row of rows){const tr=el('tr');for(const value of row)tr.append(el('td',value));body.append(tr);}table.append(head,body);parent.append(table);
  }
  table(history,['기록','성장도'],[['7일 전','50,000'],['3일 전','51,500'],['최근','52,400']]);
  columns.append(trend);
  const participation=el('section',undefined,'overview-section');participation.append(el('h3','최근 4주 공식 참여율'));
  const score=el('div',undefined,'overview-participation-score');score.append(el('strong','87.5%'),el('span','75% 조건 충족','overview-badge'));participation.append(score);
  const meter=el('div',undefined,'participation-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label','가상 참여율 87.5%, 기준 75%');
  for(const ratio of [100,100,50,100]){const week=el('span',undefined,'participation-meter-week'),fill=el('span');fill.style.width=ratio+'%';week.append(fill);meter.append(week);}meter.append(el('span','75%','participation-meter-threshold'));participation.append(meter);
  table(participation,['집계 주간','내 참여','반영 점수'],[['3주 전','2 / 2회','25%'],['2주 전','3 / 3회','25%'],['지난주','1 / 2회','12.5%'],['이번 주','2 / 2회','25%']]);columns.append(participation);
  const ranks=el('section',undefined,'overview-section');ranks.append(el('h3','길드 내 순위'));const list=el('dl',undefined,'profile-preview-ranks');
  for(const [label,value,rank]of [['성장도','52,400','15위 / 50명'],['주간 공헌도','200','공동 8위 / 50명'],['공식 콘텐츠 참여율','87.5%','공동 10위 / 50명']]){
    const item=el('div'),result=el('dd');result.append(el('strong',value),el('small',rank));item.append(el('dt',label),result);list.append(item);
  }
  ranks.append(list);host.append(ranks);
  const personal=[50000,50300,50750,50900,51500,51800,52100,52400],average=[48300,48600,48800,49200,49500,49700,49900,50100];
  function draw(){
    if(host.hidden||document.getElementById('profile').hidden||!canvas.clientWidth)return;
    const width=canvas.clientWidth,height=150,dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=height*dpr;
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const styles=getComputedStyle(document.documentElement),color=key=>styles.getPropertyValue(key).trim();
    ctx.fillStyle=color('--page');ctx.fillRect(0,0,width,height);ctx.font='10px sans-serif';
    const x=i=>48+i*(width-62)/7,y=value=>height-24-(value-48000)/5000*(height-42);
    for(const value of [48000,50500,53000]){ctx.strokeStyle=color('--line');ctx.beginPath();ctx.moveTo(45,y(value));ctx.lineTo(width-10,y(value));ctx.stroke();ctx.fillStyle=color('--muted');ctx.textAlign='right';ctx.fillText(value.toLocaleString('ko-KR'),40,y(value)+3);}
    for(const [points,stroke,lineWidth]of [[average,color('--growth-guild'),1.5],[personal,color('--accent'),2.5]]){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.beginPath();points.forEach((value,i)=>i?ctx.lineTo(x(i),y(value)):ctx.moveTo(x(i),y(value)));ctx.stroke();}
    ctx.fillStyle=color('--accent');for(const [i,value]of personal.entries()){ctx.beginPath();ctx.arc(x(i),y(value),2.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=color('--muted');ctx.textAlign='left';ctx.fillText('7일 전',45,height-5);ctx.textAlign='right';ctx.fillText('최근',width-10,height-5);
  }
  function sync(){host.hidden=!!window.GuildAuth?.user;requestAnimationFrame(draw);}
  window.addEventListener('guild-auth-change',sync);window.addEventListener('hashchange',sync);window.addEventListener('guild-theme-change',()=>requestAnimationFrame(draw));
  new ResizeObserver(()=>requestAnimationFrame(draw)).observe(host);sync();
})();
