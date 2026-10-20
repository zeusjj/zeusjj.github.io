import {mountWeeklyNews} from './weekly-news.js?v=20261021-196';
const host=document.getElementById('community-content');
let mounted=false;
function show(){
  if(location.hash.split('/')[0]!=='#community'||mounted)return;
  mounted=true;
  mountWeeklyNews(host,{start:'0000-01-01',end:'9999-12-31',communityOnly:true});
  window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
}
window.addEventListener('hashchange',show);show();
