#!/usr/bin/env node
// Review-only probes. Production functions run unmodified with UI/timer stubs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(process.argv[2] || '/private/tmp/ops-concierge-review-003-next');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('js/app.js');
function slice(start, end) {
  const a = app.indexOf(start);
  const b = app.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Production boundaries changed');
  return app.slice(a, b);
}
const okRead = (tool, observations) => ({ok: true, source: 'mock', tool, observations, outcome: {}, error: null});
function context(fetchImpl, memory = {}) {
  const c = {
    console, Date, Math, JSON, structuredClone, AbortController, setTimeout, clearTimeout,
    OPS_MCP: {enabled: true, baseUrl: 'http://127.0.0.1:8766'}, fetch: fetchImpl,
    localStorage: {getItem: key => memory[key] || null, setItem: (key,v) => {memory[key]=String(v);}, removeItem: key => {delete memory[key];}},
    sleep: async () => {}, setChips: () => {}, proposalChips: () => [], renderCards: () => {}, syncChrome: () => {},
    messages: [], timeline: [], opSeq: 0, reviewMemory: memory
  };
  c.window=c;
  vm.createContext(c);
  for (const rel of ['js/scenarios.js','js/session-state.js','js/planner.js','js/intent.js','js/mcp-client.js']) vm.runInContext(read(rel),c,{filename:rel});
  c.store=c.OpsState.createStore();
  c.store.startStory('doorstep');
  const proposal=c.OpsPlanner.buildProposal({storyId:'doorstep',results:[okRead('ring.query',{motion:true,parcelVisual:true}),okRead('order.lookup',{eta:'16:00-18:00 SAST'})],facts:{neighbourAvailable:false}});
  c.store.setProposal(proposal);
  c.state={scenarioId:'doorstep',scenario:c.store.getFixture(),sessionId:'review-session',phase:'proposed',proposal,lastResults:[],tools:[],messages:[],forceToolFail:false};
  c.pushMsg=(role,text)=>{c.state.messages.push({role,text});};
  c.pushTool=(name,status,meta)=>{c.state.tools.push({name,status,meta});return c.state.tools.length-1;};
  c.updateTool=(i,status,meta)=>{Object.assign(c.state.tools[i],{status,meta});};
  c.setThinking=value=>{c.state.thinking=value;};
  for (const [a,b] of [
    ['  function nextOpId(', '\n  function persistDemo('],
    ['  function persistDemo(', '\n  function hydrateUiFromSession('],
    ['  function hydrateUiFromSession(', '\n  function syncSessionMessagesTools('],
    ['  function syncSessionMessagesTools(', '\n  function canResumeSession('],
    ['  function mcpArgsFor(', '\n  function renderChat('],
    ['  async function handleApprove(', '\n  async function switchToOtherStory('],
    ['  function ticketText(', '\n  function proposalCardHtml(']
  ]) vm.runInContext(slice(a,b),c);
  return c;
}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const success=(tool,extra={})=>({ok:true,source:'bridge',operationId:'server_'+tool,tool,meta:tool+' ok',detail:extra});

