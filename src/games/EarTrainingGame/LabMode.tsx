import { useState, useRef, useCallback, useEffect } from 'react';

// ── Lab Mode constants (fully isolated from Training Mode) ────────────
const LAB_FREQ_MIN = 80;
const LAB_FREQ_MAX = 8000;
const LAB_ANGLE_MIN = -135;
const LAB_ANGLE_MAX = 135;

// Parameter defaults and ranges
const LAB_Q_MIN = 4;
const LAB_Q_MAX = 20;
const LAB_Q_DEFAULT = 8;
const LAB_GAIN_MIN = 3;
const LAB_GAIN_MAX = 15;
const LAB_GAIN_DEFAULT = 9;
const LAB_TOL_MIN = 1;
const LAB_TOL_MAX = 15;
const LAB_TOL_DEFAULT = 8;

// ── Helpers (no imports from Training Mode) ───────────────────────────
function labFreqToAngle(freq: number): number {
  const t = Math.log(freq / LAB_FREQ_MIN) / Math.log(LAB_FREQ_MAX / LAB_FREQ_MIN);
  return LAB_ANGLE_MIN + t * (LAB_ANGLE_MAX - LAB_ANGLE_MIN);
}

function labAngleToFreq(angle: number): number {
  const t = Math.min(1, Math.max(0, (angle - LAB_ANGLE_MIN) / (LAB_ANGLE_MAX - LAB_ANGLE_MIN)));
  return Math.round(LAB_FREQ_MIN * Math.pow(LAB_FREQ_MAX / LAB_FREQ_MIN, t));
}

function labClamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function labGenerateTarget(): number {
  const logMin = Math.log(LAB_FREQ_MIN);
  const logMax = Math.log(LAB_FREQ_MAX);
  return Math.round(Math.exp(logMin + Math.random() * (logMax - logMin)));
}

type LabGameState = 'playing' | 'result';
type LabResult = 'correct' | 'incorrect';

function labGetResult(selected: number, target: number, tolerancePct: number): LabResult {
  const ratio = Math.abs(selected - target) / target;
  return ratio * 100 <= tolerancePct ? 'correct' : 'incorrect';
}

// ── Audio sources (pink noise only for active; others are placeholders) ─
type LabSource = 'pink' | 'vocal' | 'guitar' | 'piano' | 'drums' | 'upload';

const SOURCE_OPTIONS: { id: LabSource; label: string; available: boolean }[] = [
  { id: 'pink', label: 'Pink Noise', available: true },
  { id: 'vocal', label: 'Vocal', available: true },
  { id: 'guitar', label: 'Guitar', available: true },
  { id: 'piano', label: 'Piano', available: true },
  { id: 'drums', label: 'Drums', available: true },
  { id: 'upload', label: 'Upload', available: true },
];

const SOURCE_FILES: Partial<Record<LabSource, string>> = {
  vocal:  '/V.wav',
  guitar: '/EG.wav',
  piano:  '/P.wav',
  drums:  '/D.wav',
};

// Per-source gain multipliers. PINK = 1.0 reference; all others scaled relative.
const SOURCE_GAIN: Record<LabSource, number> = {
  pink:   1.0,
  vocal:  9.5,
  guitar: 7,
  piano:  6.7,
  drums:  8.7,
  upload: 1.0,
};

const audioBufferCache = new Map<string, AudioBuffer>();

// ── AudioWorklet code (separate processor name from Training Mode) ──────
const LAB_WORKLET_CODE = `
class LabPinkNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.b = [0, 0, 0, 0, 0, 0, 0];
  }
  process(inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;
    const b = this.b;
    for (let i = 0; i < out.length; i++) {
      const w = Math.random() * 2 - 1;
      b[0] = 0.99886 * b[0] + w * 0.0555179;
      b[1] = 0.99332 * b[1] + w * 0.0750759;
      b[2] = 0.96900 * b[2] + w * 0.1538520;
      b[3] = 0.86650 * b[3] + w * 0.3104856;
      b[4] = 0.55000 * b[4] + w * 0.5329522;
      b[5] = -0.7616 * b[5] - w * 0.0168980;
      out[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11;
      b[6] = w * 0.115926;
    }
    return true;
  }
}
registerProcessor('lab-pink-noise', LabPinkNoiseProcessor);
`;

