import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function normalizeMarkdown(input = "") {
  let t = String(input ?? "");

  // 0) 혹시 HTML <br> 들어오면 줄바꿈으로
  t = t.replace(/<br\s*\/?>/gi, "\n");

  // 1) 구분선/헤더는 무조건 줄바꿈 벌리기
  t = t.replace(/\s---\s/g, "\n\n---\n\n");
  t = t.replace(/\s###\s/g, "\n\n### ");
  t = t.replace(/\s####\s/g, "\n\n#### ");

  // 2) 번호 목록 "1. " "2. " 는 새 문단으로
  t = t.replace(/\s(\d+)\.\s+/g, "\n\n$1. ");

  // 3) 불릿 "- " 는 새 줄로 (단, 숫자 범위 2,400~2,600 같은 문장은 건드리지 않게)
  //    " - " 앞에 콜론이 있으면(칼로리: - 이런 경우) 안 건드림
  t = t.replace(/([^:\n])\s-\s+/g, "$1\n- ");

  // 4) TOTAL 라인 강조되게 문단 분리
  t = t.replace(/\s\*\*TOTAL\*\*:/g, "\n\n**TOTAL**:");

  // 5) 전체 섭취/핵심 원칙 같은 섹션도 벌리기
  t = t.replace(/\s(### 전체 섭취)/g, "\n\n$1");
  t = t.replace(/\s(### 핵심 원칙)/g, "\n\n$1");

  // 6) 과한 줄바꿈 정리
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

export default function MarkdownMessage({ text }) {
  if (!text) return null;
  const normalized = normalizeMarkdown(text);

  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized}</ReactMarkdown>
    </div>
  );
}
