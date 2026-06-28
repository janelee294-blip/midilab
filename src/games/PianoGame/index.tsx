import React, { useState, useCallback, useRef, useEffect } from 'react';
import { awardPianoPoints } from '../../lib/gamePoints';
import { useGameStatus, getWeekKey, fmtCountdownWeekly } from '../../lib/useGameStatus';
import { useAuth } from '../../contexts/AuthContext';

// 🎹 12-TET 25-Key 주파수 맵 (C3 ~ C5)
const PIANO_KEYS = [
  { note: 'C3', freq: 130.81, type: 'white' }, { note: 'C#3', freq: 138.59, type: 'black' },
  { note: 'D3', freq: 146.83, type: 'white' }, { note: 'D#3', freq: 155.56, type: 'black' },
  { note: 'E3', freq: 164.81, type: 'white' }, { note: 'F3', freq: 174.61, type: 'white' },
  { note: 'F#3', freq: 185.00, type: 'black' }, { note: 'G3', freq: 196.00, type: 'white' },
  { note: 'G#3', freq: 207.65, type: 'black' }, { note: 'A3', freq: 220.00, type: 'white' },
  { note: 'A#3', freq: 233.08, type: 'black' }, { note: 'B3', freq: 246.94, type: 'white' },
  { note: 'C4', freq: 261.63, type: 'white' }, { note: 'C#4', freq: 277.18, type: 'black' },
  { note: 'D4', freq: 293.66, type: 'white' }, { note: 'D#4', freq: 311.13, type: 'black' },
  { note: 'E4', freq: 329.63, type: 'white' }, { note: 'F4', freq: 349.23, type: 'white' },
  { note: 'F#4', freq: 369.99, type: 'black' }, { note: 'G4', freq: 392.00, type: 'white' },
  { note: 'G#4', freq: 415.30, type: 'black' }, { note: 'A4', freq: 440.00, type: 'white' },
  { note: 'A#4', freq: 466.16, type: 'black' }, { note: 'B4', freq: 493.88, type: 'white' },
  { note: 'C5', freq: 523.25, type: 'white' }
];

interface ChordItem { name: string; hint: string; answers: number[] }

const CATEGORIES = [
  { id: '0', title: 'Lv.0 튜토리얼 (Tutorial)', desc: '음악의 원자 단위인 음정을 시각과 청각으로 강제 매핑합니다.' },
  { id: '1', title: 'Lv.1 음정 (Intervals)', desc: '시각적 단서 없이 두 소리가 부딪히는 맥놀이 질감을 판별합니다.' },
  { id: '2', title: 'Lv.2 3화음 (Triads)', desc: '1-3-5도 수직 적층이 만드는 조성의 안정적/불안정적 구조입니다.' },
  { id: '3', title: 'Lv.3 4화음 (7ths)', desc: '뼈대 위에 7도를 얹어 대중음악과 재즈의 기본 색채를 완성합니다.' },
  { id: '4', title: 'Lv.4 도미넌트 중력 (Dominants)', desc: '타조성(다른 키)으로 빨려가는 강한 중력(세컨더리)과 대리 코드입니다.' },
  { id: '5', title: 'Lv.5 차원 도약 (Warp)', desc: '타조성 2-5-1, 반음계적 미끄러짐(디미니쉬), 증6화음을 다룹니다.' },
  { id: '6', title: 'Lv.6 평행 우주 (Modal)', desc: '단조, 도리안 등 다른 평행 모드에서 유입되는 모든 차용 화음입니다.' },
  { id: '7', title: 'Lv.7 대기권 확장 (Tensions)', desc: '9, 11, 13도 누적 및 반음계적 변위가 빚는 고밀도 마찰입니다.' },
  { id: '8', title: 'Lv.8 이중 중력 (Polychords)', desc: '두 개의 3화음 결합(어퍼 스트럭처) 및 하이브리드 슬래시 화성입니다.' },
  { id: '9', title: 'Lv.9 조성 붕괴 (Atonal)', desc: '4도 누적(콰탈) 및 대칭 스케일에 의한 완전한 조성 붕괴 영역입니다.' }
];

