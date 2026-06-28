import React, { useState } from 'react';
import { Play, Lock, Youtube, AlertTriangle } from 'lucide-react';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoId: string;
  duration: string;
  category: string;
}

const SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: '1',
    title: '기초 음악 이론 - 음정과 음계',
    description: '장조와 단조의 차이, 기본 음정 구조를 이해합니다.',
    videoId: 'dQw4w9WgXcQ',
    duration: '12:34',
    category: '기초 이론',
  },
  {
    id: '2',
    title: '리듬 트레이닝 - 기본 박자',
    description: '4/4 박자, 3/4 박자 등 기본 리듬 패턴을 연습합니다.',
    videoId: 'dQw4w9WgXcQ',
    duration: '18:20',
    category: '리듬',
  },
  {
    id: '3',
    title: '화음의 구조와 코드 진행',
    description: '3화음, 7화음의 구조와 자주 쓰이는 코드 진행을 학습합니다.',
    videoId: 'dQw4w9WgXcQ',
    duration: '25:10',
    category: '화성학',
  },
  {
    id: '4',
    title: '스케일 연습 - 장조 스케일',
    description: '12개의 장조 스케일을 체계적으로 연습합니다.',
    videoId: 'dQw4w9WgXcQ',
    duration: '15:45',
    category: '연주 기법',
  },
];

interface VideoPlayerProps {
  video: VideoItem;
  onClose: () => void;
}

function SecureVideoPlayer({ video, onClose }: VideoPlayerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-[#0d1117] border-b border-[#1e2940]">
        <div>
          <h3 className="font-semibold text-white">{video.title}</h3>
          <p className="text-[#475569] text-xs mt-0.5">{video.category} · {video.duration}</p>
        </div>
        <button
          onClick={onClose}
          className="text-[#475569] hover:text-white transition-colors p-2 hover:bg-[#1e2940] rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 relative bg-black">
        <div className="absolute inset-0 pointer-events-none z-10" />
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1&disablekb=0&fs=1&controls=1&autoplay=1`}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={video.title}
        />
        <div className="absolute top-0 right-0 w-12 h-12 z-20" />
      </div>

      <div className="bg-[#0d1117] border-t border-[#1e2940] px-6 py-3 flex items-center gap-2 text-xs text-[#334155]">
        <Lock size={12} />
        보안 플레이어 — 다운로드 및 외부 공유가 차단된 전용 환경입니다.
      </div>
    </div>
  );
}

export function VideoLibrary() {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const categories = ['전체', ...Array.from(new Set(SAMPLE_VIDEOS.map(v => v.category)))];
  const filtered = selectedCategory === '전체' ? SAMPLE_VIDEOS : SAMPLE_VIDEOS.filter(v => v.category === selectedCategory);

  return (
    <div className="space-y-5">
      {selectedVideo && (
        <SecureVideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}

      <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-400">
        <AlertTriangle size={15} />
        이 영상들은 수강생 전용 비공개 콘텐츠입니다. 다운로드 및 외부 공유는 엄격히 금지됩니다.
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${selectedCategory === cat
                ? 'bg-[#22d3ee] text-[#0b0f19]'
                : 'bg-[#141b2d] border border-[#1e2940] text-[#8fa0dd] hover:border-[#22d3ee]/40'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((video) => (
          <div
            key={video.id}
            className="bg-[#141b2d] rounded-2xl border border-[#1e2940] overflow-hidden hover:border-[#22d3ee]/30 transition-colors duration-200 group"
          >
            <div
              className="relative bg-[#0b0f19] aspect-video flex items-center justify-center cursor-pointer"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Youtube size={40} className="text-red-500 opacity-70" />
              <div className="absolute bottom-3 left-3">
                <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">{video.duration}</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-[#22d3ee]/20 backdrop-blur border border-[#22d3ee]/40 flex items-center justify-center">
                  <Play size={24} className="text-[#22d3ee] ml-1" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-white text-sm leading-snug">{video.title}</h4>
                <span className="shrink-0 text-xs bg-[#1e2940] text-[#8fa0dd] px-2 py-0.5 rounded-full">{video.category}</span>
              </div>
              <p className="text-[#94a3b8] text-xs leading-relaxed">{video.description}</p>
              <button
                onClick={() => setSelectedVideo(video)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#22d3ee] hover:text-cyan-300 transition-colors"
              >
                <Play size={13} />
                영상 시청하기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
