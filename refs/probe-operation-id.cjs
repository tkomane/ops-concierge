#!/usr/bin/env node
// Review-only: verify stable operation identity across structured bridge errors.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const harnessPath = path.join(__dirname, 'probe-next.cjs');
const source = fs.readFileSync(harnessPath, 'utf8');
const harness = new Module(harnessPath, module);
harness.filename = harnessPath;
harness.paths = module.paths;
harness._compile(source.slice(0, source.indexOf('(async()=>{')) + '\nmodule.exports={context,response};', harnessPath);
const {context,response} = harness.exports;
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'bridge-error-responses.json'),'utf8'));
const snapshot = c => ({phase:c.state.phase,counts:c.store.getActionCounts(),progress:c.store.getOperationProgress(c.state.proposal.planId)});

async function run(tool, uncertainFirst, reload) {
  const calls=[];
  let attempts=0;
  const error = fixture.results.find(x=>x.request.tool === tool);
  const fetchImpl=async(url,init)=>{
    if(url.endsWith('/healthz')) return response({ok:true});
    const request=JSON.parse(init.body);
    calls.push(request);
    if(request.tool === tool) {
      attempts++;
      if(uncertainFirst && attempts === 1) throw new TypeError('Response lost after dispatch');
      if(attempts === (uncertainFirst ? 2 : 1)) return response(error.body,error.status);
    }
    return response({ok:true,source:'bridge',tool:request.tool,operationId:request.arguments.operationId,meta:'success',outcome:request.tool === 'task.open' ? {id:'GUEST-10421',status:'draft'} : {queued:true}});
  };
  let c=context(fetchImpl);
  const stages=[];
  for(let stage=0; stage<(uncertainFirst ? 3 : 2); stage++) {
    if(stage>0 && reload) {
      c=context(fetchImpl,{...c.reviewMemory});
      if(!c.store.load().ok) throw new Error('Persisted review state failed to reload');
      c.hydrateUiFromSession(c.store.getSession());
    }
    if(stage>0) await c.OpsMcpClient.probeHealth(true);
    await c.handleApprove('approve',{intent:'approve'});
    stages.push(snapshot(c));
  }
  const operationIds=calls.filter(x=>x.tool===tool).map(x=>x.arguments.operationId);
  return {tool,uncertainFirst,reload,calls,stages,operationIds,stableOperationId:new Set(operationIds).size === 1};
}

(async()=>{
  const cases=[];
  for(const tool of ['notify.household','task.open']) {
    for(const uncertainFirst of [false,true]) {
      for(const reload of [false,true]) cases.push(await run(tool,uncertainFirst,reload));
    }
  }
  const failures=cases.filter(x=>!x.stableOperationId).length;
  process.stdout.write(JSON.stringify({checkout:process.argv[2],method:'Production client, runner, coordinator and store with injected fetch; structured error bodies captured from the actual HTTP route',failures,cases},null,2)+'\n');
  if(failures) process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
