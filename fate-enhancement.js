const panel=document.getElementById('fate-panel');
const root=document.createElement('section');root.id='fate-enhancement';root.hidden=true;root.setAttribute('aria-labelledby','fate-enhancement-title');
root.innerHTML=`
 <div class="fate-enhance-heading"><h2 id="fate-enhancement-title"><i data-lucide="gem"></i>희귀 장신구 강화·분해</h2><span>0강 구매 · 실패까지 강화</span></div>
 <div class="fate-enhance-controls">
  <fieldset><legend>장신구 티어</legend><div class="fate-tier-options">${[1,2,3,4,5,6].map(t=>`<label><input type="radio" name="fate-tier" value="${t}" ${t===1?'checked':''}><span>T${t}</span></label>`).join('')}</div></fieldset>
  <label class="fate-enhance-price" for="fate-item-price">개당 평균 구매가<div><input id="fate-item-price" type="number" min="0.1" max="1000000" step="0.1" value="50" inputmode="decimal"><span>다이아</span></div></label>
  <label for="fate-scroll-price">장신구 강화 주문서 <output id="fate-scroll-output">0 다이아</output><input id="fate-scroll-price" type="range" min="0" max="10" step="0.1" value="0"><span class="fate-range-ends"><span>0 다이아</span><span>10 다이아</span></span></label>
  <label for="fate-quantity">구매 수량 <output id="fate-quantity-output">10개</output><input id="fate-quantity" type="range" min="10" max="1000" step="10" value="10"><span class="fate-range-ends"><span>10개</span><span>1,000개</span></span></label>
 </div>
 <p id="fate-enhance-status" role="status"></p>
 <div id="fate-enhance-result" hidden>
  <div class="fate-enhance-metrics">
   <div><span>정가 대비 기대 효율</span><strong id="fate-efficiency"></strong><small>실타래 정가 0.5 다이아/개 = 1배</small></div>
   <div><span>기대 흐름 획득량</span><strong id="fate-flow"></strong><small id="fate-flow-gain"></small></div>
   <div><span>기대 총비용 (다이아)</span><strong id="fate-cost"></strong><small id="fate-scroll-count"></small></div>
   <div><span>정가보다 저렴하게 얻을 확률</span><strong id="fate-better"></strong><small>40,000회 표본 · 수익 보장 아님</small></div>
  </div>
  <div class="fate-enhance-graph-heading"><h3>결과 분포</h3><fieldset class="fate-chart-modes"><legend class="visually-hidden">분포 기준</legend><label><input type="radio" name="fate-chart-mode" value="efficiency"><span>효율 배수</span></label><label><input type="radio" name="fate-chart-mode" value="flow" checked><span>흐름 획득량</span></label></fieldset></div>
  <figure class="fate-enhance-chart"><svg id="fate-enhance-plot" role="img" tabindex="0"></svg><div id="fate-chart-tooltip" role="tooltip" hidden></div><figcaption id="fate-chart-detail"></figcaption></figure>
  <div id="fate-quantiles" class="fate-quantiles"></div>
  <p class="fate-simulation-note">동일 조건 40,000회 추정 · 5~95백분위는 가운데 90% 구간이며 최소·최대 보상이 아닙니다.</p>
  <div class="fate-enhance-comparison"><table><caption id="fate-compare-caption"></caption><thead><tr><th scope="col">방식</th><th scope="col">흐름</th><th scope="col">총비용</th><th scope="col">흐름 1개당 비용</th></tr></thead><tbody id="fate-compare-rows"></tbody></table></div>
  <p id="fate-break-even" class="fate-break-even"></p>
 </div>
 <details class="fate-enhance-method"><summary>계산 기준·강화 확률</summary><p>+0 희귀 장신구를 구매해 최초 실패까지 강화합니다. 실패 시 직전 강화 단계의 분해량을 받고, +12까지 모두 성공하면 +12 장신구를 분해합니다. 강화 시도당 주문서 1장, 실패한 시도의 주문서도 비용에 포함합니다. 추가 수수료·골드·보호·확률 보정은 제외합니다.</p><p>실타래 정가를 흐름 1개당 0.5다이아로 환산합니다. 기대 효율 = 기대 총흐름 × 0.5 ÷ 기대 총비용. 1배는 정가와 동일하며 2배는 정가의 절반 비용입니다. 수량을 정한 반복 실험의 효율 평균과는 다를 수 있습니다. 기대 흐름·비용은 단계별 확률을 합산한 정확한 기댓값이며, 분포·백분위·유리할 확률은 독립 시행 40,000회의 추정치입니다. 강화 횟수와 보상의 상관관계를 함께 반영합니다.</p><p>분포의 마지막 막대는 우측 경계 이상 결과를 모두 포함합니다. 매우 드문 고강화 보상은 표본에 나타나지 않을 수 있으나, 기댓값에는 +12까지 모두 포함합니다.</p><div class="fate-rates" id="fate-enhance-rates"></div></details>`;