// ── Lab audio hook (fully isolated — own AudioContext, own nodes) ──────
function useLabAudio(
  targetFreq: number,
  q: number,
  gainDb: number,
  source: LabSource,
  uploadedBuffer: AudioBuffer | null,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioWorkletNode | AudioBufferSourceNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (gain && ctx) {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => {
        try {
          if (sourceNodeRef.current instanceof AudioBufferSourceNode) {
            sourceNodeRef.current.stop();
          }
          sourceNodeRef.current?.disconnect();
        } catch {}
        try { filterRef.current?.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
        sourceNodeRef.current = null;
        filterRef.current = null;
        gainRef.current = null;
      }, 200);
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(async () => {
    stop();
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const filter = ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = targetFreq;
      filter.Q.value = q;
      filter.gain.value = gainDb;

      const gain = ctx.createGain();
      const targetGain = 0.7 * SOURCE_GAIN[source];
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
      console.debug(`[LabMode] play source="${source}" gain=${targetGain.toFixed(4)}`);

      if (source === 'upload') {
        if (!uploadedBuffer) return;
        const bufSrc = ctx.createBufferSource();
        bufSrc.buffer = uploadedBuffer;
        bufSrc.loop = true;
        bufSrc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        bufSrc.start();
        sourceNodeRef.current = bufSrc;
      } else {
        const filePath = SOURCE_FILES[source];
        if (filePath) {
          let buffer = audioBufferCache.get(filePath);
          if (!buffer) {
            const res = await fetch(filePath);
            const arrayBuf = await res.arrayBuffer();
            buffer = await ctx.decodeAudioData(arrayBuf);
            audioBufferCache.set(filePath, buffer);
          }
          const bufSrc = ctx.createBufferSource();
          bufSrc.buffer = buffer;
          bufSrc.loop = true;
          bufSrc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          bufSrc.start();
          sourceNodeRef.current = bufSrc;
        } else {
          if (!blobUrlRef.current) {
            const blob = new Blob([LAB_WORKLET_CODE], { type: 'application/javascript' });
            blobUrlRef.current = URL.createObjectURL(blob);
          }
          await ctx.audioWorklet.addModule(blobUrlRef.current).catch(() => {});
          const noise = new AudioWorkletNode(ctx, 'lab-pink-noise');
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          sourceNodeRef.current = noise;
        }
      }

      filterRef.current = filter;
      gainRef.current = gain;
      setIsPlaying(true);
    } catch (err) {
      console.error('Lab audio init failed:', err);
    }
  }, [targetFreq, q, gainDb, source, uploadedBuffer, stop]);

  // Stop when target changes (new round)
  useEffect(() => {
    stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetFreq]);

  useEffect(() => {
    return () => {
      stop();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isPlaying, play, stop };
}

// ── Slider component ───────────────────────────────────────────────────
function LabSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`flex flex-col gap-1.5 w-full ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] tracking-widest text-gray-600 uppercase">{label}</span>
        <span className="text-sm font-light text-amber-400 tabular-nums">{display}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute w-full h-px bg-[#2a2a2a]" />
        <div className="absolute h-px bg-amber-800/60" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer lab-slider"
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-700">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ── Collapsible panel component ────────────────────────────────────────
function CollapsiblePanel({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="w-full bg-[#111] border border-gray-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-[#161616]"
      >
        <span className="text-[10px] tracking-[0.25em] text-gray-600 uppercase">{label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

// ── VaultBackground (self-contained, no import from App.tsx) ──────────
function LabVaultBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden bg-[#050505]">
      {/* 1. Base Metallic Conic Gradient (빛 반사 효과) */}
      <div 
        className="absolute w-[1200px] h-[1200px] opacity-30 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg at 50% 50%, #111 0%, #222 25%, #050505 50%, #222 75%, #111 100%)',
          filter: 'blur(8px)'
        }}
      />

      {/* 2. Vault Mechanical Structures */}
      <svg
        className="absolute w-[1000px] h-[1000px] max-w-none opacity-80"
        viewBox="0 0 1000 1000"
      >
        <defs>
          <radialGradient id="vaultShadow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Heavy Outer Steel Frame */}
        <circle cx="500" cy="500" r="480" fill="url(#vaultShadow)" stroke="#151515" strokeWidth="40" />
        <circle cx="500" cy="500" r="460" fill="none" stroke="#000" strokeWidth="4" />
        
        {/* Outer Frame Hex Bolts */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) * (Math.PI / 180);
          return (
            <circle
              key={`bolt-${i}`}
              cx={500 + Math.cos(angle) * 480}
              cy={500 + Math.sin(angle) * 480}
              r="6"
              fill="#111"
              stroke="#2a2a2a"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Precision Dial Tick Marks (눈금) */}
        {Array.from({ length: 120 }).map((_, i) => {
          const angle = (i * 3) * (Math.PI / 180);
          const isMajor = i % 10 === 0;
          const r1 = isMajor ? 385 : 392;
          const r2 = 400;
          return (
            <line
              key={`tick-${i}`}
              x1={500 + Math.cos(angle) * r1}
              y1={500 + Math.sin(angle) * r1}
              x2={500 + Math.cos(angle) * r2}
              y2={500 + Math.sin(angle) * r2}
              stroke={isMajor ? '#555' : '#222'}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* Inner Mechanics */}
        <circle cx="500" cy="500" r="280" fill="none" stroke="#1a1a1a" strokeWidth="6" />
        <circle cx="500" cy="500" r="277" fill="none" stroke="#050505" strokeWidth="12" />
        <circle cx="500" cy="500" r="200" fill="none" stroke="#111" strokeWidth="2" strokeDasharray="4 8" />
      </svg>
    </div>
  );
}

// ── Lab Mode root component ────────────────────────────────────────────
export default function LabMode() {
  // Game state
  const [target, setTarget] = useState(() => labGenerateTarget());
  const [freq, setFreq] = useState(1000);
  const [submittedFreq, setSubmittedFreq] = useState<number | null>(null);
  const [gameState, setGameState] = useState<LabGameState>('playing');
  const [result, setResult] = useState<LabResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Adjustable parameters (Lab Mode only)
  const [q, setQ] = useState(LAB_Q_DEFAULT);
  const [gainDb, setGainDb] = useState(LAB_GAIN_DEFAULT);
  const [tolerance, setTolerance] = useState(LAB_TOL_DEFAULT);
  const [source, setSource] = useState<LabSource>('pink');
  const [uploadedBuffer, setUploadedBuffer] = useState<AudioBuffer | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const dragStartY = useRef(0);
  const dragStartAngle = useRef(0);
  const isKnobLocked = gameState !== 'playing';

  const { isPlaying, play, stop } = useLabAudio(target, q, gainDb, source, uploadedBuffer);

  const displayFreq = gameState === 'result' && submittedFreq !== null ? submittedFreq : freq;
  const diffDisplay = gameState === 'result' && submittedFreq !== null ? Math.abs(submittedFreq - target) : null;
  const angle = labFreqToAngle(freq);

  const handleSubmit = useCallback(() => {
    if (gameState !== 'playing') return;
    const res = labGetResult(freq, target, tolerance);
    setSubmittedFreq(freq);
    setResult(res);
    setGameState('result');
  }, [freq, target, gameState, tolerance]);

  const handleNextRound = useCallback(() => {
    setTarget(labGenerateTarget());
    setFreq(1000);
    setSubmittedFreq(null);
    setResult(null);
    setGameState('playing');
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isKnobLocked) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartAngle.current = labFreqToAngle(freq);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [freq, isKnobLocked],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || isKnobLocked) return;
      const deltaY = dragStartY.current - e.clientY;
      const newAngle = labClamp(dragStartAngle.current + deltaY * 0.5, LAB_ANGLE_MIN, LAB_ANGLE_MAX);
      setFreq(labAngleToFreq(newAngle));
    },
    [isDragging, isKnobLocked],
  );

  const onPointerUp = useCallback(() => setIsDragging(false), []);

  const handleUploadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      await ctx.close();
      setUploadedBuffer(decoded);
      setSource('upload');
    } catch (err) {
      console.error('Upload decode failed:', err);
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const tickMarks = [];
  for (let i = 0; i <= 20; i++) {
    const tickAngle = LAB_ANGLE_MIN + (i / 20) * (LAB_ANGLE_MAX - LAB_ANGLE_MIN);
    const tickFreq = labAngleToFreq(tickAngle);
    tickMarks.push({ angle: tickAngle, active: tickFreq <= displayFreq });
  }

  // Knob pointer color based on result state
  const pointerBg = gameState === 'result'
    ? result === 'correct'
      ? 'linear-gradient(to bottom, #34d399, #065f46)'
      : 'linear-gradient(to bottom, #f87171, #991b1b)'
    : 'linear-gradient(to bottom, #fbbf24, #92400e)';
  const pointerShadow = gameState === 'result'
    ? result === 'correct'
      ? '0 0 8px rgba(52,211,153,0.5)'
      : '0 0 8px rgba(248,113,113,0.4)'
    : '0 0 8px rgba(251,191,36,0.4)';

  const tickColor = (active: boolean) => {
    if (!active) return 'rgba(255,255,255,0.10)';
    if (gameState === 'result') return result === 'correct' ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.5)';
    return 'rgba(251,191,36,0.5)';
  };

  const freqTextColor = gameState === 'result'
    ? result === 'correct' ? 'text-emerald-400' : 'text-red-400'
    : 'text-amber-400';

  const barGradient = gameState === 'result'
    ? result === 'correct'
      ? 'linear-gradient(90deg, #065f46, #34d399)'
      : 'linear-gradient(90deg, #991b1b, #f87171)'
    : 'linear-gradient(90deg, #92400e, #fbbf24)';

  const knobShadow = gameState === 'result'
    ? result === 'correct'
      ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(52,211,153,0.15)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(248,113,113,0.1)'
    : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.8)';

return (
    <div className="w-full flex justify-center py-6 px-2">
      
      {/* 가로 확장 로직 삭제: max-w-[460px]로 완전 고정 */}
      <div 
        className="relative w-full max-w-[460px] bg-[#0a0a0a] rounded-2xl flex flex-col items-center select-none pb-12 overflow-hidden"
        style={{
          border: '1px solid #151515',
          borderTop: '1px solid #2f2f2f',
          borderBottom: '1px solid #000',
          boxShadow: '0 40px 80px rgba(0,0,0,1), inset 0 1px 0 rgba(255,255,255,0.03), inset 15px 0 40px rgba(0,0,0,0.6), inset -15px 0 40px rgba(0,0,0,0.6)'
        }}
      >
        <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-[#050505] border border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,1)]" />
        <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-[#050505] border border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,1)]" />
        <div className="absolute bottom-5 left-5 w-2 h-2 rounded-full bg-[#050505] border border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,1)]" />
        <div className="absolute bottom-5 right-5 w-2 h-2 rounded-full bg-[#050505] border border-[#222] shadow-[inset_0_1px_2px_rgba(0,0,0,1)]" />

        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700/20 to-transparent" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-30">
          <div className="w-4 h-0.5 bg-amber-500 rounded-full" />
          <div className="w-4 h-0.5 bg-amber-500 rounded-full" />
          <div className="w-4 h-0.5 bg-amber-500 rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full pt-14 px-5 gap-6">
          
          <div className="flex flex-col items-center gap-0.5 text-center">
            <p className="text-[10px] tracking-[0.35em] text-amber-700 uppercase">Experimental</p>
            <p className="text-xs tracking-[0.2em] text-gray-600 uppercase">Parameter Laboratory</p>
          </div>

          <div className="flex flex-col items-center gap-1 w-full text-center">
            <span className="text-xs tracking-[0.2em] text-gray-600 uppercase">Target Frequency</span>
            <div className="h-10 flex items-center justify-center">
              {gameState === 'result' ? (
                <span className="text-3xl font-light text-amber-400 tabular-nums tracking-wider drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                  {target.toLocaleString()} Hz
                </span>
              ) : (
                <span className="text-3xl font-light text-amber-400/20 tracking-widest">???</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 min-h-[48px] justify-center text-center">
            {gameState === 'result' && result ? (
              <>
                <span className={`text-2xl font-bold tracking-[0.25em] transition-all duration-300 ${result === 'correct' ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`}>
                  {result === 'correct' ? 'UNLOCKED' : 'INCORRECT'}
                </span>
                <span className="text-sm text-gray-500">
                  {result === 'correct' ? `Within ±${tolerance}%` : `Off by ${diffDisplay} Hz`}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-gray-500 tracking-widest uppercase">Find the resonance</span>
            )}
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div 
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: '320px',
                height: '320px',
                background: 'conic-gradient(from 180deg at 50% 50%, #151515 0%, #2a2a2a 20%, #0d0d0d 50%, #2a2a2a 80%, #151515 100%)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 2px 2px rgba(255,255,255,0.05)',
                border: '1px solid #000'
              }}
            >
              <div 
                className="absolute inset-[14px] rounded-full flex items-center justify-center"
                style={{
                  background: '#0a0a0a',
                  boxShadow: 'inset 0 10px 40px rgba(0,0,0,1), 0 1px 1px rgba(255,255,255,0.08)',
                  border: '1px solid #000'
                }}
              >
                <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" viewBox="0 0 290 290">
                  <circle cx="145" cy="145" r="135" fill="none" stroke="#141414" strokeWidth="2" />
                  {Array.from({ length: 6 }).map((_, i) => {
                    const angle = (i * 60) * (Math.PI / 180);
                    return (
                      <circle
                        key={`bolt-${i}`}
                        cx={145 + Math.cos(angle) * 126} cy={145 + Math.sin(angle) * 126}
                        r="3.5" fill="#050505" stroke="#222" strokeWidth="1"
                      />
                    );
                  })}
                </svg>

                <svg className="absolute z-10" width="220" height="220" viewBox="-110 -110 220 220">
                  {tickMarks.map((tick, i) => {
                    const rad = (tick.angle - 90) * (Math.PI / 180);
                    const r1 = 95;
                    const r2 = tick.active ? 82 : 86;
                    return (
                      <line
                        key={i}
                        x1={Math.cos(rad) * r1} y1={Math.sin(rad) * r1}
                        x2={Math.cos(rad) * r2} y2={Math.sin(rad) * r2}
                        stroke={tickColor(tick.active)}
                        strokeWidth={tick.active ? 2 : 1}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>

                <div
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className={`relative z-20 w-36 h-36 rounded-full touch-none ${isKnobLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                  style={{
                    background: 'radial-gradient(circle at 40% 35%, #2a2a2a 0%, #1a1a1a 50%, #0d0d0d 100%)',
                    boxShadow: knobShadow,
                  }}
                >
                  <div className="absolute inset-2 rounded-full" style={{ border: '1px solid rgba(255,255,255,0.04)' }} />
                  <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                    <div className="absolute left-1/2 top-3 -translate-x-1/2 w-1 h-8 rounded-full" style={{ background: pointerBg, boxShadow: pointerShadow }} />
                  </div>
                  <div className="absolute inset-[46px] rounded-full" style={{ background: 'radial-gradient(circle at 40% 35%, #333, #151515)', border: '1px solid rgba(255,255,255,0.05)' }} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-700 tracking-[0.2em] uppercase">
            {isKnobLocked ? 'Frequency locked' : isDragging ? 'Adjusting...' : 'Drag knob to adjust'}
          </p>

          <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-extralight tabular-nums tracking-wider transition-colors duration-300 ${freqTextColor}`}>
                {displayFreq.toLocaleString()}
              </span>
              <span className="text-lg text-gray-500 font-light">Hz</span>
            </div>
            <div className="w-64 h-1 bg-[#1a1a1a] rounded-full mt-2 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{ width: `${((displayFreq - LAB_FREQ_MIN) / (LAB_FREQ_MAX - LAB_FREQ_MIN)) * 100}%`, background: barGradient }}
              />
            </div>
            <div className="flex justify-between w-64 text-[10px] text-gray-700 mt-1">
              <span>{LAB_FREQ_MIN} Hz</span>
              <span>{LAB_FREQ_MAX} Hz</span>
            </div>
            <p className="text-[10px] text-gray-700 tracking-widest mt-1">
              Tolerance: ±{tolerance}%
            </p>
          </div>

          <div className="flex gap-3 mt-2 items-center">
            <button
              onClick={play}
              disabled={isPlaying}
              className={`px-5 py-2.5 text-xs tracking-[0.15em] uppercase font-medium rounded transition-all duration-200 border ${
                isPlaying
                  ? 'text-gray-600 bg-[#111] border-gray-900/60 cursor-default'
                  : 'text-gray-300 bg-[#151515] border-gray-700/50 hover:bg-[#222] hover:text-white hover:border-gray-600/60 shadow-lg'
              }`}
            >
              Play
            </button>
            <button
              onClick={stop}
              disabled={!isPlaying}
              className={`px-5 py-2.5 text-xs tracking-[0.15em] uppercase font-medium rounded transition-all duration-200 border ${
                !isPlaying
                  ? 'text-gray-700 bg-[#111] border-gray-900/60 cursor-default'
                  : 'text-gray-300 bg-[#151515] border-gray-700/50 hover:bg-[#222] hover:text-white hover:border-gray-600/60 shadow-lg'
              }`}
            >
              Stop
            </button>
            <div className="w-px h-5 bg-gray-800/60 mx-1" />
            {gameState === 'playing' && (
              <>
                <button
                  onClick={handleSubmit}
                  className="px-8 py-2.5 text-sm tracking-[0.2em] uppercase font-semibold rounded transition-all duration-200 text-amber-300 bg-amber-950/20 border border-amber-800/50 hover:bg-amber-900/40 hover:text-amber-200 hover:border-amber-600/60 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                >
                  Submit
                </button>
               
              </>
            )}
            {gameState === 'result' && (
              <button
                onClick={handleNextRound}
                className="px-8 py-2.5 text-sm tracking-[0.2em] uppercase font-semibold rounded transition-all duration-200 text-amber-300 bg-amber-950/20 border border-amber-800/50 hover:bg-amber-900/40 hover:text-amber-200 hover:border-amber-600/60 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
              >
                Next Round
              </button>
            )}
          </div>

          {/* === 수정됨: Upload 컴포넌트 완전 제거 및 레이아웃 재배열 === */}
          <div className="w-full mt-2">
            <p className="text-[10px] tracking-widest text-gray-600 uppercase mb-2">Audio Source</p>
            <div className="grid grid-cols-3 gap-1.5">
              {SOURCE_OPTIONS.filter((opt) => opt.id !== 'upload').map((opt) => {
                const isSelected = source === opt.id;
                const isDisabled = !opt.available || gameState === 'result';
                const handleClick = () => {
                  if (gameState === 'result') return;
                  if (opt.available) setSource(opt.id);
                };

                return (
                  <button
                    key={opt.id}
                    disabled={isDisabled}
                    onClick={handleClick}
                    className={`py-2 text-[10px] tracking-[0.1em] uppercase font-medium rounded border transition-all duration-150 ${
                      isDisabled
                        ? 'text-gray-800 bg-[#0d0d0d] border-[#111] cursor-not-allowed'
                        : isSelected
                        ? 'text-amber-300 bg-amber-950/30 border-amber-800/60 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]'
                        : 'text-gray-500 bg-[#141414] border-gray-800/60 hover:text-gray-400 hover:border-gray-700/50'
                    }`}
                  >
                    {opt.label}
                    {!opt.available && <span className="block text-[8px] text-gray-800 mt-0.5 normal-case tracking-normal">soon</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full mt-2">
            <CollapsiblePanel label="EQ Settings">
              <LabSlider label="Q" value={q} min={LAB_Q_MIN} max={LAB_Q_MAX} step={0.5} display={q.toFixed(1)} disabled={gameState === 'result'} onChange={setQ} />
              <LabSlider label="Gain" value={gainDb} min={LAB_GAIN_MIN} max={LAB_GAIN_MAX} step={0.5} display={`+${gainDb.toFixed(1)} dB`} disabled={gameState === 'result'} onChange={setGainDb} />
              <LabSlider label="Tolerance" value={tolerance} min={LAB_TOL_MIN} max={LAB_TOL_MAX} step={1} display={`±${tolerance}%`} disabled={gameState === 'result'} onChange={setTolerance} />
            </CollapsiblePanel>
          </div>

        </div>
      </div>
    </div>
  );
}