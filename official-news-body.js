import DOMPurify from './vendor/purify.es.js';

export function officialBody(html){
  const fragment=DOMPurify.sanitize(html,{
    ALLOWED_TAGS:['p','br','strong','b','em','i','u','s','span','div','h1','h2','h3','h4','h5','h6','ul','ol','li','table','thead','tbody','tfoot','tr','th','td','caption','colgroup','col','blockquote','a','img','hr','pre','code','sub','sup','dl','dt','dd','figure','figcaption'],
    ALLOWED_ATTR:['href','src','alt','title','colspan','rowspan','scope','start'],
    ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false,RETURN_DOM_FRAGMENT:true,
  });
  const safeUrl=value=>{try{const url=new URL(value,'https://zeus.com2us.com/');return url.protocol==='https:'&&!url.username&&!url.password?url:null;}catch{return null;}};
  for(const link of fragment.querySelectorAll('a')){
    const url=safeUrl(link.getAttribute('href')||'');
    if(!link.hasAttribute('href')||!url){link.replaceWith(...link.childNodes);continue;}
    link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
  }
  for(const image of fragment.querySelectorAll('img')){
    const url=safeUrl(image.getAttribute('src')||'');
    if(!image.hasAttribute('src')||!url||!(url.hostname==='com2us.com'||url.hostname.endsWith('.com2us.com'))){image.remove();continue;}
    image.src=url.href;image.alt=image.getAttribute('alt')||'공식 소식 이미지';image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
    image.addEventListener('error',()=>{const fallback=document.createElement('p');fallback.className='official-news-image-error';fallback.textContent='이미지를 불러오지 못했습니다. 원문에서 확인해주세요.';image.replaceWith(fallback);},{once:true});
  }
  for(const table of fragment.querySelectorAll('table')){
    const scroll=document.createElement('div');scroll.className='official-news-table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','공식 소식 표');table.before(scroll);scroll.append(table);
  }
  return fragment;
}
