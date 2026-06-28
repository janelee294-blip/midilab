import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { awardShortCutPoints } from '../../lib/gamePoints';
import { useGameStatus, getWeekKey, fmtCountdownWeekly } from '../../lib/useGameStatus';
import { useAuth } from '../../contexts/AuthContext';

const premiumStyles = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
  
  @keyframes floatUp {
    0% { transform: translateY(10px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .animate-float { animation: floatUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  
  @keyframes softPulse {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); box-shadow: 0 0 20px rgba(255, 140, 0, 0.4); }
  }
  .animate-soft-pulse { animation: softPulse 2s infinite ease-in-out; }

  .v-key { 
    cursor: pointer; 
    transition: all 0.08s cubic-bezier(0.4, 0, 0.2, 1); 
    backdrop-filter: blur(8px);
  }
  @media (hover: hover) and (pointer: fine) {
    .v-key:hover { 
      background-color: rgba(255, 255, 255, 0.05) !important; 
      border-color: rgba(255, 255, 255, 0.2) !important;
    }
  }
`;

interface Props {
  userName?: string;
  onComplete?: (finalScore: number) => void;
}

interface Prompt {
  label: string;
  keys: string[];
  id: number;
  action: string;
  uiHint: string;
  requiresMouse?: boolean;
}

const ABLETON_SHORTCUTS: Omit<Prompt, 'id'>[] = [
  { label: 'Ctrl+T', keys: ['Control', 't'], action: '오디오 트랙 생성', uiHint: '트랙 리스트', requiresMouse: true },
  { label: 'Ctrl+Shift+T', keys: ['Control', 'Shift', 't'], action: '미디 트랙 생성', uiHint: '트랙 리스트', requiresMouse: true },
  { label: 'Ctrl+Alt+T', keys: ['Control', 'Alt', 't'], action: '리턴 트랙 생성', uiHint: '트랙 리스트', requiresMouse: true },
  { label: 'Ctrl+N', keys: ['Control', 'n'], action: '새 Live Set 생성', uiHint: '전역', requiresMouse: true },
  { label: 'Ctrl+Shift+M', keys: ['Control', 'Shift', 'm'], action: '빈 미디 클립 생성', uiHint: '어레인지먼트' },
  { label: 'Tab', keys: ['Tab'], action: '세션 / 어레인지먼트 전환', uiHint: '전체 뷰' },
  { label: 'Shift+Tab', keys: ['Shift', 'Tab'], action: '클립 / 디바이스 전환', uiHint: '하단 패널' },
  { label: 'Space', keys: ['Space'], action: '재생 및 정지', uiHint: '트랜스포트' },
  { label: 'Shift+Space', keys: ['Shift', 'Space'], action: '정지 구간부터 이어서 재생', uiHint: '트랜스포트' },
  { label: 'Ctrl+D', keys: ['Control', 'd'], action: '선택 항목 복제', uiHint: '클립 / 트랙' },
  { label: 'Ctrl+E', keys: ['Control', 'e'], action: '클립 자르기', uiHint: '어레인지먼트' },
  { label: 'Ctrl+J', keys: ['Control', 'j'], action: '클립 병합 (Consolidate)', uiHint: '어레인지먼트' },
  { label: 'Ctrl+L', keys: ['Control', 'l'], action: '선택 구간 루프 설정', uiHint: '타임라인' },
  { label: 'Ctrl+R', keys: ['Control', 'r'], action: '이름 변경', uiHint: '트랙 / 클립' },
  { label: 'Ctrl+G', keys: ['Control', 'g'], action: '트랙/디바이스 그룹화', uiHint: '체인 / 리스트' },
  { label: 'Ctrl+Shift+G', keys: ['Control', 'Shift', 'g'], action: '그룹 해제', uiHint: '체인 / 리스트' },
  { label: 'Ctrl+U', keys: ['Control', 'u'], action: '퀀타이즈 실행', uiHint: '피아노 롤' },
  { label: 'Ctrl+Shift+U', keys: ['Control', 'Shift', 'u'], action: '퀀타이즈 설정창', uiHint: '피아노 롤' },
  { label: 'Ctrl+B', keys: ['Control', 'b'], action: '그리기 모드 (Draw)', uiHint: '전역' },
  { label: 'Ctrl+Alt+B', keys: ['Control', 'Alt', 'b'], action: '브라우저 패널 토글', uiHint: '좌측 패널' },
  { label: 'Ctrl+Alt+M', keys: ['Control', 'Alt', 'm'], action: '믹서 섹션 토글', uiHint: '세션 뷰' },
  { label: 'Ctrl+Alt+S', keys: ['Control', 'Alt', 's'], action: '센드(Sends) 섹션 토글', uiHint: '세션 뷰' },
  { label: 'Ctrl+1', keys: ['Control', '1'], action: '그리드 간격 좁히기', uiHint: '타임라인' },
  { label: 'Ctrl+2', keys: ['Control', '2'], action: '그리드 간격 넓히기', uiHint: '타임라인' },
  { label: 'Ctrl+3', keys: ['Control', '3'], action: '그리드 트리플렛(셋잇단) 토글', uiHint: '타임라인' },
  { label: 'Ctrl+4', keys: ['Control', '4'], action: '그리드 스냅 끄기/켜기', uiHint: '타임라인' },
  { label: 'A', keys: ['a'], action: '오토메이션 모드 토글', uiHint: '어레인지먼트' },
  { label: 'S', keys: ['s'], action: '선택 트랙 솔로 (Solo)', uiHint: '믹서' },
  { label: 'Z', keys: ['z'], action: '선택 구간 확대 (Zoom to Selection)', uiHint: '어레인지먼트' },
  { label: 'X', keys: ['x'], action: '전체 보기로 축소 (Zoom Out)', uiHint: '어레인지먼트' },
  { label: 'M', keys: ['m'], action: '컴퓨터 키보드를 미디 건반으로 사용', uiHint: '전역' },
  { label: '0', keys: ['0'], action: '활성/비활성 (Mute)', uiHint: '클립 / 장치' },
  { label: 'F11', keys: ['f11'], action: '전체 화면 토글', uiHint: '전역' },
  { label: 'Ctrl+Z', keys: ['Control', 'z'], action: '실행 취소', uiHint: '전역' },
  { label: 'Ctrl+Y', keys: ['Control', 'y'], action: '다시 실행 (Redo)', uiHint: '전역' },
  { label: 'Ctrl+S', keys: ['Control', 's'], action: '프로젝트 저장', uiHint: '전역' },
];

const FL_STUDIO_SHORTCUTS: Omit<Prompt, 'id'>[] = [
  { label: 'Ctrl+T', keys: ['Control', 't'], action: '타이핑 키보드를 피아노로', uiHint: '전역', requiresMouse: true },
  { label: 'Ctrl+N', keys: ['Control', 'n'], action: '새 버전으로 덮어쓰기 저장', uiHint: '전역', requiresMouse: true },
  { label: 'F5', keys: ['f5'], action: '플레이리스트 열기/닫기', uiHint: '메인 윈도우' },
  { label: 'F6', keys: ['f6'], action: '채널 랙 열기/닫기', uiHint: '메인 윈도우' },
  { label: 'F7', keys: ['f7'], action: '피아노 롤 열기/닫기', uiHint: '메인 윈도우' },
  { label: 'F8', keys: ['f8'], action: '플러그인 피커 열기', uiHint: '메인 윈도우' },
  { label: 'F9', keys: ['f9'], action: '믹서 창 열기/닫기', uiHint: '메인 윈도우' },
  { label: 'F12', keys: ['f12'], action: '모든 창 닫기', uiHint: '메인 윈도우' },
  { label: 'Space', keys: ['Space'], action: '재생 및 일시정지', uiHint: '트랜스포트' },
  { label: 'L', keys: ['l'], action: '패턴 / 송(Song) 재생 모드 전환', uiHint: '트랜스포트' },
  { label: 'Ctrl+B', keys: ['Control', 'b'], action: '선택 구간 뒤로 복제', uiHint: '플레이리스트/피아노 롤' },
  { label: 'Ctrl+C', keys: ['Control', 'c'], action: '선택 항목 복사', uiHint: '전역' },
  { label: 'Ctrl+V', keys: ['Control', 'v'], action: '선택 항목 붙여넣기', uiHint: '전역' },
  { label: 'Ctrl+X', keys: ['Control', 'x'], action: '선택 항목 잘라내기', uiHint: '전역' },
  { label: 'Ctrl+L', keys: ['Control', 'l'], action: '빠른 레가토 (노트 길이를 다음까지)', uiHint: '피아노 롤' },
  { label: 'Ctrl+Q', keys: ['Control', 'q'], action: '빠른 퀀타이즈', uiHint: '피아노 롤' },
  { label: 'Alt+Q', keys: ['Alt', 'q'], action: '상세 퀀타이즈 설정창', uiHint: '피아노 롤' },
  { label: 'Alt+V', keys: ['Alt', 'v'], action: '고스트 채널(배경 노트) 토글', uiHint: '피아노 롤' },
  { label: 'Alt+C', keys: ['Alt', 'c'], action: '선택된 항목의 색상 변경', uiHint: '전역' },
  { label: 'C', keys: ['c'], action: '자르기 툴 (Slice)', uiHint: '툴바' },
  { label: 'P', keys: ['p'], action: '연필 툴 (Draw)', uiHint: '툴바' },
  { label: 'B', keys: ['b'], action: '페인트 툴 (Brush)', uiHint: '툴바' },
  { label: 'T', keys: ['t'], action: '뮤트 툴 (Mute Tool)', uiHint: '툴바' },
  { label: 'E', keys: ['e'], action: '선택 툴 (Select)', uiHint: '툴바' },
  { label: 'Y', keys: ['y'], action: '플레이백 툴 (Playback)', uiHint: '툴바' },
  { label: 'Z', keys: ['z'], action: '돋보기 툴 (Zoom)', uiHint: '툴바' },
  { label: 'M', keys: ['m'], action: '트랙/클립/노트 뮤트', uiHint: '플레이리스트/피아노 롤' },
  { label: 'Ctrl+M', keys: ['Control', 'm'], action: '메트로놈 켜기/끄기', uiHint: '상단 패널' },
  { label: 'Ctrl+E', keys: ['Control', 'e'], action: '에디슨(Edison) 오디오 편집기 열기', uiHint: '믹서' },
  { label: 'Alt+R', keys: ['Alt', 'r'], action: '오디오 렌더링 (Export)', uiHint: '전역' },
  { label: 'Ctrl+Z', keys: ['Control', 'z'], action: '실행 취소', uiHint: '전역' },
  { label: 'Ctrl+Alt+Z', keys: ['Control', 'Alt', 'z'], action: '다중 단계 실행 취소 (Step Back)', uiHint: '전역' },
  { label: 'Ctrl+S', keys: ['Control', 's'], action: '프로젝트 저장', uiHint: '전역' },
];

const TOTAL_ROUNDS = 10;
const PASSING_HITS = 8;
const ROUND_TIME_MS = 5000;

export default function DawGame({ userName, onComplete }: Props) {
  const { isEarned, refresh: refreshStatus } = useGameStatus();
  const { refreshProfile } = useAuth();
  const [dawMode, setDawMode] = useState<'ableton' | 'flstudio' | null>(null);
  const [queue, setQueue] = useState<Prompt[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  
  const [done, setDone] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<string[]>([]);
  const [physicalKeys, setPhysicalKeys] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'perfect' | 'good' | 'wrong' | 'miss' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timerBarRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const isTransitioning = useRef(false);
  const roundStartTime = useRef<number>(0);
  const timerFrameReq = useRef<number>(0);
  const handleTimeoutRef = useRef<(() => void) | null>(null);

  const startTimer = useCallback(() => {
    roundStartTime.current = Date.now();
    const updateTimer = () => {
      const elapsed = Date.now() - roundStartTime.current;
      const remainingPct = Math.max(0, 100 - (elapsed / ROUND_TIME_MS) * 100);
      
      if (timerBarRef.current) {
        timerBarRef.current.style.width = `${remainingPct}%`;
        timerBarRef.current.style.backgroundColor = remainingPct > 25 
          ? (dawMode === 'ableton' ? '#D6FF00' : '#FF7B00') 
          : '#FF4136';
      }

      if (remainingPct > 0) {
        timerFrameReq.current = requestAnimationFrame(updateTimer);
      } else {
        if (handleTimeoutRef.current) handleTimeoutRef.current();
      }
    };
    timerFrameReq.current = requestAnimationFrame(updateTimer);
  }, [dawMode]);

  const stopTimer = () => cancelAnimationFrame(timerFrameReq.current);

  const requestFullscreenAPI = async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      }
    } catch (err) {}
  };

  const exitFullscreenAPI = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch (err) {}
  };

  const startGame = async (mode: 'ableton' | 'flstudio') => {
    await requestFullscreenAPI();
    const data = mode === 'ableton' ? ABLETON_SHORTCUTS : FL_STUDIO_SHORTCUTS;
    const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, TOTAL_ROUNDS);
    
    setDawMode(mode);
    setQueue(shuffled.map((item, index) => ({ ...item, id: index })));
    setCurrentRound(0);
    setScore(0);
    setCorrectCount(0);
    setCombo(0);
    setDone(false);
    setFeedback(null);
    setActiveModifiers([]);
    setPhysicalKeys([]);
    isTransitioning.current = false;
    startTimer();
  };

  useEffect(() => {
    if (!done || correctCount < PASSING_HITS) return;
    setIsAwarding(true);
    awardShortCutPoints(score).then(pts => {
      setIsAwarding(false);
      if (pts > 0) { setPointsEarned(pts); refreshStatus(); refreshProfile(); }
    });
  }, [done]); // eslint-disable-line

  const exitGame = () => {
    stopTimer();
    exitFullscreenAPI();
    setDawMode(null);
    setPointsEarned(null);
    if (done && correctCount >= PASSING_HITS && onComplete) onComplete(score);
  };

  function getCtx() {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  }

  function playSound(type: 'hit' | 'error' | 'win' | 'lose', comboMulti = 0) {
    const ctx = getCtx();
    const g = ctx.createGain();
    g.connect(ctx.destination);
    
    if (type === 'hit') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const baseFreq = 523.25; 
      const freq = baseFreq * Math.pow(1.05946, Math.min(comboMulti, 12)); 
      
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
      
      osc1.connect(g);
      osc2.connect(g);
      
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);

    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      osc.connect(filter);
      filter.connect(g);
      
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);

    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
        const o = ctx.createOscillator(); const g2 = ctx.createGain();
        o.type = 'sine';
        o.connect(g2); g2.connect(ctx.destination);
        o.frequency.value = f;
        g2.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
        g2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.08 + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.5);
        o.start(ctx.currentTime + i * 0.08); o.stop(ctx.currentTime + i * 0.08 + 0.5);
      });
    } else if (type === 'lose') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.6);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.6);
    }
  }

  const handleNextRound = () => {
    setTimeout(() => {
      setFeedback(null);
      const nextRound = currentRound + 1;
      if (nextRound >= TOTAL_ROUNDS) {
        setDone(true);
        const isWin = correctCount + (feedback === 'perfect' || feedback === 'good' ? 1 : 0) >= PASSING_HITS;
        playSound(isWin ? 'win' : 'lose');
      } else {
        setCurrentRound(nextRound);
        isTransitioning.current = false;
        startTimer();
      }
    }, 600);
  };

  const handleTimeout = () => {
    if (isTransitioning.current || done) return;
    isTransitioning.current = true;
    stopTimer();
    setCombo(0);
    playSound('error');
    setFeedback('miss');
    setActiveModifiers([]);
    handleNextRound();
  };

  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  });

  const validateInput = useCallback((pressedKeys: string[]) => {
    if (!dawMode || done || queue.length === 0 || isTransitioning.current) return;
    
    const current = queue[currentRound];
    const expectedKeysLower = current.keys.map(k => k.toLowerCase());
    
    const match = pressedKeys.length === expectedKeysLower.length &&
                  expectedKeysLower.every(k => pressedKeys.includes(k));

    isTransitioning.current = true;
    stopTimer();

    if (match) {
      const reactTime = Date.now() - roundStartTime.current;
      const isPerfect = reactTime < 1500;
      
      const newCombo = combo + 1;
      const basePts = isPerfect ? 1500 : 1000;
      const comboBonus = newCombo * 100;
      
      setCorrectCount(prev => prev + 1);
      setCombo(newCombo);
      setScore(s => s + basePts + comboBonus);
      setFeedback(isPerfect ? 'perfect' : 'good');
      playSound('hit', newCombo);
    } else {
      setCombo(0);
      setFeedback('wrong');
      playSound('error');
    }

    handleNextRound();
  }, [dawMode, done, queue, currentRound, combo, correctCount]);

  const handlePhysicalKey = useCallback((e: KeyboardEvent) => {
    if (!dawMode || done || isTransitioning.current || queue.length === 0) return;
    
    const current = queue[currentRound];
    if (current.requiresMouse && (e.ctrlKey || e.metaKey) && ['t', 'n', 'w'].includes(e.key.toLowerCase())) {
        return; 
    }

    if (!((e.ctrlKey || e.metaKey) && ['t', 'n', 'w'].includes(e.key.toLowerCase()))) {
      e.preventDefault();
    }

    const keyLower = e.key === ' ' ? 'space' : (e.key === 'Meta' ? 'control' : e.key.toLowerCase());
    
    setPhysicalKeys(prev => prev.includes(keyLower) ? prev : [...prev, keyLower]);

    const isModifier = ['control', 'shift', 'alt', 'meta'].includes(keyLower);
    if (isModifier) return;

    const pressed: string[] = [];
    if (e.ctrlKey || e.metaKey) pressed.push('control');
    if (e.shiftKey) pressed.push('shift');
    if (e.altKey) pressed.push('alt');
    pressed.push(keyLower);

    validateInput(pressed);
    setActiveModifiers([]); 
  }, [dawMode, done, queue, currentRound, isTransitioning, validateInput]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const keyLower = e.key === ' ' ? 'space' : (e.key === 'Meta' ? 'control' : e.key.toLowerCase());
    setPhysicalKeys(prev => prev.filter(k => k !== keyLower));
  }, []);

  useEffect(() => {
    const handleBlur = () => setPhysicalKeys([]);
    window.addEventListener('keydown', handlePhysicalKey, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handlePhysicalKey, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, [handlePhysicalKey, handleKeyUp]);

  const handleVirtualClick = (clickedKey: string, e: React.MouseEvent) => {
    if (!dawMode || done || isTransitioning.current) return;
    
    const keyLower = clickedKey.toLowerCase();
    const isModifier = ['control', 'shift', 'alt'].includes(keyLower);
    
    if (isModifier) {
      setActiveModifiers(prev => 
        prev.includes(keyLower) ? prev.filter(m => m !== keyLower) : [...prev, keyLower]
      );
      setFlashKey(clickedKey);
      setTimeout(() => setFlashKey(null), 150);
      return;
    }

    setFlashKey(clickedKey);
    setTimeout(() => setFlashKey(null), 150);

    const pressed: string[] = [...activeModifiers];
    if ((e.ctrlKey || e.metaKey) && !pressed.includes('control')) pressed.push('control');
    if (e.shiftKey && !pressed.includes('shift')) pressed.push('shift');
    if (e.altKey && !pressed.includes('alt')) pressed.push('alt');
    
    pressed.push(keyLower);

    validateInput(pressed);
    setActiveModifiers([]);
  };

  useEffect(() => {
    return () => {
      cancelAnimationFrame(timerFrameReq.current);
      exitFullscreenAPI();
    };
  }, []);

if (!dawMode) {
    const weekKey = getWeekKey();
    const weeklyEarned = isEarned('short-cut', `score:${weekKey}`);
    const resetInfo = fmtCountdownWeekly();
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center w-full gap-6 sm:gap-8 py-10 sm:py-16 font-sans" style={{ background: '#0D0E15', color: '#ECECED' }}>
        <style dangerouslySetInnerHTML={{ __html: premiumStyles }} />
        <div className="text-center">
          <h2 className="text-4xl font-extrabold tracking-tight mb-3" style={{ color: '#FFFFFF' }}>
            Shortcut <span style={{ color: '#D6FF00' }}>Master</span>
          </h2>
          <p className="text-[#8B90A0] text-sm max-w-md mx-auto leading-relaxed">
            실무 기반의 DAW 단축키 훈련 모듈입니다.<br/>브라우저 충돌을 방지하기 위해 시작 시 전체화면으로 전환됩니다.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: weeklyEarned ? 'rgba(71,85,105,0.3)' : 'rgba(214,255,0,0.08)', border: `1px solid ${weeklyEarned ? '#334155' : 'rgba(214,255,0,0.25)'}`, color: weeklyEarned ? '#475569' : '#D6FF00' }}>
            {weeklyEarned
              ? <>✓ 이번 주 포인트 획득 완료</>
              : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" /> 획득 가능 · {resetInfo}</>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 mt-4">
          <button onClick={() => startGame('ableton')} className="w-52 py-8 rounded-2xl text-xl font-bold transition-all hover:-translate-y-1 hover:shadow-2xl" style={{ background: '#1A1D27', border: '1px solid #2A2F3A', color: '#ECECED', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div className="text-[#D6FF00] mb-1 text-sm font-semibold tracking-wider">ABLETON</div>
            Live 12
          </button>
          <button onClick={() => startGame('flstudio')} className="w-52 py-8 rounded-2xl text-xl font-bold transition-all hover:-translate-y-1 hover:shadow-2xl" style={{ background: '#1A1D27', border: '1px solid #2A2F3A', color: '#ECECED', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div className="text-[#FF7B00] mb-1 text-sm font-semibold tracking-wider">IMAGE-LINE</div>
            FL Studio 24
          </button>
        </div>
        <p className="text-[10px] text-slate-600 font-mono mt-2">🏆 8000~11999점: 1점 · 12000~15999점: 2점 · 16000+점: 3점 (주 1회)</p>
      </div>
    );
  }

  const themeColor = dawMode === 'ableton' ? '#D6FF00' : '#FF7B00';
  const current = queue[currentRound];
  const isShake = feedback === 'wrong' || feedback === 'miss';
  const isWinConditionMet = correctCount >= PASSING_HITS;

  const renderKey = (k: string, isSpecial: boolean, dynamicClass: string) => {
    const keyLower = k.toLowerCase();
    const isActiveModifier = activeModifiers.includes(keyLower);
    const isPhysicallyHeld = physicalKeys.includes(keyLower);
    const isFlashed = flashKey?.toLowerCase() === keyLower;
    const isHighlighted = isFlashed || isActiveModifier || isPhysicallyHeld;
    const isPressed = isActiveModifier || isPhysicallyHeld;
    const mlClass = (k === 'f1' || k === 'f5' || k === 'f9') ? 'ml-1 sm:ml-[12px]' : 'ml-0';
    
    return (
      <div key={k} onMouseDown={(e) => handleVirtualClick(k, e)} 
           className={`v-key flex items-center justify-center font-semibold uppercase transition-all duration-75 ${dynamicClass} ${mlClass}`}
           style={{ 
             background: isHighlighted ? `${themeColor}20` : '#181A20', 
             border: `1px solid ${isHighlighted ? themeColor : '#2A2F3A'}`,
             color: isHighlighted ? themeColor : '#7A8294',
             boxShadow: isHighlighted ? `0 0 20px ${themeColor}60, inset 0 0 15px ${themeColor}30` : '0 2px 4px rgba(0,0,0,0.2)',
             transform: isPressed ? 'translateY(2px) scale(0.96)' : 'translateY(0) scale(1)'
           }}>
        {k}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-start sm:justify-center min-h-screen w-full px-2 sm:px-6 pt-4 pb-6 sm:py-8 gap-4 sm:gap-6 select-none font-sans" style={{ background: '#0D0E15', color: '#ECECED', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: premiumStyles }} />
      
      <div className="flex items-end justify-between w-full max-w-3xl">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[#5A6170] uppercase font-bold tracking-widest">Score / Accuracy</span>
          <div className="flex items-baseline gap-2 sm:gap-4">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight" style={{ color: '#FFFFFF' }}>
              {score.toLocaleString()}
            </span>
            <div className="flex items-center px-2 py-1 rounded-md" style={{ background: correctCount >= PASSING_HITS ? 'rgba(0, 255, 102, 0.1)' : '#181A20', border: `1px solid ${correctCount >= PASSING_HITS ? 'rgba(0, 255, 102, 0.3)' : '#2A2F3A'}` }}>
              <span className="text-[10px] sm:text-xs font-bold" style={{ color: correctCount >= PASSING_HITS ? '#00FF66' : '#8B90A0' }}>
                {correctCount} / {TOTAL_ROUNDS}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-[#5A6170] uppercase font-bold tracking-widest">Combo</span>
          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight" style={{ color: combo >= 3 ? themeColor : '#8B90A0', textShadow: combo >= 3 ? `0 0 15px ${themeColor}60` : 'none' }}>
            x{combo}
          </span>
        </div>
      </div>

      {!done && current ? (
        <>
          <div className="flex flex-col items-center justify-center w-full max-w-3xl w-full">
            <div className={`relative flex flex-col items-center justify-center w-full h-40 sm:h-56 rounded-2xl overflow-hidden ${isShake ? 'animate-shake' : ''}`} 
                 style={{ 
                   background: '#15161E',
                   border: `1px solid ${feedback === 'perfect' || feedback === 'good' ? 'rgba(0, 255, 102, 0.5)' : isShake ? 'rgba(255, 65, 54, 0.5)' : '#2A2D3D'}`, 
                   boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                   transition: 'border-color 0.2s ease'
                 }}>
              
              <div ref={timerBarRef} className="absolute top-0 left-0 h-0.5" style={{ width: '100%', backgroundColor: themeColor }} />
              
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white text-center mb-4 sm:mb-5 tracking-tight px-4 break-keep" style={{ zIndex: 10 }}>{current.action}</h3>
              
              <div className="px-3 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold tracking-wider uppercase" style={{ background: '#0D0E15', color: '#8B90A0', border: '1px solid #1A1D27', zIndex: 10 }}>
                {current.uiHint}
              </div>

              {feedback && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 20 }}>
                  {feedback === 'perfect' && <span className="text-3xl sm:text-4xl font-black text-[#00FF66] animate-float tracking-widest uppercase" style={{ textShadow: '0 4px 20px rgba(0,255,102,0.4)' }}>Perfect</span>}
                  {feedback === 'good' && <span className="text-3xl sm:text-4xl font-black text-white animate-float tracking-widest uppercase">Good</span>}
                  {feedback === 'wrong' && <span className="text-4xl sm:text-5xl font-black text-[#FF4136] animate-float uppercase" style={{ textShadow: '0 4px 20px rgba(255,65,54,0.4)' }}>Miss</span>}
                  {feedback === 'miss' && <span className="text-3xl sm:text-4xl font-black text-[#FF4136] animate-float tracking-widest uppercase">Time Over</span>}
                </div>
              )}
            </div>

            <div className="h-6 sm:h-10 w-full flex justify-center mt-3 sm:mt-4">
              {current.requiresMouse && !feedback && (
                <div className="px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-full flex items-center gap-2 sm:gap-3 animate-soft-pulse" style={{ background: 'rgba(255, 123, 0, 0.15)', border: '1px solid rgba(255, 123, 0, 0.4)', backdropFilter: 'blur(4px)' }}>
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FF7B00] animate-ping"></span>
                  <span className="text-[9px] sm:text-sm font-semibold text-[#FF7B00] tracking-wide text-center">
                    <span className="text-white bg-[#FF7B0020] px-1.5 py-0.5 rounded mr-1">Ctrl/Shift</span> 홀드 + 클릭
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full flex justify-center px-1 sm:px-0">
            <div className="flex flex-col items-stretch sm:items-center gap-1 sm:gap-1.5 w-full sm:min-w-[580px] max-w-[580px]">
              <div className="flex gap-0.5 sm:gap-1 mb-1">
                {['esc', 'f1','f2','f3','f4','f5','f6','f7','f8','f9','f10','f11','f12'].map(k => 
                  renderKey(k, false, 'flex-1 sm:flex-none sm:w-9 h-7 sm:h-8 text-[7px] sm:text-[10px] rounded-md sm:rounded-lg')
                )}
              </div>
              {[
                ['1','2','3','4','5','6','7','8','9','0'],
                ['tab','q','w','e','r','t','y','u','i','o','p'],
                ['a','s','d','f','g','h','j','k','l'],
                ['shift','z','x','c','v','b','n','m'],
              ].map((row, ri) => (
                <div key={ri} className="flex gap-0.5 sm:gap-1.5">
                  {row.map(k => {
                    const isSpecial = k === 'tab' || k === 'shift';
                    const dynamicClass = isSpecial 
                      ? (k === 'shift' ? 'w-12 sm:flex-none sm:w-24' : 'w-10 sm:flex-none sm:w-16') 
                      : 'flex-1 sm:flex-none sm:w-[52px]';
                    return renderKey(k, isSpecial, `${dynamicClass} h-8 sm:h-[44px] text-[9px] sm:text-xs rounded-md sm:rounded-lg`);
                  })}
                </div>
              ))}
              <div className="flex gap-0.5 sm:gap-1.5">
                {renderKey('Control', true, 'w-14 sm:flex-none sm:w-24 h-8 sm:h-[44px] text-[9px] sm:text-xs rounded-md sm:rounded-lg')}
                {renderKey('Space', true, 'flex-1 sm:flex-none sm:w-[350px] h-8 sm:h-[44px] text-[9px] sm:text-xs rounded-md sm:rounded-lg')}
                {renderKey('Alt', true, 'w-14 sm:flex-none sm:w-24 h-8 sm:h-[44px] text-[9px] sm:text-xs rounded-md sm:rounded-lg')}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl w-full" style={{ background: '#15161E', border: `1px solid ${isWinConditionMet ? 'rgba(0, 255, 102, 0.3)' : 'rgba(255, 65, 54, 0.3)'}`, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h2 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-widest mb-3 text-center" style={{ color: isWinConditionMet ? '#00FF66' : '#FF4136' }}>
              {isWinConditionMet ? 'Assessment Passed' : 'Assessment Failed'}
            </h2>
            <p className="text-sm mb-8 sm:mb-10 text-[#8B90A0] font-medium tracking-wide">
              정답: <span className={isWinConditionMet ? 'text-white' : 'text-white'}>{correctCount}</span> / {TOTAL_ROUNDS} 
              <span className="mx-2 opacity-30">|</span> 기준: {PASSING_HITS}
            </p>
            
            <div className="text-[10px] text-[#5A6170] uppercase font-bold tracking-widest mb-2">Final Score</div>
            <div className="text-6xl sm:text-7xl font-mono font-black text-white mb-8 tracking-tighter">{score.toLocaleString()}</div>

            {isAwarding && (
              <div className="mb-6 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(0,255,102,0.05)', border: '1px solid rgba(0,255,102,0.2)', color: '#64748b' }}>
                채점 및 포인트 서버 기록 중...
              </div>
            )}
            {!isAwarding && pointsEarned !== null && (
              <div className="mb-6 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(0,255,102,0.1)', border: '1px solid rgba(0,255,102,0.3)', color: '#00FF66' }}>
                +{pointsEarned}점 획득!
              </div>
            )}
            <button
              onClick={exitGame}
              className="w-full sm:w-auto px-8 sm:px-12 py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-1"
              style={{ background: isWinConditionMet ? '#00FF66' : '#181A20', color: isWinConditionMet ? '#0D0E15' : '#ECECED', border: isWinConditionMet ? 'none' : '1px solid #2A2F3A' }}
            >
              {isWinConditionMet ? 'Complete & Collect Points' : 'Return to Menu'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}