async function droppedResponse() {
  const calls=[];
  const c=context(async(url,init)=>{
    if(url.endsWith('/healthz'))return response({ok:true});
    calls.push(JSON.parse(init.body));
    throw new TypeError('fetch failed after request dispatch');
  });
  let mockCalled=false;
  const result=await c.runTool('notify.household','notify',async()=>{mockCalled=true;return {meta:'mock queued',outcome:{queued:true}};},{requireBridge:false});
  return {method:'Production client and runner; injected fetch rejection after recording POST',calls,mockCalled,result,timeline:c.state.tools};
}
async function retry(reload = false) {
  const calls=[];
  let taskAttempts=0;
  const fetchImpl=async(url,init)=>{
    if(url.endsWith('/healthz'))return response({ok:true});
    const request=JSON.parse(init.body);calls.push(request);
    if(request.tool==='task.open'&&++taskAttempts===1)return response({ok:false,source:'bridge',tool:request.tool,operationId:'failed_task',error:{code:'tool_error',message:'First task attempt failed'},meta:'task failed'},500);
    return response(success(request.tool,request.tool==='task.open'?{id:'GUEST-10421',status:'draft'}:{queued:true}));
  };
  const c=context(fetchImpl);
  await c.handleApprove('approve',{intent:'approve'});
  const first={phase:c.state.phase,counts:c.store.getActionCounts(),messages:c.state.messages.slice(),tools:c.state.tools.slice()};
  let target=c;
  if(reload){
    target=context(fetchImpl,{...c.reviewMemory});
    if(!target.store.load().ok)throw new Error('Reload failed');
    target.hydrateUiFromSession(target.store.getSession());
  }
  await target.handleApprove('approve',{intent:'approve'});
  return {method:'Production client, runner, approval coordinator and store; injected HTTP responses',reload,first,afterRetry:{phase:target.state.phase,counts:target.store.getActionCounts(),calls,messages:target.state.messages,proposal:target.state.proposal,artifact:target.ticketText(target.state.scenario)}};
}
async function unknownRetry(reload = false) {
  const calls=[];
  let bridgeUp=true;
  const fetchImpl=async(url,init)=>{
    if(url.endsWith('/healthz')){calls.push({method:'GET',healthOk:bridgeUp});return response({ok:bridgeUp},bridgeUp?200:503);}
    calls.push({method:'POST',request:JSON.parse(init.body)});
    throw new TypeError('Connection lost after POST dispatch');
  };
  const firstContext=context(fetchImpl);
  await firstContext.handleApprove('approve',{intent:'approve'});
  const first={phase:firstContext.state.phase,lastResult:firstContext.state.lastResults.at(-1),progress:firstContext.store.getOperationProgress(firstContext.state.proposal.planId)};
  bridgeUp=false;
  let target=firstContext;
  if(reload){
    target=context(fetchImpl,{...firstContext.reviewMemory});
    if(!target.store.load().ok)throw new Error('Unknown operation reload failed');
    target.hydrateUiFromSession(target.store.getSession());
  }
  await target.handleApprove('approve',{intent:'approve'});
  return {method:'Production client, runner, coordinator and store; POST rejection followed by unavailable bridge',reload,first,afterRetry:{phase:target.state.phase,counts:target.store.getActionCounts(),results:target.state.lastResults,progress:target.store.getOperationProgress(target.state.proposal.planId),calls,messages:target.state.messages,artifact:target.ticketText(target.state.scenario)}};
}
async function actualHttp() {
  const calls=[];
  const c=context(async(url,init)=>{
    const res=await fetch(url,init);
    const body=await res.json();
    calls.push({url,request:init.body?JSON.parse(init.body):null,status:res.status,response:body});
    return response(body,res.status);
  });
  const inspection=[];
  for(const tool of ['ring.query','order.lookup','session.ack','calendar.propose']) inspection.push(await c.runTool(tool,tool,async()=>({meta:'unexpected mock',observations:{}}),{}));
  const bridgeProposal=c.OpsPlanner.buildProposal({storyId:'doorstep',results:inspection,fixture:c.state.scenario});
  const outputs=[];
  for(const tool of ['notify.household','task.open']) outputs.push(await c.runTool(tool,tool,async()=>({meta:'unexpected mock',outcome:{}}),{requireBridge:false}));
  return {method:'Production client and runner against actual localhost MCP demo bridge; action payload checks are independent of the inspection-derived proposal',calls,inspection,bridgeProposal,outputs};
}
(async()=>{
  const c=context(fetch);
  const cases={
    no_results:[],
    false_event_no_order:[okRead('ring.query',{motion:false,parcelVisual:false})],
    order_failed:[okRead('ring.query',{motion:true,parcelVisual:true}),{ok:false,tool:'order.lookup',error:{code:'unavailable'}}],
    all_bedtime_reads_failed:[{ok:false,tool:'ring.query',error:{code:'unavailable'}},{ok:false,tool:'order.lookup',error:{code:'unavailable'}}]
  };
  const uncertainty={};
  for(const[name,results]of Object.entries(cases)){
    const storyId=name.startsWith('all_bedtime')?'bedtime':'doorstep';
    const p=c.OpsPlanner.buildProposal({storyId,results});
    const s=c.OpsState.createStore();s.startStory(storyId);s.setProposal(p);
    uncertainty[name]={proposal:p,approval:s.approve(p.planId)};
  }
  const conditionals=['Go ahead if the parcel is ours','Do it after Mira confirms','Yes, approve if Mira is available','Approve plan_1 when Mira confirms'].map(utterance=>c.OpsIntent.classify(utterance));
  const out={checkout:root,conditionals,uncertainty,droppedResponse:await droppedResponse(),retry:await retry(),retryAfterReload:await retry(true),unknownRetry:await unknownRetry(),unknownRetryAfterReload:await unknownRetry(true),actualHttp:await actualHttp()};
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
