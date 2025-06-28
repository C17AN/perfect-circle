"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Circle {
  id: number;
  x: number; // vw
  y: number; // vh
  size: number; // px
  color: string;
  dirX: 1 | -1;
  dirY: 1 | -1;
  drift: number; // px amplitude
}

const COLORS = [
  "rgba(99, 102, 241, 0.15)", // indigo-500
  "rgba(236, 72, 153, 0.15)", // pink-500
  "rgba(34, 197, 94, 0.15)", // green-500
  "rgba(59, 130, 246, 0.15)", // blue-500
];

const MAX_CIRCLES = 4;
const SPAWN_INTERVAL_MS = 8000;

export default function BackgroundCircles() {
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    const addCircle = () => {
      const id = Date.now();
      const size = 200 + Math.random() * 300; // 200–500

      // Generate position avoiding the central viewport region (approx 30% width & height)
      let x = Math.random() * 100;
      let y = Math.random() * 100;
      const isInCenter = (xx: number, yy: number) => {
        return xx > 25 && xx < 75 && yy > 20 && yy < 80; // adjust as needed
      };
      let safety = 0;
      while (isInCenter(x, y) && safety < 10) {
        x = Math.random() * 100;
        y = Math.random() * 100;
        safety++;
      }

      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const dirX: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      const dirY: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      const drift = 80 + Math.random() * 120; // 80–200px sway distance

      setCircles((prev) => {
        const next = [...prev, { id, x, y, size, color, dirX, dirY, drift }];
        // oldest circle disappears in opposite direction when exceeding limit
        if (next.length > MAX_CIRCLES) {
          next.shift();
        }
        return next;
      });
    };

    addCircle(); // initial spawn
    const interval = setInterval(addCircle, SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {circles.map((c) => {
        const filterId = `blur-${c.id}`;
        return (
          <motion.svg
            key={c.id}
            className="pointer-events-none fixed z-0"
            style={{
              top: `${c.y}vh`,
              left: `${c.x}vw`,
              width: `${c.size}px`,
              height: `${c.size}px`,
            }}
            initial={{
              opacity: 0,
              scale: 0,
              x: c.dirX * 100,
              y: c.dirY * 100,
            }}
            animate={{
              opacity: 0.45,
              scale: 1,
              x: [0, c.dirX * c.drift],
              y: [0, c.dirY * c.drift],
            }}
            transition={{
              opacity: { duration: 1.5 },
              scale: { duration: 1.5 },
              x: { duration: 14, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
              y: { duration: 18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
            }}
            exit={{
              opacity: 0,
              scale: 0,
              x: -c.dirX * 200,
              y: -c.dirY * 200,
            }}
          >
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="50" />
              </filter>
            </defs>
            <circle cx="50%" cy="50%" r="50%" fill={c.color} filter={`url(#${filterId})`} />
          </motion.svg>
        );
      })}
    </AnimatePresence>
  );
}
