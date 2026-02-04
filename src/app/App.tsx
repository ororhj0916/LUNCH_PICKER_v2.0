import React, { useState, useEffect } from "react";
import { LunchPicker } from "@/app/components/LunchPicker";
import { PlaceManager } from "@/app/components/PlaceManager";
import { useLunch } from "@/hooks/use-lunch";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { Share2, Plus, Edit2, Check, Monitor } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

export default function App() {
  const [tab, setTab] = useState<"pick" | "manage">("pick");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(true);

  // 1. Initialize Room ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let r = params.get("room");
    
    if (!r) {
      // Auto-generate room ID if missing and replace URL
      r = Math.random().toString(36).substring(2, 8); // 6 chars
      const url = new URL(window.location.href);
      url.searchParams.set("room", r);
      window.history.replaceState({}, "", url.toString());
    }
    
    setRoomId(r);
    setIsReady(true);
  }, []);

  if (!isReady || !roomId) return null;

  return (
      <>
        {/* CRT Overlay Container */}
        <div className={cn("min-h-screen bg-[#101010] text-white font-mono selection:bg-[#00FF94] selection:text-black overflow-x-hidden relative transition-all duration-500", crtEnabled ? "brightness-110 contrast-110 saturate-120" : "")}>
            
            {/* 1. CRT Scanlines */}
            {crtEnabled && (
                <div className="fixed inset-0 z-[9999] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20" />
            )}
            
            {/* 2. CRT Curvature & Vignette */}
            {crtEnabled && (
                <div 
                    className="fixed inset-0 z-[9998] pointer-events-none"
                    style={{
                        background: "radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.4) 100%)",
                        boxShadow: "inset 0 0 50px rgba(0,0,0,0.5)"
                    }}
                />
            )}

            {/* 3. Screen Flicker (Rare Glitch) */}
            {crtEnabled && (
              <div
                className="fixed inset-0 z-[9997] pointer-events-none bg-white opacity-[0.006]"
                style={{
                  animation: "crtFlicker 12s infinite",
                }}
              />
            )}
<style>{`
@keyframes crtFlicker {
  0%, 92%, 100% { opacity: 0.006; }
  93% { opacity: 0.02; }
  93.3% { opacity: 0.008; }
  94% { opacity: 0.03; }
  94.2% { opacity: 0.006; }
}
`}</style>

            <AppContent roomId={roomId} tab={tab} setTab={setTab} crtEnabled={crtEnabled} setCrtEnabled={setCrtEnabled} />
        </div>
      </>
  );
}

