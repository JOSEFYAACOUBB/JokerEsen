import React, { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy, ChevronRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Static quiz data
// ─────────────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 1,
    suit: "♥",
    question: "من عام قداش عندو Club Joker؟",
    choices: ["3 ans", "5 ans", "10 ans", "7 ans"],
    correct: "10 ans",
  },
  {
    id: 2,
    suit: "♠",
    question: "وقتاش تأسس Club Joker؟",
    choices: ["2020", "2023", "2016", "2021"],
    correct: "2016",
  },
  {
    id: 3,
    suit: "♦",
    question: "على قداش من axes يخدم Joker؟",
    choices: ["3 axes", "2 axes", "5 axes", "4 axes"],
    correct: "4 axes",
  },
  {
    id: 4,
    suit: "♣",
    question: "قدّاش من مرة Club Joker فاز بلقب «Meilleur Club» في جامعة منوبة؟",
    choices: ["2 fois", "1 fois", "3 fois", "4 fois"],
    correct: "2 fois",
  },
  {
    id: 5,
    suit: "♥",
    question: "شنيا أكثر حاجة تميز Joker؟",
    choices: ["Sans entretien", "Camping", "Marathon", "Formation"],
    correct: "Sans entretien",
  },
] as const;

const RESULTS = [
  { min: 0, max: 1, emoji: "😩", labelAr: "امورك تاعبة",   labelFr: "1 / 5",  color: "#E05C6E", bg: "rgba(160,40,60,0.12)",  desc: "تحاول تاني وجيب نتيجة أحسن !" },
  { min: 2, max: 2, emoji: "😶", labelAr: "مكش مركز",      labelFr: "2 / 5",  color: "#D4854A", bg: "rgba(180,90,40,0.12)",  desc: "شوية ركيزة وتنجم تعمل أحسن." },
  { min: 3, max: 3, emoji: "🔄", labelAr: "جرب مرة أخرى", labelFr: "3 / 5",  color: "#C9A83F", bg: "rgba(170,140,30,0.12)", desc: "قريب ولكن محتاج تعاود." },
  { min: 4, max: 4, emoji: "🌟", labelAr: "معلم",           labelFr: "4 / 5",  color: "#4B9E6F", bg: "rgba(50,140,90,0.12)",  desc: "تقريبًا مكمّل ! Joker يستناك." },
  { min: 5, max: 5, emoji: "🃏", labelAr: "Joker !",        labelFr: "5 / 5",  color: "#A73541", bg: "rgba(167,53,65,0.15)", desc: "100% — انت من جماعتنا بالكامل 🎉" },
];

