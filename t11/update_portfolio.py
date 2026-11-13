#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""BR-A 포트폴리오 기록·통계·문단 후보 자동 갱신 도구 (표준 라이브러리만 사용)."""
from __future__ import annotations
import argparse, json, re, shutil
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data.json"
ALLOWED_FIELDS = {
    "강점이 드러난 일화", "그 결과·알게 된 점", "그 결과/알게 된 점", "오늘의 첫 행동"
}
RULES = {
    "자기조절력": ("학습과 일상을 스스로 점검하고 조절한 행동", ["계획","순서","시간","집중","복습","정리","조절","관리","침착","천천히","알람","루틴","검색","오류","이해","공부량","연습"]),
    "대인관계력": ("먼저 다가가고 소통하거나 상대를 배려한 행동", ["인사","대화","소통","경청","배려","친절","사과","분위기","말을 텄","먼저","함께","상대","사람"]),
    "자기동기부여": ("관심을 구체적인 학습과 실행으로 연결한 행동", ["시작","실행","목표","관심","궁금","배우","공부","네트워크","보안","코딩","강의","자료","찾","도전","하고 싶"]),
    "회복탄력성과 지속성": ("계획이 흔들리거나 어려움이 있어도 다시 시도한 행동", ["다시","돌아","실패","못 했","무너","포기하지","계속","버티","대비","다른 방법","제시간","결석","아파","어려","고치"])
}
def clean(v: Any) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:260]

