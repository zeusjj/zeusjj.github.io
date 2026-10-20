from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs, urlencode
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
import json
import sys
import time

ORIGIN='https://gall.dcinside.com'
GALLERY='zeusthegodofpride'
AGENT='GuildNewsReader/1.0 (+https://zeusjj.github.io/)'
KST=timezone(timedelta(hours=9))

class Posts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items=[]
        self.row=None
        self.capture=False

    def handle_starttag(self, tag, attributes):
        attrs=dict(attributes)
        if tag=='tr':
            number=attrs.get('data-no','')
            self.row={'id':number,'title':'','publishedAt':None,'url':None} if number.isdigit() and 'icon_recom' in attrs.get('data-type','') else None
            self.capture=False
        if self.row is None:return
        if tag=='td' and 'gall_date' in attrs.get('class','').split():
            try:self.row['publishedAt']=datetime.strptime(attrs.get('title',''),'%Y-%m-%d %H:%M:%S').replace(tzinfo=KST).isoformat()
            except ValueError:pass
        if tag=='a' and not self.row['url']:
            url=urlparse(urljoin(ORIGIN,attrs.get('href','')))
            query=parse_qs(url.query)
            if url.scheme=='https' and url.netloc=='gall.dcinside.com' and url.path=='/mgallery/board/view/' and query.get('id')==[GALLERY] and query.get('no')==[self.row['id']]:
                self.row['url']=ORIGIN+'/mgallery/board/view/?'+urlencode({'id':GALLERY,'no':self.row['id']})
                self.capture=True

    def handle_data(self,text):
        if self.row is not None and self.capture:self.row['title']+=text

    def handle_endtag(self,tag):
        if tag=='a':self.capture=False
        if tag=='tr' and self.row is not None:
            self.row['title']=' '.join(self.row['title'].split())
            if self.row['title'] and self.row['url'] and self.row['publishedAt']:self.items.append(self.row)
            self.row=None

def request(url):
    with urlopen(Request(url,headers={'User-Agent':AGENT}),timeout=20) as response:
        return response.read().decode('utf-8')

def collect(now=None):
    now=now or datetime.now(timezone.utc)
    cutoff=now-timedelta(days=14)
    robots=RobotFileParser()
    robots.parse(request(ORIGIN+'/robots.txt').splitlines())
    items={}
    for page in range(1,11):
        url=ORIGIN+'/mgallery/board/lists/?'+urlencode({'id':GALLERY,'exception_mode':'recommend','page':page})
        if not robots.can_fetch(AGENT,url):raise RuntimeError('Gallery disallows collection')
        parser=Posts();parser.feed(request(url))
        if not parser.items:raise RuntimeError('No recommended rows found; keeping previous data')
        for post in parser.items:
            published=datetime.fromisoformat(post['publishedAt'])
            if cutoff<=published<=now:items[post['id']]=post
        if min(datetime.fromisoformat(p['publishedAt']) for p in parser.items)<cutoff:break
        time.sleep(1)
    if not items:raise RuntimeError('No recent recommended posts; keeping previous data')
    records=sorted(items.values(),key=lambda p:p['publishedAt'],reverse=True)
    return {'collectedAt':now.isoformat(),'days':14,'coverageStart':min(p['publishedAt'][:10] for p in records),'source':ORIGIN+'/mgallery/board/lists/?id='+GALLERY+'&exception_mode=recommend','items':records}

if __name__=='__main__':
    target=Path(sys.argv[1] if len(sys.argv)>1 else 'community-news.json')
    data=collect()
    temporary=target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(target)
    print(f"Collected {len(data['items'])} recommended post titles and links.")
