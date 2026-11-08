import {mkdir,writeFile,rm,appendFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export function archiveEntries(list) {
 const names=list.trim().split(/\r?\n/).filter(Boolean);
 if(names.length>64||!names.includes('index.html')||new Set(names).size!==names.length||names.some(n=>n!=='.nojekyll'&&!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}\.(?:html|mjs|js|css|svg|json)$/.test(n)))throw Error('Invalid preview artifact file list.');
 return names;
}
export function matchingRun(runs,pr,repositoryId) {
 return runs.find(run=>run.conclusion==='success'&&run.event==='pull_request'&&run.head_sha===pr.head.sha&&run.head_repository?.id===repositoryId&&run.pull_requests?.some(p=>p.number===pr.number));
}
export async function assemblePreviews({repository=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN,fetchImpl=globalThis.fetch,dist=new URL('../dist/',import.meta.url),summary=process.env.GITHUB_STEP_SUMMARY}={}) {
 if(!/^[\w.-]+\/[\w.-]+$/.test(repository||'')||!token)throw Error('GitHub repository and workflow token are required.');
 const base='https://api.github.com/repos/'+repository;
 async function api(path,bytes=false) {
  const response=await fetchImpl(base+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('GitHub API returned HTTP '+response.status+'.');
  if(!bytes)return response.json();
  if(Number(response.headers.get('content-length'))>10000000)throw Error('Preview artifact too large.');
  const data=Buffer.from(await response.arrayBuffer());if(data.length>10000000)throw Error('Preview artifact too large.');return data;
 }
 const repo=await api(''),prs=(await api('/pulls?state=open&per_page=100')).filter(pr=>pr.head.repo?.id===repo.id&&pr.base.ref===repo.default_branch);
 // Rebuild from open PRs each time: closing a PR removes it at the next deployment.
 await rm(new URL('previews/',dist),{recursive:true,force:true});
 const published=[];
 for(const pr of prs.slice(0,20)) {
  let runs;try{runs=await api('/actions/workflows/preview.yml/runs?event=pull_request&status=success&head_sha='+encodeURIComponent(pr.head.sha)+'&per_page=20');}catch(error){console.warn('No preview workflow results for PR',pr.number);continue;}
  const run=matchingRun(runs.workflow_runs||[],pr,repo.id);if(!run)continue;
  const artifact=(await api('/actions/runs/'+run.id+'/artifacts')).artifacts?.find(a=>a.name==='pr-preview'&&!a.expired);if(!artifact)continue;
  const temp=await mkdtemp(join(tmpdir(),'gleiswerk-preview-'));
  try {
   const zip=join(temp,'preview.zip');await writeFile(zip,await api('/actions/artifacts/'+artifact.id+'/zip',true));
   const names=archiveEntries(execFileSync('unzip',['-Z1',zip],{encoding:'utf8',maxBuffer:32768})),target=new URL('previews/pr-'+pr.number+'/',dist);await mkdir(target,{recursive:true});
   let total=0;
   for(const name of names){const data=execFileSync('unzip',['-p',zip,name],{maxBuffer:2000000});total+=data.length;if(total>10000000)throw Error('Expanded preview exceeds size limit.');await writeFile(new URL(name,target),data);}
   // Static banner, inserted by the trusted default branch rather than PR code.
   const {readFile}=await import('node:fs/promises');const html=await readFile(new URL('index.html',target),'utf8');
   const banner=`<aside style="padding:10px 16px;background:#f4dca8;color:#38280e;font:14px system-ui;text-align:center">Preview of PR #${pr.number} · <a style="color:inherit" href="https://github.com/${repository}/pull/${pr.number}">View pull request</a> · Inventory is separate from the published app.</aside>`;
   await writeFile(new URL('index.html',target),html.replace(/<body\b[^>]*>/i,match=>match+banner));
   published.push(pr.number);
  } catch(error) {await rm(new URL('previews/pr-'+pr.number+'/',dist),{recursive:true,force:true});console.warn('Preview skipped for PR',pr.number,':',error.message);}
  finally {await rm(temp,{recursive:true,force:true});}
 }
 if(summary)await appendFile(summary,'\n### PR previews\n'+(published.length?published.map(n=>`- PR #${n}: https://${repository.split('/')[0]}.github.io/${repository.split('/')[1]}/previews/pr-${n}/`).join('\n'):'No current preview builds available.')+'\n');
 console.log('Published preview paths:',published.map(n=>'previews/pr-'+n+'/').join(', ')||'none');return published;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await assemblePreviews();
