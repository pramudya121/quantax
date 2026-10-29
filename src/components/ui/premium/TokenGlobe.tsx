import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OrbitToken {
  symbol: string;
  logoURI: string;
  orbitRadiusX: number;
  orbitRadiusY: number;
  tiltX: number;
  tiltY: number;
  tiltZ: number;
  duration: number;
  size: number;
  delay: number;
  glowColor: string;
  ringColor: string;
  startAngle: number;
}

const orbitTokens: OrbitToken[] = [
  {
    symbol: 'QMS', logoURI: '/tokens/qms.svg',
    orbitRadiusX: 130, orbitRadiusY: 110,
    tiltX: 65, tiltY: 0, tiltZ: -15,
    duration: 12, size: 46, delay: 0,
    glowColor: '59, 130, 246', ringColor: 'rgba(100, 160, 255, 0.35)',
    startAngle: 0,
  },
  {
    symbol: 'DRAGON', logoURI: '/tokens/dragon.png',
    orbitRadiusX: 160, orbitRadiusY: 140,
    tiltX: 70, tiltY: 15, tiltZ: 25,
    duration: 16, size: 42, delay: 1,
    glowColor: '239, 68, 68', ringColor: 'rgba(255, 180, 50, 0.3)',
    startAngle: 60,
  },
  {
    symbol: 'ETH', logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
    orbitRadiusX: 195, orbitRadiusY: 170,
    tiltX: 60, tiltY: -10, tiltZ: -30,
    duration: 20, size: 40, delay: 2,
    glowColor: '139, 92, 246', ringColor: 'rgba(139, 92, 246, 0.25)',
    startAngle: 120,
  },
  {
    symbol: 'BNB', logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
    orbitRadiusX: 230, orbitRadiusY: 200,
    tiltX: 75, tiltY: 20, tiltZ: 10,
    duration: 24, size: 38, delay: 0.5,
    glowColor: '245, 158, 11', ringColor: 'rgba(245, 180, 50, 0.25)',
    startAngle: 200,
  },
  {
    symbol: 'MON', logoURI: '/tokens/mon.jpg',
    orbitRadiusX: 265, orbitRadiusY: 230,
    tiltX: 55, tiltY: -20, tiltZ: 35,
    duration: 28, size: 36, delay: 3,
    glowColor: '167, 139, 250', ringColor: 'rgba(167, 139, 250, 0.2)',
    startAngle: 280,
  },
  {
    symbol: 'HYPE', logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/32196.png',
    orbitRadiusX: 300, orbitRadiusY: 260,
    tiltX: 68, tiltY: 10, tiltZ: -20,
    duration: 32, size: 34, delay: 1.5,
    glowColor: '236, 72, 153', ringColor: 'rgba(236, 72, 153, 0.2)',
    startAngle: 340,
  },
];

function OrbitingToken({ token }: { token: OrbitToken }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startTime: number | null = null;
    let animId: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const angle = ((elapsed + token.delay) / token.duration) * Math.PI * 2 + (token.startAngle * Math.PI / 180);

      // Position on elliptical orbit (in orbit's local space)
      const x = Math.cos(angle) * token.orbitRadiusX;
      const y = Math.sin(angle) * token.orbitRadiusY;

      // Apply 3D rotation to match the orbit tilt
      const radX = (token.tiltX * Math.PI) / 180;
      const radY = (token.tiltY * Math.PI) / 180;
      const radZ = (token.tiltZ * Math.PI) / 180;

      // Rotate around Z axis
      const x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
      const y1 = x * Math.sin(radZ) + y * Math.cos(radZ);
      const z1 = 0;

      // Rotate around X axis
      const x2 = x1;
      const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

      // Rotate around Y axis
      const x3 = x2 * Math.cos(radY) + z2 * Math.sin(radY);
      const y3 = y2;
      const z3 = -x2 * Math.sin(radY) + z2 * Math.cos(radY);

      // Perspective scale (tokens closer appear larger)
      const perspective = 800;
      const scale = perspective / (perspective + z3);
      const projX = x3 * scale;
      const projY = y3 * scale;

      el.style.transform = `translate(${projX}px, ${projY}px) scale(${scale})`;
      el.style.zIndex = z3 > 0 ? '25' : '15';
      el.style.opacity = z3 > -100 ? '1' : '0.5';

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [token]);

  return (
    <div
      ref={ref}
      className="absolute cursor-pointer group"
      style={{ willChange: 'transform' }}
    >
      {/* Glow */}
      <div
        className="absolute -inset-3 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ backgroundColor: `rgba(${token.glowColor}, 0.5)` }}
      />

      {/* Token body */}
      <div
        className="relative rounded-full flex items-center justify-center shadow-xl border-2 border-white/20 overflow-hidden bg-background/90 backdrop-blur-sm hover:scale-125 transition-transform"
        style={{
          width: token.size,
          height: token.size,
          marginLeft: -token.size / 2,
          marginTop: -token.size / 2,
          boxShadow: `0 0 15px rgba(${token.glowColor}, 0.4), 0 0 30px rgba(${token.glowColor}, 0.15)`,
        }}
      >
        <img
          src={token.logoURI}
          alt={token.symbol}
          className="w-full h-full rounded-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {/* Label */}
      <div
        className="absolute left-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ top: token.size / 2 + 6, transform: 'translateX(-50%)' }}
      >
        <span className="text-[10px] font-bold text-foreground whitespace-nowrap bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-border/50">
          {token.symbol}
        </span>
      </div>
    </div>
  );
}

export function TokenGlobe({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative w-full h-[700px] flex items-center justify-center overflow-hidden", className)}
      style={{ perspective: '1000px' }}
    >
      {/* Deep background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 via-destructive/8 to-accent/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-destructive/15 via-primary/10 to-transparent blur-2xl animate-pulse" />
      </div>

      {/* 3D Tilted Orbit Rings */}
      {orbitTokens.map((token, idx) => (
        <motion.div
          key={`ring-${idx}`}
          className="absolute pointer-events-none"
          style={{
            width: token.orbitRadiusX * 2,
            height: token.orbitRadiusY * 2,
            border: `1.5px solid ${token.ringColor}`,
            borderRadius: '50%',
            transform: `rotateX(${token.tiltX}deg) rotateY(${token.tiltY}deg) rotateZ(${token.tiltZ}deg)`,
            transformStyle: 'preserve-3d',
          }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.12, duration: 0.8, ease: 'easeOut' }}
        />
      ))}

      {/* Center Core */}
      <motion.div
        className="relative z-20"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
      >
        <div className="relative">
          {/* Core glow layers */}
          <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-primary/30 via-destructive/20 to-accent/30 blur-2xl animate-pulse" />
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-destructive/40 via-primary/30 to-transparent blur-xl" />

          {/* Core body - 3D cube-like feel */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted via-card to-muted flex items-center justify-center shadow-2xl relative overflow-hidden border border-white/10">
            {/* Inner shine */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent rounded-b-full" />
            <span className="text-3xl relative z-10">🐲</span>
          </div>

          {/* Rotating dashed ring */}
          <motion.div
            className="absolute -inset-5 rounded-full border border-dashed border-primary/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </motion.div>

      {/* Orbiting Tokens (positioned via JS animation) */}
      {orbitTokens.map((token) => (
        <OrbitingToken key={token.symbol} token={token} />
      ))}

      {/* Ambient particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`p-${i}`}
          className="absolute w-0.5 h-0.5 rounded-full bg-white/30"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{ opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
}
