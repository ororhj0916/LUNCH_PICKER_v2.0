import React, { useState, useEffect, useRef } from "react";
import { useLunch } from "@/hooks/use-lunch";
import { Button } from "@/app/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Star, RotateCcw, Zap } from "lucide-react";
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
  } = lunch;
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const { playHover, playClick, playTick, playSuccess, playError } = useSoundEffects();
  const tickInterval = useRef<number | null>(null);

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
    <div className="flex flex-col items-center justify-center w-full min-h-[70vh] max-w-2xl mx-auto px-6 relative z-10">
      <AnimatePresence mode="wait">
        {!hasRevealed ? (
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
                STATUS: {currentPick ? "READY" : "WAITING"}
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleAction}
              onMouseEnter={playHover}
              isLoading={isShuffling}
              className="h-20 px-12 text-2xl font-['Pixelify_Sans'] uppercase tracking-widest bg-[#00FF94] text-black border-2 border-black shadow-[6px_6px_0px_0px_#000] hover:bg-[#33FFAB] hover:shadow-[8px_8px_0px_0px_#000] hover:-translate-y-1 hover:-translate-x-1 transition-all"
            >
              {currentPick ? "REVEAL" : "PICK LUNCH"}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="w-full flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 50, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
              className="w-full max-w-lg bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_#000] relative overflow-hidden"
            >
              {/* Scanline decoration */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                <div>
                  <div className="font-mono text-xs font-bold bg-black text-white inline-block px-2 py-1 mb-4 uppercase">
                    SELECTED
                  </div>
                  <h2
                    className="text-5xl md:text-6xl font-['Pixelify_Sans'] leading-tight text-black break-words min-h-[3em] flex items-center justify-center"
                    style={{ textShadow: "3px 3px 0px #ddd" }}
                  >
                    <DecryptedText 
                        text={currentPick?.item_name || "UNKNOWN"} 
                        speed={50}
                        animateOnMount={true}
                    />
                  </h2>
                </div>

                <div className="w-full h-1 bg-black/10 rounded-full" />

                <div className="space-y-4 w-full">
                  <div className="flex flex-col gap-2 items-center">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500">
                      RATE THIS
                    </span>
                    <div
                      className="flex gap-2"
                      onMouseLeave={() => setHoverRating(0)}
                    >
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
                              "h-8 w-8",
                              star <= hoverRating
                                ? "fill-black text-black"
                                : "text-gray-300 fill-gray-100",
                            )}
                            strokeWidth={3}
                          />
                        </button>
                      ))}
                    </div>
                    {avg && (
                      <div className="font-mono text-xs text-black font-bold">
                        AVG: {avg}
                      </div>
                    )}
                  </div>
                </div>

                {attemptLeft > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={handleRetry}
                    onMouseEnter={playHover}
                    isLoading={isShuffling}
                    className="w-full border-2 border-black hover:bg-black hover:text-white"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    REROLL ({attemptLeft})
                  </Button>
                ) : (
                  <div className="font-mono text-xs text-red-500 font-bold border-2 border-red-500 px-4 py-2 bg-red-50">
                    NO MORE REROLLS
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
