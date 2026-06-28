import { Headphones } from 'lucide-react';
import { GameMeta } from './types';
import EarTrainingGame from './EarTrainingGame';
import DrumGame from './DrumGame';
import PianoGame from './PianoGame';
import BassGame from './BassGame';
import ShortCut from './ShortCut';
import Quiz from './Quiz';

export const GAMES: GameMeta[] = [
  

  {
    id: 'drum-game',
    title: '드럼 챌린지',
    description: '리듬를 맞춰보세요',
    icon: Headphones,
    component: DrumGame,
    badge: 'new',
    pointRule: '튜토/초급 1점(최초) · 중급 2점(주1회) · 심화·마스터 3점(주1회)',
  },

  

  {
    id: 'piano-game',
    title: '피아노 챌린지',
    description: '코드를 맞춰보세요',
    icon: Headphones,
    component: PianoGame,
    badge: 'new',
    pointRule: 'Lv0-2: 1점(최초) · Lv3-6: 1점(주1회/일2점) · Lv7-9: 2점(주1회/일4점)',
  },



{
    id: 'bass-game',
    title: '베이스 챌린지',
    description: '근음을 맞춰보세요',
    icon: Headphones,
    component: BassGame,
    badge: 'new',
    pointRule: '이지 통과 1점 · 하드 통과 3점 (각 최초 1회)',
  },



{
    id: 'short-cut',
    title: '단축키 챌린지',
    description: '단축키를 맞춰보세요',
    icon: Headphones,
    component: ShortCut,
    badge: 'new',
    pointRule: '8000~11999점: 1점 · 12000~15999점: 2점 · 16000+점: 3점 (주 1회)',
  },

  

  {
    id: 'quiz',
    title: '퀴즈 챌린지',
    description: '퀴즈를 맞춰보세요',
    icon: Headphones,
    component: Quiz,
    badge: 'new',
    pointRule: '각 회차 최초 통과 시 1점 (총 4회차)',
  },



  {
    id: 'ear-training',
    title: '금고 열기 챌린지',
    description: '재생되는 레조넌스를 듣고 주파수를 맞춰보세요',
    icon: Headphones,
    component: EarTrainingGame,
    badge: 'new',
    pointRule: '이지 통과 1점(일 1회) · 하드 통과 3점(일 1회)',
  },
  

  
];

export { GameLobby } from './Lobby';
export type { GameMeta } from './types';


