 import { motion } from 'framer-motion';
 import { cn } from '@/lib/utils';
 
 interface TokenData {
   symbol: string;
   color: string;
   logo?: string;
   orbitRadius: number;
   orbitDuration: number;
   size: number;
   delay?: number;
 }
 
 const defaultTokens: TokenData[] = [
   { symbol: 'QMS', color: 'from-blue-500 to-cyan-400', orbitRadius: 100, orbitDuration: 15, size: 40, delay: 0 },
   { symbol: 'QTX', color: 'from-red-500 to-orange-400', orbitRadius: 140, orbitDuration: 20, size: 36, delay: 2 },
   { symbol: 'ETH', color: 'from-purple-500 to-blue-400', orbitRadius: 180, orbitDuration: 25, size: 32, delay: 4 },
   { symbol: 'BNB', color: 'from-yellow-500 to-orange-400', orbitRadius: 220, orbitDuration: 30, size: 28, delay: 1 },
   { symbol: 'MON', color: 'from-violet-500 to-purple-400', orbitRadius: 260, orbitDuration: 35, size: 26, delay: 3 },
   { symbol: 'HYPE', color: 'from-pink-500 to-rose-400', orbitRadius: 300, orbitDuration: 40, size: 24, delay: 5 },
 ];
 
 interface TokenOrbitProps {
   tokens?: TokenData[];
   className?: string;
   showOrbits?: boolean;
   centerContent?: React.ReactNode;
 }
 
 export function TokenOrbit({ 
   tokens = defaultTokens, 
   className,
   showOrbits = true,
   centerContent
 }: TokenOrbitProps) {
   return (
     <div className={cn("relative flex items-center justify-center", className)}>
       {/* Center Glow */}
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/40 blur-3xl animate-pulse" />
       </div>
 
       {/* Orbit Lines */}
       {showOrbits && tokens.map((token, idx) => (
         <motion.div
           key={`orbit-${idx}`}
           className="absolute rounded-full border border-white/5"
           style={{
             width: token.orbitRadius * 2,
             height: token.orbitRadius * 2,
           }}
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: idx * 0.1, duration: 0.5 }}
         >
           {/* Orbit glow effect */}
           <div 
             className="absolute inset-0 rounded-full"
             style={{
               background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)`,
             }}
           />
         </motion.div>
       ))}
 
       {/* Center Element */}
       <motion.div
         className="relative z-20"
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
       >
         {centerContent || (
           <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-2xl shadow-primary/50">
             <span className="text-2xl font-black text-white">🐲</span>
           </div>
         )}
       </motion.div>
 
       {/* Orbiting Tokens */}
       {tokens.map((token, idx) => (
         <OrbitingToken key={token.symbol} token={token} index={idx} />
       ))}
     </div>
   );
 }
 
 function OrbitingToken({ token, index }: { token: TokenData; index: number }) {
   return (
     <motion.div
       className="absolute"
       style={{
         width: token.orbitRadius * 2,
         height: token.orbitRadius * 2,
       }}
       animate={{ rotate: 360 }}
       transition={{
         duration: token.orbitDuration,
         repeat: Infinity,
         ease: 'linear',
         delay: token.delay || 0,
       }}
     >
       {/* Token positioned at the edge of orbit */}
       <motion.div
         className="absolute"
         style={{
           top: 0,
           left: '50%',
           transform: 'translateX(-50%)',
         }}
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ delay: 0.5 + index * 0.15, type: 'spring' }}
       >
         {/* Counter-rotate to keep token upright */}
         <motion.div
           animate={{ rotate: -360 }}
           transition={{
             duration: token.orbitDuration,
             repeat: Infinity,
             ease: 'linear',
             delay: token.delay || 0,
           }}
         >
           <div 
             className={cn(
               "rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-125",
               `bg-gradient-to-br ${token.color}`
             )}
             style={{
               width: token.size,
               height: token.size,
               boxShadow: `0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(0,0,0,0.3)`,
             }}
           >
             <span 
               className="font-bold text-white drop-shadow-md"
               style={{ fontSize: token.size * 0.35 }}
             >
               {token.symbol.slice(0, 3)}
             </span>
           </div>
           
           {/* Glow trail */}
           <div 
             className={cn(
               "absolute inset-0 rounded-full blur-md opacity-50",
               `bg-gradient-to-br ${token.color}`
             )}
             style={{ transform: 'scale(1.2)' }}
           />
         </motion.div>
       </motion.div>
     </motion.div>
   );
 }
 
 // Larger version for hero sections
 export function TokenSolarSystem({ className }: { className?: string }) {
   const solarTokens: TokenData[] = [
     { symbol: 'QMS', color: 'from-blue-400 to-cyan-300', orbitRadius: 120, orbitDuration: 12, size: 48, delay: 0 },
     { symbol: 'QTX', color: 'from-red-500 to-orange-400', orbitRadius: 170, orbitDuration: 18, size: 44, delay: 1 },
     { symbol: 'ETH', color: 'from-indigo-500 to-purple-400', orbitRadius: 220, orbitDuration: 24, size: 40, delay: 2 },
     { symbol: 'BNB', color: 'from-yellow-400 to-amber-300', orbitRadius: 270, orbitDuration: 30, size: 36, delay: 3 },
     { symbol: 'MON', color: 'from-violet-400 to-fuchsia-400', orbitRadius: 320, orbitDuration: 36, size: 32, delay: 4 },
     { symbol: 'HYPE', color: 'from-pink-400 to-rose-300', orbitRadius: 370, orbitDuration: 42, size: 28, delay: 5 },
   ];
 
   return (
     <div className={cn("relative w-full h-[700px] flex items-center justify-center overflow-hidden", className)}>
       {/* Background glow effects */}
       <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/20 via-transparent to-accent/20 blur-3xl" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-secondary/30 via-transparent to-primary/30 blur-2xl animate-pulse" />
       </div>
 
       {/* Orbit rings with enhanced styling */}
       {solarTokens.map((token, idx) => (
         <motion.div
           key={`solar-orbit-${idx}`}
           className="absolute rounded-full"
           style={{
             width: token.orbitRadius * 2,
             height: token.orbitRadius * 2,
             border: '1px solid',
             borderColor: `rgba(255,255,255,${0.08 - idx * 0.01})`,
           }}
           initial={{ opacity: 0, scale: 0.5 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: idx * 0.1, duration: 0.8, ease: 'easeOut' }}
         >
           {/* Orbit dash effect */}
           <div 
             className="absolute inset-0 rounded-full opacity-30"
             style={{
               background: `conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1) 10%, transparent 20%)`,
             }}
           />
         </motion.div>
       ))}
 
       {/* Center sun/core */}
       <motion.div
         className="relative z-30"
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
       >
         <div className="relative">
           {/* Core glow layers */}
           <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-secondary blur-xl opacity-80 animate-pulse" />
           <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-tr from-red-500 via-orange-400 to-yellow-300 blur-md opacity-60" />
           
           {/* Core */}
           <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-red-500 to-orange-400 flex items-center justify-center shadow-2xl relative overflow-hidden">
             {/* Inner shine */}
             <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
             <span className="text-4xl relative z-10">🐲</span>
           </div>
           
           {/* Rotating ring around core */}
           <motion.div
             className="absolute -inset-4 rounded-full border-2 border-dashed border-primary/30"
             animate={{ rotate: 360 }}
             transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
           />
         </div>
       </motion.div>
 
       {/* Orbiting tokens */}
       {solarTokens.map((token, idx) => (
         <motion.div
           key={`solar-token-${token.symbol}`}
           className="absolute pointer-events-none"
           style={{
             width: token.orbitRadius * 2,
             height: token.orbitRadius * 2,
           }}
           animate={{ rotate: 360 }}
           transition={{
             duration: token.orbitDuration,
             repeat: Infinity,
             ease: 'linear',
             delay: token.delay || 0,
           }}
         >
           <motion.div
             className="absolute pointer-events-auto"
             style={{
               top: 0,
               left: '50%',
               transform: 'translateX(-50%)',
             }}
             initial={{ scale: 0, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.6 + idx * 0.15, type: 'spring', stiffness: 200 }}
           >
             <motion.div
               animate={{ rotate: -360 }}
               transition={{
                 duration: token.orbitDuration,
                 repeat: Infinity,
                 ease: 'linear',
                 delay: token.delay || 0,
               }}
               whileHover={{ scale: 1.3 }}
               className="cursor-pointer"
             >
               {/* Token glow */}
               <div 
                 className={cn(
                   "absolute -inset-2 rounded-full blur-lg opacity-60",
                   `bg-gradient-to-br ${token.color}`
                 )}
               />
               
               {/* Token body */}
               <div 
                 className={cn(
                   "relative rounded-full flex items-center justify-center shadow-xl transition-shadow hover:shadow-2xl",
                   `bg-gradient-to-br ${token.color}`
                 )}
                 style={{
                   width: token.size,
                   height: token.size,
                 }}
               >
                 {/* Inner highlight */}
                 <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent" />
                 
                 <span 
                   className="font-bold text-white drop-shadow-lg relative z-10"
                   style={{ fontSize: token.size * 0.32 }}
                 >
                   {token.symbol.length > 3 ? token.symbol.slice(0, 3) : token.symbol}
                 </span>
               </div>
               
               {/* Orbit trail effect */}
               <motion.div
                 className={cn(
                   "absolute top-1/2 left-full -translate-y-1/2 h-1 rounded-full opacity-30",
                   `bg-gradient-to-r ${token.color}`
                 )}
                 style={{ width: 30 }}
                 animate={{ opacity: [0.3, 0.1, 0.3] }}
                 transition={{ duration: 2, repeat: Infinity }}
               />
             </motion.div>
           </motion.div>
         </motion.div>
       ))}
 
       {/* Particle effects */}
       {[...Array(20)].map((_, i) => (
         <motion.div
           key={`particle-${i}`}
           className="absolute w-1 h-1 rounded-full bg-white/30"
           style={{
             top: `${Math.random() * 100}%`,
             left: `${Math.random() * 100}%`,
           }}
           animate={{
             opacity: [0, 1, 0],
             scale: [0, 1, 0],
           }}
           transition={{
             duration: 3 + Math.random() * 2,
             repeat: Infinity,
             delay: Math.random() * 5,
           }}
         />
       ))}
     </div>
   );
 }