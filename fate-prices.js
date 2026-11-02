import {fatePrices} from './fate-price-data.js';
export {fatePrices};
if(typeof document!=='undefined'){
  const body=document.querySelector('#fate-price-table tbody'),number=new Intl.NumberFormat('ko-KR');
  body.replaceChildren();
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
