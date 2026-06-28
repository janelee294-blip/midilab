import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { awardQuizPoints } from '../../lib/gamePoints';
import { useGameStatus } from '../../lib/useGameStatus';
import { useAuth } from '../../contexts/AuthContext';

const quizStyles = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }
  .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
  
  @keyframes popUp {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); opacity: 1; text-shadow: 0 0 20px currentColor; }
    100% { transform: scale(1); opacity: 0; }
  }
  .animate-pop { animation: popUp 0.6s ease-out forwards; }
  
  .option-btn {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  /* 마우스 포인터가 있는 기기(PC)에서만 hover 효과 적용 */
  @media (hover: hover) and (pointer: fine) {
    .option-btn:hover:not(:disabled) {
      transform: translateX(8px);
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }
  }
  
  .option-btn:active:not(:disabled) {
    transform: translateX(4px);
  }
`;

interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  answer: string;
}

const WEEK_1_DATA: Question[] = [
  { id: 101, category: '장비', text: '마이크나 악기의 아날로그 신호를 컴퓨터가 인식할 수 있는 디지털 신호로 변환해주는 장비는?', options: ['오디오 인터페이스', '마스터 건반', '모니터 스피커', '앰프'], answer: '오디오 인터페이스' },
  { id: 102, category: '소프트웨어', text: '작곡, 편곡, 믹싱 등 음악 제작의 전 과정을 컴퓨터에서 처리할 수 있게 해주는 메인 프로그램(예: FL Studio)은?', options: ['시퀀서 (DAW)', '가상 악기 (VSTi)', '이펙터', '사운드 카드'], answer: '시퀀서 (DAW)' },
  { id: 103, category: '장비', text: '소리의 왜곡 없이 평탄한 주파수 응답을 제공하여, 작업자가 소리를 객관적으로 듣게 해주는 장비는?', options: ['모니터 스피커', '하이파이 오디오', '다이내믹 마이크', '블루투스 이어폰'], answer: '모니터 스피커' },
  { id: 104, category: '개념', text: '곡의 뼈대가 되는 멜로디와 화성을 만드는 것을 작곡이라 한다면, 어떤 악기를 배치하고 리듬을 어떻게 구성할지 살을 붙이는 작업은?', options: ['편곡', '믹싱', '마스터링', '작사'], answer: '편곡' },
  { id: 105, category: '개념', text: '완성된 여러 트랙(드럼, 베이스, 보컬 등)의 볼륨과 주파수 밸런스를 맞추어 하나의 조화로운 곡으로 섞는 과정은?', options: ['믹싱', '마스터링', '편곡', '레코딩'], answer: '믹싱' },
  { id: 106, category: '개념', text: '믹싱이 끝난 곡의 전체적인 음압과 최종 음질을 상업 음원 기준에 맞게 가다듬는 최종 단계는?', options: ['마스터링', '편곡', '렌더링', '바운싱'], answer: '마스터링' },
  { id: 107, category: '편곡 구성', text: '기본적인 편곡을 구성할 때 뼈대가 되는 3가지 핵심 요소는?', options: ['리듬, 베이스, 화성악기', '보컬, 코러스, 기타', '드럼, 이펙터, 플러그인', '킥, 스네어, 하이햇'], answer: '리듬, 베이스, 화성악기' },
  { id: 108, category: '작업 방식', text: '하나의 음악적 아이디어가 담긴 짧은 마디가 무한히 반복되도록 구성한 오디오나 미디 조각을 무엇이라 하는가?', options: ['루프 (Loop)', '원샷 (One-shot)', '스템 (Stem)', '미디 (MIDI)'], answer: '루프 (Loop)' },
  { id: 109, category: '장비', text: '소리를 전기 신호로 바꾸는 원리 중, 내구성이 강하고 주로 라이브 공연에 많이 쓰이는 마이크는?', options: ['다이내믹 마이크', '콘덴서 마이크', '리본 마이크', '샷건 마이크'], answer: '다이내믹 마이크' },
  { id: 110, category: '장비', text: '스튜디오 녹음용으로 주로 쓰이며 감도가 매우 높아 미세한 소리까지 잡아내는 마이크는?', options: ['콘덴서 마이크', '다이내믹 마이크', '리본 마이크', '다이렉트 박스'], answer: '콘덴서 마이크' },
  { id: 111, category: '개념', text: '음악 데이터 그 자체가 아니라 "어떤 건반을 언제, 세게 눌렀는지"에 대한 연주 정보만을 담고 있는 신호 규격은?', options: ['MIDI', 'WAV', 'MP3', 'FLAC'], answer: 'MIDI' },
];

const WEEK_2_DATA: Question[] = [
  { id: 201, category: '드럼', text: '드럼 세트 중 정박(주로 1, 3박)에 떨어져 곡의 묵직한 저음역대 중심을 잡아주는 악기는?', options: ['킥 (Kick)', '스네어 (Snare)', '하이햇 (Hi-hat)', '탐 (Tom)'], answer: '킥 (Kick)' },
  { id: 202, category: '드럼', text: '드럼 세트 중 엇박(주로 2, 4박)에 타격되어 날카로운 소리로 곡의 긴장감을 해소하는 악기는?', options: ['스네어 (Snare)', '킥 (Kick)', '하이햇 (Hi-hat)', '크래쉬 (Crash)'], answer: '스네어 (Snare)' },
  { id: 203, category: '드럼', text: '가장 잘게 쪼개어 연주되며, 곡의 속도감과 그루브(찰랑거리는 질감)를 결정하는 타악기는?', options: ['하이햇 (Hi-hat)', '스네어 (Snare)', '킥 (Kick)', '라이드 (Ride)'], answer: '하이햇 (Hi-hat)' },
  { id: 204, category: '리듬', text: '대중음악 리듬의 기본으로, 한 마디를 8개로 균등하게 쪼개어 연주하는 리듬 패턴은?', options: ['8비트', '4비트', '16비트', '32비트'], answer: '8비트' },
  { id: 205, category: '리듬', text: '한 마디를 16개로 잘게 쪼개며, 펑크(Funk)나 힙합 등 리듬감이 화려한 곡에 주로 쓰이는 리듬은?', options: ['16비트', '8비트', '4비트', '셔플 리듬'], answer: '16비트' },
  { id: 206, category: '화성학', text: '음과 음 사이의 거리(간격)를 나타내는 화성학적 용어는?', options: ['음정 (Interval)', '키 (Key)', '코드 (Chord)', '근음 (Root)'], answer: '음정 (Interval)' },
  { id: 207, category: '화성학', text: '곡의 중심이 되는 음의 체계나 조성을 의미하는 단어는? (예: C Major)', options: ['키 (Key)', '음정 (Interval)', '진행 (Progression)', '화음 (Triad)'], answer: '키 (Key)' },
  { id: 208, category: '화성학', text: '코드를 구성할 때, 그 코드의 이름이 되며 가장 밑바탕(뿌리)이 되는 중심음은?', options: ['근음 (Root)', '3음 (Third)', '5음 (Fifth)', '텐션 (Tension)'], answer: '근음 (Root)' },
  { id: 209, category: '화성학', text: '기본적인 3화음(Triad) 코드는 근음을 기준으로 음을 몇 도 간격으로 쌓아 올린 것인가?', options: ['3도', '2도', '4도', '5도'], answer: '3도' },
  { id: 210, category: '화성학', text: '메이저와 마이너 코드의 밝고 어두운 성질을 결정짓는 핵심적인 음은 근음으로부터 쌓은 몇 음인가?', options: ['3음 (Third)', '5음 (Fifth)', '7음 (Seventh)', '근음 (Root)'], answer: '3음 (Third)' },
  { id: 211, category: '베이스', text: '곡의 그루브를 안정적으로 묶기 위해 베이스(Bass) 악기의 리듬은 보통 어떤 드럼 파트의 타이밍과 맞추는가?', options: ['킥 타이밍', '스네어 타이밍', '하이햇 타이밍', '크래쉬 타이밍'], answer: '킥 타이밍' },
];

const WEEK_3_DATA: Question[] = [
  { id: 301, category: '레이아웃', text: 'FL Studio에서 악기를 불러오고, 스텝 시퀀서를 통해 미디와 오디오 패턴을 직관적으로 배열하는 창은?', options: ['채널 랙 (Channel Rack)', '피아노 롤', '플레이리스트', '믹서'], answer: '채널 랙 (Channel Rack)' },
  { id: 302, category: '레이아웃', text: '미디 노트의 높낮이(음정)와 길이를 상세하게 편집하고 멜로디와 코드를 그리는 창은?', options: ['피아노 롤 (Piano Roll)', '채널 랙', '믹서', '플레이리스트'], answer: '피아노 롤 (Piano Roll)' },
  { id: 303, category: '레이아웃', text: '만들어진 패턴이나 오디오 샘플들을 시간 순서대로 가로로 배치하여 곡의 전체 구조를 완성하는 창은?', options: ['플레이리스트 (Playlist)', '피아노 롤', '믹서', '채널 랙'], answer: '플레이리스트 (Playlist)' },
  { id: 304, category: '레이아웃', text: '각 채널의 소리를 모아 볼륨/패닝을 조절하고 이펙터(플러그인)를 걸어 소리를 믹스하는 창은?', options: ['믹서 (Mixer)', '채널 랙', '피아노 롤', '플레이리스트'], answer: '믹서 (Mixer)' },
  { id: 305, category: '기능', text: '시간의 흐름에 따라 볼륨이나 특정 파라미터 값이 자동으로 변하도록 제어하는 선(Curve)을 무엇이라 하는가?', options: ['오토메이션 (Automation)', '퀀타이즈', '바운스', '사이드체인'], answer: '오토메이션 (Automation)' },
  { id: 306, category: '기능', text: 'FL 피아노 롤의 특화 기능으로, 특정 노트의 음정이 다른 노트의 음정으로 부드럽게 미끄러지듯 이동하게 만드는 것은?', options: ['슬라이드 (Slide)', '고스트 노트', '포르타멘토', '글리산도'], answer: '슬라이드 (Slide)' },
  { id: 307, category: '저장', text: '작업 중인 프로젝트의 현재 상태 자체를 보존하는 FL Studio 전용 프로젝트 확장자는?', options: ['FLP', 'WAV', 'MP3', 'MIDI'], answer: 'FLP' },
  { id: 308, category: '렌더링', text: '완성된 곡을 WAV나 MP3와 같은 최종 오디오 파일로 뽑아내는 렌더링 과정을 다른 말로 무엇이라 하는가?', options: ['익스포트 (Export)', '바운싱', '마스터링', '컴포징'], answer: '익스포트 (Export)' },
  { id: 309, category: '재생 모드', text: '트랜스포트 패널에서, 현재 선택된 1개의 패턴만 반복할지, 곡 전체를 재생할지 선택하는 버튼의 모드는?', options: ['PAT / SONG', 'PLAY / STOP', 'REC / EDIT', 'SOLO / MUTE'], answer: 'PAT / SONG' },
  { id: 310, category: '기능', text: '피아노 롤에서 마우스로 노트를 찍을 때, 건반을 누르는 세기(강약)를 조절하는 수치는?', options: ['벨로시티 (Velocity)', '피치 벤드', '모듈레이션', '패닝'], answer: '벨로시티 (Velocity)' },
  { id: 311, category: '기능', text: '마우스로 노트를 움직일 때, 자석처럼 박자 선(그리드)에 딱 맞게 붙여주는 제어 기능은?', options: ['스냅 (Snap to Grid)', '퀀타이즈', '스윙', '그루브'], answer: '스냅 (Snap to Grid)' }
];

const WEEK_4_DATA: Question[] = [
  { id: 401, category: '플러그인', text: '소리의 다이내믹 레인지를 압축하여, 큰 소리는 누르고 작은 소리는 끌어올려 볼륨을 단단하게 제어하는 이펙터는?', options: ['컴프레서 (Compressor)', '이퀄라이저 (EQ)', '리버브 (Reverb)', '딜레이 (Delay)'], answer: '컴프레서 (Compressor)' },
  { id: 402, category: '플러그인', text: '소리가 일정 기준을 절대 넘지 못하도록 천장을 만들어 클리핑을 방지하고 음압을 극대화하는 컴프레서는?', options: ['리미터 (Limiter)', '코러스 (Chorus)', '페이저 (Phaser)', '디스토션 (Distortion)'], answer: '리미터 (Limiter)' },
  { id: 403, category: '플러그인', text: '특정 주파수 대역(고/중/저음)을 깎거나 부스트하여 악기의 톤을 조절하고 마스킹을 해결하는 이펙터는?', options: ['EQ (이퀄라이저)', '리미터 (Limiter)', '플랜저 (Flanger)', '페이저 (Phaser)'], answer: 'EQ (이퀄라이저)' },
  { id: 404, category: '플러그인', text: '소리에 인공적인 공간감과 잔향(방, 홀 등)을 더해주어 소리를 뒤로 밀어넣거나 풍성하게 만드는 이펙터는?', options: ['리버브 (Reverb)', '딜레이 (Delay)', '컴프레서 (Compressor)', 'EQ (이퀄라이저)'], answer: '리버브 (Reverb)' },
  { id: 405, category: '플러그인', text: '원음을 일정 시간 간격으로 반복시켜 산울림(메아리) 같은 효과를 내는 이펙터는?', options: ['딜레이 (Delay)', '리버브 (Reverb)', '코러스 (Chorus)', '디스토션 (Distortion)'], answer: '딜레이 (Delay)' },
  { id: 406, category: '플러그인', text: '원본 소리에 위상이 미세하게 변하는 지연음을 섞어, 여러 명이 동시에 소리 내는 듯한 풍성함을 주는 이펙터는?', options: ['코러스 (Chorus)', '페이저 (Phaser)', '리미터 (Limiter)', '디스토션 (Distortion)'], answer: '코러스 (Chorus)' },
  { id: 407, category: '플러그인', text: '제트기 엔진 소리처럼 소리가 위아래로 쓸려 올라갔다 내려가는 강렬한 위상 효과를 주는 것은?', options: ['플랜저 (Flanger)', '페이저 (Phaser)', '코러스 (Chorus)', '딜레이 (Delay)'], answer: '플랜저 (Flanger)' },
  { id: 408, category: '플러그인', text: '원음과 지연음의 간섭을 이용해 바람이 부는 듯 빙글빙글 도는 우주적인 소리를 내는 이펙터는?', options: ['페이저 (Phaser)', '플랜저 (Flanger)', '코러스 (Chorus)', '리버브 (Reverb)'], answer: '페이저 (Phaser)' },
  { id: 409, category: '플러그인', text: '소리의 파형을 의도적으로 일그러뜨려 거칠고 공격적이며 배음이 풍성한 사운드를 만드는 이펙터는?', options: ['디스토션 (Distortion)', '컴프레서 (Compressor)', '리미터 (Limiter)', 'EQ (이퀄라이저)'], answer: '디스토션 (Distortion)' },
  { id: 410, category: '믹서 워크플로우', text: '믹서의 특정 트랙 슬롯에 플러그인을 직렬로 걸어, 해당 소스 자체의 성질을 직접 변형시키는 방식은?', options: ['인서트 (Insert)', '센드 (Send)', '프리 페이더 (Pre-Fader)', '패닝 (Panning)'], answer: '인서트 (Insert)' },
  { id: 411, category: '개념', text: '딜레이와 리버브처럼 소리에 물리적 거리감, 울림, 잔향 등을 부여하는 이펙터 군을 무엇이라 부르는가?', options: ['공간계 이펙터', '다이내믹계 이펙터', '모듈레이션 이펙터', '필터계 이펙터'], answer: '공간계 이펙터' }
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TOTAL_ROUNDS = 10; 
const PASSING_HITS = 8;
const ROUND_TIME_MS = 10000;

export default function CurriculumQuizGame({ userName, onComplete }: { userName?: string, onComplete?: (score: number) => void }) {
  const { isEarned, refresh: refreshStatus } = useGameStatus();
  const { refreshProfile } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const timerBarRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  
  const isTransitioning = useRef(false);
  const roundStartTime = useRef<number>(0);
  const timerFrameReq = useRef<number>(0);
  const handleTimeoutRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (gameState !== 'end' || !selectedWeek || correctCount < PASSING_HITS) return;
    setIsAwarding(true);
    awardQuizPoints(selectedWeek).then(pts => {
      setIsAwarding(false);
      if (pts > 0) { setPointsEarned(pts); refreshStatus(); refreshProfile(); }
    });
  }, [gameState]); // eslint-disable-line

  useEffect(() => {
    return () => {
      cancelAnimationFrame(timerFrameReq.current);
      exitFullscreenAPI();
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        masterGainRef.current.disconnect();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  function getCtx() {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = master;
    }
    return { ctx: audioCtxRef.current, master: masterGainRef.current! };
  }

  function playSound(type: 'hit' | 'error' | 'win') {
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;
    
    const g = ctx.createGain();
    g.connect(master);
    
    if (type === 'hit') {
      const osc = ctx.createOscillator();
      const baseFreq = 523.25; 
      const freq = baseFreq * Math.pow(1.05946, Math.min(combo, 12)); 
      
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(g);
      
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); 
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); 
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);

    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.3); 
      
      osc.connect(g);
      
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);

    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 987.77].forEach((f, i) => { 
        const o = ctx.createOscillator(); const g2 = ctx.createGain();
        o.type = 'sine'; o.connect(g2); g2.connect(master);
        o.frequency.value = f;
        
        g2.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        g2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 1.0);
        
        o.start(ctx.currentTime + i * 0.1); 
        o.stop(ctx.currentTime + i * 0.1 + 1.0);
      });
    }
  }

  const startTimer = useCallback(() => {
    roundStartTime.current = Date.now();
    const updateTimer = () => {
      const elapsed = Date.now() - roundStartTime.current;
      const remainingPct = Math.max(0, 100 - (elapsed / ROUND_TIME_MS) * 100);
      
      if (timerBarRef.current) {
        timerBarRef.current.style.width = `${remainingPct}%`;
        timerBarRef.current.style.backgroundColor = remainingPct > 30 ? '#00E5FF' : '#FF4136';
      }

      if (remainingPct > 0) {
        timerFrameReq.current = requestAnimationFrame(updateTimer);
      } else {
        if (handleTimeoutRef.current) handleTimeoutRef.current();
      }
    };
    timerFrameReq.current = requestAnimationFrame(updateTimer);
  }, []);

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

  const startGame = async () => {
    if (!selectedWeek) return;
    await requestFullscreenAPI();
    
    let pool: Question[] = [];
    if (selectedWeek === 1) pool = WEEK_1_DATA;
    else if (selectedWeek === 2) pool = WEEK_2_DATA;
    else if (selectedWeek === 3) pool = WEEK_3_DATA;
    else if (selectedWeek === 4) pool = WEEK_4_DATA;

    const shuffledQuestions = shuffleArray(pool).slice(0, TOTAL_ROUNDS).map(q => ({
      ...q,
      options: shuffleArray(q.options)
    }));
    
    setQuestions(shuffledQuestions);
    setGameState('playing');
    setCurrentRound(0);
    setScore(0);
    setCorrectCount(0);
    setCombo(0);
    setMaxCombo(0);
    setFeedback(null);
    setSelectedOption(null);
    isTransitioning.current = false;
    startTimer();
  };

  const handleNextRound = () => {
    setTimeout(() => {
      setFeedback(null);
      setSelectedOption(null);
      const nextRound = currentRound + 1;
      
      if (nextRound >= TOTAL_ROUNDS) {
        setGameState('end');
      } else {
        setCurrentRound(nextRound);
        isTransitioning.current = false;
        startTimer();
      }
    }, 1200); 
  };

  useEffect(() => {
    if (gameState === 'end') {
      const isPass = correctCount >= PASSING_HITS;
      playSound(isPass ? 'win' : 'error');
    }
  }, [gameState]);

  const handleTimeout = () => {
    if (isTransitioning.current || gameState !== 'playing') return;
    isTransitioning.current = true;
    stopTimer();
    setCombo(0);
    playSound('error');
    setFeedback('timeout');
    handleNextRound();
  };

  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  });

  const handleOptionClick = (option: string) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    stopTimer();
    setSelectedOption(option);

    const currentQ = questions[currentRound];
    const isCorrect = option === currentQ.answer;

    if (isCorrect) {
      const reactTime = Date.now() - roundStartTime.current;
      const timeBonus = Math.max(0, ROUND_TIME_MS - reactTime) / 1000; 
      const basePts = 1000;
      const calculatedScore = Math.floor(basePts + (timeBonus * 100)) * (1 + (combo * 0.1));
      
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      setScore(s => s + calculatedScore);
      setCorrectCount(prev => prev + 1);
      setFeedback('correct');
      playSound('hit');
    } else {
      setCombo(0);
      setFeedback('wrong');
      playSound('error');
    }

    handleNextRound();
  };

  const getRank = () => {
    if (score >= 12000) return { label: 'S', color: '#D6FF00' };
    if (score >= 9000) return { label: 'A', color: '#00E5FF' };
    if (score >= 6000) return { label: 'B', color: '#A061FF' };
    return { label: 'C', color: '#FF4136' };
  };

  const weekTitles = [
    '1회차: 장비 및 편곡 개념', 
    '2회차: 리듬 및 기본 화성학', 
    '3회차: 레이아웃 및 워크플로우', 
    '4회차: 플러그인 및 믹서 제어'
  ];

  if (gameState === 'start') {
    return (
      <div ref={containerRef} className="flex flex-col items-center w-full gap-6 sm:gap-8 py-10 sm:py-16 font-sans select-none" style={{ background: '#0D0E15', color: '#ECECED' }}>
        <style dangerouslySetInnerHTML={{ __html: quizStyles }} />
        <div className="text-center w-full max-w-4xl px-4">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Curriculum <span style={{ color: '#00E5FF' }}>Assessment</span>
          </h1>
          <p className="text-[#8B90A0] text-sm max-w-lg mx-auto leading-relaxed mb-8">
            기초과정 4주차 커리큘럼 복습을 위한 타임어택 퀴즈 모듈입니다.<br/>
            응시할 주차를 선택해 주세요. 시작 시 전체화면으로 전환됩니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map(week => {
              const earned = isEarned('quiz', `week_${week}`);
              return (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  className="relative px-6 py-8 rounded-2xl text-left border-2 transition-all hover:-translate-y-1"
                  style={{
                    background: selectedWeek === week ? 'rgba(0, 229, 255, 0.1)' : '#15161E',
                    borderColor: earned ? '#1e2940' : selectedWeek === week ? '#00E5FF' : '#2A2F3A',
                    color: selectedWeek === week ? '#00E5FF' : '#ECECED',
                    boxShadow: selectedWeek === week ? '0 10px 30px rgba(0, 229, 255, 0.2)' : 'none',
                    opacity: earned ? 0.65 : 1,
                  }}
                >
                  {!earned && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  {earned && <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">완료</div>}
                  <div className="text-xl font-bold">{weekTitles[week-1]}</div>
                  <div className="text-xs mt-2 opacity-70">해당 주차 문제 풀에서 10문제 무작위 출제</div>
                  <div className="text-[10px] mt-2 font-bold" style={{ color: earned ? '#475569' : '#D6FF00' }}>🏆 1점 · 최초 1회</div>
                </button>
              );
            })}
          </div>

          <button 
            onClick={startGame}
            disabled={!selectedWeek}
            className={`px-16 py-4 rounded-xl text-lg font-black uppercase tracking-widest transition-all ${!selectedWeek ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            style={{ 
              background: !selectedWeek ? '#2A2F3A' : '#00E5FF', 
              color: !selectedWeek ? '#0D0E15' : '#0D0E15', 
              boxShadow: !selectedWeek ? 'none' : '0 10px 30px rgba(0, 229, 255, 0.3)' 
            }}
          >
            {selectedWeek ? '퀴즈 시작하기' : '회차를 선택하세요'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'end') {
    const rank = getRank();
    const isPass = correctCount >= PASSING_HITS;
    return (
      <div ref={containerRef} className="flex flex-col items-center w-full py-10 sm:py-16 px-4 font-sans select-none" style={{ background: '#0D0E15', color: '#ECECED' }}>
        <style dangerouslySetInnerHTML={{ __html: quizStyles }} />
        <div className="flex flex-col items-center p-6 sm:p-12 rounded-3xl w-full max-w-2xl" style={{ background: '#15161E', border: `1px solid ${isPass ? rank.color : '#FF4136'}40`, boxShadow: `0 20px 40px rgba(0,0,0,0.4), inset 0 0 60px ${isPass ? rank.color : '#FF4136'}10` }}>
          <div className="text-[#8B90A0] font-bold tracking-widest uppercase mb-2">{isPass ? 'Assessment Passed' : 'Assessment Failed'}</div>
          <div className="text-9xl font-black mb-4" style={{ color: isPass ? rank.color : '#FF4136', textShadow: `0 0 40px ${isPass ? rank.color : '#FF4136'}60` }}>{isPass ? rank.label : 'F'}</div>
          
          <div className="text-sm mb-10 text-[#8B90A0] font-medium tracking-wide">
            정답: <span className="text-white font-bold">{correctCount}</span> / {TOTAL_ROUNDS} 
            <span className="mx-2 opacity-30">|</span> 기준: {PASSING_HITS}개 이상
          </div>
          
          <div className="w-full flex justify-between px-8 py-6 rounded-2xl mb-10" style={{ background: '#0D0E15', border: '1px solid #2A2F3A' }}>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#5A6170] font-bold uppercase tracking-widest mb-1">Total Score</span>
              <span className="text-3xl font-mono font-black text-white">{Math.floor(score).toLocaleString()}</span>
            </div>
            <div className="w-px h-full bg-[#2A2F3A]"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-[#5A6170] font-bold uppercase tracking-widest mb-1">Max Combo</span>
              <span className="text-3xl font-mono font-black text-[#00E5FF]">{maxCombo}</span>
            </div>
          </div>
          
          {isAwarding && (
            <div className="mb-4 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', color: '#64748b' }}>
              채점 및 포인트 서버 기록 중...
            </div>
          )}
          {!isAwarding && pointsEarned !== null && (
            <div className="mb-4 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', color: '#00E5FF' }}>
              +{pointsEarned}점 획득!
            </div>
          )}
          <button
            onClick={() => {
              if (isPass && onComplete) onComplete(score);
              exitFullscreenAPI();
              setGameState('start');
              setPointsEarned(null);
            }}
            className="px-12 py-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-1"
            style={{ background: isPass ? '#00E5FF' : '#1A1D27', color: isPass ? '#0D0E15' : '#ECECED', border: isPass ? 'none' : '1px solid #2A2F3A' }}
          >
            {isPass ? 'Complete & Collect Points' : 'Return to Menu'}
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentRound];
  const isShake = feedback === 'wrong' || feedback === 'timeout';

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-start sm:justify-center min-h-screen w-full px-2 sm:px-6 pt-6 pb-6 sm:py-10 gap-4 sm:gap-6 select-none font-sans" style={{ background: '#0D0E15', color: '#ECECED', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: quizStyles }} />
      
      <div className="flex flex-wrap sm:flex-nowrap items-end justify-between w-full max-w-4xl px-2 sm:px-4 gap-y-4">
        <div className="flex flex-col gap-1 w-1/2 sm:w-auto order-1">
          <span className="text-[10px] text-[#5A6170] uppercase font-bold tracking-widest">Score / Hit</span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black font-mono tracking-tight" style={{ color: '#FFFFFF' }}>
              {Math.floor(score).toLocaleString()}
            </span>
            <span className={`text-sm font-bold px-2 py-1 rounded ${correctCount >= PASSING_HITS ? 'bg-green-900 text-green-300' : 'bg-[#1A1D27] text-gray-400'}`}>
              {correctCount} / {TOTAL_ROUNDS}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1 w-1/2 sm:w-auto order-2 sm:order-3">
          <span className="text-[10px] text-[#5A6170] uppercase font-bold tracking-widest">Combo</span>
          <span className="text-3xl font-black font-mono tracking-tight" style={{ color: combo > 0 ? '#00E5FF' : '#5A6170', textShadow: combo >= 3 ? '0 0 15px rgba(0,229,255,0.5)' : 'none' }}>
            x{combo}
          </span>
        </div>

        <div className="flex w-full sm:w-auto justify-center order-3 sm:order-2 mt-2 sm:mt-0">
          <div className="flex flex-col items-center gap-1.5 px-4 sm:px-6 py-2 rounded-xl w-full sm:w-auto" style={{ background: '#15161E', border: '1px solid #2A2F3A' }}>
            <span className="text-[10px] sm:text-xs font-bold text-center" style={{ color: '#8B90A0' }}>SESSION {selectedWeek} | ROUND {currentRound + 1} / {TOTAL_ROUNDS}</span>
          </div>
        </div>
      </div>

      <div className={`relative flex flex-col w-full max-w-4xl rounded-3xl overflow-hidden ${isShake ? 'animate-shake' : ''}`} 
           style={{ 
             background: '#15161E',
             border: `1px solid ${feedback === 'correct' ? 'rgba(0, 255, 102, 0.5)' : isShake ? 'rgba(255, 65, 54, 0.5)' : '#2A2D3D'}`, 
             boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
           }}>
        
        <div className="h-1.5 w-full bg-[#0D0E15]">
          <div ref={timerBarRef} className="h-full" style={{ width: '100%', backgroundColor: '#00E5FF' }} />
        </div>

        <div className="flex flex-col items-center text-center p-5 sm:p-10 min-h-[180px] sm:min-h-[240px] justify-center relative">
          <div className="absolute top-6 left-6 flex gap-2">
            <span className="px-3 py-1 rounded-md text-[11px] font-bold tracking-wider" style={{ background: '#1A1D27', color: '#8B90A0', border: '1px solid #2A2F3A' }}>
              {currentQ.category}
            </span>
          </div>

          <h2 className="text-lg sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mt-6" style={{ wordBreak: 'keep-all' }}>
            {currentQ.text}
          </h2>

          {feedback && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(21, 22, 30, 0.8)', backdropFilter: 'blur(4px)', zIndex: 20 }}>
              {feedback === 'correct' && <span className="text-4xl sm:text-6xl font-black text-[#00FF66] animate-pop tracking-widest uppercase">Correct!</span>}
              {feedback === 'wrong' && <span className="text-4xl sm:text-6xl font-black text-[#FF4136] animate-pop tracking-widest uppercase">Wrong</span>}
              {feedback === 'timeout' && <span className="text-4xl sm:text-6xl font-black text-[#FF4136] animate-pop tracking-widest uppercase">Time Over</span>}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        {currentQ.options.map((option, idx) => {
          let btnStyle = { background: '#15161E', borderColor: '#2A2F3A', color: '#ECECED' };
          
          if (feedback) {
            if (option === currentQ.answer) {
              btnStyle = { background: 'rgba(0, 255, 102, 0.15)', borderColor: '#00FF66', color: '#00FF66' }; 
            } else if (option === selectedOption) {
              btnStyle = { background: 'rgba(255, 65, 54, 0.15)', borderColor: '#FF4136', color: '#FF4136' }; 
            } else {
              btnStyle = { background: '#0D0E15', borderColor: '#1A1D27', color: '#5A6170' }; 
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              disabled={!!feedback}
              className="option-btn text-left px-4 sm:px-8 py-4 sm:py-6 rounded-2xl text-base sm:text-xl font-bold border-2 relative overflow-hidden"
              style={btnStyle}
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center min-w-[32px] w-8 h-8 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {['A', 'B', 'C', 'D'][idx]}
                </span>
                <span>{option}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}