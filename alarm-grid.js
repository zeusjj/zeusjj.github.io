export function detectBoardGrid(width,height,pixels){
  const light=(x,y)=>{const i=(y*width+x)*4;return pixels[i]*.299+pixels[i+1]*.587+pixels[i+2]*.114;};
  function boundaries(vertical){
    const size=vertical?width:height,span=vertical?height:width,step=Math.max(1,Math.floor(span/1000)),edges=[];
    // Card borders are straight across most of the board; artwork edges are not.
    for(let at=1;at<size;at++){let hits=0,total=0;for(let other=0;other<span;other+=step){const difference=vertical?Math.abs(light(at,other)-light(at-1,other)):Math.abs(light(other,at)-light(other,at-1));if(difference>8)hits++;total++;}if(hits/total>=.8)edges.push(at);}
    const groups=[];for(const edge of edges){const group=groups.at(-1);if(group && edge-group.at(-1)<=Math.max(10,size/100))group.push(edge);else groups.push([edge]);}
    const margin=vertical?60:40;
    return [0,...groups.map(group=>Math.round(group.reduce((sum,value)=>sum+value,0)/group.length)).filter(at=>at>margin && at<size-margin),size];
  }
  const xs=boundaries(true),ys=boundaries(false),cells=[];
  for(let row=0;row<ys.length-1;row++)for(let col=0;col<xs.length-1;col++)cells.push({left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]});
  return {columns:xs.length-1,rows:ys.length-1,cells};
}
