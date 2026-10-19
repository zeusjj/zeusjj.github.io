// Official dismantling01/dismantling02 quantities, checked 2026-10-18.
export const sinkwaPrices=[
  {grade:'일반',material:'신과의 파편',unitPrice:1,amounts:[10,15,25,50,80,120,160,200]},
  {grade:'고급',material:'신과의 결정',unitPrice:1,amounts:[10,15,25,50,80,120,160,200]},
  {grade:'희귀 T1',material:'신과의 정수',unitPrice:5,amounts:[5,8,13,25,40,60,80,100]},
  {grade:'희귀 T2',material:'신과의 정수',unitPrice:5,amounts:[10,16,26,52,83,125,166,208]},
  {grade:'희귀 T3',material:'신과의 정수',unitPrice:5,amounts:[11,17,27,54,86,130,173,216]},
  {grade:'희귀 T4',material:'신과의 정수',unitPrice:5,amounts:[15,23,38,75,120,180,240,300]},
  {grade:'희귀 T5',material:'신과의 정수',unitPrice:5,amounts:[16,24,40,80,128,192,256,320]},
  {grade:'희귀 T6',material:'신과의 정수',unitPrice:5,amounts:[17,26,43,85,136,204,272,340]},
];

if(typeof document!=='undefined'){
  const table=document.getElementById('sinkwa-price-table'),body=table.querySelector('tbody');
  const number=new Intl.NumberFormat('ko-KR'),labels=['0~5강','6강','7강','8강','9강','10강','11강','12강'];
  for(const {grade,material,unitPrice,amounts} of sinkwaPrices){
    const row=document.createElement('tr'),heading=document.createElement('th');heading.scope='row';
    const name=document.createElement('strong'),type=document.createElement('small');name.textContent=grade;type.textContent=material;
    name.className='equipment-grade-'+(grade==='일반'?'normal':grade==='고급'?'advanced':'rare');
    heading.append(name,type);row.append(heading);
    amounts.forEach((amount,index)=>{
      const cell=document.createElement('td'),price=document.createElement('strong'),quantity=document.createElement('small');
      if(grade.startsWith('희귀')&&amount*unitPrice<50){
        cell.dataset.label=labels[index];cell.className='sinkwa-unavailable';cell.textContent='-';
        cell.title='구매 상한가가 희귀 장비의 최소 거래가격 50다이아보다 낮습니다.';
        row.append(cell);return;
      }
      cell.dataset.label=labels[index];price.textContent=number.format(amount*unitPrice);quantity.textContent=number.format(amount)+'개 획득';
      cell.append(price,quantity);row.append(cell);
    });
    body.append(row);
  }
}
