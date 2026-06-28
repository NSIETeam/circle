'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon, CheckCircleIcon, SparklesIcon, CpuIcon,
} from '../../components/icons';
import {
  QUESTIONS, STAGES, DIMENSIONS, DIMENSION_COLORS,
  getStage, getDimensionScores, getDimensionLevel,
  type Question, type StageInfo,
} from '../../lib/assessment-data';

type Phase = 'intro' | 'quiz' | 'result';

export default function AssessmentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);      // 当前题目索引 0-14
  const [answers, setAnswers] = useState<Record<number, number>>({}); // {题号: 分数}
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const totalQuestions = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIdx];
  const answeredCount = Object.keys(answers).length;

  // 选择答案后自动前进
  const handleSelect = (q: Question, score: number) => {
    const newAnswers = { ...answers, [q.id]: score };
    setAnswers(newAnswers);

    // 延迟一下让用户看到选中效果
    setTimeout(() => {
      if (currentIdx < totalQuestions - 1) {
        setDirection('next');
        setCurrentIdx(currentIdx + 1);
      } else {
        // 最后一题，进入结果
        setPhase('result');
      }
    }, 280);
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setDirection('prev');
      setCurrentIdx(currentIdx - 1);
    }
  };

  const goNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setDirection('next');
      setCurrentIdx(currentIdx + 1);
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrentIdx(0);
    setPhase('intro');
  };

  // ===== 介绍页 =====
  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* 顶部导航 */}
        <div style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center',
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
        }}>
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/profile`); }}
            style={backBtnStyle}
          >
            <ChevronLeftIcon size={18} color="var(--text-secondary)" />
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>
            AI转型成熟度诊断
          </span>
          <div style={{ width: 36 }} />
        </div>

        {/* Hero */}
        <div style={{
          padding: '40px 24px 32px',
          background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
          color: '#fff',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CpuIcon size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            企业AI转型成熟度诊断
          </h1>
          <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
            15题自检 · 5个维度雷达图 · 精准定位你的AI转型阶段
          </p>
        </div>

        {/* 阶段总览 */}
        <div style={{ padding: '20px 16px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
            五大阶段
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STAGES.map((s, i) => (
              <div key={s.code} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: stageBgColor(s.code), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                }}>
                  {s.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
                    {s.feature}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {s.minScore}-{s.maxScore}分 · {s.summary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 维度说明 */}
        <div style={{ padding: '0 16px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
            5维度雷达图
          </h2>
          <div className="card" style={{ padding: '16px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              将每3题得分加总（满分15分），得到5个维度的诊断，雷达图直观显示企业短板。
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIMENSIONS.map(d => (
                <span key={d.key} style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                  background: DIMENSION_COLORS[d.key] + '15',
                  color: DIMENSION_COLORS[d.key],
                }}>
                  {d.key} (Q{d.questionIds[0]}-Q{d.questionIds[2]})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 开始按钮 */}
        <div style={{ padding: '0 16px 40px' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '15px' }}
            onClick={() => setPhase('quiz')}
          >
            <SparklesIcon size={18} color="#fff" />
            <span style={{ marginLeft: 6 }}>开始诊断</span>
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            每题选项 A=1分 / B=2分 / C=3分 / D=4分 / E=5分 · 满分75分
          </p>
        </div>
      </div>
    );
  }

  // ===== 答题页 =====
  if (phase === 'quiz') {
    const progress = ((currentIdx + 1) / totalQuestions) * 100;
    const selectedScore = answers[currentQuestion.id];

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部导航 + 进度 */}
        <div style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
        }}>
          <button onClick={goPrev} disabled={currentIdx === 0} style={{
            ...backBtnStyle,
            opacity: currentIdx === 0 ? 0.4 : 1,
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
          }}>
            <ChevronLeftIcon size={18} color="var(--text-secondary)" />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {currentIdx + 1} / {totalQuestions}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: '#fff',
                background: stageBgColor(currentQuestion.stage),
                padding: '2px 8px', borderRadius: 10,
              }}>
                {currentQuestion.stage} {currentQuestion.stageName}
              </span>
            </div>
            {/* 进度条 */}
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                borderRadius: 2, transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>

        {/* 题目区 */}
        <div style={{
          flex: 1, padding: '24px 16px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div key={currentQuestion.id} style={{
            animation: `${direction === 'next' ? 'slideInRight' : 'slideInLeft'} 0.3s ease`,
          }}>
            {/* 题号 + 题目 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'inline-block', fontSize: 12, fontWeight: 700,
                color: 'var(--primary)', background: 'var(--primary-surface)',
                padding: '3px 10px', borderRadius: 12, marginBottom: 10,
              }}>
                Q{currentQuestion.id}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, color: 'var(--text)' }}>
                {currentQuestion.title}
              </h2>
            </div>

            {/* 选项 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {currentQuestion.options.map(opt => {
                const isSelected = selectedScore === opt.score;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelect(currentQuestion, opt.score)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-lg)',
                      border: isSelected
                        ? `2px solid var(--primary)`
                        : '1.5px solid var(--border)',
                      background: isSelected ? 'var(--primary-surface)' : 'var(--card)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      border: isSelected ? 'none' : '1.5px solid var(--border-strong)',
                      background: isSelected ? 'var(--primary)' : 'var(--card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}>
                      {isSelected ? <CheckCircleIcon size={16} color="#fff" /> : opt.key}
                    </div>
                    <span style={{
                      flex: 1, fontSize: 14, lineHeight: 1.5,
                      color: isSelected ? 'var(--text)' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {opt.text}
                    </span>
                    <span style={{
                      fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
                    }}>
                      {opt.score}分
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div style={{
          padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: 'var(--card)', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
            已答 {answeredCount}/{totalQuestions} 题
          </span>
          {currentIdx < totalQuestions - 1 ? (
            <button
              onClick={goNext}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--card)',
                fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
              }}
            >
              跳过
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: '10px 24px' }}
              onClick={() => setPhase('result')}
              disabled={answeredCount === 0}
            >
              查看结果
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== 结果页 =====
  const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
  const stage = getStage(totalScore);
  const dimScores = getDimensionScores(answers);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {/* 顶部导航 */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/profile`); }} style={backBtnStyle}>
          <ChevronLeftIcon size={18} color="var(--text-secondary)" />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>
          诊断结果
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* 总分 + 阶段 */}
      <div style={{
        padding: '32px 24px',
        background: `linear-gradient(135deg, ${stageBgColor(stage.code)}, ${stageBgColor(stage.code)}dd)`,
        color: '#fff', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>你的总分</p>
        <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          {totalScore}
          <span style={{ fontSize: 20, opacity: 0.7 }}>/75</span>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.2)',
          padding: '6px 16px', borderRadius: 20,
          marginTop: 12,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{stage.code}</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{stage.name}</span>
        </div>
        <p style={{ fontSize: 13, opacity: 0.85, marginTop: 12, lineHeight: 1.5 }}>
          {stage.summary}
        </p>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          {stage.feature}
        </p>
      </div>

      {/* 雷达图 */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="card" style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
            5维度雷达图
          </h3>
          <RadarChart dimScores={dimScores} />
        </div>
      </div>

      {/* 维度详情 */}
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>维度分析</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dimScores.map(({ dim, score }) => {
            const level = getDimensionLevel(score);
            const pct = (score / dim.maxScore) * 100;
            return (
              <div key={dim.key} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: DIMENSION_COLORS[dim.key],
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{dim.key}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: level.color + '15', color: level.color, fontWeight: 600,
                    }}>
                      {level.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {score}<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/15</span>
                  </span>
                </div>
                {/* 进度条 */}
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: DIMENSION_COLORS[dim.key],
                    borderRadius: 3, transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Q{dim.questionIds[0]} + Q{dim.questionIds[1]} + Q{dim.questionIds[2]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 答题回顾 */}
      <div style={{ padding: '0 16px 16px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>答题回顾</h3>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {QUESTIONS.map((q, i) => {
            const score = answers[q.id];
            return (
              <div key={q.id} style={{
                padding: '12px 16px',
                borderBottom: i < QUESTIONS.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  flexShrink: 0, marginTop: 2, minWidth: 24,
                }}>
                  Q{q.id}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>
                    {q.title}
                  </div>
                  {score !== undefined ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {q.options.find(o => o.score === score)?.text}
                      <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: 6 }}>
                        ({score}分)
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      未作答
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ padding: '0 16px', display: 'flex', gap: 12 }}>
        <button
          className="btn-secondary"
          onClick={restart}
          style={{ flex: 1 }}
        >
          重新诊断
        </button>
        <button
          className="btn-primary"
          onClick={() => { if (window.history.length > 1) router.back(); else router.push(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/profile`); }}
          style={{ flex: 1 }}
        >
          完成
        </button>
      </div>
    </div>
  );
}

// ===== 雷达图组件 (纯SVG) =====
function RadarChart({ dimScores }: { dimScores: { dim: typeof DIMENSIONS[0]; score: number }[] }) {
  const size = 260;
  const center = size / 2;
  const maxRadius = 95;
  const levels = 5; // 5圈
  const angleStep = (Math.PI * 2) / dimScores.length;

  // 计算每个维度的坐标点
  const points = dimScores.map(({ dim, score }, i) => {
    const angle = -Math.PI / 2 + i * angleStep; // 从正上方开始
    const ratio = score / dim.maxScore;
    const r = maxRadius * ratio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (maxRadius + 22) * Math.cos(angle),
      labelY: center + (maxRadius + 22) * Math.sin(angle),
      valueX: center + (maxRadius * ratio * 0.7) * Math.cos(angle),
      valueY: center + (maxRadius * ratio * 0.7) * Math.sin(angle),
      key: dim.key,
      score,
      maxScore: dim.maxScore,
    };
  });

  // 多边形路径
  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {/* 背景网格 - 同心多边形 */}
      {Array.from({ length: levels }, (_, i) => {
        const r = (maxRadius / levels) * (i + 1);
        const gridPoints = dimScores.map((_, j) => {
          const angle = -Math.PI / 2 + j * angleStep;
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <polygon
            key={i}
            points={gridPoints}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.6}
          />
        );
      })}

      {/* 轴线 */}
      {dimScores.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + maxRadius * Math.cos(angle)}
            y2={center + maxRadius * Math.sin(angle)}
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {/* 数据多边形 */}
      <polygon
        points={polygonPath}
        fill="rgba(26, 86, 219, 0.15)"
        stroke="var(--primary)"
        strokeWidth={2}
      />

      {/* 数据点 */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#fff"
          stroke={DIMENSION_COLORS[p.key]}
          strokeWidth={2}
        />
      ))}

      {/* 维度标签 */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.labelX}
          y={p.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={13}
          fontWeight={700}
          fill={DIMENSION_COLORS[p.key]}
        >
          {p.key}
        </text>
      ))}

      {/* 分值标签 */}
      {points.map((p, i) => (
        <text
          key={`score-${i}`}
          x={p.valueX}
          y={p.valueY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--text)"
        >
          {p.score}
        </text>
      ))}
    </svg>
  );
}

// ===== 辅助函数 =====
function stageBgColor(code: string): string {
  const map: Record<string, string> = {
    L1: '#64748B',
    L2: '#1A56DB',
    L3: '#7C3AED',
    L4: '#047857',
    L5: '#DC2626',
  };
  return map[code] || 'var(--primary)';
}

const backBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--card)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};
