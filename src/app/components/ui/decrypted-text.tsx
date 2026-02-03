import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  className?: string;
  animateOnMount?: boolean;
  sequential?: boolean;
}

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

export function DecryptedText({
  text,
  speed = 50,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  className,
  animateOnMount = true,
  sequential = true,
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (animateOnMount) {
      scramble();
    }
    return () => clearIntervalRef();
  }, [text]);

  const clearIntervalRef = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const scramble = () => {
    setIsScrambling(true);
    let iteration = 0;
    const maxIterations = 15; // How many scrambles before settling each char

    clearIntervalRef();

    intervalRef.current = window.setInterval(() => {
      let complete = true;

      setDisplayText((prev) =>
        text
          .split("")
          .map((char, index) => {
            // Logic to determine if this specific character should be revealed yet
            // If sequential is true, we reveal from left to right based on iteration
            const shouldReveal = sequential 
                ? index < iteration / 3 
                : iteration >= maxIterations;

            if (shouldReveal) {
              return char;
            }

            complete = false;
            // Return random char
            return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          })
          .join("")
      );

      if (sequential) {
          // If we've revealed everything
          if (iteration / 3 > text.length) {
              complete = true;
          }
      }

      if (complete) {
        setIsScrambling(false);
        setDisplayText(text);
        clearIntervalRef();
      }

      iteration++;
    }, speed);
  };

  return (
    <span 
        className={cn("inline-block font-mono", className)}
        onMouseEnter={() => !isScrambling && scramble()}
    >
      {displayText}
    </span>
  );
}