panel.prepend(root);
const find=id=>root.querySelector('#'+id),number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}),decimal=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const ns='http://www.w3.org/2000/svg',svg=find('fate-enhance-plot'),detail=find('fate-chart-detail'),tooltip=find('fate-chart-tooltip');
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const mark=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;return el;};
let worker=null,generation=0,timer,result=null,selected=-1;
const options=()=>({tier:Number(root.querySelector('[name=fate-tier]:checked').value),quantity:Number(find('fate-quantity').value),itemPrice:Number(find('fate-item-price').value),scrollPrice:Number(find('fate-scroll-price').value)});
const mode=()=>root.querySelector('[name=fate-chart-mode]:checked').value;
const format=value=>mode()==='efficiency'?decimal.format(value)+'배':number.format(value)+'개';
function hideTooltip(){tooltip.hidden=true;svg.removeAttribute('aria-describedby');}
function positionTooltip(point){
 const box=tooltip.parentElement.getBoundingClientRect(),bar=svg.querySelector(`[data-bin="${selected}"]`)?.getBoundingClientRect();
 const px=(point?.clientX??(bar?bar.left+bar.width/2:box.left+box.width/2))-box.left,py=(point?.clientY??bar?.top??box.top)-box.top;
 const width=tooltip.offsetWidth,height=tooltip.offsetHeight;
 tooltip.style.left=Math.max(4,Math.min(box.width-width-4,px-width/2))+'px';tooltip.style.top=Math.max(4,Math.min(box.height-height-4,py-height-12))+'px';
}
function describe(index,point){
 if(!result)return;const bin=result[mode()].bins[index];if(!bin)return;selected=index;
 const range=mode()==='flow'?number.format(Math.ceil(bin.low))+(bin.tail?'개 이상':' ~ '+number.format(Math.ceil(bin.high)-1)+'개'):(bin.tail?format(bin.low)+' 이상':format(bin.low)+' ~ '+format(bin.high));
 detail.textContent=range+': '+decimal.format(bin.probability*100)+'%';
 const cumulative=result[mode()].bins.slice(0,index+1).reduce((sum,b)=>sum+b.probability,0);
 tooltip.replaceChildren(node('strong',range),node('span','해당 구간 '+decimal.format(bin.probability*100)+'%'),node('span','누적 '+decimal.format(Math.min(1,cumulative)*100)+'%'));
 tooltip.hidden=false;svg.setAttribute('aria-describedby',tooltip.id);positionTooltip(point);
 svg.querySelectorAll('[data-bin]').forEach((bar,i)=>bar.classList.toggle('selected',i===index));
}
function draw(){
 hideTooltip();
 if(!result||root.hidden)return;const width=Math.floor(svg.clientWidth);if(width<100)return;
 const dist=result[mode()],height=230,left=46,right=18,top=20,bottom=38,w=width-left-right,h=height-top-bottom;
 const low=dist.min,high=dist.max,ceiling=Math.max(.01,...dist.bins.map(b=>b.probability))*1.1,x=v=>left+(v-low)/(high-low)*w;
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-label',`${mode()==='efficiency'?'효율 배수':'흐름 획득량'} 분포. 하위 5% ${format(dist.quantiles[0])}, 중앙값 ${format(dist.quantiles[1])}, 상위 5% ${format(dist.quantiles[2])}. 40,000회 추정.`);svg.replaceChildren();
 for(const f of [0,.5,1]){const y=top+h*(1-f);svg.append(mark('line',{x1:left,x2:width-right,y1:y,y2:y,class:'fate-chart-grid'}),mark('text',{x:left-7,y:y+4,'text-anchor':'end',class:'fate-chart-text'},decimal.format(ceiling*f*100)+'%'));}
 dist.bins.forEach((b,i)=>{const bar=mark('rect',{x:left+i*w/28+1,y:top+h*(1-b.probability/ceiling),width:Math.max(1,w/28-2),height:h*b.probability/ceiling,'data-bin':i,class:'fate-chart-bar'});bar.addEventListener('pointerenter',event=>describe(i,event));bar.addEventListener('pointermove',event=>positionTooltip(event));svg.append(bar);});
 for(const [i,value]of dist.quantiles.entries())svg.append(mark('line',{x1:x(value),x2:x(value),y1:top,y2:top+h,class:'fate-chart-percentile percentile-'+i}));
 if(mode()==='efficiency'&&low<=1&&high>=1){svg.append(mark('line',{x1:x(1),x2:x(1),y1:top,y2:top+h,class:'fate-chart-baseline'}),mark('text',{x:x(1),y:12,'text-anchor':'middle',class:'fate-chart-text'},'정가 1배'));}
 for(const f of [0,.5,1])svg.append(mark('text',{x:left+w*f,y:height-12,'text-anchor':f===0?'start':f===1?'end':'middle',class:'fate-chart-text'},format(low+(high-low)*f)));
 detail.textContent='가로: '+(mode()==='efficiency'?'정가 0.5 다이아 대비 효율':'총 흐름 획득량')+' · 세로: 결과가 해당 구간에 속할 확률';
 const quantiles=find('fate-quantiles');quantiles.replaceChildren();
 dist.quantiles.forEach((value,i)=>{const block=node('div');block.className='fate-quantile-'+i;block.append(node('span',['운이 나쁜 쪽 · 하위 5%','운 보통 · 중앙값','운이 좋은 쪽 · 상위 5%'][i]),node('strong',format(value)));quantiles.append(block);});selected=-1;
}
function render(){
 const e=result.expected,o=options();find('fate-efficiency').textContent=decimal.format(e.efficiency)+'배';find('fate-efficiency').dataset.favorable=String(e.efficiency>=1);
 find('fate-flow').textContent=number.format(e.flow)+'개';find('fate-flow-gain').textContent='바로 분해 '+number.format(e.baselineFlow)+'개';
 find('fate-cost').textContent=decimal.format(e.cost);find('fate-scroll-count').textContent='주문서 평균 '+decimal.format(e.scrolls)+'장 포함';find('fate-better').textContent=decimal.format(result.betterProbability*100)+'%';
 find('fate-compare-caption').textContent='희귀 T'+o.tier+' 장신구 '+number.format(o.quantity)+'개 기준';
 const rows=find('fate-compare-rows');rows.replaceChildren();
 for(const [label,flow,cost]of [['정가로 동일 기대량 구매',e.flow,e.retailCost],['장신구 바로 분해',e.baselineFlow,e.baselineCost],['실패까지 강화 후 분해 (기대)',e.flow,e.cost]]){const row=node('tr');const heading=node('th',label);heading.scope='row';row.append(heading,node('td',number.format(flow)+'개'),node('td',decimal.format(cost)+' 다이아'),node('td',decimal.format(cost/flow)+' 다이아'));rows.append(row);}
 const verdict=Math.abs(e.efficiency-1)<1e-10?'현재 조건은 정가와 기대 효율이 같습니다.':e.efficiency>1?'현재 조건은 정가보다 저렴하게 얻을 것으로 기대됩니다.':'현재 조건은 정가로 구매하는 편이 기대값 기준으로 유리합니다.';
 find('fate-break-even').textContent=verdict+' '+(e.breakEvenScroll>0?'주문서 가격 '+decimal.format(e.breakEvenScroll)+' 다이아 미만이면 정가보다 기대 효율이 높습니다.':e.breakEvenScroll<0?'주문서가 무료여도 정가보다 기대 효율이 낮습니다.':'주문서가 무료일 때만 정가와 기대 효율이 같습니다.');
 find('fate-enhance-result').hidden=false;find('fate-enhance-status').textContent='';root.removeAttribute('aria-busy');draw();
}
function request(){
 if(root.hidden)return;const id=++generation;clearTimeout(timer);
 hideTooltip();
 find('fate-scroll-output').value=decimal.format(Number(find('fate-scroll-price').value))+' 다이아';find('fate-quantity-output').value=number.format(Number(find('fate-quantity').value))+'개';
 if(!find('fate-item-price').validity.valid||Number(find('fate-item-price').value)<=0){find('fate-enhance-result').hidden=true;find('fate-enhance-status').textContent='개당 구매가를 0.1~1,000,000 다이아로 입력해주세요.';return;}
 root.setAttribute('aria-busy','true');find('fate-enhance-status').textContent='분포 계산 중…';
 timer=setTimeout(()=>{try{
  if(!worker){worker=new Worker(new URL('./fate-enhancement-worker.js?v=20261102-retail',import.meta.url),{type:'module'});worker.onmessage=({data})=>{if(data.id!==generation||root.hidden)return;if(data.error){fail();return;}result=data.result;render();};worker.onerror=fail;}
  worker.postMessage({id,options:options()});
 }catch{fail();}},160);
}
function fail(){find('fate-enhance-status').textContent='분포를 계산하지 못했습니다. 값을 변경해 다시 계산해주세요.';find('fate-enhance-result').hidden=true;root.removeAttribute('aria-busy');worker?.terminate();worker=null;}
function auth(){root.hidden=!window.GuildAuth?.user;if(root.hidden){generation++;clearTimeout(timer);worker?.terminate();worker=null;result=null;find('fate-enhance-result').hidden=true;root.removeAttribute('aria-busy');}else request();}
root.querySelectorAll('.fate-enhance-controls input').forEach(input=>input.addEventListener('input',request));root.querySelectorAll('[name=fate-chart-mode]').forEach(input=>input.addEventListener('change',draw));
svg.addEventListener('keydown',event=>{if(event.key==='Escape'){hideTooltip();return;}if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();describe(Math.max(0,Math.min(27,selected+(event.key==='ArrowRight'?1:-1))));});
svg.addEventListener('pointerleave',hideTooltip);svg.addEventListener('blur',hideTooltip);
new ResizeObserver(draw).observe(svg);window.addEventListener('guild-auth-change',auth);
import('./enhancement-model.js').then(({ENHANCEMENT_PROBABILITIES})=>{for(const [i,p]of ENHANCEMENT_PROBABILITIES.accessory.entries()){const entry=node('span','+'+(i+1)+' · '+decimal.format(p*100)+'%');find('fate-enhance-rates').append(entry);}});
window.lucide?.createIcons();auth();
