import React, { useState, useEffect, useRef, useCallback } from 'react';
import { awardDrumPoints } from '../../lib/gamePoints';
import { useGameStatus, getWeekKey, fmtCountdownWeekly } from '../../lib/useGameStatus';
import { useAuth } from '../../contexts/AuthContext';

// 모바일 환경(640px 미만)에서만 스크롤바를 숨기는 CSS
const mobileScrollStyle = `
  @media (max-width: 639px) {
    .mobile-hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .mobile-hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  }
`;

const ROWS = 5; 
const DRUM_NAMES = ['오픈 하이햇 (OH)', '클로즈 하이햇 (CH)', '스네어/림샷 (SD)', '퍼커션/탐 (PERC)', '킥/808 (KD)'];

interface Round { 
  name: string; tutorial_text?: string; hint: string; cols: number; bpm: number; swing: number; useGhost: boolean; 
  tracks: number[]; accents: Record<number, number[]>; ghosts: Record<number, number[]>;  
}
interface Theme { title: string; desc: string; rounds: Round[] }

const DIFFICULTY_DATA: Record<string, Record<string, Theme>> = {
  tutorial: {
    guide: {
      title: "🔰 튜토리얼: 시퀀싱 기초", desc: "시퀀서 조작법과 다이내믹스(벨로시티)의 기본을 배웁니다.",
      rounds: [
        { 
          name: "Step 1: 킥 (Kick)", 
          tutorial_text: "[조작법] [킥/808] 첫 번째 칸을 누르고 이후 4칸 간격으로 계속 눌러보세요. 총 네 번의 타격(■)이 들어갑니다. 완료 후 아래 [정답 제출하기]을 누르세요.", 
          hint: "가장 기본이 되는 4비트 정박 킥입니다.", cols: 16, bpm: 110, swing: 0, useGhost: false, tracks: [4], accents: { 4: [0, 4, 8, 12] }, ghosts: {} 
        },
        { 
          name: "Step 2: 스네어 (Snare)", 
          tutorial_text: "킥과 킥이 울리는 정확히 중간 지점마다 [스네어/림샷]을 얹어보세요. 킥과 교차하며 현대 음악의 뼈대를 형성합니다.", 
          hint: "두 번째와 네 번째 박자에 악센트를 줍니다.", cols: 16, bpm: 110, swing: 0, useGhost: false, tracks: [2, 4], accents: { 2: [4, 12], 4: [0, 4, 8, 12] }, ghosts: {} 
        },
        { 
          name: "Step 3: 하이햇 (Hi-Hat)", 
          tutorial_text: "[클로즈 하이햇]을 한 칸씩 건너뛰며 촘촘하게 채워보세요. 비트를 쪼개어 속도감을 부여합니다.", 
          hint: "하이햇이 곡이 전진하는 느낌을 주는 8-Beat 리듬입니다.", cols: 16, bpm: 110, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0, 2, 4, 6, 8, 10, 12, 14], 2: [4, 12], 4: [0, 8] }, ghosts: {} 
        },
        { 
          name: "Step 4: 엇박 (Syncopation)", 
          tutorial_text: "두 번째 스네어를 원래 있던 자리에서 반 박자(두 칸) 앞으로 당겨서 찍어보세요. 타이밍이 어긋나며 춤추기 좋은 그루브가 생깁니다.", 
          hint: "스네어가 정박보다 일찍 떨어집니다.", cols: 16, bpm: 110, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0, 2, 4, 6, 8, 10, 12, 14], 2: [4, 10], 4: [0, 8] }, ghosts: {} 
        },
        { 
          name: "Step 5: 약음 켜기 (Ghost Note)", 
          tutorial_text: "[중요] 지금부터 칸을 '한 번' 누르면 작은 점(·, 약음), '두 번' 누르면 네모(■, 강음)가 됩니다. 첫 번째 스네어와 엇박 스네어 사이의 빈 공간에 '약음'을 섞어보세요.", 
          hint: "약음(고스트 노트)은 공간을 은밀하게 채웁니다.", cols: 16, bpm: 100, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 12], 4: [0, 8] }, ghosts: { 2: [7, 9] } 
        }
      ]
    }
  },
  easy: {
    standard_pop: {
      title: "🟢 초급: 팝 & 댄스", desc: "고스트 노트 없이 강음만으로 구성되는 대중음악 표준 패턴.",
      rounds: [
        { name: "1R: 하드 록 (Rock)", hint: "스네어 타격 직후 다음 칸에 킥을 연달아 넣어 전진하는 밴드 사운드를 냅니다.", cols: 16, bpm: 95, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 12], 4: [0, 5, 8] }, ghosts: {} },
        { name: "2R: 디스코 바운스", hint: "오픈 하이햇(OH)이 정박 사이의 엇박 위치에만 단독으로 들어갑니다.", cols: 16, bpm: 122, swing: 0, useGhost: false, tracks: [0, 1, 2, 4], accents: { 0: [2, 6, 10, 14], 1: [0, 4, 8, 12], 2: [4, 12], 4: [0, 4, 8, 12] }, ghosts: {} },
        { name: "3R: 댄스홀 (Dancehall)", hint: "킥이 첫 번째, 세 번째 박자 정박을 잡고 스네어가 엇박으로 치고 들어오며 리듬을 끕니다.", cols: 16, bpm: 100, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [3, 11], 4: [0, 8] }, ghosts: {} },
        { name: "4R: 베이직 트랩", hint: "하이햇이 빈틈없이 질주하며, 스네어는 세 번째 박자 정박에 딱 한 번 떨어집니다.", cols: 16, bpm: 140, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 2: [8], 4: [0, 10] }, ghosts: {} },
        { name: "5R: 유로 댄스", hint: "킥, 스네어, 오픈 하이햇 세 가지 악기가 매 박자마다 동시에 꽂히는 강력한 클럽 비트입니다.", cols: 16, bpm: 135, swing: 0, useGhost: false, tracks: [0, 2, 4], accents: { 0: [2, 6, 10, 14], 2: [4, 12], 4: [0, 4, 8, 12] }, ghosts: {} }
      ]
    },
    electronic_dance: {
      title: "🟢 초급: 일렉트로닉", desc: "하우스와 드럼앤베이스 등 현대 전자음악의 기초 리듬.",
      rounds: [
        { name: "1R: 딥 하우스 (Deep House)", hint: "킥은 정박, 스네어는 백비트, 클로즈 하이햇은 엇박에만 배치해 가장 깔끔한 공간을 둡니다.", cols: 16, bpm: 120, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [2, 6, 10, 14], 2: [4, 12], 4: [0, 4, 8, 12] }, ghosts: {} },
        { name: "2R: 투스텝 (2-Step) 기초", hint: "킥이 첫 박자와 세 번째 박자의 엇박에만 등장하여 바닥에 발을 덜 디디는 느낌입니다.", cols: 16, bpm: 130, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 12], 4: [0, 10] }, ghosts: {} },
        { name: "3R: 드럼앤베이스 기초", hint: "170BPM의 질주. 스네어 엇박 당김음과 후반부 킥 더블링이 생명입니다.", cols: 16, bpm: 170, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 10], 4: [0, 5, 8] }, ghosts: {} },
        { name: "4R: 신스웨이브", hint: "Blinding Lights 위켄드 스타일의 질주하는 드럼 머신 비트.", cols: 16, bpm: 170, swing: 0, useGhost: false, tracks: [1, 2, 4], accents: { 1: [0, 2, 4, 6, 8, 10, 12, 14], 2: [4, 12], 4: [0, 8, 10] }, ghosts: {} },
        { name: "5R: 저지 클럽 기초", hint: "세 번째 박자 이후에 몰아치는 킥의 5연속 폭격이 핵심입니다.", cols: 16, bpm: 155, swing: 0, useGhost: false, tracks: [1, 4], accents: { 1: [4, 12], 4: [0, 4, 8, 11, 14] }, ghosts: {} }
      ]
    }
  },
  normal: {
    groove_hiphop: {
      title: "🟡 중급: 그루브 & R&B", desc: "스윙(Layback)과 약음(고스트 노트)이 본격적으로 사용됩니다.",
      rounds: [
        { name: "1R: 고스트 펑크 (Funk)", hint: "정박 외의 엇박 빈 공간들에 스네어 약음을 흩뿌려 그루브를 유도하세요.", cols: 16, bpm: 100, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 12], 4: [0, 8] }, ghosts: { 2: [7, 9, 14] } },
        { name: "2R: 붐뱁 레이백 스윙", hint: "타이밍이 밀리는 스윙 연산이 켜집니다. 하이햇 약음을 섞고, 킥을 뒤로 밀리는 엇박에 꽂으세요.", cols: 16, bpm: 88, swing: 35, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,4,8,12], 2: [4, 12], 4: [0, 9, 11] }, ghosts: { 1: [2, 6, 10, 14] } },
        { name: "3R: 투스텝 개러지 (2-Step)", hint: "하이햇 약음이 흐르는 가운데, 킥이 첫 박자와 세 번째 박자 엇박에만 등장해 부유감을 줍니다.", cols: 16, bpm: 132, swing: 15, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 12], 4: [0, 10] }, ghosts: { 1: [3, 7, 11, 15] } },
        { name: "4R: 저지 클럽 (Jersey Club)", hint: "후반부에 몰아치는 킥의 5연속 폭격을 구현하세요.", cols: 16, bpm: 155, swing: 10, useGhost: true, tracks: [1, 4], accents: { 1: [4, 12], 4: [0, 4, 8, 11, 14] }, ghosts: { 1: [0, 2, 6, 8, 10, 14] } },
        { name: "5R: 로파이 재즈", hint: "Dilla 스타일. 스윙이 강하게 걸린 상태에서 킥이 엇박을 타격하고, 스네어 약음이 가볍게 들어갑니다.", cols: 16, bpm: 82, swing: 35, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,4,8,12], 2: [4, 12], 4: [0, 7, 10] }, ghosts: { 1: [2, 6, 10, 14], 2: [9, 14] } }
      ]
    },
    waltz_3_4: {
      title: "🟡 중급: 왈츠 (3/4박자)",
      desc: "2마디(24칸) 체제로 확장하여 쿵짝짝(Oom-Pah-Pah) 본연의 호흡을 완벽히 살려낸 3/4박자 훈련입니다.",
      rounds: [
        { 
          name: "1R: 프로덕션 왈츠", 
          hint: "3/4박자 기본형입니다. 사이사이에 숨은 약음(고스트)들과 오픈 하이햇(OH)의 다이내믹스를 매칭하세요.", 
          cols: 24, bpm: 110, swing: 0, useGhost: true, 
          tracks: [0, 1, 2, 4], 
          accents: { 
            0: [10, 22],               
            1: [0, 4, 8, 12, 16, 20],  
            2: [4, 16],                
            4: [0, 12]                 
          }, 
          ghosts: { 
            1: [2, 14],                
            2: [6, 8, 18, 20]          
          } 
        },
        { 
          name: "2R: 빈 왈츠 (Viennese Waltz)", 
          hint: "150BPM의 빠른 왈츠. 스네어 없이 킥과 하이햇의 강약 교차만으로 무도회 춤곡을 이끕니다.", 
          cols: 24, bpm: 150, swing: 0, useGhost: true, 
          tracks: [1, 4], 
          accents: { 1: [4, 8, 16, 20], 4: [0, 12] }, 
          ghosts: { 1: [0, 12] } 
        },
        { 
          name: "3R: 재즈 왈츠 (Jazz Ride)", 
          hint: "스윙 35%. 재즈 드럼 특유의 '챙-차카-챙' 궤적. 하이햇 라인이 뜁니다.", 
          cols: 24, bpm: 120, swing: 35, useGhost: true, 
          tracks: [1, 2, 4], 
          accents: { 1: [0, 4, 8, 12, 16, 20], 4: [0, 12] }, 
          ghosts: { 1: [6, 10, 18, 22], 2: [7, 19] } 
        },
        { 
          name: "4R: 모던 R&B 발라드 (3/4)", 
          hint: "현대 팝 양식입니다. 스네어가 3번째 박자에만 무겁게 떨어지며 깊은 공간감과 무게감을 만듭니다.", 
          cols: 24, bpm: 95, swing: 0, useGhost: true, 
          tracks: [1, 2, 4], 
          accents: { 1: [0, 4, 8, 12, 16, 20], 2: [8, 20], 4: [0, 4, 12] }, 
          ghosts: { 1: [2, 6, 10, 14, 18, 22] } 
        },
        { 
          name: "5R: 얼터너티브 3/4 브레이크", 
          hint: "3박자 프레임 안에서 퍼커션이 엇박을 쪼개며 기하학적인 월드 폴리리듬 질감을 냅니다.", 
          cols: 24, bpm: 115, swing: 0, useGhost: true, 
          tracks: [1, 2, 3, 4], 
          accents: { 1: [0, 4, 8, 12, 16, 20], 2: [4, 16], 3: [6, 10, 18, 22], 4: [0, 12] }, 
          ghosts: {} 
        }
      ]
    }
  },
  hard: {
    world_latin: {
      title: "🔴 심화: 정통 라틴 & 아프로", desc: "정확하게 고증된 오리지널 아프리칸/라틴 폴리리듬 궤적.",
      rounds: [
        { name: "1R: Bossa Nova (정통 클라베)", hint: "킥이 첫 박과 마지막 박자 당김음을 짚어주고, 림샷(스네어)이 정통 3-2 클라베 엇박을 연주합니다.", cols: 16, bpm: 75, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [0, 3, 6, 10, 13], 4: [0, 7, 8, 15] }, ghosts: {} },
        { name: "2R: 아프로비츠 (Afrobeat 오리지널)", hint: "퍼커션과 킥이 3:3:2 리듬 비율로 쪼개져 정밀하게 얽히는 아프리카 본연의 뼈대입니다.", cols: 16, bpm: 105, swing: 10, useGhost: true, tracks: [1, 2, 3, 4], accents: { 1: [0,4,8,12], 2: [4, 12], 3: [2, 7, 10, 15], 4: [0, 3, 6, 8, 11, 14] }, ghosts: {} },
        { name: "3R: 하프타임 드릴 (UK Drill)", hint: "드릴 장르 특유의 불규칙한 엇박 하이햇 슬라이드와 지연된 808 킥의 배치를 찾아내세요.", cols: 16, bpm: 142, swing: 15, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,3,6,8,11,14], 2: [8], 4: [0, 10] }, ghosts: {} },
        { name: "4R: 트랩 하프타임 롤", hint: "하이햇이 두 칸씩 연속으로 쪼개지는 트랩 특유의 하프타임 바운스입니다.", cols: 16, bpm: 145, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,1,2,4,5,6,8,9,10,12,13,14], 2: [8], 4: [0, 13] }, ghosts: { 1: [3, 7, 11, 15] } },
        { name: "5R: 레게톤 브레이크다운", hint: "스네어가 완전히 사라지고 킥과 퍼커션이 라틴 그루브의 공백을 메웁니다.", cols: 16, bpm: 95, swing: 0, useGhost: true, tracks: [1, 3, 4], accents: { 1: [0,2,4,6,8,10,12,14], 3: [3, 6, 11, 14], 4: [0, 4, 8, 12] }, ghosts: { 3: [1, 9] } }
      ]
    }
  },
  master: {
    complex_breakbeats: {
      title: "👑 마스터: 화려한 브레이크 섹션", desc: "실제 프로덕션 브릿지에 투입되는 리니어 필인, 글리치, 하이퍼 모던 변박자.",
      rounds: [
        { name: "1R: 아멘 브레이크 (Amen Break)", hint: "드럼앤베이스의 시초. 하이햇이 일정하게 흐르는 가운데 스네어의 고스트 노트와 킥이 폭풍처럼 쏟아집니다.", cols: 16, bpm: 165, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0,2,4,6,8,10,12,14], 2: [4, 12], 4: [0, 2, 8, 11] }, ghosts: { 2: [7, 9, 14] } },
        { name: "2R: 가스펠 리니어 필인 (Linear Fill)", hint: "모든 칸이 한 번씩만 타격되며 겹치지 않습니다. 클로즈햇-퍼커션-스네어 연속타격 이후 킥이 몰아칩니다.", cols: 16, bpm: 110, swing: 0, useGhost: true, tracks: [0, 1, 2, 3, 4], accents: { 0: [15], 1: [0], 2: [2, 3, 8, 12], 3: [1, 6, 7, 11], 4: [4, 5, 9, 10, 13, 14] }, ghosts: {} },
        { name: "3R: 퓨처 베이스 드랍", hint: "거대한 공간감. 하이햇 약음이 쏟아지는 와중에 킥이 엇박에 강력하게 충돌합니다.", cols: 16, bpm: 150, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 4, 12], 2: [8], 4: [0, 3, 11] }, ghosts: { 1: [2, 6, 10, 14] } },
        { name: "4R: 하이퍼팝 글리치 (32-Grid)", hint: "32칸 가속. 기계 오류처럼 하이햇이 연사되고 스네어와 808 베이스가 불규칙한 공간에서 끊어집니다.", cols: 32, bpm: 140, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 1, 2, 3, 16, 17, 18, 19, 24, 26, 28, 30], 2: [8, 24], 4: [0, 16, 28] }, ghosts: {} },
        { name: "5R: 매스 록 변박자 (14-Grid)", hint: "14칸(7/8박자). 마지막 박자가 잘려나가는 변칙 리듬 속에서 스네어가 기하학적으로 배치됩니다.", cols: 14, bpm: 130, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 2, 4, 6, 8, 10, 12], 2: [4, 11], 4: [0, 3, 6, 10] }, ghosts: {} }
      ]
    },
    polyrhythm: {
      title: "👑 마스터: 폴리리듬 & 변박자", desc: "12칸, 14칸, 20칸 등 상식을 파괴하는 가변 격자 수학.",
      rounds: [
        { name: "1R: 3:4 폴리리듬 (12-Grid)", hint: "12그리드! 하이햇은 3칸 간격, 킥은 4칸 간격으로 완벽히 엇갈립니다.", cols: 12, bpm: 120, swing: 0, useGhost: true, tracks: [1, 4], accents: { 1: [0, 3, 6, 9], 4: [0, 4, 8] }, ghosts: {} },
        { name: "2R: 아프로 12/8 그루브 (12-Grid)", hint: "스네어가 12칸 격자 내에서 아프리카 특유의 황금 비율을 그립니다.", cols: 12, bpm: 120, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 2, 4, 6, 8, 10], 2: [0, 3, 5, 8, 10], 4: [0, 6] }, ghosts: {} },
        { name: "3R: 5/4 변박자 'Take Five' (20-Grid)", hint: "20그리드! 4/4박자가 아닌 5/4박자(1박=4칸)입니다. 스네어 엇박을 따라가세요.", cols: 20, bpm: 120, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 4, 8, 12, 16], 2: [6, 14], 4: [0, 8, 12] }, ghosts: {} },
        { name: "4R: 7/8 변박자 브릿지 (14-Grid)", hint: "14그리드! 3-3-2 분할의 긴박한 스파이 영화 테마 리듬입니다.", cols: 14, bpm: 120, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 3, 6, 8, 10, 12], 2: [0, 3, 6], 4: [0, 3] }, ghosts: {} },
        { name: "5R: 5:4 폴리 하이브리드 (20-Grid)", hint: "가변 그리드의 최종 보스. 20칸 안에서 하이햇(4칸 간격)과 킥(5칸 간격)이 엇갈립니다.", cols: 20, bpm: 120, swing: 0, useGhost: true, tracks: [1, 2, 4], accents: { 1: [0, 4, 8, 12, 16], 2: [10], 4: [0, 5, 10, 15] }, ghosts: {} }
      ]
    }
  }
};

