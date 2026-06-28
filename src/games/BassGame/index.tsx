import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { awardBassPoints } from '../../lib/gamePoints';
import { useGameStatus } from '../../lib/useGameStatus';
import { useAuth } from '../../contexts/AuthContext';

const gameStyles = `
  /* 모바일 환경(640px 미만)에서만 가로 스크롤바를 숨기는 CSS */
  @media (max-width: 639px) {
    .mobile-hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .mobile-hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }

  @keyframes scanline {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .grid-cell {
    transition: all 0.1s ease-in-out;
  }
  .grid-cell:hover {
    filter: brightness(1.5);
  }
`;

const NOTES = [
  { name: 'B', freq: 123.47 },
  { name: 'A', freq: 110.00 },
  { name: 'G', freq: 98.00 },
  { name: 'F', freq: 87.31 },
  { name: 'E', freq: 82.41 },
  { name: 'D', freq: 73.42 },
  { name: 'C', freq: 65.41 },
];

interface Chord {
  name: string;
  root: string;
  startStep: number;
  endStep: number;
  freqs: number[];
}

interface Level {
  id: number;
  title: string;
  bpm: number;
  description: string;
  kick: number[];
  snare: number[];
  hihat: number[];
  chords: Chord[];
}

const getChordFreqs = (baseFreq: number, intervals: number[]) => {
  return intervals.map(interval => baseFreq * Math.pow(1.05946, interval));
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const EASY_LEVELS: Level[] = [
  {
    id: 1, title: 'Easy 1: 4-Beat Basic', bpm: 110,
    description: '4비트 킥 타이밍에 맞춰 C - G 진행의 근음을 찍어보세요.',
    kick: [0, 4, 8, 12], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14],
    chords: [
      { name: 'C Maj', root: 'C', startStep: 0, endStep: 8, freqs: getChordFreqs(261.63, [0, 4, 7]) },
      { name: 'G Maj', root: 'G', startStep: 8, endStep: 16, freqs: getChordFreqs(196.00, [0, 4, 7]) }
    ]
  },
  {
    id: 2, title: 'Easy 2: 8-Beat Syncopation', bpm: 100,
    description: '엇박이 섞인 8비트 킥입니다. A minor - F Major 진행을 매칭하세요.',
    kick: [0, 5, 8, 11], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14],
    chords: [
      { name: 'Am', root: 'A', startStep: 0, endStep: 8, freqs: getChordFreqs(220.00, [0, 3, 7]) },
      { name: 'F Maj', root: 'F', startStep: 8, endStep: 16, freqs: getChordFreqs(174.61, [0, 4, 7]) }
    ]
  },
  {
    id: 3, title: 'Easy 3: R&B Groove', bpm: 90,
    description: '여유로운 리듬. 1마디 안의 F - G - E minor - A minor를 분석하세요.',
    kick: [0, 3, 8, 10], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14],
    chords: [
      { name: 'F', root: 'F', startStep: 0, endStep: 4, freqs: getChordFreqs(174.61, [0, 4, 7]) },
      { name: 'G', root: 'G', startStep: 4, endStep: 8, freqs: getChordFreqs(196.00, [0, 4, 7]) },
      { name: 'Em', root: 'E', startStep: 8, endStep: 12, freqs: getChordFreqs(164.81, [0, 3, 7]) },
      { name: 'Am', root: 'A', startStep: 12, endStep: 16, freqs: getChordFreqs(220.00, [0, 3, 7]) }
    ]
  },
  {
    id: 4, title: 'Easy 4: Disco Funk', bpm: 115,
    description: '잘게 쪼개진 펑크 리듬. D minor 1코드 뱀프입니다.',
    kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    chords: [
      { name: 'Dm7', root: 'D', startStep: 0, endStep: 16, freqs: getChordFreqs(146.83, [0, 3, 7, 10]) }
    ]
  },
  {
    id: 5, title: 'Easy 5: Neo Soul', bpm: 85,
    description: '불규칙한 킥과 C - E minor - F 코드를 매칭하세요.',
    kick: [0, 4, 7, 10, 13], snare: [4, 12], hihat: [0, 4, 8, 12],
    chords: [
      { name: 'C Maj', root: 'C', startStep: 0, endStep: 6, freqs: getChordFreqs(261.63, [0, 4, 7]) },
      { name: 'E min', root: 'E', startStep: 6, endStep: 10, freqs: getChordFreqs(164.81, [0, 3, 7]) },
      { name: 'F Maj', root: 'F', startStep: 10, endStep: 16, freqs: getChordFreqs(174.61, [0, 4, 7]) }
    ]
  }
];