function getResult(score: number) {
  return RESULTS.find((r) => score >= r.min && score <= r.max) ?? RESULTS[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const ClubQuiz: React.FC = () => {
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore]         = useState(0);
  const [answers, setAnswers]     = useState<boolean[]>([]);
  const [done, setDone]           = useState(false);
  const [entering, setEntering]   = useState(false);

  const q       = QUESTIONS[current];
  const isRight = selected === q.correct;
  const result  = done ? getResult(score) : null;

  const pick = (choice: string) => { if (!confirmed) setSelected(choice); };

  const confirm = () => {
    if (!selected || confirmed) return;
    const ok = selected === q.correct;
    setConfirmed(true);
    setScore((s) => (ok ? s + 1 : s));
    setAnswers((prev) => [...prev, ok]);
  };

  const next = () => {
    setEntering(true);
    setTimeout(() => {
      if (current + 1 >= QUESTIONS.length) { setDone(true); }
      else { setCurrent((c) => c + 1); setSelected(null); setConfirmed(false); }
      setEntering(false);
    }, 180);
  };

  const reset = () => {
    setCurrent(0); setSelected(null); setConfirmed(false);
    setScore(0);   setAnswers([]);     setDone(false);
  };

  const progress = ((current + (confirmed ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <section
      id="quiz"
      className="relative py-16 sm:py-24 bg-[#FAF7F5] overflow-hidden border-b border-[#EDE4DE]"
    >
      {/* ── Ambient floating orbs (light brand palette) ── */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-[#A73541]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#4B5B9E]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-36 h-36 bg-[#E8B9A8]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Dot-grid texture */}
      <div className="dot-grid opacity-20 pointer-events-none" aria-hidden="true" />

      {/* ── Large decorative suits ── */}
      {["♠", "♥", "♦", "♣"].map((s, i) => (
        <span key={s} aria-hidden="true" style={{
          position: "absolute", fontFamily: "'Bebas Neue',sans-serif",
          fontSize: `${6 + i * 2.5}rem`, opacity: 0.05, userSelect: "none", pointerEvents: "none",
          top: `${8 + i * 20}%`,
          ...(i % 2 === 0 ? { left: `${2 + i}%` } : { right: `${2 + i}%` }),
          transform: `rotate(${i * 18 - 20}deg)`, color: i % 2 === 0 ? "#A73541" : "#4B5B9E", lineHeight: 1,
        }}>{s}</span>
      ))}

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">

        {/* ── Section header ── */}
        <div className="text-center mb-10 sm:mb-14 space-y-3">
          {/* Chapter badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A73541]/10 border border-[#A73541]/25 text-[#A73541] text-[10px] font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A73541] animate-pulse" />
            Club Quiz · كلوب جوكر
          </div>

          {/* Big heading — Arabic in Noto Kufi Arabic, Latin in font-display */}
          <h2 className="font-display text-4xl sm:text-6xl font-black text-[#2A2020] leading-none uppercase tracking-tight">
            <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>كيفاش </span>
            <span style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", color: "#A73541" }}>تعرف</span>
            {" "}JOKER<span style={{ color: "#A73541" }}>?</span>
          </h2>
          <p style={{ fontFamily: "'Montserrat',sans-serif" }} className="text-[#5C1F2E] text-xs font-semibold uppercase tracking-wider">
            {QUESTIONS.length} questions &nbsp;·&nbsp;{" "}
            {done
              ? `Score final : ${score} / ${QUESTIONS.length}`
              : `Question ${current + 1} / ${QUESTIONS.length}`}
          </p>
        </div>

        {/* ── Progress bar ── */}
        {!done && (
          <div className="mb-6 h-1.5 rounded-full overflow-hidden bg-[#E5DDD7]">
            <div
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #A73541, #4B5B9E)", transition: "width .5s cubic-bezier(.16,1,.3,1)", height: "100%", borderRadius: 9999 }}
            />
          </div>
        )}

        {/* ══════════ RESULT SCREEN ══════════ */}
        {done && result && (
          <div className="rounded-[28px] overflow-hidden bg-[#FFFFFF] border border-[#E5DDD7] shadow-[0_8px_32px_rgba(43,15,18,0.06)]">
            {/* top accent strip */}
            <div style={{ height: 4, background: `linear-gradient(90deg, #A73541, ${result.color})` }} />

            <div className="p-8 sm:p-12 text-center space-y-6">
              {/* dot trail */}
              <div className="flex justify-center gap-2">
                {answers.map((ok, i) => (
                  <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: ok ? "#4B9E6F" : "#A73541", display: "inline-block" }} />
                ))}
              </div>

              {/* emoji */}
              <div className="text-7xl sm:text-8xl leading-none select-none">{result.emoji}</div>

              {/* Arabic result label */}
              <div>
                <p style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", fontWeight: 900, fontSize: "clamp(2rem,6vw,3rem)", color: result.color, lineHeight: 1.2, direction: "rtl" }}>
                  {result.labelAr}
                </p>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", color: "#5C1F2E", fontSize: "1.1rem", letterSpacing: "0.15em", marginTop: 4 }}>
                  {result.labelFr}
                </p>
                <p style={{ fontFamily: "'Noto Kufi Arabic', sans-serif", color: "#2A2020", fontSize: "0.9rem", marginTop: 10, direction: "rtl", fontWeight: 500 }}>
                  {result.desc}
                </p>
              </div>

              {/* Score + Precision tiles */}
              <div className="flex justify-center gap-3">
                {[
                  { val: `${score}/${QUESTIONS.length}`, label: "Score" },
                  { val: `${Math.round((score / QUESTIONS.length) * 100)}%`, label: "Précision" },
                ].map((tile) => (
                  <div key={tile.label} className="px-7 py-4 rounded-2xl text-center bg-[#FAF7F5] border border-[#E5DDD7]">
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", color: "#2A2020", lineHeight: 1 }}>{tile.val}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: "0.65rem", color: "#5C1F2E", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 4, fontWeight: 700 }}>{tile.label}</div>
                  </div>
                ))}
              </div>

              {/* Replay */}
              <button onClick={reset}
                className="inline-flex items-center gap-2 cursor-pointer hover:bg-[#8C2B35] transition-all hover:scale-105"
                style={{ padding: "0.9rem 2.5rem", borderRadius: 9999, background: "#A73541", color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.12em", boxShadow: "0 4px 16px rgba(167,53,65,.25)", border: "none" }}>
                <RotateCcw size={16} />
                Rejouer
              </button>
            </div>
          </div>
        )}

        {/* ══════════ QUESTION CARD ══════════ */}
        {!done && (
          <div
            key={current}
            className="rounded-[28px] overflow-hidden bg-[#FFFFFF] border border-[#E5DDD7] shadow-[0_8px_32px_rgba(43,15,18,0.06)]"
            style={{
              opacity: entering ? 0 : 1,
              transform: entering ? "translateY(12px)" : "translateY(0)",
              transition: "opacity .18s ease, transform .18s ease",
            }}
          >
            {/* Crimson top stripe */}
            <div style={{ height: 3, background: "linear-gradient(90deg, #A73541, #4B5B9E)" }} />

            {/* Card header */}
            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-[#EDE4DE]">
              <div className="flex items-center justify-between mb-4">
                {/* Suit + question badge */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#A73541]/10 border border-[#A73541]/25 text-[#A73541]">
                  {q.suit} Question {current + 1}
                </span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", color: "#5C1F2E", fontSize: "1.1rem", letterSpacing: "0.1em" }}>
                  {current + 1} / {QUESTIONS.length}
                </span>
              </div>

              {/* ── Arabic question — Noto Kufi Arabic, bold, RTL ── */}
              <p
                dir="rtl" lang="ar"
                style={{
                  fontFamily: "'Noto Kufi Arabic', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.25rem, 3.8vw, 1.75rem)",
                  color: "#2A2020",
                  lineHeight: 1.5,
                  textAlign: "right",
                }}
              >
                {q.question}
              </p>
            </div>

            {/* Choices */}
            <div className="px-6 sm:px-8 py-5 space-y-2.5">
              {q.choices.map((choice) => {
                let state: "idle" | "selected" | "correct" | "wrong" = "idle";
                if (confirmed) {
                  if (choice === q.correct) state = "correct";
                  else if (choice === selected) state = "wrong";
                } else if (choice === selected) state = "selected";

                const styles: React.CSSProperties = {
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.875rem 1.25rem", borderRadius: 16, border: "1px solid",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "0.875rem",
                  cursor: confirmed ? "default" : "pointer",
                  transition: "all .18s cubic-bezier(.16,1,.3,1)",
                  textAlign: "left",
                  ...(state === "idle"
                    ? { background: "#FAF7F5", borderColor: "#E5DDD7", color: "#2A2020" }
                    : state === "selected"
                    ? { background: "rgba(75,91,158,0.08)", borderColor: "#4B5B9E", color: "#4B5B9E", transform: "scale(1.01)" }
                    : state === "correct"
                    ? { background: "rgba(75,158,111,0.12)", borderColor: "#4B9E6F", color: "#1A4A2E" }
                    : { background: "rgba(167,53,65,0.12)", borderColor: "#A73541", color: "#A73541" }),
                };

                return (
                  <button key={choice} onClick={() => pick(choice)} disabled={confirmed} style={styles}
                    onMouseEnter={(e) => { if (state === "idle") { (e.currentTarget as HTMLButtonElement).style.background = "#F0EBE7"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#D8CFC8"; } }}
                    onMouseLeave={(e) => { if (state === "idle") { (e.currentTarget as HTMLButtonElement).style.background = "#FAF7F5"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#E5DDD7"; } }}
                  >
                    <span>{choice}</span>
                    {state === "correct" && <CheckCircle2 size={18} style={{ color: "#4B9E6F", flexShrink: 0 }} />}
                    {state === "wrong"   && <XCircle      size={18} style={{ color: "#A73541", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {/* Feedback banner */}
            {confirmed && (
              <div className="mx-6 sm:mx-8 mb-4 px-4 py-2.5 rounded-2xl flex items-center gap-2"
                style={{
                  background: isRight ? "rgba(75,158,111,0.1)" : "rgba(167,53,65,0.1)",
                  border: `1px solid ${isRight ? "rgba(75,158,111,0.3)" : "rgba(167,53,65,0.3)"}`,
                  color: isRight ? "#1A4A2E" : "#A73541",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: "0.75rem",
                }}>
                {isRight
                  ? <><CheckCircle2 size={14} style={{ flexShrink: 0, color: "#4B9E6F" }} /> Bravo ! Bonne réponse 🎉</>
                  : <><XCircle size={14} style={{ flexShrink: 0, color: "#A73541" }} /> Réponse correcte : <strong style={{ marginLeft: 4 }}>{q.correct}</strong></>}
              </div>
            )}

            {/* Card footer: dot trail + action button */}
            <div className="px-6 sm:px-8 pb-6 flex items-center justify-between gap-3">
              {/* animated dot trail */}
              <div className="flex gap-1.5 items-center">
                {QUESTIONS.map((_, i) => {
                  const isActive  = i === current;
                  const isPast    = i < current;
                  const wasRight  = isPast && answers[i];
                  const wasWrong  = isPast && !answers[i];
                  return (
                    <span key={i} style={{
                      display: "inline-block", borderRadius: 9999,
                      width: isActive ? 20 : 8, height: 8,
                      background: isActive ? "#A73541" : wasRight ? "#4B9E6F" : wasWrong ? "#A73541" : "#E5DDD7",
                      transition: "all .3s cubic-bezier(.16,1,.3,1)",
                    }} />
                  );
                })}
              </div>

              {/* Valider / Suivant */}
              {!confirmed ? (
                <button onClick={confirm} disabled={!selected}
                  className="inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-105 hover:bg-[#8C2B35] disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
                  style={{ padding: "0.65rem 1.6rem", borderRadius: 9999, background: "#A73541", color: "#fff", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", boxShadow: "0 4px 16px rgba(167,53,65,.25)", border: "none" }}>
                  Valider
                </button>
              ) : (
                <button onClick={next}
                  className="inline-flex items-center gap-2 cursor-pointer hover:scale-105 hover:bg-[#F0EBE7] transition-all"
                  style={{ padding: "0.65rem 1.6rem", borderRadius: 9999, background: "#FAF7F5", border: "1px solid #E5DDD7", color: "#2A2020", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {current + 1 >= QUESTIONS.length
                    ? <><Trophy size={15} style={{ color: "#A73541" }} /> Résultats</>
                    : <>Suivant <ChevronRight size={15} /></>}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default ClubQuiz;
