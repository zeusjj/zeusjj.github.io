const destination=value=>{
  try{const url=new URL(value,self.location.origin);if(url.origin===self.location.origin&&/^#(?:members|weekly|notices(?:\/[a-f0-9-]{36})?|tips(?:\/[a-f0-9-]{36})?)$/.test(url.hash))return url.href;}catch{}
  return self.location.origin+'/#weekly';
};
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let value;try{value=event.data?.json();}catch{}
  const data=value&&typeof value==='object'?value:{};
  event.waitUntil(self.registration.showNotification(typeof data.title==='string'?data.title.slice(0,80):'절대중립 길드',{
    body:typeof data.body==='string'?data.body.slice(0,200):'새 소식을 확인해주세요.',
    icon:'/assets/guild-app-192.png',badge:'/assets/guild-app-192.png',
    tag:typeof data.id==='string'?data.id.slice(0,100):'guild-update',
    data:{url:destination(data.url)}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=destination(event.notification.data?.url);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(existing){const navigated=await existing.navigate(url);await (navigated??existing).focus();}
    else await self.clients.openWindow(url);
  })());
});