const HARMONY_POOLS: Record<string, { title: string, desc: string, isTutorial?: boolean, isRootFixed?: boolean, pool: ChordItem[] }> = {
  // Lv.0
  "0-1": { title: "대화형 음정 튜토리얼 (전수)", desc: "12평균율의 모든 음정을 순차적으로 매핑합니다.", isTutorial: true, pool: [
    { name: "Step 1: 기준음", hint: "빛나는 기준음 도(C4)를 누르십시오.", answers: [12] },
    { name: "Step 2: 단 2도", hint: "가장 좁고 날카로운 반음 마찰. 도(C4)와 레b(Db4)을 누르십시오.", answers: [12, 13] },
    { name: "Step 3: 장 2도", hint: "반음 2개가 모인 온음 거리. 도(C4)와 레(D4)를 누르십시오.", answers: [12, 14] },
    { name: "Step 4: 단 3도", hint: "어두운 단조의 뼈대 (반음 3개). 도(C4)와 미b(Eb4)을 누르십시오.", answers: [12, 15] },
    { name: "Step 5: 장 3도", hint: "밝은 장조의 뼈대 (반음 4개). 도(C4)와 미(E4)를 누르십시오.", answers: [12, 16] },
    { name: "Step 6: 완전 4도", hint: "안정적인 하행 관성. 도(C4)와 파(F4)를 누르십시오.", answers: [12, 17] },
    { name: "Step 7: 증 4도", hint: "중력을 유발하는 악마의 음정(트라이톤). 도(C4)와 파#(F#4)을 누르십시오.", answers: [12, 18] },
    { name: "Step 8: 완전 5도", hint: "가장 순수하고 완벽한 협화음. 도(C4)와 솔(G4)을 누르십시오.", answers: [12, 19] },
    { name: "Step 9: 단 6도", hint: "비애감이 섞인 도약. 도(C4)와 라b(Ab4)을 누르십시오.", answers: [12, 20] },
    { name: "Step 10: 장 6도", hint: "밝은 확장. 도(C4)와 라(A4)를 누르십시오.", answers: [12, 21] },
    { name: "Step 11: 단 7도", hint: "도미넌트의 핵심 텐션. 도(C4)와 시b(Bb4)을 누르십시오.", answers: [12, 22] },
    { name: "Step 12: 장 7도", hint: "해결을 갈망하는 리딩톤. 도(C4)와 시(B4)를 누르십시오.", answers: [12, 23] },
    { name: "Step 13: 완전 8도", hint: "동일 위상(옥타브). 도(C4)와 높은 도(C5)를 누르십시오.", answers: [12, 24] }
  ]},
  "0-2": { title: "기준음 고정 탐색", desc: "고정된 기준음(C4)을 바탕으로 목표 주파수를 유추합니다.", isRootFixed: true, pool: [
    { name: "단 2도", hint: "1 반음 거리", answers: [12, 13] }, { name: "장 3도", hint: "4 반음 거리", answers: [12, 16] },
    { name: "증 4도", hint: "6 반음 거리 (트라이톤)", answers: [12, 18] }, { name: "완전 5도", hint: "7 반음 거리", answers: [12, 19] },
    { name: "장 7도", hint: "11 반음 거리", answers: [12, 23] }, { name: "완전 8도", hint: "옥타브", answers: [12, 24] }
  ]},
  // Lv.1
  "1-1": { title: "협소 음정 블라인드", desc: "단2도~증4도의 조밀한 주파수 마찰 판별.", pool: [
    { name: "단 2도", answers: [12, 13], hint: "반음 마찰 (1칸)" }, { name: "장 2도", answers: [12, 14], hint: "온음 거리 (2칸)" },
    { name: "단 3도", answers: [12, 15], hint: "어두운 3도 (3칸)" }, { name: "장 3도", answers: [12, 16], hint: "밝은 3도 (4칸)" },
    { name: "완전 4도", answers: [12, 17], hint: "안정적 도약 (5칸)" }, { name: "증 4도", answers: [12, 18], hint: "트라이톤 (6칸)" }
  ]},
  "1-2": { title: "광대 음정 블라인드", desc: "완전5도 이상의 넓은 도약에 따른 장력 판별.", pool: [
    { name: "완전 5도", answers: [12, 19], hint: "순수한 협화 (7칸)" }, { name: "단 6도", answers: [12, 20], hint: "슬픈 도약 (8칸)" },
    { name: "장 6도", answers: [12, 21], hint: "시원한 도약 (9칸)" }, { name: "단 7도", answers: [12, 22], hint: "도미넌트 텐션 (10칸)" },
    { name: "장 7도", answers: [12, 23], hint: "팽팽함 (11칸)" }, { name: "완전 8도", answers: [12, 24], hint: "옥타브 (12칸)" }
  ]},
  // Lv.2
  "2-1": { title: "다이어토닉 3화음", desc: "스케일 내의 7개 기초 트라이어드 블록.", pool: [
    { name: "C Major", answers: [12, 16, 19], hint: "I" }, { name: "Dm", answers: [14, 17, 21], hint: "ii" },
    { name: "Em", answers: [16, 19, 23], hint: "iii" }, { name: "F Major", answers: [17, 21, 24], hint: "IV" },
    { name: "G Major", answers: [7, 11, 14], hint: "V" }, { name: "Am", answers: [9, 12, 16], hint: "vi" },
    { name: "Bdim", answers: [11, 14, 17], hint: "vii°" }
  ]},
  "2-2": { title: "특수 변형 3화음", desc: "증/감/계류 등 성질이 변형된 불안정 트라이어드.", pool: [
    { name: "Caug", answers: [12, 16, 20], hint: "증5도 팽창" }, { name: "Csus4", answers: [12, 17, 19], hint: "완전4도 지연" },
    { name: "Csus2", answers: [12, 14, 19], hint: "장2도 지연" }, { name: "F#dim", answers: [6, 9, 12], hint: "단3도 누적 대칭" },
    { name: "Cdim", answers: [12, 15, 18], hint: "감5도 수축" }
  ]},
  // Lv.3
  "3-1": { title: "다이어토닉 7th", desc: "4음이 누적된 대중음악/재즈의 표준 뼈대.", pool: [
    { name: "Cmaj7", answers: [12, 16, 19, 23], hint: "Imaj7" }, { name: "Dm7", answers: [14, 17, 21, 24], hint: "ii7" },
    { name: "Em7", answers: [4, 7, 11, 14], hint: "iii7" }, { name: "Fmaj7", answers: [5, 9, 12, 16], hint: "IVmaj7" },
    { name: "G7", answers: [7, 11, 14, 17], hint: "V7" }, { name: "Am7", answers: [9, 12, 16, 19], hint: "vi7" },
    { name: "Bm7b5", answers: [11, 14, 17, 21], hint: "vii°7" }
  ]},
  "3-2": { title: "논다이어토닉 7th", desc: "C를 근음으로 유지한 상태의 모든 성질 변위.", pool: [
    { name: "C7", answers: [12, 16, 19, 22], hint: "도미넌트 7" }, { name: "Cm7", answers: [12, 15, 19, 22], hint: "마이너 7" },
    { name: "Cdim7", answers: [12, 15, 18, 21], hint: "감7" }, { name: "CmM7", answers: [12, 15, 19, 23], hint: "마이너 메이저 7" },
    { name: "Caug7", answers: [12, 16, 20, 22], hint: "증7" }
  ]},
  // Lv.4
  "4-1": { title: "세컨더리 도미넌트", desc: "다이어토닉 코드를 임시 1도로 취급하는 타조성의 도미넌트.", pool: [
    { name: "A7", answers: [9, 13, 16, 19], hint: "V7/ii (Dm로 향함)" }, { name: "B7", answers: [11, 15, 18, 21], hint: "V7/iii (Em로 향함)" },
    { name: "C7", answers: [12, 16, 19, 22], hint: "V7/IV (F로 향함)" }, { name: "D7", answers: [14, 18, 21, 24], hint: "V7/V (G로 향함)" },
    { name: "E7", answers: [4, 8, 11, 14], hint: "V7/vi (Am로 향함)" }
  ]},
  "4-2": { title: "대리 도미넌트 (SubV7)", desc: "V7과 트라이톤을 공유하여 반음 하행으로 기묘하게 해결하는 재즈 문법.", pool: [
    { name: "Db7", answers: [1, 5, 8, 11], hint: "subV7/I (C로 하행)" }, { name: "Eb7", answers: [3, 7, 10, 13], hint: "subV7/ii (Dm로 하행)" },
    { name: "Gb7", answers: [6, 10, 13, 16], hint: "subV7/IV (F로 하행)" }, { name: "Ab7", answers: [8, 12, 15, 18], hint: "subV7/V (G로 하행)" },
    { name: "Bb7", answers: [10, 14, 17, 20], hint: "subV7/vi (Am로 하행)" }
  ]},
  // Lv.5
  "5-1": { title: "릴레이티드 ii-V (다른 키 유입)", desc: "세컨더리 도미넌트 앞의 임시 2도를 붙여 완전한 타조성 워프 형성.", pool: [
    { name: "Em7b5 (ii/ii)", answers: [4, 7, 10, 14], hint: "Dm로 향하는 A7 앞의 2도" },
    { name: "F#m7b5 (ii/iii)", answers: [6, 9, 12, 16], hint: "Em로 향하는 B7 앞의 2도" },
    { name: "Gm7 (ii/IV)", answers: [7, 10, 14, 17], hint: "F로 향하는 C7 앞의 2도" }
  ]},
  "5-2": { title: "패싱 디미니쉬 (반음계 연결)", desc: "다이어토닉 코드를 반음계적(Chromatic)으로 매끄럽게 연결하는 감7화음.", pool: [
    { name: "C#dim7 (#Idim7)", answers: [13, 16, 19, 22], hint: "Cmaj7과 Dm7을 연결" },
    { name: "D#dim7 (#iidim7)", answers: [3, 6, 9, 12], hint: "Dm7과 Em7을 연결" },
    { name: "F#dim7 (#IVdim7)", answers: [6, 9, 12, 15], hint: "Fmaj7과 G7을 연결" }
  ]},
  "5-3": { title: "증6화음 (Augmented 6ths)", desc: "클래식 화성학의 극한. G(도미넌트)로 향하기 위해 증6도 마찰을 일으키는 텐션.", pool: [
    { name: "이탈리안 6화음 (It+6)", answers: [8, 12, 18], hint: "Ab-C-F# (가장 뼈대만 남은 증6)" },
    { name: "프렌치 6화음 (Fr+6)", answers: [8, 12, 14, 18], hint: "Ab-C-D-F# (장2도가 추가된 날카로움)" },
    { name: "저먼 6화음 (Ger+6)", answers: [8, 12, 15, 18], hint: "Ab-C-Eb-F# (Ab7과 동음이명, 풍성함)" }
  ]},
  // Lv.6
  "6-1": { title: "에올리안 차용 (단조 계열)", desc: "C Minor에서 빌려오는 가장 어둡고 무거운 기초 차용 화음.", pool: [
    { name: "Cm", answers: [12, 15, 19], hint: "i" }, { name: "Fm", answers: [5, 8, 12], hint: "iv" },
    { name: "Ab", answers: [8, 12, 15], hint: "bVI" }, { name: "Bb", answers: [10, 14, 17], hint: "bVII" },
    { name: "Db", answers: [1, 5, 8], hint: "bII" }, { name: "Eb", answers: [3, 7, 10], hint: "bIII" },
    { name: "Fm7", answers: [5, 8, 12, 15], hint: "iv7" }, { name: "Abmaj7", answers: [8, 12, 15, 19], hint: "bVImaj7" },
    { name: "Bbm7", answers: [10, 13, 17, 20], hint: "bVIIm7" }, { name: "Dbmaj7", answers: [1, 5, 8, 12], hint: "bIImaj7" }
  ]},
  "6-2": { title: "도리안 & 믹솔리디안 차용", desc: "Dorian, Mixolydian 모드에서 파생되는 밝으면서도 세련된 화음.", pool: [
    { name: "Dm (Dorian ii)", answers: [14, 17, 21], hint: "ii" }, { name: "Gm (Dorian v)", answers: [7, 10, 14], hint: "v" },
    { name: "Bb (Mixo bVII)", answers: [10, 14, 17], hint: "bVII" }, { name: "Dm7", answers: [14, 17, 21, 24], hint: "ii7" },
    { name: "Gm7", answers: [7, 10, 14, 17], hint: "v7" }, { name: "Bbmaj7", answers: [10, 14, 17, 21], hint: "bVIImaj7" }
  ]},
  "6-3": { title: "리디안 & 로크리안 극한 차용", desc: "가장 이질적인 증4도 혹은 감5도 색채를 가진 모달 종착지.", pool: [
    { name: "Gbmaj7", answers: [6, 10, 13, 17], hint: "bVmaj7 (Lydian 증4도 색채)" },
    { name: "Bm7b5", answers: [11, 14, 17, 21], hint: "Locrian의 으뜸음" },
    { name: "Db7", answers: [1, 5, 8, 11], hint: "Lydian b7" }
  ]},
  // Lv.7
  "7-1": { title: "공간감 확장 텐션 (9,11,13)", desc: "기본 7도 화음 상층부에 비화성음을 누적하여 넓은 공간의 배음을 만듭니다.", pool: [
    { name: "Cmaj9", answers: [0, 4, 7, 11, 14], hint: "M7 + 9" }, { name: "Dm9", answers: [2, 5, 9, 12, 16], hint: "m7 + 9" },
    { name: "Fadd9", answers: [5, 9, 12, 14], hint: "Triad + 9" }, { name: "Am9", answers: [9, 12, 16, 19, 23], hint: "m7 + 9" },
    { name: "C13", answers: [0, 4, 7, 11, 21], hint: "dom7 + 13" }, { name: "Fmaj9", answers: [5, 9, 12, 16, 19], hint: "M7 + 9" }
  ]},
  "7-2": { title: "알터드 텐션 (Altered)", desc: "도미넌트 해결성을 극한으로 밀어붙이기 위해 텐션을 플랫/샵으로 비튼 불협화음.", pool: [
    { name: "C7(b9)", answers: [0, 4, 10, 1], hint: "단9도 마찰" }, { name: "C7(#9)", answers: [0, 4, 10, 3], hint: "증9도 마찰" },
    { name: "C7(b13)", answers: [0, 4, 10, 8], hint: "단13도" }, { name: "Cmaj7(#11)", answers: [0, 4, 7, 11, 6], hint: "리디안 증4도" },
    { name: "C7(alt)", answers: [0, 4, 10, 1, 8], hint: "알터드 풀 스케일" }
  ]},
  // Lv.8
  "8-1": { title: "어퍼 스트럭처 (Upper Structure)", desc: "하층부 도미넌트와 상층부의 이질적인 3화음이 결합된 폴리코드.", pool: [
    { name: "C7(US-D)", answers: [10, 4, 9, 14, 18], hint: "C7 베이스 + D 트라이어드" }, 
    { name: "C7(US-Eb)", answers: [10, 4, 15, 19, 23], hint: "C7 베이스 + Eb 트라이어드" },
    { name: "C7(US-F#)", answers: [10, 4, 6, 10, 13], hint: "C7 베이스 + F# 트라이어드" }
  ]},
  "8-2": { title: "하이브리드 슬래시 화성", desc: "베이스와 상층부 코드를 분리하여 구동하는 모던 팝/재즈 기법.", pool: [
    { name: "F/G", answers: [7, 17, 21, 24], hint: "G 베이스 + F Triad (G11 대리)" },
    { name: "Ab/Bb", answers: [10, 15, 20, 24], hint: "Bb 베이스 + Ab Triad" },
    { name: "Db/C", answers: [0, 13, 17, 20], hint: "C 베이스 + Db Triad" }
  ]},
  // Lv.9
  "9-1": { title: "콰탈 보이싱 (Quartal/So What)", desc: "3도 누적을 버리고 완전 4도 간격으로 쌓아올려 조성감을 무력화시킵니다.", pool: [
    { name: "C Quartal", answers: [2, 7, 12, 17], hint: "(4도 3개 누적)" }, 
    { name: "So What (Dm)", answers: [4, 9, 14, 19, 23], hint: "(4도 3개 + 맨 위 장3도)" }
  ]},
  "9-2": { title: "대칭 스케일 클러스터 (Tone Clusters)", desc: "현대음악에서 쓰이는 규칙적인 간격의 고밀도 소음 화음입니다.", pool: [
    { name: "온음음계 클러스터", answers: [12, 14, 16, 18], hint: "(Whole Tone Scale 파편)" },
    { name: "디미니쉬 클러스터", answers: [12, 14, 15, 17], hint: "(Diminished Scale 파편)" }
  ]}
};

