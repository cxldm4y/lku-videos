import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 420; // 14 секунд

// Тайминг (в кадрах, 30 fps)
const T = {
  duck: 75, // боец пригибается и достаёт телефон
  buddy: 195, // напарник орёт
  reply: 240, // боец: "лучший мод для Link Messenger"
  slowmo: 300, // замедление, летит пуля
  hit: 335, // попадание
  end: 360, // финальная плашка
};

const HORIZON = 1040;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Line = {from: number; to: number; who: string; text: string; red?: boolean};

const LINES: Line[] = [
  {from: 0, to: T.duck, who: 'КОМАНДИР', text: 'ДЕРЖИМ ПОЗИЦИЮ!'},
  {from: T.duck, to: T.buddy, who: 'БОЕЦ', text: 'Стоп… я жене в LinkYou не ответил!'},
  {from: T.buddy, to: T.reply, who: 'КОМАНДИР', text: 'ТЫ СЕЙЧАС СЕРЬЁЗНО?!'},
  {from: T.reply, to: T.hit, who: 'БОЕЦ', text: 'Это лучший мод для Link Messenger!'},
  {from: T.hit, to: T.end + 20, who: '', text: 'СВЯЗЬ ПОТЕРЯНА', red: true},
];

/* ------------------------------ ФОН ------------------------------ */

const GROUND_FACETS: {pts: string; fill: string}[] = [
  {pts: `0,${HORIZON} 360,${HORIZON} 120,1300`, fill: '#4c5c3a'},
  {pts: `360,${HORIZON} 120,1300 640,1180`, fill: '#3d4a2f'},
  {pts: `360,${HORIZON} 760,${HORIZON} 640,1180`, fill: '#51633c'},
  {pts: `760,${HORIZON} 1080,${HORIZON} 1080,1260 640,1180`, fill: '#44532f'},
  {pts: `0,1300 120,1300 0,1920`, fill: '#364229'},
  {pts: `120,1300 640,1180 520,1920 0,1920`, fill: '#3a4730'},
  {pts: `640,1180 1080,1260 1080,1920 520,1920`, fill: '#2f3a25'},
];

const Background: React.FC = () => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#34343f" />
        <stop offset="0.65" stopColor="#c19a74" />
        <stop offset="1" stopColor="#e8cba1" />
      </linearGradient>
    </defs>
    <rect width={W} height={HORIZON} fill="url(#sky)" />
    {/* дальние холмы */}
    <polygon
      points={`0,${HORIZON} 0,860 180,800 340,900 520,820 700,930 880,840 1080,900 1080,${HORIZON}`}
      fill="#4a5638"
    />
    <polygon
      points={`0,${HORIZON} 120,950 300,1000 480,935 660,1010 860,955 1080,1000 1080,${HORIZON}`}
      fill="#5c6c45"
    />
    {/* руины */}
    <rect x={90} y={900} width={110} height={140} fill="#2c2929" />
    <rect x={220} y={940} width={80} height={100} fill="#3a3535" />
    <rect x={800} y={880} width={130} height={160} fill="#2c2929" />
    <rect x={940} y={930} width={90} height={110} fill="#383333" />
    {GROUND_FACETS.map((g, i) => (
      <polygon key={i} points={g.pts} fill={g.fill} />
    ))}
  </svg>
);

/* ---------------------- ТРАССЕРЫ / ВЗРЫВЫ ----------------------- */

const TRACERS = 44;

