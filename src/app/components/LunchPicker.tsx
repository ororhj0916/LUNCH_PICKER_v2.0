import React, { useState, useEffect, useRef } from "react";
import { useLunch } from "@/hooks/use-lunch";
import { Button } from "@/app/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Star, RotateCcw, Zap, History, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { DecryptedText } from "@/app/components/ui/decrypted-text";

export function LunchPicker({
  lunch,
}: {
  lunch: ReturnType<typeof useLunch>;
}) {
  const {
    currentPick,
    pickLunch,
    attemptLeft,
    loading,
    submitRating,
    getAvgRating,
    history
  } = lunch;
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const { playHover, playClick, playTick, playSuccess } = useSoundEffects();
  const tickInterval = useRef<number | null>(null);

  // Auto-reveal if already picked on load
  useEffect(() => {
      if (currentPick && !hasRevealed && !isShuffling) {
          setHasRevealed(true);
      }
  }, [currentPick]);

  const handleAction = async () => {
    playClick();
    setIsShuffling(true);
    const shuffleTime = 1200;

    // Start ticking sound loop
    tickInterval.current = window.setInterval(() => {
        playTick();
    }, 100);

    if (!currentPick) {
      await pickLunch();
    } else {
      await new Promise((resolve) =>
        setTimeout(resolve, shuffleTime),
      );
    }

    if (tickInterval.current) {
        clearInterval(tickInterval.current);
        tickInterval.current = null;
    }
    
    playSuccess();
    setIsShuffling(false);
    setHasRevealed(true);
  };

  const handleRetry = async () => {
    playClick();
    setIsShuffling(true);

    // Start ticking sound loop
    tickInterval.current = window.setInterval(() => {
        playTick();
    }, 100);

    await pickLunch();

    if (tickInterval.current) {
        clearInterval(tickInterval.current);
        tickInterval.current = null;
    }
    
    playSuccess();
    setIsShuffling(false);
  };

  const avg = currentPick
    ? getAvgRating(currentPick.type!, currentPick.item_id!)
    : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-black animate-bounce [animation-delay:-0.3s]" />
          <div className="w-4 h-4 bg-[#7000FF] animate-bounce [animation-delay:-0.15s]" />
          <div className="w-4 h-4 bg-[#00FF94] animate-bounce" />
        </div>
        <p className="font-mono text-sm tracking-widest uppercase">
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[70vh] max-w-4xl mx-auto px-6 relative z-10 pb-20">
      <AnimatePresence mode="wait">
        {!hasRevealed && !currentPick ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: 1.1,
              filter: "blur(10px)",
            }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center space-y-12"
          >
            <div className="space-y-6 relative">
              {/* Decorative floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: "easeInOut",
                }}
                className="absolute -top-12 -left-12 text-[#00FF94] opacity-80"
              >
                <Zap
                  className="w-12 h-12"
                  fill="currentColor"
                />
              </motion.div>

              <h1
                className="text-7xl md:text-9xl font-['Pixelify_Sans'] text-white leading-none select-none"
                style={{
                  textShadow: `
                    4px 4px 0px #000,
                    8px 8px 0px #7000FF,
                    12px 12px 0px #000
                  `,
                  WebkitTextStroke: "2px black",
                }}
              >
                LUNCH
                <br />
                PICKER
              </h1>

              <div className="inline-block bg-black text-[#00FF94] px-4 py-2 font-mono text-sm border-2 border-[#00FF94] shadow-[4px_4px_0px_0px_#00FF94]">
                STATUS: WAITING_INPUT
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleAction}
              onMouseEnter={playHover}
              isLoading={isShuffling}
              className="h-20 px-12 text-2xl font-['Pixelify_Sans'] uppercase tracking-widest bg-[#00FF94] text-black border-2 border-black shadow-[6px_6px_0px_0px_#000] hover:bg-[#33FFAB] hover:shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 transition-all"
            >
              PICK LUNCH
            </Button>

            {/* History Preview (Intro) */}
             {history.length > 0 && (
                <div className="mt-8 border-t border-gray-700 pt-4 w-full max-w-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 font-mono uppercase">
                        <History className="w-3 h-3" />
                        Recent Picks (Cooldown Active)
                    </div>
                    <div className="space-y-1 opacity-60">
                        {history.slice(0, 3).map((h, i) => (
                            <div key={i} className="text-xs font-mono text-gray-400 flex justify-between">
                                <span>- {h.item_name}</span>
                                <span className="opacity-50">{h.date.slice(5)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="w-full flex flex-col items-center gap-12"
          >
            {/* --- RECEIPT UI --- */}
            <motion.div
              initial={{ opacity: 0, y: 50, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
              className="bg-white text-black font-mono w-full max-w-sm shadow-[0px_0px_40px_rgba(0,0,0,0.5)] relative"
              style={{
                  filter: "drop-shadow(0px 10px 10px rgba(0,0,0,0.5))"
              }}
            >
              {/* Receipt Top Jagged Edge (CSS trick) */}
              <div 
                className="absolute -top-3 left-0 right-0 h-4 bg-white" 
                style={{ 
                    clipPath: "polygon(0% 100%, 2% 0%, 4% 100%, 6% 0%, 8% 100%, 10% 0%, 12% 100%, 14% 0%, 16% 100%, 18% 0%, 20% 100%, 22% 0%, 24% 100%, 26% 0%, 28% 100%, 30% 0%, 32% 100%, 34% 0%, 36% 100%, 38% 0%, 40% 100%, 42% 0%, 44% 100%, 46% 0%, 48% 100%, 50% 0%, 52% 100%, 54% 0%, 56% 100%, 58% 0%, 60% 100%, 62% 0%, 64% 100%, 66% 0%, 68% 100%, 70% 0%, 72% 100%, 74% 0%, 76% 100%, 78% 0%, 80% 100%, 82% 0%, 84% 100%, 86% 0%, 88% 100%, 90% 0%, 92% 100%, 94% 0%, 96% 100%, 98% 0%, 100% 100%)"
                }} 
              />

              <div className="p-8 pb-12 flex flex-col items-center space-y-6">
                 {/* Header */}
                 <div className="text-center space-y-1">
                     <h2 className="text-3xl font-black tracking-tighter font-['Pixelify_Sans'] uppercase">LUNCH RECEIPT</h2>
                     <div className="text-xs text-gray-500 font-bold">
                         ORDER #{Math.floor(Math.random() * 9000) + 1000}
                     </div>
                     <div className="text-xs text-gray-400">
                         {new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                     </div>
                 </div>

                 {/* Divider */}
                 <div className="w-full border-b-2 border-dashed border-gray-300" />

                 {/* Item Details */}
                 <div className="w-full space-y-4 py-2">
                     <div className="flex justify-between text-xs font-bold mb-2">
                         <span>ITEM</span>
                         <span>QTY</span>
                     </div>
                     
                     <div className="flex justify-between items-start">
                         <div className="flex flex-col">
                             <span className="text-2xl font-black uppercase leading-none mb-1">
                                 {currentPick?.item_name || "LOADING..."}
                             </span>
                             <span className="text-sm text-gray-500 font-bold">
                                 @ {currentPick?.place_name || "UNKNOWN PLACE"}
                             </span>
                         </div>
                         <span className="text-xl font-bold">1</span>
                     </div>
                 </div>

                 {/* Divider */}
                 <div className="w-full border-b-2 border-dashed border-gray-300" />

                 {/* Total */}
                 <div className="w-full flex justify-between items-end">
                     <span className="text-xl font-bold">TOTAL</span>
                     <span className="text-3xl font-black">$???</span>
                 </div>

                 {/* Message */}
                 <div className="pt-6 font-['Pixelify_Sans'] text-xl italic opacity-70">
                     "Enjoy your meal!"
                 </div>

                 {/* Barcode */}
                 <div className="w-full h-16 bg-[repeating-linear-gradient(90deg,black,black_2px,white_2px,white_4px,black_4px,black_8px,white_8px,white_9px)] mt-4 opacity-80" />
                 
                 <div className="text-[10px] tracking-[0.5em] text-center w-full">THANK YOU</div>
              </div>
              
              {/* Receipt Bottom Jagged Edge */}
              <div 
                className="absolute -bottom-3 left-0 right-0 h-4 bg-white" 
                style={{ 
                    clipPath: "polygon(0% 0%, 2% 100%, 4% 0%, 6% 100%, 8% 0%, 10% 100%, 12% 0%, 14% 100%, 16% 0%, 18% 100%, 20% 0%, 22% 100%, 24% 0%, 26% 100%, 28% 0%, 30% 100%, 32% 0%, 34% 100%, 36% 0%, 38% 100%, 40% 0%, 42% 100%, 44% 0%, 46% 100%, 48% 0%, 50% 100%, 52% 0%, 54% 100%, 56% 0%, 58% 100%, 60% 0%, 62% 100%, 64% 0%, 66% 100%, 68% 0%, 70% 100%, 72% 0%, 74% 100%, 76% 0%, 78% 100%, 80% 0%, 82% 100%, 84% 0%, 86% 100%, 88% 0%, 90% 100%, 92% 0%, 94% 100%, 96% 0%, 98% 100%, 100% 0%)"
                }} 
              />
            </motion.div>

            {/* Controls */}
            <div className="flex flex-col gap-4 w-full max-w-sm">
                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onMouseEnter={() => {
                        setHoverRating(star);
                        playHover();
                        }}
                        onClick={() => {
                            submitRating(star);
                            playClick();
                        }}
                        className="focus:outline-none transform transition-transform hover:scale-110 active:scale-90"
                    >
                        <Star
                        className={cn(
                            "h-6 w-6",
                            star <= hoverRating
                            ? "fill-[#00FF94] text-[#00FF94]"
                            : "text-gray-700 fill-gray-900",
                        )}
                        strokeWidth={2}
                        />
                    </button>
                    ))}
                </div>

                {attemptLeft > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={handleRetry}
                    onMouseEnter={playHover}
                    isLoading={isShuffling}
                    className="w-full border-2 border-[#00FF94] text-[#00FF94] hover:bg-[#00FF94] hover:text-black font-['Pixelify_Sans'] text-xl"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    REROLL ({attemptLeft})
                  </Button>
                ) : (
                  <div className="font-mono text-xs text-red-500 font-bold border-2 border-red-500 px-4 py-2 bg-red-900/20 text-center">
                    NO MORE REROLLS
                  </div>
                )}
            </div>

            {/* Recent History Table */}
            {history.length > 0 && (
                <div className="w-full max-w-sm mt-8">
                     <h4 className="text-[#00FF94] font-['Pixelify_Sans'] mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                         <History className="w-4 h-4" /> RECENT_LOGS
                     </h4>
                     <div className="space-y-2">
                         {history.map((h, i) => (
                             <div key={i} className="flex justify-between items-center text-xs font-mono text-gray-400 hover:text-white transition-colors">
                                 <div className="flex gap-4">
                                     <span className="opacity-50 w-16">{h.date.slice(5)}</span>
                                     <span className={cn(i === 0 && h.date === new Date().toISOString().slice(0,10) ? "text-[#00FF94]" : "")}>
                                         {h.item_name}
                                     </span>
                                 </div>
                                 <span className="opacity-30 text-[10px]">{h.place_name}</span>
                             </div>
                         ))}
                     </div>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