const shuffleArray = (array: ChordItem[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function SynthHarmonyGame() {
  const { isEarned, getDailyPts, refresh: refreshStatus } = useGameStatus();
  const { refreshProfile } = useAuth();
  const [gameState, setGameState] = useState<'select' | 'play' | 'result'>('select');
  const [activeMainTheme, setActiveMainTheme] = useState<string | null>(null);
  const [levelKey, setLevelKey] = useState<string>('');
  const [shuffledPool, setShuffledPool] = useState<ChordItem[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);
  const [isRoundChecked, setIsRoundChecked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [isAwarding, setIsAwarding] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<any[]>([]);

  const stopAudio = useCallback(() => {
    activeOscillatorsRef.current.forEach(source => { try { source.stop(); source.disconnect(); } catch (e) {} });
    activeOscillatorsRef.current = [];
  }, []);

  const playNotes = useCallback((noteIndexes: number[], duration = 2.0) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    stopAudio();
    const time = ctx.currentTime;
    noteIndexes.forEach(idx => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(PIANO_KEYS[idx].freq, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(time); osc.stop(time + duration);
      activeOscillatorsRef.current.push(osc);
    });
  }, [stopAudio]);

  const initLevel = (key: string) => {
    stopAudio();
    const data = HARMONY_POOLS[key];
    const poolData = data.isTutorial ? data.pool : shuffleArray(data.pool);
    setLevelKey(key);
    setShuffledPool(poolData);
    setRoundIdx(0);
    setScore(0);
    
    if (data.isRootFixed) setSelectedNotes([12]);
    else setSelectedNotes([]);
    
    setIsRoundChecked(false);
    setGameState('play');
    
    if (data.isTutorial) setFeedback(poolData[0].hint);
    else if (data.isRootFixed) setFeedback(`💡 기준음(C4)이 고정되었습니다: ${poolData[0].hint}`);
    else setFeedback("🔊 주파수가 출력 대기 중입니다. [문제 화음 듣기]를 누르십시오.");
  };

  const current = shuffledPool[roundIdx];

  const handleNoteToggle = (idx: number) => {
    if (isRoundChecked || !current) return;
    if (HARMONY_POOLS[levelKey]?.isRootFixed && idx === 12) return;

    setSelectedNotes(prev => {
      const next = prev.includes(idx) ? prev.filter(n => n !== idx) : [...prev, idx];
      if (!prev.includes(idx)) playNotes([idx], 0.3);
      
      if (HARMONY_POOLS[levelKey]?.isTutorial) {
        const isExactMatch = current.answers.length === next.length && current.answers.every(a => next.includes(a));
        if (isExactMatch) {
          setIsRoundChecked(true);
          setScore(s => s + 1);
          setFeedback("✅ 매핑 완료. [다음 진행]을 누르십시오.");
        }
      }
      return next;
    });
  };

  const checkAnswer = () => {
    if (!current) return;
    const isExactMatch = current.answers.length === selectedNotes.length && current.answers.every(a => selectedNotes.includes(a));
    setIsRoundChecked(true);
    if (isExactMatch) setScore(s => s + 1);
    setFeedback(isExactMatch ? "🎉 정확합니다. 목표 주파수를 완벽히 딕테이션했습니다." : "❌ 오류. 타겟 음정을 벗어났습니다.");
  };

  const handleNextRound = () => {
    if (roundIdx + 1 >= shuffledPool.length) {
      setGameState('result');
    } else {
      setRoundIdx(r => r + 1);
      const isRoot = HARMONY_POOLS[levelKey].isRootFixed;
      setSelectedNotes(isRoot ? [12] : []);
      setIsRoundChecked(false);
      
      const nextData = shuffledPool[roundIdx + 1];
      if (HARMONY_POOLS[levelKey].isTutorial) setFeedback(nextData.hint);
      else setFeedback(isRoot ? `💡 기준음(C4) 고정 훈련: ${nextData.hint}` : "🔊 [문제 화음 듣기]를 누르십시오.");
    }
  };

// 🌟 (추가할 코드) 컴포넌트가 꺼질 때(나가기) 울리고 있던 잔향 완벽 컷
  useEffect(() => {
    return () => {
      stopAudio(); 
    };
  }, [stopAudio]);
  
  const renderPianoKeys = () => {
    const isTutorial = HARMONY_POOLS[levelKey]?.isTutorial;
    const isRootFixed = HARMONY_POOLS[levelKey]?.isRootFixed;
    const whiteKeys = PIANO_KEYS.filter(k => k.type === 'white');

    return (
      <div className="relative w-full h-32 sm:h-48 bg-slate-900 border border-slate-800 rounded-b-lg rounded-t-sm flex justify-between select-none mb-6 mt-1 shadow-inner" style={{ minWidth: '280px' }}>
        {PIANO_KEYS.map((k, i) => {
          if (k.type !== 'white') return null;
          const isSelected = selectedNotes.includes(i);
          const isTargetTutorial = isTutorial && current?.answers.includes(i);
          const isRootAnchor = isRootFixed && i === 12;
          const isCorrectAns = isRoundChecked && current?.answers.includes(i);
          const isWrongAns = isRoundChecked && isSelected && !current?.answers.includes(i);

          return (
            <div key={i} onClick={() => handleNoteToggle(i)} 
                 className={`flex-1 border-r border-slate-700 cursor-pointer relative z-0 transition-all h-full flex flex-col justify-end pb-2 items-center
                   ${isSelected ? 'bg-cyan-400' : 'bg-white hover:bg-slate-200'}
                   ${isTargetTutorial && !isSelected ? 'shadow-[inset_0_-20px_30px_rgba(250,204,21,0.8)] bg-yellow-100 ring-2 ring-yellow-400 z-10' : ''}
                   ${isRootAnchor && !isSelected ? 'bg-amber-300 shadow-inner' : ''}
                   ${isCorrectAns && !isRootAnchor ? 'bg-emerald-400' : ''}
                   ${isWrongAns ? 'bg-rose-400' : ''}
                 `}>
                 <span className={`text-[9px] font-bold ${isSelected || isCorrectAns || isWrongAns || isRootAnchor ? 'text-slate-900' : 'text-slate-400'}`}>{k.note}</span>
            </div>
          );
        })}
        {PIANO_KEYS.map((k, i) => {
          if (k.type !== 'black') return null;
          const isSelected = selectedNotes.includes(i);
          const isTargetTutorial = isTutorial && current?.answers.includes(i);
          const isCorrectAns = isRoundChecked && current?.answers.includes(i);
          const isWrongAns = isRoundChecked && isSelected && !current?.answers.includes(i);
          const whiteIndexBefore = PIANO_KEYS.slice(0, i).filter(key => key.type === 'white').length;
          const leftPercent = (whiteIndexBefore / whiteKeys.length) * 100;

          return (
            <div key={i} onClick={(e) => { e.stopPropagation(); handleNoteToggle(i); }}
                 className={`absolute top-0 h-[55%] w-[3.5%] border border-black rounded-b-md z-20 cursor-pointer transition-all flex flex-col justify-end pb-1 items-center
                   ${isSelected ? 'bg-cyan-600' : 'bg-slate-900 hover:bg-slate-700'}
                   ${isTargetTutorial && !isSelected ? 'shadow-[0_0_20px_rgba(250,204,21,1)] bg-yellow-500 border-yellow-300 scale-105' : ''}
                   ${isCorrectAns ? 'bg-emerald-600' : ''}
                   ${isWrongAns ? 'bg-rose-600' : ''}
                 `}
                 style={{ left: `calc(${leftPercent}% - 1.75%)` }}>
                 <span className={`text-[7px] font-bold ${isSelected || isCorrectAns || isTargetTutorial ? 'text-white' : 'text-slate-500'}`}>{k.note}</span>
            </div>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (gameState !== 'result') return;
    const total = shuffledPool.length;
    const isPass = score >= Math.floor(total * 0.8);
    if (!isPass || !levelKey) return;
    setIsAwarding(true);
    awardPianoPoints(levelKey).then(pts => {
      setIsAwarding(false);
      if (pts > 0) { setPointsEarned(pts); refreshStatus(); refreshProfile(); }
    });
  }, [gameState]); // eslint-disable-line

  useEffect(() => {
    if (gameState === 'select') refreshStatus();
  }, [gameState]); // eslint-disable-line

if (gameState === 'select') return (
    <div className="p-4 sm:p-8 bg-[#070a12] text-white rounded-3xl w-full max-w-5xl mx-auto border border-slate-800 shadow-2xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-black mb-1 text-emerald-400 tracking-tighter">Universal 10-Tier C-Key Station</h1>
        <p className="text-xs text-slate-400">음정부터 무조성까지, 물리적으로 가능한 10개의 화성학 층위를 완벽히 분리했습니다.</p>
      </div>
      
      {/* 선택된 테마가 없을 때 (1-Depth 메인 화면) */}
      {!activeMainTheme ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(() => {
            const week = getWeekKey();
            const daily36 = getDailyPts('piano-game', '3-6:');
            const daily79 = getDailyPts('piano-game', '7-9:');
            const catHasAvailable = (catId: string) =>
              Object.keys(HARMONY_POOLS).filter(k => k.startsWith(catId + '-')).some(sk => {
                const lvNum = parseInt(sk.split('-')[0]);
                if (lvNum <= 2) return !isEarned('piano-game', `lv:${sk}`);
                if (lvNum <= 6) return !isEarned('piano-game', `3-6:${sk}:${week}`) && daily36 < 1;
                return !isEarned('piano-game', `7-9:${sk}:${week}`) && daily79 < 1;
              });
            return CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveMainTheme(cat.id)}
                      className="relative p-4 rounded-xl border text-left transition-all flex flex-col justify-start shadow-sm hover:-translate-y-1 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-emerald-500 group">
                {catHasAvailable(cat.id) && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <h2 className="font-black text-xs mb-2 text-slate-200 group-hover:text-emerald-400 transition-colors">{cat.title}</h2>
                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">{cat.desc}</p>
              </button>
            ));
          })()}
        </div>
      ) : (
        /* 선택된 테마가 있을 때 (2-Depth 서브 모듈 화면) */
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-4 flex flex-col items-start border-b border-slate-800 pb-4">
            <button onClick={() => setActiveMainTheme(null)} className="text-[10px] text-slate-500 hover:text-emerald-400 font-bold tracking-widest uppercase mb-3 flex items-center transition-colors">
              ← 카테고리 다시 선택하기
            </button>
            <div className="w-full flex justify-between items-end">
              <h2 className="text-lg font-black text-white">{CATEGORIES.find(c => c.id === activeMainTheme)?.title} 모듈</h2>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Select to Play</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const daily36 = getDailyPts('piano-game', '3-6:');
              const daily79 = getDailyPts('piano-game', '7-9:');
              return Object.keys(HARMONY_POOLS).filter(k => k.startsWith(activeMainTheme + '-')).map(subKey => {
                const lvNum = parseInt(subKey.split('-')[0]);
                const week = getWeekKey();
                let logSubKey: string;
                let pts: number;
                let resetLabel: string;
                if (lvNum <= 2) {
                  logSubKey = `lv:${subKey}`;
                  pts = 1;
                  resetLabel = '최초 1회';
                } else if (lvNum <= 6) {
                  logSubKey = `3-6:${subKey}:${week}`;
                  pts = 0.5;
                  resetLabel = fmtCountdownWeekly();
                } else {
                  logSubKey = `7-9:${subKey}:${week}`;
                  pts = 1;
                  resetLabel = fmtCountdownWeekly();
                }
                const earned = isEarned('piano-game', logSubKey);
                const dailyLimitReached = lvNum >= 3 && lvNum <= 6 && daily36 >= 1 && !earned;
                const daily79LimitReached = lvNum >= 7 && daily79 >= 1 && !earned;
                const anyLimitReached = dailyLimitReached || daily79LimitReached;
                const canEarn = !earned && !anyLimitReached;
                const statusColor = earned ? '#475569' : anyLimitReached ? '#b45309' : '#D6FF00';
                const dailyMax = 1;
                return (
                  <button key={subKey} onClick={() => initLevel(subKey)}
                          className={`p-5 text-left border rounded-xl transition-all group relative overflow-hidden
                            ${HARMONY_POOLS[subKey].isTutorial ? 'bg-slate-800 border-yellow-600 hover:bg-slate-700' : 'bg-slate-900 border-slate-800 hover:border-emerald-500 hover:bg-slate-800'}`}
                          style={{ opacity: (earned || anyLimitReached) ? 0.55 : 1 }}>
                    {canEarn && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse z-20" />}
                    {earned && <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500 z-20">완료</div>}
                    {anyLimitReached && <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-900/60 text-amber-500 z-20">일일 한도 {dailyMax}점</div>}
                    <div className="relative z-10">
                      <h3 className={`font-black text-sm mb-2 group-hover:translate-x-1 transition-transform ${HARMONY_POOLS[subKey].isTutorial ? 'text-yellow-400' : 'text-white'}`}>
                        {HARMONY_POOLS[subKey].title}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{HARMONY_POOLS[subKey].desc}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/50 inline-block px-2 py-1 rounded">
                          {HARMONY_POOLS[subKey].isTutorial || HARMONY_POOLS[subKey].isRootFixed ? '🎯 능동형 매핑 모드' : '🎧 블라인드 청음 모드'}
                        </div>
                        <div className="text-[9px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: statusColor }}>
                          🏆 {pts}점 · {resetLabel}{lvNum >= 3 ? ` · 일 최대 ${dailyMax}점` : ''}
                        </div>
                      </div>
                    </div>
                    {HARMONY_POOLS[subKey].isTutorial && <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );

  if (gameState === 'result') {
    const total = shuffledPool.length;
    const isPass = score >= Math.floor(total * 0.8);
    return (
      <div className="w-full max-w-xl mx-auto p-10 bg-[#070a12] border border-slate-800 rounded-3xl text-center text-white shadow-2xl">
        <h2 className="text-2xl font-black mb-6 text-emerald-400">MODULE COMPLETED</h2>
        <div className="bg-slate-950 p-8 rounded-2xl border border-slate-900 mb-6">
          <span className="text-5xl font-mono font-black text-cyan-400">{score} <span className="text-xl text-slate-600">/ {total}</span></span>
          <p className="text-xs mt-4 font-bold tracking-widest uppercase">{isPass ? '✅ 청음 딕테이션 완수' : '❌ 숙련도 미달 (80% 이상 요구)'}</p>
        </div>
        {isAwarding && (
          <div className="mb-4 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', color: '#64748b' }}>
            채점 및 포인트 서버 기록 중...
          </div>
        )}
        {!isAwarding && pointsEarned !== null && (
          <div className="mb-4 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
            +{pointsEarned}점 획득!
          </div>
        )}
        <button onClick={() => { setGameState('select'); setPointsEarned(null); }} className="w-full py-4 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-black transition-all uppercase tracking-wider shadow-lg">메인 덱으로 복귀</button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="p-4 sm:p-6 bg-[#0a0d14] text-white rounded-3xl w-full max-w-5xl mx-auto border border-slate-800 shadow-2xl select-none">
      <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-widest">{HARMONY_POOLS[levelKey].title}</h2>
          <h3 className="text-2xl font-black text-emerald-400 tracking-tight">
            {HARMONY_POOLS[levelKey].isTutorial || HARMONY_POOLS[levelKey].isRootFixed || isRoundChecked ? current.name : "???"}
          </h3>
          {!HARMONY_POOLS[levelKey].isTutorial && (
            <p className="text-[11px] text-slate-400 mt-2 max-w-lg leading-relaxed bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 inline-block">{current.hint}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] text-slate-300 font-black bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 tracking-widest">STEP {roundIdx + 1} / {shuffledPool.length}</span>
          <button onClick={() => { stopAudio(); setGameState('select'); }} className="text-[10px] px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-500 hover:text-rose-400 font-bold uppercase transition-colors">훈련 강제 종료</button>
        </div>
      </div>
      
      {HARMONY_POOLS[levelKey].isTutorial && (
        <div className="mb-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl p-5 text-center shadow-[0_0_20px_rgba(234,179,8,0.1)]">
          <p className="text-yellow-400 font-black text-base md:text-lg tracking-tight animate-pulse">👉 {feedback}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => playNotes(current.answers, 2.5)} disabled={HARMONY_POOLS[levelKey].isTutorial} className="px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-xs font-black text-slate-950 hover:opacity-90 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-30 disabled:shadow-none">🔊 문제 화음 듣기</button>
        <button onClick={() => playNotes(selectedNotes, 2.0)} className="px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-black hover:bg-slate-700 transition-all">▶ 내 건반 확인</button>
      </div>

      <div className="bg-slate-950 p-1 sm:p-2 rounded-2xl border border-slate-900 shadow-inner overflow-x-auto">
         {renderPianoKeys()}
      </div>

      <div className="flex gap-3 mt-6">
        {!HARMONY_POOLS[levelKey].isTutorial && !isRoundChecked && (
          <button onClick={checkAnswer} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase text-white shadow-lg transition-all">🔍 정답 제출 및 채점</button>
        )}
        {isRoundChecked && (
          <button onClick={handleNextRound} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-xs font-black uppercase text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
            {roundIdx + 1 >= shuffledPool.length ? "📊 최종 결과 확인" : "⏩ 다음 진행"}
          </button>
        )}
      </div>
      
      {!HARMONY_POOLS[levelKey].isTutorial && (
        <p className={`mt-4 text-[12px] font-black text-center py-3 rounded-xl border ${isRoundChecked ? (current.answers.length === selectedNotes.length && current.answers.every(a => selectedNotes.includes(a)) ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/50' : 'bg-rose-900/20 text-rose-400 border-rose-900/50') : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}