export default function UltimateRhythmEngine() {
  const { isEarned, refresh: refreshStatus } = useGameStatus();
  const { refreshProfile } = useAuth();
  const [gameState, setGameState] = useState<'diff_select' | 'theme_select' | 'playing' | 'result'>('diff_select');
  const [diff, setDiff] = useState<string>('');
  const [themeKey, setThemeKey] = useState<string>('');
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [isAwarding, setIsAwarding] = useState(false);
  
  const [gridCols, setGridCols] = useState(16);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [useGhost, setUseGhost] = useState(false);
  const [activeTracks, setActiveTracks] = useState<number[]>([]);

  const [grid, setGrid] = useState<number[][]>(() => Array(ROWS).fill(null).map(() => Array(16).fill(0)));
  
  const [currentCol, setCurrentCol] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false); 
  const [isRoundChecked, setIsRoundChecked] = useState(false); 
  const [isCorrect, setIsCorrect] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const nextNoteTimeRef = useRef(0.0); 
  const timerIdRef = useRef<number | null>(null);
  const stateRef = useRef({ grid, currentCol, isPlaying, bpm, swing, gridCols });

  useEffect(() => { 
    stateRef.current = { grid, currentCol, isPlaying, bpm, swing, gridCols }; 
  }, [grid, currentCol, isPlaying, bpm, swing, gridCols]);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (!noiseBufferRef.current) {
      const bSize = ctx.sampleRate * 2; 
      const b = ctx.createBuffer(1, bSize, ctx.sampleRate);
      const d = b.getChannelData(0); 
      for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
      noiseBufferRef.current = b;
    }
    return ctx;
  }, []);

  const playSound = (type: number, time: number, velocity: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const targetTime = Math.max(time, ctx.currentTime + 0.01);
    const gainMod = velocity === 2 ? 1.0 : 0.35; 

    switch(type) {
      case 4: { 
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(130, targetTime); 
        o.frequency.exponentialRampToValueAtTime(0.01, targetTime + 0.3);
        g.gain.setValueAtTime(0, targetTime);
        g.gain.linearRampToValueAtTime(0.9 * gainMod, targetTime + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.3);
        o.start(targetTime); o.stop(targetTime + 0.3); break;
      }
      case 3: { 
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
        o.type = 'triangle'; 
        o.frequency.setValueAtTime(450, targetTime); 
        o.frequency.exponentialRampToValueAtTime(120, targetTime + 0.1);
        g.gain.setValueAtTime(0, targetTime);
        g.gain.linearRampToValueAtTime(0.6 * gainMod, targetTime + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.1);
        o.start(targetTime); o.stop(targetTime + 0.1); break;
      }
      case 2: { 
        if (noiseBufferRef.current) {
          const n = ctx.createBufferSource(); n.buffer = noiseBufferRef.current;
          const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200;
          const g = ctx.createGain(); 
          g.gain.setValueAtTime(0, targetTime);
          g.gain.linearRampToValueAtTime(0.45 * gainMod, targetTime + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.15);
          n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(targetTime); n.stop(targetTime + 0.15);
        }
        break;
      }
      case 1: { 
        if (noiseBufferRef.current) {
          const n = ctx.createBufferSource(); n.buffer = noiseBufferRef.current;
          const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 9000;
          const g = ctx.createGain(); 
          g.gain.setValueAtTime(0, targetTime);
          g.gain.linearRampToValueAtTime(0.2 * gainMod, targetTime + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.05);
          n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(targetTime); n.stop(targetTime + 0.05);
        }
        break;
      }
      case 0: { 
        if (noiseBufferRef.current) {
          const n = ctx.createBufferSource(); n.buffer = noiseBufferRef.current;
          const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8500;
          const g = ctx.createGain(); 
          g.gain.setValueAtTime(0, targetTime);
          g.gain.linearRampToValueAtTime(0.25 * gainMod, targetTime + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, targetTime + 0.4);
          n.connect(f); f.connect(g); g.connect(ctx.destination); n.start(targetTime); n.stop(targetTime + 0.4);
        }
        break;
      }
    }
  };

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current || !stateRef.current.isPlaying) return; 
    const ctx = audioCtxRef.current;
    
    let beatsPerMeasure = 4;
    if(stateRef.current.gridCols === 32) beatsPerMeasure = 4;
    if(stateRef.current.gridCols === 24) beatsPerMeasure = 6;
    if(stateRef.current.gridCols === 22) beatsPerMeasure = 5.5;
    if(stateRef.current.gridCols === 20) beatsPerMeasure = 5;
    if(stateRef.current.gridCols === 18) beatsPerMeasure = 4.5;
    if(stateRef.current.gridCols === 14) beatsPerMeasure = 3.5;
    if(stateRef.current.gridCols === 12) beatsPerMeasure = 3;

    const secondsPerMeasure = (60.0 / stateRef.current.bpm) * beatsPerMeasure;
    const baseStepTime = secondsPerMeasure / stateRef.current.gridCols;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.05) {
      let nCol = stateRef.current.currentCol + 1;
      if (nCol >= stateRef.current.gridCols) nCol = 0;

      setCurrentCol(nCol);
      stateRef.current.currentCol = nCol;

      let timeOffset = 0;
      if (nCol % 2 !== 0) timeOffset = (stateRef.current.swing / 100) * (baseStepTime * 0.4);

      const exactPlayTime = nextNoteTimeRef.current + timeOffset;

      for (let r = 0; r < ROWS; r++) {
        const vel = stateRef.current.grid[r][nCol];
        if (vel > 0) playSound(r, exactPlayTime, vel);
      }
      nextNoteTimeRef.current += baseStepTime;
    }
    timerIdRef.current = window.setTimeout(scheduler, 15);
  }, []);

  const togglePlay = () => {
    const ctx = initAudio();
    if (isPlaying) { 
      setIsPlaying(false);
      stateRef.current.isPlaying = false;
      if (timerIdRef.current !== null) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      setCurrentCol(-1);
      stateRef.current.currentCol = -1;
    } else { 
      setIsPlaying(true);
      stateRef.current.isPlaying = true;
      nextNoteTimeRef.current = ctx.currentTime + 0.05; 
      
      if (timerIdRef.current !== null) clearTimeout(timerIdRef.current);
      timerIdRef.current = window.setTimeout(scheduler, 0); 
    }
  };

  const playGuide = () => {
    if (isPlaying) {
      togglePlay(); 
    }

    const ctx = initAudio();
    const prob = DIFFICULTY_DATA[diff][themeKey].rounds[round];
    const sTime = ctx.currentTime + 0.1; 

    let beatsPerMeasure = 4;
    if(prob.cols === 32) beatsPerMeasure = 4;
    if(prob.cols === 24) beatsPerMeasure = 6;
    if(prob.cols === 22) beatsPerMeasure = 5.5;
    if(prob.cols === 20) beatsPerMeasure = 5;
    if(prob.cols === 18) beatsPerMeasure = 4.5;
    if(prob.cols === 14) beatsPerMeasure = 3.5;
    if(prob.cols === 12) beatsPerMeasure = 3;

    const secondsPerMeasure = (60.0 / prob.bpm) * beatsPerMeasure;
    const baseStepTime = secondsPerMeasure / prob.cols;
    
    for (let c = 0; c < prob.cols; c++) {
      let timeOffset = 0;
      if (c % 2 !== 0) timeOffset = (prob.swing / 100) * (baseStepTime * 0.4);
      const t = sTime + c * baseStepTime + timeOffset;

      for (const r of prob.tracks) {
        const acc = prob.accents[r] || [];
        const gh = prob.ghosts[r] || [];
        if (acc.includes(c)) playSound(r, t, 2);
        else if (gh.includes(c)) playSound(r, t, 1);
      }
    }
  };

  const loadRoundData = (dKey: string, tKey: string, rIdx: number) => {
    const prob = DIFFICULTY_DATA[dKey][tKey].rounds[rIdx];
    setGridCols(prob.cols);
    setBpm(prob.bpm);
    setSwing(prob.swing);
    setUseGhost(prob.useGhost);
    setActiveTracks(prob.tracks);
    setGrid(Array(ROWS).fill(null).map(() => Array(prob.cols).fill(0)));
    setIsRoundChecked(false); 
  };

  const handleDifficultySelect = (selectedDiff: string) => {
    setDiff(selectedDiff);
    const themes = Object.keys(DIFFICULTY_DATA[selectedDiff]);
    if (themes.length === 1) {
      setThemeKey(themes[0]);
      setGameState('playing');
      setRound(0);
      setScore(0);
      loadRoundData(selectedDiff, themes[0], 0);
    } else {
      setGameState('theme_select');
    }
  };

  const checkAnswer = () => {
    const prob = DIFFICULTY_DATA[diff][themeKey].rounds[round];
    let ok = true;
    for (const r of prob.tracks) {
      const acc = prob.accents[r] || [];
      const gh = prob.ghosts[r] || [];
      for (let c = 0; c < gridCols; c++) {
        const expectedVel = acc.includes(c) ? 2 : (gh.includes(c) ? 1 : 0);
        if (grid[r][c] !== expectedVel) { ok = false; break; }
      }
      if (!ok) break;
    }
    setIsCorrect(ok); setIsRoundChecked(true); if (ok) setScore(s => s + 1);
  };

  useEffect(() => {
    return () => {
      if (timerIdRef.current !== null) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'result') return;
    if (score < 4) return;
    setIsAwarding(true);
    awardDrumPoints(diff, themeKey).then(pts => {
      setIsAwarding(false);
      if (pts > 0) { setPointsEarned(pts); refreshStatus(); refreshProfile(); }
    });
  }, [gameState]); // eslint-disable-line

  if (gameState === 'diff_select') {
    const week = getWeekKey();
    const tutorialEarned = isEarned('drum-game', 'tutorial:guide');
    const hardEarned = isEarned('drum-game', `hard:world_latin:${week}`);
    const multiAvailable: Record<string, boolean> = {
      easy: !isEarned('drum-game', 'easy:standard_pop') || !isEarned('drum-game', 'easy:electronic_dance'),
      normal: !isEarned('drum-game', `normal:groove_hiphop:${week}`) || !isEarned('drum-game', `normal:waltz_3_4:${week}`),
      master: !isEarned('drum-game', `master:complex_breakbeats:${week}`) || !isEarned('drum-game', `master:polyrhythm:${week}`),
    };

    const diffLabels: Record<string, string> = {
      tutorial: '튜토리얼 (Tutorial)',
      easy: '초급 (Easy)',
      normal: '중급 (Normal)',
      hard: '심화 (Hard)',
      master: '마스터 (Master)',
    };

    return (
      <div className="w-full max-w-4xl mx-auto p-10 bg-[#060913] border border-slate-800 rounded-3xl text-white text-center shadow-2xl">
        <h2 className="text-3xl font-black mb-2 text-teal-400 uppercase tracking-tighter">Rhythm Master V11</h2>
        <p className="text-sm text-slate-500 mb-8">트렌디한 장르부터 폴리리듬까지 다양한 리듬을 완벽히 마스터하세요.</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {Object.keys(DIFFICULTY_DATA).map((key) => {
            const isSingleTheme = key === 'tutorial' || key === 'hard';
            const singleEarned = key === 'tutorial' ? tutorialEarned : key === 'hard' ? hardEarned : false;
            const singlePts = key === 'tutorial' ? 1 : 3;
            const singleReset = key === 'tutorial' ? '최초 1회' : fmtCountdownWeekly();
            return (
              <button key={key} onClick={() => handleDifficultySelect(key)}
                className={`relative py-6 px-3 border rounded-2xl transition-all font-bold uppercase text-sm flex flex-col items-center justify-center gap-2
                  ${key === 'tutorial' ? 'bg-blue-900/40 border-blue-500 text-blue-300 hover:bg-blue-800'
                  : key === 'master' ? 'bg-gradient-to-br from-purple-900/60 to-pink-900/60 border-pink-500 text-pink-300 hover:opacity-80'
                  : 'bg-slate-900 border-slate-700 hover:bg-slate-800 hover:border-teal-400'}`}
                style={{ opacity: isSingleTheme && singleEarned ? 0.55 : 1 }}>
                <span>{diffLabels[key]}</span>
                {isSingleTheme && (
                  <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full normal-case tracking-normal ${singleEarned ? 'bg-slate-800 text-slate-500' : 'bg-emerald-900/50 text-emerald-400'}`}>
                    {singleEarned ? '완료' : `🏆 ${singlePts}점 · ${singleReset}`}
                  </span>
                )}
                {isSingleTheme && !singleEarned && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {!isSingleTheme && multiAvailable[key] && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (gameState === 'theme_select') {
    const week = getWeekKey();
    const isOneTime = diff === 'tutorial' || diff === 'easy';
    const pts = diff === 'tutorial' || diff === 'easy' ? 1 : diff === 'normal' ? 2 : 3;
    const resetLabel = isOneTime ? '최초 1회' : fmtCountdownWeekly();
    return (
      <div className="w-full max-w-3xl mx-auto p-8 bg-[#060913] border border-slate-800 rounded-3xl text-white shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-teal-400">테마 선택</h2>
          <button onClick={() => setGameState('diff_select')} className="text-[11px] font-bold text-slate-500 hover:text-white uppercase">← 난이도 재선택</button>
        </div>
        <div className="flex flex-col gap-3">
          {Object.entries(DIFFICULTY_DATA[diff]).map(([key, theme]) => {
            const subKey = isOneTime ? `${diff}:${key}` : `${diff}:${key}:${week}`;
            const earned = isEarned('drum-game', subKey);
            return (
              <div key={key} onClick={() => { setThemeKey(key); setGameState('playing'); setRound(0); setScore(0); loadRoundData(diff, key, 0); }}
                className="relative p-5 bg-slate-950 border rounded-2xl cursor-pointer hover:border-teal-400 transition-all group"
                style={{ borderColor: earned ? '#1e293b' : '#1e3a3a', opacity: earned ? 0.6 : 1 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold mb-1 group-hover:text-teal-400">💿 {theme.title}</h4>
                    <p className="text-xs text-slate-500">{theme.desc}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                    {earned
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">완료</span>
                      : <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />획득 가능</span>
                    }
                    <span className="text-[9px] text-slate-600 font-mono">🏆 {pts}점 · {resetLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (gameState === 'result') {
    const isPassed = score >= 4;
    return (
      <div className="w-full max-w-xl mx-auto p-10 bg-[#060913] border border-slate-800 rounded-3xl text-center text-white shadow-2xl">
        <h2 className="text-2xl font-black mb-6 text-teal-400">스테이지 종료</h2>
        <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 mb-4 flex flex-col items-center">
          <span className="text-5xl font-mono font-black text-indigo-400">{score} <span className="text-2xl text-slate-600">/ 5</span></span>
          <p className={`mt-4 text-xl font-black tracking-widest uppercase ${isPassed ? 'text-emerald-400' : 'text-rose-500'}`}>
            {isPassed ? '✅ 통과 (PASS)' : '❌ 미달 (FAIL)'}
          </p>
        </div>
        {isAwarding && (
          <div className="mb-4 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.2)', color: '#64748b' }}>
            채점 및 포인트 서버 기록 중...
          </div>
        )}
        {!isAwarding && pointsEarned !== null && (
          <div className="mb-4 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', color: '#2dd4bf' }}>
            +{pointsEarned}점 획득!
          </div>
        )}
        <button onClick={() => { setGameState('diff_select'); setIsRoundChecked(false); setPointsEarned(null); }} className="w-full py-4 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold uppercase">메인 화면 복귀</button>
      </div>
    );
  }

  const cur = DIFFICULTY_DATA[diff][themeKey].rounds[round];
  
  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-5 bg-[#090d16] text-white rounded-3xl border border-slate-800 shadow-2xl select-none flex flex-col gap-2 sm:gap-4">
      <style dangerouslySetInnerHTML={{ __html: mobileScrollStyle }} />
      
      {/* 상단 헤더 및 나가기 버튼 */}
      <div className="flex justify-between items-start border-b border-slate-800 pb-2 sm:pb-3 mt-1">
        <div>
          <h3 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 sm:gap-3">
            {themeKey} <span className="text-teal-400">[{gridCols}-GRID]</span>
          </h3>
          <p className="text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 font-black mt-1 break-keep">{cur.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 sm:gap-2">
          <button onClick={() => { if(timerIdRef.current) clearTimeout(timerIdRef.current); setGameState('diff_select'); }} className="text-[10px] bg-rose-900/40 text-rose-300 hover:bg-rose-800/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded font-bold transition-all">
            🚪 나가기
          </button>
          <div className="text-[10px] sm:text-[11px] text-slate-300 font-mono bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-700 flex flex-col items-end gap-0.5 sm:gap-1 shadow-inner">
            <span className="font-bold text-indigo-400">ROUND {round + 1} / 5</span>
            <span>BPM: {cur.bpm} | Swing: {cur.swing}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:gap-4 bg-slate-900/50 p-2.5 sm:p-3.5 rounded-xl border border-slate-800 justify-between items-center flex-wrap">
        <div className="flex gap-2">
          <button onClick={playGuide} disabled={isRoundChecked} className="px-3 sm:px-5 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-500 font-black text-[11px] sm:text-xs rounded-xl disabled:opacity-30 transition-all shadow-lg">🔊 정답 듣기</button>
          <button onClick={togglePlay} className={`px-3 sm:px-5 py-2 sm:py-3 font-black text-[11px] sm:text-xs rounded-xl transition-all shadow-lg ${isPlaying ? 'bg-slate-700 text-white' : 'bg-teal-500 hover:bg-teal-400 text-slate-950'}`}>{isPlaying ? '⏹ 정지' : '▶ 재생'}</button>
        </div>
        
        {!cur.tutorial_text && (
          <p className="text-[11px] sm:text-xs text-amber-400 w-full sm:w-auto max-w-full sm:max-w-[700px] text-left sm:text-right font-medium leading-relaxed bg-amber-900/20 px-3 sm:px-4 py-2 rounded-lg border border-amber-900/50 break-keep">
            💡 {cur.hint} {!useGhost && <span className="ml-1 sm:ml-2 text-[10px] text-blue-400 whitespace-nowrap">(※ 약음 비활성 모드)</span>}
          </p>
        )}
      </div>
      
      {/* 시퀀싱 그리드 */}
      <div className="bg-[#0b0f19] p-2.5 sm:p-5 rounded-2xl border border-slate-800 overflow-x-auto custom-scrollbar mobile-hide-scrollbar touch-pan-x shadow-inner">
        <div className="grid gap-2 sm:gap-4" style={{ minWidth: `${gridCols * 36 + 88}px` }}>
          {activeTracks.map((r) => (
            <div key={r} className="flex gap-1.5 sm:gap-2 items-center">
              <div className="w-[72px] sm:w-28 shrink-0 text-[9px] sm:text-[10px] font-black uppercase text-slate-400 border-r border-slate-700 pr-1 sm:pr-2 leading-tight break-keep">{DRUM_NAMES[r]}</div>
              {Array(gridCols).fill(null).map((_, c) => {
                const velocityState = grid[r][c]; 
                const isCurrentHit = currentCol === c;
                
                let beats = 4;
                if(gridCols === 32) beats = 4;
                if(gridCols === 24) beats = 6;
                if(gridCols === 22) beats = 5.5;
                if(gridCols === 20) beats = 5;
                if(gridCols === 18) beats = 4.5;
                if(gridCols === 14) beats = 3.5;
                if(gridCols === 12) beats = 3;
                const steps = gridCols / beats;
                const isDownbeat = Number.isInteger(steps) ? (c % steps === 0) : false;

                let cellColor = isDownbeat ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-900/50 border-slate-800';
                if (velocityState === 1) cellColor = 'bg-teal-900/60 border-teal-600/60 text-teal-300';
                else if (velocityState === 2) cellColor = 'bg-teal-500 border-teal-400 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.4)]';
                  
                return (
                  <div 
                    key={c} 
                    onClick={() => { 
                      if (!isRoundChecked) {
                        setGrid(prev => { 
                          const next = prev.map(row => [...row]); 
                          if (!useGhost) {
                            next[r][c] = next[r][c] === 0 ? 2 : 0;
                          } else {
                            next[r][c] = (next[r][c] + 1) % 3; 
                          }
                          return next; 
                        });
                      }
                    }} 
                    className={`flex-1 h-8 sm:h-14 rounded-md sm:rounded-lg border cursor-pointer transition-all flex items-center justify-center font-mono font-black text-[10px] ${cellColor} ${isCurrentHit ? 'ring-2 ring-white z-10 scale-110' : 'hover:border-slate-500'}`}
                  >
                    {velocityState === 0 ? '' : (velocityState === 2 ? '■' : '·')}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 검증 컨트롤러 및 튜토리얼 가이드 */}
      <div className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-700 flex flex-col items-center gap-3 sm:gap-4 shadow-2xl">
        
        {cur.tutorial_text && (
          <div className="w-full bg-blue-900/30 border border-blue-500 p-4 sm:p-5 rounded-xl flex flex-col gap-1.5 sm:gap-2 mb-1 sm:mb-2 shadow-lg">
            <h4 className="text-blue-300 font-black text-xs sm:text-sm mb-1">🔰 튜토리얼 지시</h4>
            <p className="text-blue-50 text-sm sm:text-lg md:text-xl font-bold leading-relaxed break-keep">{cur.tutorial_text}</p>
          </div>
        )}

        <div className="w-full flex flex-col items-center gap-2 sm:gap-3">
          {isRoundChecked ? (
            <>
              <p className={`text-xs sm:text-sm font-mono font-black break-keep text-center ${isCorrect ? 'text-emerald-400' : 'text-rose-500'}`}>{isCorrect ? "✅ 완벽히 일치합니다." : "❌ 오답입니다. 오디오를 다시 모니터링 하십시오."}</p>
              <button onClick={() => { 
                const maxRound = DIFFICULTY_DATA[diff][themeKey].rounds.length - 1;
                if (round < maxRound) { 
                  setRound(r => r + 1); 
                  loadRoundData(diff, themeKey, round + 1); 
                } else { 
                  setGameState('result'); 
                } 
              }} className="w-full max-w-md py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm uppercase rounded-xl transition-all shadow-xl">
                {round < 4 ? '⏩ 다음 라운드 진행' : '최종 결과 확인'}
              </button>
            </>
          ) : (
            <button onClick={checkAnswer} className="w-full max-w-md py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-black text-xs sm:text-sm uppercase rounded-xl transition-all shadow-xl">
              정답 제출하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}