const HARD_LEVELS_POOL: Level[] = [
  {
    id: 101, title: 'Hard Session: Alpha', bpm: 105,
    description: '[청음 테스트] 킥의 리듬과 2개의 코드가 교차하는 구간을 듣고 근음을 추적하세요.',
    kick: [0, 3, 8, 11], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 10, 12, 14],
    chords: [
      { name: '???', root: 'E', startStep: 0, endStep: 8, freqs: getChordFreqs(329.63, [0, 3, 7]) },
      { name: '???', root: 'C', startStep: 8, endStep: 16, freqs: getChordFreqs(261.63, [0, 4, 7]) }
    ]
  },
  {
    id: 102, title: 'Hard Session: Beta', bpm: 95,
    description: '[청음 테스트] 3개의 코드가 빠르게 전환됩니다. 화음의 높낮이를 비교하세요.',
    kick: [0, 4, 7, 8, 12], snare: [4, 12], hihat: [0, 4, 8, 12],
    chords: [
      { name: '???', root: 'G', startStep: 0, endStep: 8, freqs: getChordFreqs(392.00, [0, 4, 7]) },
      { name: '???', root: 'B', startStep: 8, endStep: 12, freqs: getChordFreqs(246.94, [0, 3, 7]) },
      { name: '???', root: 'C', startStep: 12, endStep: 16, freqs: getChordFreqs(261.63, [0, 4, 7]) }
    ]
  },
  {
    id: 103, title: 'Hard Session: Gamma', bpm: 110,
    description: '[청음 테스트] 빈번한 킥과 4개의 하행 코드를 정확히 일치시키세요.',
    kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12], hihat: [0, 4, 8, 12],
    chords: [
      { name: '???', root: 'A', startStep: 0, endStep: 4, freqs: getChordFreqs(220.00, [0, 3, 7]) },
      { name: '???', root: 'G', startStep: 4, endStep: 8, freqs: getChordFreqs(196.00, [0, 4, 7]) },
      { name: '???', root: 'F', startStep: 8, endStep: 12, freqs: getChordFreqs(174.61, [0, 4, 7]) },
      { name: '???', root: 'E', startStep: 12, endStep: 16, freqs: getChordFreqs(164.81, [0, 4, 7]) }
    ]
  },
  {
    id: 104, title: 'Hard Session: Delta', bpm: 120,
    description: '[청음 테스트] 디스코 펑크 스타일. 베이스의 리듬 타이밍이 매우 중요합니다.',
    kick: [0, 3, 7, 10, 14], snare: [4, 12], hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    chords: [
      { name: '???', root: 'D', startStep: 0, endStep: 8, freqs: getChordFreqs(293.66, [0, 3, 7, 10]) },
      { name: '???', root: 'A', startStep: 8, endStep: 16, freqs: getChordFreqs(220.00, [0, 3, 7, 10]) }
    ]
  },
  {
    id: 105, title: 'Hard Session: Epsilon', bpm: 80,
    description: '[청음 테스트] 트랩(Trap) 리듬. 무겁고 긴 808 킥의 타점과 화음을 맞추세요.',
    kick: [0, 6, 8, 14], snare: [4, 12], hihat: [0, 2, 4, 6, 8, 9, 10, 12, 14, 15],
    chords: [
      { name: '???', root: 'F', startStep: 0, endStep: 8, freqs: getChordFreqs(174.61, [0, 4, 7]) },
      { name: '???', root: 'A', startStep: 8, endStep: 16, freqs: getChordFreqs(220.00, [0, 3, 7]) }
    ]
  },
  {
    id: 106, title: 'Hard Session: Zeta', bpm: 100,
    description: '[청음 테스트] 2마디 같은 1마디 구성입니다. 빠르게 변하는 화음을 캐치하세요.',
    kick: [0, 2, 8, 10], snare: [4, 12], hihat: [0, 4, 8, 12],
    chords: [
      { name: '???', root: 'C', startStep: 0, endStep: 4, freqs: getChordFreqs(261.63, [0, 4, 7]) },
      { name: '???', root: 'A', startStep: 4, endStep: 8, freqs: getChordFreqs(220.00, [0, 3, 7]) },
      { name: '???', root: 'F', startStep: 8, endStep: 12, freqs: getChordFreqs(174.61, [0, 4, 7]) },
      { name: '???', root: 'G', startStep: 12, endStep: 16, freqs: getChordFreqs(196.00, [0, 4, 7]) }
    ]
  }
];