def parse_txt(path: Path):
    raw = path.read_text(encoding="utf-8-sig")
    chunks = re.split(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$", raw, flags=re.M)
    records, evidence = [], {}
    for i in range(1, len(chunks), 2):
        day, body = chunks[i], chunks[i+1] if i+1 < len(chunks) else ""
        try: date.fromisoformat(day)
        except ValueError: continue
        sm = re.search(r"^\s*-\s*강점 행동:\s*(실천했다|일부 실천했다|못 했다)\s*$", body, re.M)
        records.append({"date": day, "status": sm.group(1) if sm else "기록 없음"})
        fields, key, vals = [], None, []
        for line in body.splitlines():
            if line.strip().startswith("[") and line.strip().endswith("]"):
                if key in ALLOWED_FIELDS and vals:
                    val = clean(" ".join(vals))
                    if val: fields.append({"field": key, "text": val})
                key, vals = None, []
                continue
            m = re.match(r"^\s*-\s*([^:：]+)\s*[:：]\s*(.*)$", line)
            if m:
                if key in ALLOWED_FIELDS and vals:
                    val = clean(" ".join(vals))
                    if val: fields.append({"field": key, "text": val})
                key, vals = m.group(1).strip(), [m.group(2).strip()]
            elif key in ALLOWED_FIELDS and line.strip() and not line.lstrip().startswith("-"):
                vals.append(line.strip())
        if key in ALLOWED_FIELDS and vals:
            val = clean(" ".join(vals))
            if val: fields.append({"field": key, "text": val})
        if fields: evidence[day] = fields
    if not records: raise ValueError("날짜 제목 '## YYYY-MM-DD' 형식을 찾지 못했습니다.")
    return records, evidence

def parse_json(path: Path):
    obj = json.loads(path.read_text(encoding="utf-8-sig"))
    incoming = obj.get("records") if isinstance(obj, dict) else obj
    if not isinstance(incoming, list): raise ValueError("JSON은 records 배열 또는 기록 객체 배열이어야 합니다.")
    records, evidence = [], {}
    for item in incoming:
        if not isinstance(item, dict) or not item.get("date"): continue
        day = str(item["date"]); date.fromisoformat(day)
        status = item.get("status", "기록 없음")
        if status not in {"실천했다","일부 실천했다","못 했다","기록 없음"}:
            raise ValueError(f"{day}: 알 수 없는 상태값 {status}")
        records.append({"date": day, "status": status})
        evs = item.get("evidence", [])
        if isinstance(evs, list):
            cleaned = [{"field": str(e.get("field","")), "text": clean(e.get("text",""))}
                       for e in evs if isinstance(e,dict) and e.get("text") and e.get("field") in ALLOWED_FIELDS]
            if cleaned: evidence[day] = cleaned
    if not records: raise ValueError("JSON에서 날짜가 있는 기록을 찾지 못했습니다.")
    return records, evidence

def build_candidates(evidence_by_date):
    out = []
    for title, (description, keywords) in RULES.items():
        matches, seen = [], set()
        for day in sorted(evidence_by_date):
            for item in evidence_by_date[day]:
                txt = clean(item.get("text"))
                score = sum(1 for word in keywords if word in txt)
                if score and txt not in seen:
                    matches.append({"date":day,"field":item.get("field","기록"),"text":txt,"score":score})
                    seen.add(txt)
        matches.sort(key=lambda x:(-x["score"],x["date"]))
        selected = matches[:4]
        if selected:
            excerpt = " · ".join(f"{x['date']} 기록에는 “{x['text']}”라고 적었습니다" for x in selected[:3])
            paragraph = f"{description}과 관련해 현재 기록에서 확인되는 사례입니다. {excerpt}. 이 문단은 실제 경험의 맥락과 표현이 정확한지 확인한 뒤 공개해 주세요."
        else:
            paragraph = "현재 입력된 기록에서 이 주제를 뒷받침하는 구체적인 본인 행동을 충분히 찾지 못했습니다. 관련 기록이 추가되면 문단 후보가 생성됩니다."
        out.append({"title":title,"description":description,"paragraph":paragraph,"evidenceCount":len(selected),
                    "evidence":[{k:x[k] for k in ("date","field","text")} for x in selected],
                    "dates":sorted({x["date"] for x in selected})})
    return out

def main():
    ap=argparse.ArgumentParser(description="BR-A 포트폴리오 자동 갱신")
    ap.add_argument("input_file", nargs="?")
    ap.add_argument("--replace", action="store_true", help="기존 기록을 신규 파일 내용으로 교체")
    args=ap.parse_args()
    typed=args.input_file or input("리추얼 TXT 또는 JSON 파일 경로를 입력하세요: ").strip().strip('"')
    src=Path(typed).expanduser()
    if not src.is_absolute(): src=(Path.cwd()/src).resolve()
    if not src.is_file(): print(f"[오류] 파일을 찾을 수 없습니다: {src}"); return 1
    try:
        incoming, incoming_evidence = parse_json(src) if src.suffix.lower()==".json" else parse_txt(src)
        current=json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else {"name":"서윤정","records":[]}
        old=current.get("records",[])
        merged={r["date"]:{"date":r["date"],"status":r.get("status","기록 없음")} for r in old}
        if args.replace: merged={}
        for r in incoming: merged[r["date"]]=r
        records=[merged[k] for k in sorted(merged)]
        evidence_by_date={}
        # 이전에 생성된 후보의 근거를 보존합니다.
        for c in current.get("paragraphCandidates",[]):
            for ev in c.get("evidence",[]):
                evidence_by_date.setdefault(ev["date"],[]).append({"field":ev.get("field","기록"),"text":ev.get("text","")})
        evidence_by_date.update(incoming_evidence)
        counts=Counter(r.get("status","기록 없음") for r in records)
        full, partial, missed, missing=(counts["실천했다"],counts["일부 실천했다"],counts["못 했다"],counts["기록 없음"])
        evaluated=full+partial+missed
        dates=[r["date"] for r in records]
        current["records"]=records
        current["metrics"]={"recordDays":len(records),"evaluatedDays":evaluated,"full":full,"partial":partial,
                            "notDone":missed,"missing":missing,"followRate":round((full+partial)/evaluated*100,1) if evaluated else 0}
        current["period"]={"start":min(dates),"end":max(dates)} if dates else {}
        current["paragraphCandidates"]=build_candidates(evidence_by_date)
        current["updatedAt"]=datetime.now().date().isoformat()
        current["sourceNote"]=f"현재 반영된 기록은 {len(records)}개 날짜({min(dates)}~{max(dates)})입니다. 제공된 전체 13주 기록과 동일하다고 단정하지 않습니다." if dates else "반영된 기록이 없습니다."
        backup=DATA_FILE.with_suffix(".json.bak")
        if DATA_FILE.exists(): shutil.copy2(DATA_FILE,backup)
        DATA_FILE.write_text(json.dumps(current,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("\n[완료] 포트폴리오 데이터 갱신 완료")
        print(f"- 이번 입력: {len(incoming)}일 | 누적: {len(records)}일")
        print(f"- 실천 {full}일 / 일부 실천 {partial}일 / 미실천 {missed}일 / 평가 누락 {missing}일")
        print(f"- 실천 또는 일부 실천 비율: {current['metrics']['followRate']:.1f}% (평가가 있는 {evaluated}일 기준)")
        print("- 문단 후보: 자기조절력, 대인관계력, 자기동기부여, 회복탄력성과 지속성")
        print(f"- 갱신 파일: {DATA_FILE}")
        if backup.exists(): print(f"- 백업 파일: {backup}")
        print("로컬 사이트에서 확인한 뒤, 문단 후보와 공개 범위를 검토하고 GitHub에 커밋하세요.")
        return 0
    except Exception as e:
        print(f"[오류] 갱신 실패: {e}"); return 1

if __name__=="__main__": raise SystemExit(main())