const Tracers: React.FC<{t: number; intensity: number}> = ({t, intensity}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    {Array.from({length: TRACERS}).map((_, i) => {
      const period = 8 + Math.floor(random(`per${i}`) * 14);
      const offset = Math.floor(random(`off${i}`) * period);
      const cycle = Math.floor((t + offset) / period);
      const local = ((t + offset) % period) / period;
      const seed = `${i}-${cycle}`;
      if (random(`show${seed}`) > intensity) return null;

      const fromLeft = random(`dir${seed}`) > 0.5;
      const y0 = 120 + random(`y0${seed}`) * 1300;
      const y1 = y0 + (random(`y1${seed}`) - 0.5) * 600;
      const x0 = fromLeft ? -120 : W + 120;
      const x1 = fromLeft ? W + 120 : -120;

      const head = local;
      const tail = Math.max(0, local - 0.25);
      const hx = x0 + (x1 - x0) * head;
      const hy = y0 + (y1 - y0) * head;
      const tx = x0 + (x1 - x0) * tail;
      const ty = y0 + (y1 - y0) * tail;

      return (
        <g key={i}>
          <line x1={tx} y1={ty} x2={hx} y2={hy} stroke="#ffb347" strokeWidth={9} opacity={0.25} strokeLinecap="round" />
          <line x1={tx} y1={ty} x2={hx} y2={hy} stroke="#fff4c2" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    })}
  </svg>
);

const MuzzleFlashes: React.FC<{t: number}> = ({t}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    {[0, 1, 2, 3].map((i) => {
      const on = random(`mf${i}-${Math.floor(t / 3)}`) > 0.65;
      if (!on) return null;
      const x = i % 2 === 0 ? 30 : W - 30;
      const y = 700 + i * 170;
      return <circle key={i} cx={x} cy={y} r={90} fill="#ffd27a" opacity={0.55} />;
    })}
  </svg>
);

const Explosions: React.FC<{t: number}> = ({t}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    {[0, 1, 2, 3, 4].map((i) => {
      const period = 38 + i * 7;
      const shifted = t + i * 13;
      const cycle = Math.floor(shifted / period);
      const local = (shifted % period) / period;
      if (local > 0.45) return null;
      const x = 100 + random(`ex${i}-${cycle}`) * 880;
      const y = HORIZON + random(`ey${i}-${cycle}`) * 60;
      const p = local / 0.45;
      return (
        <g key={i} opacity={1 - p}>
          <ellipse cx={x} cy={y - p * 90} rx={30 + p * 150} ry={20 + p * 130} fill="#e8c28a" />
          <ellipse cx={x} cy={y - p * 60} rx={14 + p * 70} ry={10 + p * 60} fill="#fff1c9" />
        </g>
      );
    })}
  </svg>
);

/* ----------------------------- БОЕЦ ------------------------------ */

const Soldier: React.FC<{
  t: number;
  frame: number;
}> = ({t, frame}) => {
  const duck = interpolate(
    frame,
    [T.duck, T.duck + 12, T.buddy - 10, T.buddy + 10, T.reply + 15],
    [0, 150, 150, 60, 0],
    clamp,
  );
  const hitP = interpolate(frame, [T.hit, T.hit + 6], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const bob = Math.sin(t * 0.7) * 5;
  const talking = (frame >= T.duck && frame < T.buddy) || (frame >= T.reply && frame < T.hit);
  const mouth = talking ? 4 + Math.abs(Math.sin(t * 0.9)) * 16 : 3;
  const phone = frame >= T.duck + 6 && frame < T.hit;

  return (
    <g
      transform={`translate(${240 + hitP * 70}, ${700 + duck + bob}) rotate(${hitP * 9}, 300, 700)`}
    >
      {/* куртка */}
      <polygon points="60,800 90,470 200,400 400,400 510,470 540,800" fill="#b8975a" />
      <polygon points="300,400 400,400 510,470 540,800 300,800" fill="#a2823f" />
      {/* разгрузка */}
      <polygon points="170,555 430,555 445,720 155,720" fill="#8f8f6a" />
      <polygon points="190,575 260,575 260,660 190,660" fill="#7c7c58" />
      <polygon points="270,575 330,575 330,660 270,660" fill="#838360" />
      <polygon points="340,575 410,575 410,660 340,660" fill="#7c7c58" />
      {/* шея */}
      <polygon points="250,360 350,360 362,425 238,425" fill="#c99677" />
      {/* голова */}
      <polygon points="205,200 395,200 412,300 372,382 300,408 228,382 188,300" fill="#d9a98a" />
      <polygon points="300,200 395,200 412,300 372,382 300,408" fill="#c99677" />
      {/* каска */}
      <polygon points="188,238 214,122 300,84 386,122 412,238 380,208 300,192 220,208" fill="#7b7a55" />
      <polygon points="300,84 386,122 412,238 380,208 300,192" fill="#6a6948" />
      {/* очки */}
      <polygon points="214,256 386,256 376,304 300,292 224,304" fill="#101010" />
      <polygon points="230,262 280,262 276,276 232,278" fill="#3a3a3a" />
      {/* нос */}
      <polygon points="288,300 312,300 318,338 282,338" fill="#c28d6d" />
      {/* рот */}
      <polygon points={`268,356 332,356 326,${356 + mouth} 274,${356 + mouth}`} fill="#5a2a2a" />
      {/* подбородочный ремень */}
      <polyline points="214,240 206,330 262,392 338,392 394,330 386,240" fill="none" stroke="#4b4b36" strokeWidth={8} />
      {/* гарнитура-микрофон */}
      <polygon points="196,300 150,320 150,352 188,340" fill="#2a2a2a" />
      {/* телефон в руке */}
      {phone && (
        <g>
          <polygon points="120,820 190,640 300,610 340,700 300,820" fill="#d9a98a" />
          <polygon points="150,700 270,650 330,760 220,830" fill="#1c1d26" />
          <polygon points="170,708 262,670 308,760 226,806" fill="#4fc3f7" opacity={0.85} />
        </g>
      )}
    </g>
  );
};

/* ------------------------ ПУЛЯ В ЗАМЕДЛЕНИИ ---------------------- */

const SlowBullet: React.FC<{frame: number}> = ({frame}) => {
  if (frame < T.slowmo || frame > T.hit) return null;
  const p = interpolate(frame, [T.slowmo, T.hit], [0, 1], {
    ...clamp,
    easing: Easing.in(Easing.quad),
  });
  const start = {x: 1260, y: 640};
  const target = {x: 548, y: 960};
  const lerp = (k: number) => ({
    x: start.x + (target.x - start.x) * k,
    y: start.y + (target.y - start.y) * k,
  });
  const head = lerp(p);
  const tail = lerp(Math.max(0, p - 0.2));
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <line x1={tail.x} y1={tail.y} x2={head.x} y2={head.y} stroke="#ff9d2e" strokeWidth={26} opacity={0.35} strokeLinecap="round" />
      <line x1={tail.x} y1={tail.y} x2={head.x} y2={head.y} stroke="#fff6d6" strokeWidth={9} strokeLinecap="round" />
      <circle cx={head.x} cy={head.y} r={12} fill="#ffffff" />
    </svg>
  );
};

/* --------------------------- ИНТЕРФЕЙС --------------------------- */

const Notification: React.FC<{frame: number}> = ({frame}) => {
  const {fps} = useVideoConfig();
  if (frame < T.duck || frame >= T.hit) return null;
  const enter = spring({frame: frame - T.duck, fps, config: {damping: 14}});
  const pulse = 1 + Math.sin(frame * 0.35) * 0.012;
  return (
    <div
      style={{
        position: 'absolute',
        top: 140,
        left: 80,
        width: W - 160,
        padding: '28px 32px',
        borderRadius: 40,
        background: 'rgba(18,20,28,0.93)',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        transform: `translateY(${(1 - enter) * -300}px) scale(${pulse})`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          background: 'linear-gradient(135deg,#4fc3f7,#7c4dff)',
          color: '#fff',
          fontSize: 64,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        L
      </div>
      <div style={{flex: 1, color: '#fff'}}>
        <div style={{fontSize: 44, fontWeight: 700, opacity: 0.7}}>LinkYou · Жена</div>
        <div style={{fontSize: 48, fontWeight: 700, lineHeight: 1.1}}>Ты где? Почему молчишь?</div>
      </div>
      <div
        style={{
          minWidth: 76,
          height: 76,
          borderRadius: 38,
          background: '#ff3b5c',
          color: '#fff',
          fontSize: 48,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        3
      </div>
    </div>
  );
};

const Subtitle: React.FC<{frame: number}> = ({frame}) => {
  const {fps} = useVideoConfig();
  const line = LINES.find((l) => frame >= l.from && frame < l.to);
  if (!line) return null;
  const pop = spring({frame: frame - line.from, fps, config: {damping: 12, stiffness: 220}});
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        bottom: 340,
        textAlign: 'center',
        transform: `scale(${0.85 + pop * 0.15})`,
        opacity: Math.min(1, pop * 1.5),
        fontFamily: "Impact, 'Arial Black', sans-serif",
      }}
    >
      {line.who && (
        <div style={{fontSize: 44, color: '#ffd54f', letterSpacing: 4, marginBottom: 10}}>{line.who}</div>
      )}
      <div
        style={{
          fontSize: 84,
          lineHeight: 1.05,
          color: line.red ? '#ff3b3b' : '#ffffff',
          WebkitTextStroke: '10px #000',
          paintOrder: 'stroke fill',
          textShadow: '0 6px 0 rgba(0,0,0,0.6)',
        }}
      >
        {line.text}
      </div>
    </div>
  );
};

const EndCard: React.FC<{frame: number}> = ({frame}) => {
  const {fps} = useVideoConfig();
  if (frame < T.end) return null;
  const f = frame - T.end;
  const bg = interpolate(f, [0, 10], [0, 1], clamp);
  const pop = spring({frame: f - 6, fps, config: {damping: 13}});
  const link = interpolate(f, [24, 36], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        opacity: bg,
        background: 'radial-gradient(circle at 50% 40%, #2a2250 0%, #0b0b14 75%)',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '0 80px',
      }}
    >
      <div
        style={{
          width: 240,
          height: 240,
          borderRadius: 120,
          background: 'linear-gradient(135deg,#4fc3f7,#7c4dff)',
          color: '#fff',
          fontSize: 150,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${pop})`,
          marginBottom: 60,
        }}
      >
        L
      </div>
      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.05,
          transform: `scale(${0.8 + pop * 0.2})`,
        }}
      >
        Пиши в LinkYou
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 600,
          color: '#c9c6e8',
          textAlign: 'center',
          marginTop: 28,
          opacity: pop,
        }}
      >
        лучший мод для Link Messenger
      </div>
      <div
        style={{
          marginTop: 70,
          padding: '24px 56px',
          borderRadius: 60,
          background: '#4fc3f7',
          color: '#0b0b14',
          fontSize: 56,
          fontWeight: 800,
          opacity: link,
          transform: `translateY(${(1 - link) * 30}px)`,
        }}
      >
        t.me/LinkYouMod
      </div>
    </AbsoluteFill>
  );
};

/* ----------------------------- СБОРКА ---------------------------- */

export const LinkYouAd: React.FC = () => {
  const frame = useCurrentFrame();

  // "Игровое" время: замедляется на slowmo и замирает на попадании
  const t = frame < T.slowmo ? frame : T.slowmo + (Math.min(frame, T.hit) - T.slowmo) * 0.25;

  // Тряска камеры
  const amp =
    frame < T.slowmo
      ? 14
      : frame < T.hit
        ? 4
        : frame < T.hit + 8
          ? 36 * (1 - (frame - T.hit) / 8)
          : 0;
  const sx = (random(`sx${frame}`) - 0.5) * 2 * amp;
  const sy = (random(`sy${frame}`) - 0.5) * 2 * amp;

  const gray = interpolate(frame, [T.hit, T.hit + 10], [0, 1], clamp);
  const flash = interpolate(frame, [T.hit, T.hit + 2, T.hit + 12], [0, 1, 0], clamp);
  const redVignette = interpolate(frame, [T.hit, T.hit + 14], [0, 1], clamp);
  const intensity = frame < T.slowmo ? 0.85 : 0.6;
  const chaos = frame < T.hit;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sy}px) scale(1.06)`,
          filter: `grayscale(${gray}) contrast(${1 + gray * 0.2})`,
        }}
      >
        <Background />
        <Explosions t={t} />
        {chaos && <Tracers t={t} intensity={intensity} />}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          <Soldier t={t} frame={frame} />
        </svg>
        {chaos && <MuzzleFlashes t={t} />}
        <SlowBullet frame={frame} />
      </AbsoluteFill>

      {/* виньетка, красная после попадания */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 45%, rgba(${Math.round(
            120 * redVignette,
          )},0,0,0.75) 100%)`,
        }}
      />
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />

      <Notification frame={frame} />
      <Subtitle frame={frame} />
      <EndCard frame={frame} />
    </AbsoluteFill>
  );
};
