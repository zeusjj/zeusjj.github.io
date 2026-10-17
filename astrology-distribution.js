import {astrologyDistribution} from './astrology-model.js?v=20261018-127';
const ns='http://www.w3.org/2000/svg',number=new Intl.NumberFormat('ko-KR');
const svgNode=(tag,attrs={},text)=>{const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;};
export function distributionChart(){
  const figure=document.createElement('figure'),svg=svgNode('svg'),caption=document.createElement('figcaption');
  figure.className='astrology-distribution';svg.setAttribute('role','img');svg.setAttribute('tabindex','0');figure.append(svg,caption);
  let state=null,bins=[],selected=-1;
  const describe=index=>{
    if(!bins.length||index<0||index>=bins.length)return;
    const bin=bins[index];caption.textContent=number.format(bin.low)+'~'+number.format(bin.high)+'개 사용: '+(bin.probability*100).toFixed(1)+'% · 이내 달성 '+(bin.cumulative*100).toFixed(1)+'%';
    svg.querySelectorAll('[data-bin]').forEach((bar,i)=>bar.classList.toggle('selected',i===index));
  };
  function draw(){
    if(!state)return;
    const {label,mean,quantiles,cdf,max,complete}=state,width=Math.max(260,Math.round(figure.clientWidth)),height=180,left=38,right=16,top=38,bottom=30,plotWidth=width-left-right,plotHeight=height-top-bottom;
    svg.replaceChildren();svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('aria-label',label+(complete?' 완료, 추가 소모 없음':' 소모량 분포. 평균 '+number.format(Math.ceil(mean))+'개. 같은 조건 100명 중 50명은 '+number.format(quantiles[0])+'개, 90명은 '+number.format(quantiles[1])+'개, 95명은 '+number.format(quantiles[2])+'개 이내에 달성하는 추정 분포.'));
    if(complete){svg.append(svgNode('text',{x:width/2,y:90,'text-anchor':'middle',class:'astrology-chart-text'},'완료 · 추가 소모 0개'));caption.textContent='중앙 별 전체 일치';bins=[];return;}
    bins=[];
    for(let i=0;i<24;i++){
      const low=Math.floor(max*i/24/10)*10,high=Math.floor(max*(i+1)/24/10)*10,cumulative=cdf[Math.floor(high/10)],previous=cdf[Math.floor(low/10)];
      bins.push({low:low+(i===0?0:10),high,probability:Math.max(0,cumulative-previous),cumulative});
    }
    const ceiling=Math.max(.05,Math.ceil(Math.max(...bins.map(b=>b.probability))*20)/20);
    for(const fraction of [0,.5,1]){
      const y=top+plotHeight*(1-fraction);svg.append(svgNode('line',{x1:left,x2:width-right,y1:y,y2:y,class:'astrology-chart-grid'}),svgNode('text',{x:left-6,y:y+4,'text-anchor':'end',class:'astrology-chart-text'},(ceiling*fraction*100).toFixed(1)+'명'));
    }
    bins.forEach((bin,i)=>{const bar=svgNode('rect',{x:left+i*plotWidth/24+1,y:top+plotHeight*(1-bin.probability/ceiling),width:Math.max(1,plotWidth/24-2),height:plotHeight*bin.probability/ceiling,class:'astrology-chart-bar','data-bin':i});bar.addEventListener('pointerenter',()=>{selected=i;describe(i);});svg.append(bar);});
    for(const fraction of [0,.5,1])svg.append(svgNode('text',{x:left+plotWidth*fraction,y:height-10,'text-anchor':fraction===0?'start':fraction===1?'end':'middle',class:'astrology-chart-text'},number.format(Math.round(max*fraction))+(fraction===1?'개':'')));
    quantiles.forEach((value,i)=>{
      const x=left+plotWidth*value/max;
      svg.append(svgNode('line',{x1:x,x2:x,y1:top-5,y2:top+plotHeight,class:'astrology-chart-marker marker-'+i}),svgNode('text',{x,y:10+i*12,'text-anchor':'middle',class:'astrology-chart-text'},['운 보통','운 나쁨','운 매우 나쁨'][i]));
    });
    caption.textContent='동일 조건 100명 기준 · 가로: 사용한 별 개수 · 세로: 이 구간에서 달성한 인원 · '+number.format(max)+'개 초과 '+((1-cdf[cdf.length-1])*100).toFixed(1)+'명';
  }
  svg.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();selected=Math.max(0,Math.min(23,selected+(event.key==='ArrowRight'?1:-1)));describe(selected);});
  new ResizeObserver(draw).observe(figure);
  return {element:figure,update(model,current,target,label){
    const next=target===current+1,complete=current===model.central,mean=next?model.nextMeans[current]:model.means[current],quantiles=next?model.nextQuantiles[current]:model.quantiles[current],unit=complete?10:next?model.costs[current]:10,max=complete?0:Math.ceil(quantiles[2]*1.6/(24*unit))*24*unit;
    state={label,complete,mean,quantiles,max,cdf:complete?null:astrologyDistribution(model,current,target,max)};selected=-1;draw();
  }};
}