interface Props {
  userName?: string;
  onComplete?: (score: number) => void;
}

export default function BassSequencerGame({ onComplete }: Props) {
  const { isEarned, refresh: refreshStatus } = useGameStatus();
  const { refreshProfile } = useAuth();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [activeLevels, setActiveLevels] = useState<Level[]>([]);
  
  const [levelIdx, setLevelIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<boolean[][]>(Array(NOTES.length).fill(Array(16).fill(false)));
  const [currentStep, setCurrentStep] = useState(-1);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const scheduleTimerRef = useRef<number>(0);

  const stepTimeoutsRef = useRef<number[]>([]);
  
  const isPlayingRef = useRef(false);
  const gridRef = useRef(grid);

  const level = activeLevels[levelIdx];

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    if (gameState === 'playing' && level) {
      setGrid(Array(NOTES.length).fill(Array(16).fill(false).map(() => false)));
      setFeedback(null);
      stopEngine();
      setAttempts(0);
    }
  }, [levelIdx, gameState, level]);

  useEffect(() => {
    return () => {
      stopEngine();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'end') return;
    setIsAwarding(true);
    awardBassPoints(difficulty).then(pts => {
      setIsAwarding(false);
      if (pts > 0) { setPointsEarned(pts); refreshStatus(); refreshProfile(); }
    });
  }, [gameState]); // eslint-disable-line

  const initAudio = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.connect(audioCtxRef.current.destination);
      masterGainRef.current.gain.value = 0.8;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playKick = (time: number) => {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGainRef.current!);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    osc.start(time);
    osc.stop(time + 0.3);
  };

  const playSnare = (time: number) => {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    osc.connect(gain);
    gain.connect(masterGainRef.current!);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.start(time);
    osc.stop(time + 0.2);
  };

  const playHihat = (time: number) => {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, time);
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current!);
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  };

  const playChord = (chord: Chord, time: number, duration: number) => {
    const ctx = audioCtxRef.current!;
    const chordGain = ctx.createGain();
    chordGain.connect(masterGainRef.current!);
    
    chordGain.gain.setValueAtTime(0, time);
    chordGain.gain.linearRampToValueAtTime(0.15, time + 0.05);
    chordGain.gain.setValueAtTime(0.15, time + duration - 0.1);
    chordGain.gain.linearRampToValueAtTime(0, time + duration);

    chord.freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(chordGain);
      osc.start(time);
      osc.stop(time + duration);
      
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2;
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.05;
      osc2.connect(gain2);
      gain2.connect(chordGain);
      osc2.start(time);
      osc2.stop(time + duration);
    });
  };

  const playBass = (freq: number, time: number) => {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current!);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    osc.start(time);
    osc.stop(time + 0.5);
  };

  const scheduleStep = (stepNumber: number, time: number) => {
    if (!level) return;
    const stepDuration = (60 / level.bpm) / 4; 

    if (level.kick.includes(stepNumber)) playKick(time);
    if (level.snare.includes(stepNumber)) playSnare(time);
    if (level.hihat.includes(stepNumber)) playHihat(time);

    const activeChord = level.chords.find(c => c.startStep === stepNumber);
    if (activeChord) {
      const duration = (activeChord.endStep - activeChord.startStep) * stepDuration;
      playChord(activeChord, time, duration);
    }

    NOTES.forEach((note, rowIdx) => {
      if (gridRef.current[rowIdx][stepNumber]) {
        playBass(note.freq, time);
      }
    });

    const timeToStep = time - audioCtxRef.current!.currentTime;
    const tid = window.setTimeout(() => {
      setCurrentStep(stepNumber);
    }, Math.max(0, timeToStep * 1000));
    stepTimeoutsRef.current.push(tid);
  };

  const scheduler = () => {
    if (!isPlayingRef.current || !audioCtxRef.current || !level) return;
    
    const ctx = audioCtxRef.current;
    const lookahead = 0.1; 
    const stepDuration = (60 / level.bpm) / 4; 

    if (nextNoteTimeRef.current < ctx.currentTime - 0.2) {
      nextNoteTimeRef.current = ctx.currentTime + 0.05;
    }

    while (nextNoteTimeRef.current < ctx.currentTime + lookahead) {
      scheduleStep(currentStepRef.current, nextNoteTimeRef.current);
      
      nextNoteTimeRef.current += stepDuration;
      currentStepRef.current++;
      if (currentStepRef.current >= 16) {
        currentStepRef.current = 0; 
      }
    }
    
    scheduleTimerRef.current = requestAnimationFrame(scheduler);
  };

  const startEngine = () => {
    initAudio();
    if (isPlayingRef.current) return;
    
    isPlayingRef.current = true;
    setIsPlaying(true);
    currentStepRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current!.currentTime + 0.05;
    scheduler();
  };

  const stopEngine = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    cancelAnimationFrame(scheduleTimerRef.current);
    stepTimeoutsRef.current.forEach(clearTimeout);
    stepTimeoutsRef.current = [];
    setCurrentStep(-1);
  };

  const togglePlay = () => {
    if (isPlayingRef.current) stopEngine();
    else startEngine();
  };

  const toggleGrid = (rowIdx: number, colIdx: number) => {
    const newGrid = grid.map(row => [...row]);
    for (let r = 0; r < NOTES.length; r++) {
      if (r !== rowIdx) newGrid[r][colIdx] = false;
    }
    newGrid[rowIdx][colIdx] = !newGrid[rowIdx][colIdx];
    setGrid(newGrid);
    
    if (!isPlayingRef.current && newGrid[rowIdx][colIdx]) {
      initAudio();
      playBass(NOTES[rowIdx].freq, audioCtxRef.current!.currentTime);
    }
  };

  const startGame = (mode: 'easy' | 'hard') => {
    setDifficulty(mode);
    if (mode === 'easy') {
      setActiveLevels(EASY_LEVELS);
    } else {
      setActiveLevels(shuffleArray(HARD_LEVELS_POOL).slice(0, 5));
    }
    setLevelIdx(0);
    setScore(0);
    setAttempts(0);
    setGameState('playing');
  };

  const checkAnswer = () => {
    stopEngine();
    setAttempts(a => a + 1);
    
    let isCorrect = true;
    let missingOrWrong = false;

    for (let i = 0; i < 16; i++) {
      const isKickStep = level.kick.includes(i);
      const activeChord = level.chords.find(c => i >= c.startStep && i < c.endStep);
      const expectedRootName = activeChord ? activeChord.root : null;

      let userNoteName = null;
      for (let r = 0; r < NOTES.length; r++) {
        if (grid[r][i]) {
          userNoteName = NOTES[r].name;
          break;
        }
      }

      if (isKickStep) {
        if (!userNoteName || userNoteName !== expectedRootName) {
          isCorrect = false;
          missingOrWrong = true;
        }
      } else {
        if (userNoteName !== null) {
          isCorrect = false;
          missingOrWrong = true;
        }
      }
    }

    if (isCorrect && !missingOrWrong) {
      setFeedback('correct');
      
      const difficultyMultiplier = difficulty === 'hard' ? 1.5 : 1;
      const levelScore = Math.floor(Math.max(1000 - (attempts * 200), 200) * difficultyMultiplier);
      setScore(s => s + levelScore);

      initAudio();
      const ctx = audioCtxRef.current!;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(masterGainRef.current!);
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t + idx * 0.1);
        g.gain.linearRampToValueAtTime(0.2, t + idx * 0.1 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.1 + 0.5);
        o.start(t + idx * 0.1); o.stop(t + idx * 0.1 + 0.5);
      });
      
      setTimeout(() => {
        if (levelIdx < activeLevels.length - 1) {
          setLevelIdx(l => l + 1);
        } else {
          setGameState('end');
        }
      }, 2000);

    } else {
      setFeedback('wrong');
      initAudio();
      const ctx = audioCtxRef.current!;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(100, ctx.currentTime);
      o.connect(g); g.connect(masterGainRef.current!);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
      
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const handleExit = () => {
    stopEngine();
    setGameState('start');
    setLevelIdx(0);
    setScore(0);
    setAttempts(0);
  };

  const handleFinish = () => {
    if (onComplete) onComplete(score);
    handleExit();
  };

  if (gameState === 'start') {
    const easyEarned = isEarned('bass-game', 'easy');
    const hardEarned = isEarned('bass-game', 'hard');
    return (
      <div className="flex flex-col items-center justify-center w-full py-8 sm:py-16 font-sans select-none" style={{ background: '#0D0E15', color: '#ECECED' }}>
        <div className="w-full max-w-2xl px-4 sm:px-6 flex flex-col items-center text-center gap-6 sm:gap-8">
          <div>
            <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white mb-2">
              Groove <span style={{ color: '#D6FF00' }}>Matcher</span>
            </h1>
            <p className="text-[#8B90A0] text-xs sm:text-sm mt-2 sm:mt-4 break-keep leading-relaxed">
              드럼의 킥(Kick) 패턴과 화성의 근음(Root)을 매칭하여 베이스 라인을 시퀀싱하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full mt-2 sm:mt-6">
            <button
              onClick={() => startGame('easy')}
              className="group relative flex flex-col items-center p-6 sm:p-8 rounded-2xl border-2 transition-all hover:-translate-y-1"
              style={{ background: '#15161E', borderColor: easyEarned ? '#2A2F3A' : '#00E5FF', opacity: easyEarned ? 0.6 : 1 }}
            >
              {easyEarned && <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">완료</div>}
              {!easyEarned && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              <div className="text-2xl sm:text-3xl font-black mb-2 text-[#00E5FF]">EASY</div>
              <div className="text-[11px] sm:text-xs text-[#8B90A0] leading-relaxed break-keep">
                코드 힌트가 제공되며 순차적으로 진행됩니다.<br/>시각적 피드백을 통해 훈련합니다.
              </div>
              <div className="mt-3 text-[10px] font-bold" style={{ color: easyEarned ? '#475569' : '#D6FF00' }}>
                🏆 1점 · 최초 1회
              </div>
            </button>

            <button
              onClick={() => startGame('hard')}
              className="group relative flex flex-col items-center p-6 sm:p-8 rounded-2xl border-2 transition-all hover:-translate-y-1"
              style={{ background: '#15161E', borderColor: hardEarned ? '#2A2F3A' : '#FF4136', boxShadow: hardEarned ? 'none' : '0 0 20px rgba(255, 65, 54, 0.2)', opacity: hardEarned ? 0.6 : 1 }}
            >
              {hardEarned
                ? <div className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">완료</div>
                : <div className="absolute top-0 right-0 bg-[#FF4136] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">1.5x SCORE</div>}
              {!hardEarned && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              <div className="text-2xl sm:text-3xl font-black mb-2 text-[#FF4136]">HARD</div>
              <div className="text-[11px] sm:text-xs text-[#8B90A0] leading-relaxed break-keep">
                코드 힌트가 가려지며 무작위로 출제됩니다.<br/>오직 청음으로 근음을 파악해야 합니다.
              </div>
              <div className="mt-3 text-[10px] font-bold" style={{ color: hardEarned ? '#475569' : '#D6FF00' }}>
                🏆 3점 · 최초 1회
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'end') {
    return (
      <div className="flex flex-col items-center justify-center w-full py-12 sm:py-24 font-sans select-none" style={{ background: '#0D0E15', color: '#ECECED' }}>
        <div className="flex flex-col items-center p-8 sm:p-12 rounded-3xl w-full max-w-2xl mx-4 sm:mx-0" style={{ background: '#15161E', border: '1px solid rgba(214, 255, 0, 0.4)', boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 60px rgba(214, 255, 0, 0.1)' }}>
          <div className="text-[#8B90A0] font-bold tracking-widest uppercase mb-2 text-xs sm:text-sm">Grooves Mastered</div>
          <div className="text-4xl sm:text-6xl font-black mb-8 text-center" style={{ color: '#D6FF00', textShadow: '0 0 40px rgba(214, 255, 0, 0.6)' }}>MISSION CLEAR</div>
          
          <div className="w-full flex justify-between px-6 sm:px-8 py-4 sm:py-6 rounded-2xl mb-8 sm:mb-10" style={{ background: '#0D0E15', border: '1px solid #2A2F3A' }}>
            <div className="flex flex-col items-center w-full">
              <span className="text-[10px] sm:text-xs text-[#5A6170] font-bold uppercase tracking-widest mb-1">Total Score (Points)</span>
              <span className="text-4xl sm:text-5xl font-mono font-black text-white">{Math.floor(score).toLocaleString()}</span>
            </div>
          </div>
          
          {isAwarding && (
            <div className="mb-4 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold" style={{ background: 'rgba(214,255,0,0.05)', border: '1px solid rgba(214,255,0,0.2)', color: '#8B90A0' }}>
              채점 및 포인트 서버 기록 중...
            </div>
          )}
          {!isAwarding && pointsEarned !== null && (
            <div className="mb-4 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold" style={{ background: 'rgba(214,255,0,0.1)', border: '1px solid rgba(214,255,0,0.3)', color: '#D6FF00' }}>
              +{pointsEarned}점 획득!
            </div>
          )}
          <button
            onClick={handleFinish}
            className="px-8 sm:px-12 py-3 sm:py-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-1 w-full sm:w-auto"
            style={{ background: '#D6FF00', color: '#0D0E15' }}
          >
            Collect Points & Return
          </button>
        </div>
      </div>
    );
  }

  if (!level) return null;

  const isShake = feedback === 'wrong';

  return (
    <div className="flex flex-col items-center justify-center w-full pt-14 pb-6 sm:pt-16 sm:pb-12 font-sans select-none relative" style={{ background: '#0D0E15', color: '#ECECED' }}>
      <style dangerouslySetInnerHTML={{ __html: gameStyles }} />
      
      {/* 글로벌 나가기 버튼 */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
        <button 
          onClick={handleExit} 
          className="text-xs sm:text-sm font-bold opacity-50 hover:opacity-100 transition-opacity uppercase tracking-wider text-white"
        >
          ← Exit
        </button>
      </div>
      
      <div className="w-full max-w-5xl px-3 sm:px-6 flex flex-col gap-3 sm:gap-6 mt-2 sm:mt-4">
        <div className="flex justify-between items-end border-b border-[#2A2F3A] pb-2 sm:pb-4 px-1 sm:px-0">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-1 sm:mb-2 leading-tight">
              Groove <span style={{ color: '#D6FF00' }}>Matcher</span>
            </h1>
            <p className="text-[#8B90A0] text-[10px] sm:text-sm break-keep leading-tight mt-1">드럼의 킥(Kick) 패턴과 코드의 근음(Root)을 매칭하여 베이스를 완성하세요.</p>
          </div>
          <div className="text-right flex flex-col items-end flex-shrink-0">
            {difficulty === 'hard' && (
              <span className="px-2 py-0.5 rounded bg-[#FF4136] text-white text-[9px] sm:text-[10px] font-black tracking-widest mb-1">HARD MODE</span>
            )}
            <div className="text-[#D6FF00] font-bold text-sm sm:text-lg mb-0.5 sm:mb-1">{level.title}</div>
            <div className="text-[#5A6170] text-[9px] sm:text-xs uppercase tracking-widest font-bold">BPM: {level.bpm} | Score: {score}</div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-[#15161E] p-2.5 sm:p-4 rounded-xl border border-[#2A2F3A] flex-wrap gap-2 sm:gap-3">
          <div className="text-[#ECECED] font-medium text-[11px] sm:text-base w-full sm:w-auto flex-1 break-keep leading-snug">{level.description}</div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto justify-end">
            <button 
              onClick={togglePlay}
              className="px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex-1 sm:flex-none"
              style={{ background: isPlaying ? '#FF4136' : '#00E5FF', color: '#0D0E15' }}
            >
              {isPlaying ? 'Stop Engine' : 'Play Loop'}
            </button>
            <button 
              onClick={checkAnswer}
              className="px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-105 flex-1 sm:flex-none"
              style={{ background: '#D6FF00', color: '#0D0E15' }}
            >
              Check Answer
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`p-3 sm:p-4 rounded-xl text-center font-black text-lg sm:text-2xl uppercase tracking-widest ${isShake ? 'animate-shake' : ''}`}
                style={{ background: feedback === 'correct' ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 65, 54, 0.1)', color: feedback === 'correct' ? '#00FF66' : '#FF4136', border: `1px solid ${feedback === 'correct' ? '#00FF66' : '#FF4136'}` }}>
            {feedback === 'correct' ? 'Perfect Match!' : 'Incorrect Timing or Root Note'}
          </div>
        )}

        <div className={`flex flex-col rounded-xl overflow-hidden border-2 ${isShake ? 'animate-shake' : ''}`} style={{ borderColor: feedback === 'correct' ? '#00FF66' : feedback === 'wrong' ? '#FF4136' : '#2A2F3A', background: '#1A1D27' }}>
          <div className="overflow-x-auto mobile-hide-scrollbar touch-pan-x">
          <div style={{ minWidth: `${16 * 36 + 48}px` }}>
          <div className="flex h-6 sm:h-8 bg-[#0D0E15] border-b border-[#2A2F3A]">
            <div className="w-10 sm:w-12 border-r border-[#2A2F3A] flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-[#5A6170] flex-shrink-0">STEP</div>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-colors duration-75" style={{ color: i % 4 === 0 ? '#D6FF00' : '#5A6170', borderRight: i === 15 ? 'none' : '1px solid #2A2F3A', background: currentStep === i ? 'rgba(214, 255, 0, 0.3)' : 'transparent' }}>
                {i + 1}
              </div>
            ))}
          </div>

          {/* 난이도 분기: EASY 모드일 때만 코드 진행 힌트 오픈 */}
          {difficulty === 'easy' && (
            <div className="flex h-6 sm:h-8 bg-[#15161E] border-b border-[#2A2F3A]">
              <div className="w-10 sm:w-12 border-r border-[#2A2F3A] flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-[#5A6170]">CHORD</div>
              <div className="flex-1 flex relative">
                {level.chords.map((chord, idx) => (
                  <div key={idx} className="absolute h-full flex items-center justify-center text-[10px] sm:text-xs font-bold"
                        style={{ 
                          left: `${(chord.startStep / 16) * 100}%`, 
                          width: `${((chord.endStep - chord.startStep) / 16) * 100}%`,
                          borderRight: idx === level.chords.length - 1 ? 'none' : '1px solid #2A2F3A',
                          color: '#00E5FF', background: 'rgba(0, 229, 255, 0.05)'
                        }}>
                    {chord.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {NOTES.map((note, rowIdx) => (
            <div key={note.name} className="flex h-10 sm:h-12 border-b border-[#2A2F3A] last:border-b-0 relative">
              <div className="w-10 sm:w-12 flex-shrink-0 border-r border-[#2A2F3A] flex items-center justify-center text-[10px] sm:text-xs font-bold" style={{ background: '#0D0E15', color: '#ECECED' }}>
                {note.name}2
              </div>
              
              {grid[rowIdx].map((isActive, colIdx) => {
                const isPlayingStep = currentStep === colIdx;
                
                return (
                  <div 
                    key={colIdx} 
                    onMouseDown={() => toggleGrid(rowIdx, colIdx)}
                    className="grid-cell flex-1 cursor-pointer relative"
                    style={{ 
                      borderRight: colIdx === 15 ? 'none' : '1px solid #2A2F3A',
                      background: isPlayingStep ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    }}
                  >
                    {colIdx % 4 === 0 && !isActive && <div className="absolute inset-0 bg-white opacity-5 pointer-events-none"></div>}
                    {isActive && <div className="absolute inset-1 rounded bg-[#D6FF00] shadow-[0_0_10px_#D6FF0080]"></div>}
                  </div>
                );
              })}
            </div>
          ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}