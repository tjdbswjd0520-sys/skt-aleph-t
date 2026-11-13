const DATA_URL = "data.json";
const $ = (id) => document.getElementById(id);
const statuses = ["실천했다", "일부 실천했다", "못 했다", "기록 없음"];
function countStatuses(records) {
  const counts = Object.fromEntries(statuses.map(s => [s, 0]));
  records.forEach(r => counts[statuses.includes(r.status) ? r.status : "기록 없음"]++);
  const evaluated = counts["실천했다"] + counts["일부 실천했다"] + counts["못 했다"];
  return {recordDays:records.length,evaluatedDays:evaluated,full:counts["실천했다"],partial:counts["일부 실천했다"],notDone:counts["못 했다"],missing:counts["기록 없음"],followRate:evaluated?((counts["실천했다"]+counts["일부 실천했다"])/evaluated*100):0};
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderCandidates(items){
  const grid=$("paragraphCandidates"); if(!grid)return; grid.innerHTML="";
  (Array.isArray(items)?items:[]).forEach((c,i)=>{
    const article=document.createElement("article"), letter=String.fromCharCode(65+i), evidence=Array.isArray(c.evidence)?c.evidence:[];
    const details=evidence.length?`<details class="candidate-evidence"><summary>근거 기록 ${evidence.length}개 보기</summary><ul>${evidence.map(e=>`<li><b>${esc(e.date)}</b> · ${esc(e.field)}: ${esc(e.text)}</li>`).join("")}</ul></details>`:"";
    article.innerHTML=`<span class="evidence-no">${letter}</span><h3>${esc(c.title)}</h3><p>${esc(c.paragraph)}</p><small class="candidate-count">문단 후보에 반영한 근거 ${Number(c.evidenceCount||0)}개</small>${details}`;
    grid.append(article);
  });
}
function renderProjects(projects){
  const grid=$("projectGrid");grid.innerHTML="";
  const fallback=[{number:"10",title:"LLM 레드팀 방법론 비교 연구",description:"수동·자동·하이브리드 레드팀의 효과와 한계를 실증 연구 4편을 바탕으로 비교했습니다.",status:"연구 내용 정리",tag:"PAPER · AI SECURITY"},{number:"13",title:"앱 프로젝트",description:"13번 과제 완료 후 결과물과 구현 과정, 사용 기술을 추가합니다.",status:"자리 비워 둠"}];
  (projects.length?projects:fallback).forEach((p,i)=>{
    const article=document.createElement("article");article.className=`work-card ${i===0?"work-paper":"work-app"}`;
    const visual=i===0?`<div class="work-visual visual-paper"><div class="paper-lines"></div><span>RESEARCH<br>IN PROGRESS</span></div>`:`<div class="work-visual visual-app"><div class="app-window"><i></i><i></i><i></i><b>APP<br>COMING<br>SOON</b></div></div>`;
    article.innerHTML=`<div class="work-top"><span>PROJECT ${esc(p.number||"")}</span><span>0${i+1} / 0${projects.length}</span></div>${visual}<div class="work-info"><p class="work-status">${esc(p.status||"")}</p><h3>${esc(p.title||"")}</h3><p>${esc(p.description||"")}</p>${String(p.number)==="10"?`<a class="paper-jump" href="#project10-detail">논문 내용 바로 보기 ↓</a>`:""}<span class="work-tag">${esc(p.tag||(i===0?"PAPER · ANALYSIS":"APP · BUILD"))}</span></div>`;
    if(p.url){const a=document.createElement("a");a.href=p.url;a.target="_blank";a.rel="noopener noreferrer";a.append(article);grid.append(a);}else grid.append(article);
  });
}
function render(data){
  $("heroName").textContent=data.name||"서윤정";$("tagline").textContent=data.tagline||"작은 실행을 쌓아, 신뢰할 수 있는 결과를 만드는 사람";
  const records=Array.isArray(data.records)?data.records:[],m=countStatuses(records),dates=records.map(r=>r.date).filter(Boolean).sort(),fmt=d=>d?d.replaceAll("-","."):"날짜 미정";
  $("recordDays").textContent=m.recordDays;$("fullCount").textContent=m.full;$("partialCount").textContent=m.partial;$("notDoneCount").textContent=m.notDone;
  $("periodText").textContent=dates.length?`${fmt(dates[0])} — ${fmt(dates[dates.length-1])}`:"기록 없음";
  $("followRate").textContent=`${m.followRate.toFixed(1)}%`;$("missingText").textContent=`평가 기록 누락 ${m.missing}일`;
  const total=Math.max(1,m.evaluatedDays);$("fullBar").style.width=`${m.full/total*100}%`;$("partialBar").style.width=`${m.partial/total*100}%`;$("notDoneBar").style.width=`${m.notDone/total*100}%`;
  $("sourceNote").textContent=`집계 기준: ${dates[0]||"시작일 미정"}~${dates[dates.length-1]||"종료일 미정"} 기록 ${m.recordDays}개 날짜. 실천·일부 실천 비율은 평가가 있는 ${m.evaluatedDays}일을 분모로 계산했습니다. 현재 제공된 기록이 13주 전체 기록을 의미하지는 않습니다.`;
  renderCandidates(data.paragraphCandidates);renderProjects(data.projects||[]);
}
async function load(){try{const r=await fetch(DATA_URL,{cache:"no-store"});if(!r.ok)throw Error("data.json을 불러오지 못했습니다.");render(await r.json());}catch(e){console.error(e);const s=$("dataSourceStatus");if(s)s.textContent="기록 데이터를 불러오지 못했습니다. 로컬 서버 또는 배포 상태를 확인해 주세요.";}}
load();
