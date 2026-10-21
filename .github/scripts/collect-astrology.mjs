import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {classification,parseSpecification,mergeSpecifications,sourceRoot} from './astrology-source-model.mjs';

const directory=path.resolve(process.argv[2]??'.');
const dataFile=path.join(directory,'astrology-data.js'),statusFile=path.join(directory,'astrology-source.json');
const {astrologyConstellations:previous}=await import(pathToFileURL(dataFile));
const browser=await chromium.launch({headless:true,...(process.env.ASTROLOGY_CHROME?{channel:'chrome'}:{})});
try {
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 await page.goto(sourceRoot,{waitUntil:'networkidle',timeout:60000});
 const sidebar=page.locator('[data-sidebar=content]').first();await sidebar.waitFor();
 for(let i=0;i<100;i++){
  const closed=sidebar.locator('[data-slot=collapsible-trigger][data-state=closed]').first();
  if(!await closed.count())break;await closed.click();
 }
 const buttons=sidebar.locator('li > button[data-sidebar=menu-button]');
 const names=await buttons.evaluateAll(elements=>elements.filter(e=>{
  let p=e.parentElement;
  while(p){if(p.matches('[data-slot=collapsible]')&&p.querySelector(':scope > li > [data-slot=collapsible-trigger] > button')?.textContent.trim()==='점성술')return true;p=p.parentElement;}
  return false;
 }).map(e=>e.textContent.trim()));
 if(names.length<4||new Set(names).size!==names.length)throw Error('Incomplete astrology menu');
 const discovered=[];let known;
 for(const name of names){
  const previousUrl=page.url();
  await sidebar.getByRole('button',{name,exact:true}).click();
  await page.waitForURL(url=>url.href!==previousUrl,{timeout:20000});
  const url=new URL(page.url());url.searchParams.set('lang','ko');
  if(url.origin!==new URL(sourceRoot).origin||!url.href.startsWith(sourceRoot+'/'))throw Error('Unexpected source URL');
  await page.goto(url.href,{waitUntil:'networkidle',timeout:60000});
  await page.getByRole('heading',{name:'점성술',exact:true}).waitFor();
  await page.locator('table').first().waitFor();
  const tables=await page.locator('table').evaluateAll(es=>es.map(t=>Array.from(t.rows,r=>Array.from(r.cells,c=>c.innerText.trim()))));
  const listed=classification(tables);known??=listed;
  if(JSON.stringify([...known])!==JSON.stringify([...listed]))throw Error('Source changed during collection');
  if(!known.has(name))throw Error('Unverified menu entry: '+name);
  const spec=parseSpecification(name,tables);
  if(spec.central!==undefined&&spec.central!==known.get(name))throw Error('Conflicting central count');
  spec.central=known.get(name);
  discovered.push({name,central:known.get(name),url:url.href,spec});
 }
 if(names.length!==known.size||previous.some(s=>!known.has(s.name)))throw Error('Source lost an existing constellation');
 const {accepted,pending}=mergeSpecifications(previous,discovered);
 const snapshot={source:sourceRoot,dataHash:createHash('sha256').update(JSON.stringify(accepted)).digest('hex'),discovered:discovered.map(({spec,...record})=>record),pending};
 let old;try{old=JSON.parse(await fs.readFile(statusFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const comparable=old&&(({updatedAt,...rest})=>rest)(old);
 if(JSON.stringify(comparable)!==JSON.stringify(snapshot))await fs.writeFile(statusFile,JSON.stringify({updatedAt:new Date().toISOString(),...snapshot},null,2)+'\n');
 if(JSON.stringify(previous)!==JSON.stringify(accepted))await fs.writeFile(dataFile,'// Updated from validated official tables; incomplete entries retain the last accepted values.\nexport const astrologyConstellations='+JSON.stringify(accepted,null,2)+';\n');
 console.log(JSON.stringify({accepted:accepted.length,pending:pending.map(p=>({name:p.name,missing:p.missing}))}));
}finally{await browser.close();}