function AppContent({ 
    roomId, 
    tab, 
    setTab,
    crtEnabled,
    setCrtEnabled
}: { 
    roomId: string, 
    tab: "pick" | "manage", 
    setTab: (t: "pick" | "manage") => void,
    crtEnabled: boolean,
    setCrtEnabled: (v: boolean) => void
}) {
  const lunch = useLunch(roomId);
  const { playHover, playClick } = useSoundEffects();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const handleCopyLink = () => {
    const url = window.location.href;
    const fallbackCopy = (text: string) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                toast.success("ROOM LINK COPIED!");
            } else {
                toast.error("MANUAL COPY REQUIRED");
            }
        } catch (err) {
            toast.error("MANUAL COPY REQUIRED");
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url)
            .then(() => toast.success("ROOM LINK COPIED!"))
            .catch(() => fallbackCopy(url));
    } else {
        fallbackCopy(url);
    }
    playClick();
  };

  const handleNewRoom = () => {
      window.location.href = window.location.pathname; // Reloads without params -> generates new room
  };

  const saveRoomName = async () => {
      if(tempName.trim()) {
          await lunch.setRoomName(tempName.trim());
      }
      setIsEditingName(false);
  };

  const startEditName = () => {
      setTempName(lunch.roomName || "");
      setIsEditingName(true);
  };

  return (
    <div className="relative z-10">
      {/* Retro Grid Background */}
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform: "perspective(500px) rotateX(20deg) scale(1.5)",
          transformOrigin: "top center",
        }}
      />
      
      <Toaster position="bottom-center" theme="dark" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pointer-events-none">
        <div className="flex flex-col pointer-events-auto gap-2">
            <div className="flex items-center gap-3">
                {isEditingName ? (
                    <div className="flex items-center gap-2">
                        <Input 
                            value={tempName} 
                            onChange={e => setTempName(e.target.value)}
                            className="h-8 w-48 bg-black/50 border-gray-600 text-[#00FF94] font-['Pixelify_Sans'] text-xl"
                            placeholder="ENTER ROOM NAME"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && saveRoomName()}
                        />
                        <Button size="icon" className="h-8 w-8 bg-[#00FF94] text-black" onClick={saveRoomName}>
                            <Check className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <div 
                        onClick={startEditName}
                        className="group flex items-center gap-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors"
                    >
                        <div
                            className="text-[#00FF94] font-['Pixelify_Sans'] text-2xl select-none"
                            style={{ 
                                textShadow: crtEnabled ? "2px 2px 4px rgba(0,255,148,0.5)" : "2px 2px 0px #000" 
                            }}
                        >
                            {lunch.roomName || "UNTITLED_ROOM"}
                        </div>
                        <Edit2 className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </div>
            
            <div className="flex gap-2 text-[10px] text-gray-400 font-mono">
                <span className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">ID: {roomId}</span>
                <span className="text-gray-600">// PRIVATE SECURE CHANNEL</span>
            </div>
        </div>

        <div className="flex flex-wrap gap-4 pointer-events-auto items-center">
            <div className="flex items-center gap-2 mr-4 bg-black/40 p-1 rounded-lg border border-gray-800 backdrop-blur-sm">
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-xs hover:text-[#00FF94] hover:bg-[#00FF94]/10"
                    onClick={handleCopyLink}
                    onMouseEnter={playHover}
                >
                    <Share2 className="w-3 h-3 mr-2" />
                    SHARE LINK
                </Button>
                <div className="w-px h-4 bg-gray-700 mx-1" />
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-xs hover:text-white hover:bg-white/10"
                    onClick={handleNewRoom}
                    onMouseEnter={playHover}
                >
                    <Plus className="w-3 h-3 mr-2" />
                    NEW ROOM
                </Button>
            </div>

          <nav className="flex gap-4">
            <NavButton
                active={tab === "pick"}
                onClick={() => { setTab("pick"); playClick(); }}
                onMouseEnter={playHover}
            >
                [ TERMINAL ]
            </NavButton>
            <NavButton
                active={tab === "manage"}
                onClick={() => { setTab("manage"); playClick(); }}
                onMouseEnter={playHover}
            >
                [ DATABASE ]
            </NavButton>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 min-h-screen flex flex-col pt-32 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="flex-1 w-full"
          >
            {tab === "pick" ? (
              <LunchPicker lunch={lunch} />
            ) : (
              <PlaceManager lunch={lunch} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed bottom-4 left-6 right-6 flex justify-between text-[10px] text-gray-500 font-mono z-50 pointer-events-none">
        <div>SYS_READY // {new Date().toLocaleDateString()} // ENCRYPTED</div>
        <div className="pointer-events-auto">
            <button 
                onClick={() => setCrtEnabled(!crtEnabled)}
                className={cn("flex items-center gap-1 hover:text-[#00FF94] transition-colors", crtEnabled ? "text-[#00FF94]" : "")}
            >
                <Monitor className="w-3 h-3" />
                CRT: {crtEnabled ? "ON" : "OFF"}
            </button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ children, active, onClick, onMouseEnter }: any) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "px-4 py-2 text-sm font-bold border-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]",
        active
          ? "bg-[#7000FF] border-white text-white hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]"
          : "bg-black border-gray-700 text-gray-500 hover:text-white hover:border-white",
      )}
    >
      {children}
    </button>
  );
}
