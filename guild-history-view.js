(() => {
  const node=(tag,text,className)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;};
  let closeMenu=()=>{};
  document.addEventListener('click',event=>{if(!event.target.closest('.history-menu,.history-more'))closeMenu();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu(true);});
  function render({host,entries,start,today,weekNo,authenticated,formattedHtml,entryForm,showHistory,removeEntry,iconButton}){
    closeMenu();host.replaceChildren();
    const count=Math.max(1,weekNo(today)),months=new Map(),heading=document.querySelector('#history>.page-heading');
    const jump=document.querySelector('#history .history-week-jump');
    document.querySelector('#history .history-navigation')?.remove();heading.querySelector('.history-add')?.remove();
    const navigation=node('div',undefined,'history-navigation'),monthLinks=node('nav',undefined,'history-months');monthLinks.setAttribute('aria-label','월별 기록 이동');navigation.append(monthLinks);heading.after(navigation);
    if(jump)navigation.append(jump);
    let currentList;
    function openForm(editor,anchor,placement='before'){
      if(placement==='after')anchor.after(editor.row);else anchor.before(editor.row);
      editor.form.hidden=false;editor.content.focus();
    }
    for(let week=count;week>=1;week--){
      const section=node('section',undefined,'guild-history-week'),header=node('header'),title=node('h2',week+'주차'),range=node('time');
      const from=new Date(start.getTime()+(week-1)*604800000),to=new Date(Math.min(from.getTime()+6*86400000,Date.parse(today+'T00:00:00+09:00')));
      const parts=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date).split('-').map(Number);
      const [year,month,day]=parts(from),[endYear,endMonth,endDay]=parts(to);
      range.textContent=`${month}월 ${day}일 ~ ${year!==endYear?endYear+'년 ':''}${month===endMonth?'':endMonth+'월 '}${endDay}일`;
      header.append(title,range);if(week===count)header.append(node('span','이번 주','history-current'));section.append(header);
      const list=node('ol',undefined,'guild-history-list');section.append(list);host.append(section);if(week===count)currentList=list;
      for(const date of [to,from]){const [y,m]=parts(date),key=y+'-'+String(m).padStart(2,'0');if(!months.has(key))months.set(key,{section,year:y,month:m});}
      const rows=entries.filter(item=>weekNo(item.event_date)===week).sort((a,b)=>b.event_date.localeCompare(a.event_date)||(b.sort_order??0)-(a.sort_order??0)||b.created_at-a.created_at);
      for(const item of rows){
        const li=node('li',undefined,'guild-history-entry'),line=node('div',undefined,'guild-history-line'),date=node('time'),body=node('div',undefined,'guild-history-body'),text=node('span',undefined,'guild-history-content');
        li.dataset.entryId=item.id;date.dateTime=item.event_date;
        const [y,m,d]=item.event_date.split('-').map(Number),weekday=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',weekday:'long'}).format(new Date(item.event_date+'T00:00:00+09:00'));
        date.dataset.weekday=weekday.slice(0,1);
        const number=node('span',undefined,'history-date-number');number.append(node('span',m+'.','history-date-month'),node('strong',String(d).padStart(2,'0')));date.append(number,node('small',weekday));date.setAttribute('aria-label',`${y}년 ${m}월 ${d}일 ${weekday}`);
        text.innerHTML=formattedHtml(item.content);text.tabIndex=0;
        const latest=item.history?.[0];text.title=`작성자: ${item.created_nickname||'기록'} · ${new Date(item.created_at).toLocaleString('ko-KR')}\n최근 수정자: ${latest&&latest.version>1?latest.editor_nickname+' · '+new Date(latest.changed_at).toLocaleString('ko-KR'):'수정 없음'}`;
        body.append(text);const revisions=Math.max(0,(item.history?.length||1)-1);
        if(revisions){const audit=iconButton('history',revisions+'회 수정 기록 보기',()=>showHistory(item));audit.className='guild-history-audit';audit.append(node('span','수정 '+revisions+'회'));body.append(audit);}
        line.append(date,body);li.append(line);list.append(li);
        if(authenticated){
          const menu=node('div',undefined,'history-menu');menu.hidden=true;menu.role='menu';menu.id='history-actions-'+item.id;menu.setAttribute('aria-label',item.event_date+' 기록 작업');
          const trigger=iconButton('ellipsis','기록 메뉴',()=>{const opening=menu.hidden;closeMenu();if(opening){menu.classList.remove('opens-up');menu.hidden=false;const bounds=menu.getBoundingClientRect();menu.classList.toggle('opens-up',bounds.bottom>innerHeight-12&&trigger.getBoundingClientRect().top>bounds.height+12);trigger.setAttribute('aria-expanded','true');closeMenu=(focus=false)=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus&&trigger.isConnected)trigger.focus();};}});
          trigger.className='history-more';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',menu.id);
          const actions=[['pencil','연혁 수정',()=>openForm(entryForm(item,null),li)],['list-plus','이 줄 위에 추가',()=>openForm(entryForm(null,item.id),li)],['list-plus','이 줄 아래에 추가',()=>openForm(entryForm(null,item.id,'after'),li,'after')],['history','수정 기록 보기',()=>showHistory(item)]];
          if(item.can_delete)actions.push(['trash-2','연혁 제거',()=>removeEntry(item)]);
          for(const [icon,label,action]of actions){const button=iconButton(icon,label,()=>{closeMenu();action();});button.append(node('span',label));button.role='menuitem';menu.append(button);}
          trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(menu.hidden)trigger.click();(event.key==='ArrowUp'?menu.lastElementChild:menu.firstElementChild).focus();}});
          menu.addEventListener('keydown',event=>{const buttons=[...menu.children],index=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}if(event.key==='Tab')closeMenu();});
          line.append(trigger,menu);
        }
      }
      if(!rows.length){const empty=node('li',undefined,'guild-history-empty');empty.append(node('span','아직 기록이 없습니다.'));list.append(empty);if(authenticated){const add=iconButton('plus','첫 기록 추가',()=>{const editor=entryForm(null,null);editor.form.querySelector('input[name=eventDate]').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(from);openForm(editor,empty,'after');});add.classList.add('history-more');empty.append(add);}}
    }
    for(const [key,value]of [...months].sort(([a],[b])=>b.localeCompare(a))){const button=node('button',monthLinks.childElementCount?value.month+'월':value.year+'년 '+value.month+'월');button.type='button';button.setAttribute('aria-pressed',String(!monthLinks.childElementCount));button.addEventListener('click',()=>{for(const sibling of monthLinks.children)sibling.setAttribute('aria-pressed',String(sibling===button));value.section.scrollIntoView({block:'start',behavior:'instant'});});button.dataset.month=key;monthLinks.append(button);}
    if(authenticated){const add=iconButton('plus','기록 추가',()=>{const editor=entryForm(null,null);currentList.prepend(editor.row);editor.form.hidden=false;editor.content.focus();});add.className='history-add';add.append(node('span','기록 추가'));heading.append(add);}
  }
  window.GuildHistoryView={render};
})();
