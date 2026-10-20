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
    def __init__(self,recommended_only=True):
        super().__init__(convert_charrefs=True)
        self.recommended_only=recommended_only
        self.items=[]
        self.row=None
        self.capture=False

    def handle_starttag(self, tag, attributes):
        attrs=dict(attributes)
        if tag=='tr':
            number=attrs.get('data-no','')
            kind=attrs.get('data-type','')
            accepted='icon_recom' in kind if self.recommended_only else kind.startswith('icon_') and not any(value in kind for value in ['notice','ad','survey'])
            self.row={'id':number,'title':'','publishedAt':None,'url':None} if number.isdigit() and accepted else None
            if self.row is not None and not self.recommended_only:self.row['recommended']='icon_recom' in kind
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

class BodyText(HTMLParser):
    void_tags={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
    blocks={'p','div','section','article','li','tr','h1','h2','h3','h4','blockquote','pre'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.parts=[]
        self.found=False

    def handle_starttag(self,tag,attributes):
        attrs=dict(attributes)
        if not self.stack:
            if self.found or tag!='div' or 'write_div' not in attrs.get('class','').split():return
            self.found=True
            self.stack=[(tag,False)]
            return
        hidden=self.stack[-1][1] or tag in {'script','style','iframe','video','audio','button','noscript'} or attrs.get('aria-hidden')=='true'
        if not hidden and tag in self.blocks|{'br','hr'}:self.parts.append('\n')
        if tag not in self.void_tags:self.stack.append((tag,hidden))

    def handle_startendtag(self,tag,attributes):
        self.handle_starttag(tag,attributes)
        if tag not in self.void_tags:self.handle_endtag(tag)

    def handle_endtag(self,tag):
        match=next((i for i in range(len(self.stack)-1,-1,-1) if self.stack[i][0]==tag),None)
        if match is None:return
        if not self.stack[-1][1] and tag in self.blocks:self.parts.append('\n')
        del self.stack[match:]

    def handle_data(self,text):
        if self.stack and not self.stack[-1][1]:self.parts.append(text)

    def text(self):
        lines=[' '.join(line.split()) for line in ''.join(self.parts).splitlines()]
        result=[]
        for line in lines:
            if line or (result and result[-1]):result.append(line)
        return '\n'.join(result).strip()


def request(url,data=None,referer=None):
    headers={'User-Agent':AGENT}
    if referer:headers.update({'Referer':referer,'X-Requested-With':'XMLHttpRequest'})
    payload=urlencode(data).encode() if data is not None else None
    with urlopen(Request(url,data=payload,headers=headers),timeout=20) as response:
        return response.read().decode('utf-8')

class CommentFields(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.values={}
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='input' and attrs.get('id')=='e_s_n_o':self.values['e_s_n_o']=attrs.get('value','')


class CommentPages(HTMLParser):
    def __init__(self):super().__init__();self.pages=[1]
    def handle_data(self,text):
        if text.strip().isdigit():self.pages.append(int(text.strip()))


def comment_items(values):
    result=[]
    for value in values:
        if not isinstance(value,dict) or str(value.get('del_yn','N'))=='Y' or str(value.get('is_delete','0'))=='1':continue
        memo=value.get('memo')
        if not isinstance(memo,str):continue
        parser=BodyText();parser.feed('<div class="write_div">'+memo+'</div>');text=parser.text()
        if not text:continue
        result.append({'id':str(value.get('no','')),'text':text,'reply':str(value.get('depth','0'))!='0' or str(value.get('c_no','0')) not in {'','0','None'}})
    return result


def collect_comments(post,html,robots):
    endpoint=ORIGIN+'/board/comment/'
    if not robots.can_fetch(AGENT,endpoint):raise RuntimeError('Comment collection disallowed')
    fields=CommentFields();fields.feed(html)
    if not fields.values.get('e_s_n_o'):raise RuntimeError('Public comment fields not found')
    comments=[];seen=set();truncated=False
    for page in range(1,6):
        time.sleep(1)
        data={'id':GALLERY,'no':post['id'],'cmt_id':GALLERY,'cmt_no':post['id'],'e_s_n_o':fields.values['e_s_n_o'],'comment_page':page,'sort':'D','_GALLTYPE_':'M'}
        result=json.loads(request(endpoint,data=data,referer=post['url']))
        if not isinstance(result,dict) or 'comments' not in result:raise RuntimeError('Invalid comment response')
        raw=result['comments']
        if raw is None and int(result.get('total_cnt',0))==0:raw=[]
        if not isinstance(raw,list):raise RuntimeError('Invalid comment list')
        for comment in comment_items(raw):
            if comment['id'] not in seen:seen.add(comment['id']);comments.append(comment)
        pages=CommentPages();pages.feed(str(result.get('pagination','')))
        more=max(pages.pages)>page
        if not more:break
        if page==5:truncated=True
    return {'comments':comments,'commentsStatus':'ok','commentsTruncated':truncated}


def collect(now=None,previous=None,recommended_only=True,limit=None):
    now=now or datetime.now(timezone.utc)
    cutoff=now-timedelta(days=14)
    robots=RobotFileParser()
    robots.parse(request(ORIGIN+'/robots.txt').splitlines())
    items={}
    for page in range(1,11):
        query={'id':GALLERY,'page':page}
        if recommended_only:query['exception_mode']='recommend'
        url=ORIGIN+'/mgallery/board/lists/?'+urlencode(query)
        if not robots.can_fetch(AGENT,url):raise RuntimeError('Gallery disallows collection')
        parser=Posts(recommended_only);parser.feed(request(url))
        if not parser.items:raise RuntimeError('No recommended rows found; keeping previous data')
        for post in parser.items:
            published=datetime.fromisoformat(post['publishedAt'])
            if cutoff<=published<=now:items[post['id']]=post
        if (limit and len(items)>=limit) or min(datetime.fromisoformat(p['publishedAt']) for p in parser.items)<cutoff:break
        time.sleep(1)
    if not items:raise RuntimeError('No recent recommended posts; keeping previous data')
    records=sorted(items.values(),key=lambda p:(p['publishedAt'],int(p['id'])),reverse=True)[:limit]
    cached={post['id']:post for post in (previous or {}).get('items',[])}
    for post in records:
        old=cached.get(post['id'],{})
        html=None
        try:recent=datetime.fromisoformat(old.get('contentFetchedAt',''))>now-timedelta(hours=6)
        except (ValueError,TypeError):recent=False
        if recent and old.get('contentStatus') in {'text','no-text'}:
            for key in ['contentText','contentStatus','contentFetchedAt']:post[key]=old[key]
        else:
            try:
                if not robots.can_fetch(AGENT,post['url']):raise RuntimeError('Article disallows collection')
                time.sleep(1)
                html=request(post['url']);body=BodyText();body.feed(html)
                if not body.found:raise RuntimeError('Article body not found')
                text=body.text()
                post.update(contentText=text,contentStatus='text' if text else 'no-text',contentFetchedAt=now.isoformat())
            except Exception as error:
                post.update(contentText='',contentStatus='unavailable')
                print(f"Could not collect text for {post['id']}: {type(error).__name__}",file=sys.stderr)
        if not recommended_only:
            try:comments_recent=datetime.fromisoformat(old.get('commentsFetchedAt',''))>now-timedelta(hours=1)
            except (ValueError,TypeError):comments_recent=False
            if comments_recent and old.get('commentsStatus')=='ok':
                for key in ['comments','commentsStatus','commentsTruncated','commentsFetchedAt']:
                    if key in old:post[key]=old[key]
                continue
            try:
                if not robots.can_fetch(AGENT,post['url']):raise RuntimeError('Article disallows collection')
                if html is None:time.sleep(1);html=request(post['url'])
                post.update(collect_comments(post,html,robots),commentsFetchedAt=now.isoformat())
            except Exception as error:
                post.update(comments=[],commentsStatus='unavailable')
                print(f"Could not collect comments for {post['id']}: {type(error).__name__}",file=sys.stderr)
    return {'collectedAt':now.isoformat(),'days':14,'coverageStart':min(p['publishedAt'][:10] for p in records),'source':ORIGIN+'/mgallery/board/lists/?id='+GALLERY+('&exception_mode=recommend' if recommended_only else ''),'items':records}

if __name__=='__main__':
    target=Path(sys.argv[1] if len(sys.argv)>1 else 'community-news.json')
    try:previous=json.loads(target.read_text(encoding='utf-8'))
    except (OSError,ValueError):previous=None
    all_posts='--all' in sys.argv
    if all_posts:
        try:
            recommended=json.loads(target.with_name('community-news.json').read_text(encoding='utf-8'))
            previous={'items':recommended['items']+(previous or {}).get('items',[])}
        except (OSError,ValueError,KeyError):pass
    data=collect(previous=previous,recommended_only=not all_posts,limit=120 if all_posts else None)
    temporary=target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temporary.replace(target)
    print(f"Collected {len(data['items'])} recommended posts with text-only bodies; no images requested.")
