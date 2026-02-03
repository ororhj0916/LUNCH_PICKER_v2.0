import React, { useState, useEffect } from "react";
import { LunchPicker } from "@/app/components/LunchPicker";
import { PlaceManager } from "@/app/components/PlaceManager";
import { useLunch } from "@/hooks/use-lunch";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { Share2, Users, Database, Copy } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function App() {
  const [tab, setTab] = useState<"pick" | "manage">("pick");
  
  // URL Params parsing
  const [room, setRoom] = useState("global");
  const [session, setSession] = useState("global");
  const [isUrlParsed, setIsUrlParsed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoom(params.get("room") || "global");
    setSession(params.get("session") || "global");
    setIsUrlParsed(true);
  }, []);

  const lunch = useLunch(room, session);
  const { playHover, playClick } = useSoundEffects();

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("LINK COPIED TO CLIPBOARD");
    playClick();
  };

  const handleCreatePrivate = () => {
      const newId = Math.random().toString(36).substring(7);
      const url = new URL(window.location.href);
      url.searchParams.set("room", newId);
      url.searchParams.set("session", "main");
      window.location.href = url.toString();
  };

  if (!isUrlParsed) return null;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white font-mono selection:bg-[#00FF94] selection:text-black overflow-x-hidden relative">
      {/* Retro Grid Background */}
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform:
            "perspective(500px) rotateX(20deg) scale(1.5)",
          transformOrigin: "top center",
        }}
      />

      {/* Vignette */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

      <Toaster position="bottom-center" theme="dark" />

      {/* Header / Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pointer-events-none">
        <div className="flex flex-col pointer-events-auto">
            <div
            className="text-[#00FF94] font-['Pixelify_Sans'] text-2xl select-none"
            style={{ textShadow: "2px 2px 0px #000" }}
            >
            LUNCH_PICKER_v2.0
            </div>
            {(room !== "global" || session !== "global") && (
                <div className="flex gap-2 text-[10px] text-gray-400 mt-1">
                    {room !== "global" && <span className="bg-red-900/50 px-1 border border-red-800">ROOM: {room}</span>}
                    {session !== "global" && <span className="bg-blue-900/50 px-1 border border-blue-800">SESSION: {session}</span>}
                </div>
            )}
        </div>

        <div className="flex flex-wrap gap-4 pointer-events-auto items-center">
            {/* Share Controls */}
            <div className="flex items-center gap-2 mr-4">
                <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-xs border border-gray-700 hover:border-[#00FF94] hover:text-[#00FF94]"
                    onClick={handleCopyLink}
                    onMouseEnter={playHover}
                >
                    <Share2 className="w-3 h-3 mr-2" />
                    SHARE
                </Button>
                {room === "global" && (
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-xs border border-gray-700 hover:border-red-500 hover:text-red-500"
                        onClick={handleCreatePrivate}
                        onMouseEnter={playHover}
                    >
                        <Users className="w-3 h-3 mr-2" />
                        NEW PRIVATE ROOM
                    </Button>
                )}
            </div>

          <nav className="flex gap-4">
            <NavButton
                active={tab === "pick"}
                onClick={() => {
                    setTab("pick");
                    playClick();
                }}
                onMouseEnter={playHover}
            >
                [ TERMINAL ]
            </NavButton>
            <NavButton
                active={tab === "manage"}
                onClick={() => {
                    setTab("manage");
                    playClick();
                }}
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
            initial={{
              opacity: 0,
              x: -20,
              filter: "blur(10px)",
            }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
            transition={{
              type: "spring",
              bounce: 0,
              duration: 0.5,
            }}
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

      {/* Footer Decoration */}
      <div className="fixed bottom-4 left-6 text-[10px] text-gray-500 font-mono z-0 pointer-events-none">
        SYS_READY // {new Date().toLocaleDateString()} // MODE: {room === "global" ? "PUBLIC_NET" : "SECURE_LINK"}
      </div>
    </div>
  );
}

function NavButton({
  children,
  active,
  onClick,
  onMouseEnter,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
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
