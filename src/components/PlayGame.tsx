"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Peer, DataConnection } from "peerjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PlayGameProps {
  gameId: string;
}

const PlayGame = ({ gameId }: PlayGameProps) => {
  const peerRef = useRef<Peer | null>(null);
  const [myId, setMyId] = useState("");
  const connRef = useRef<DataConnection | null>(null);

  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);

  const [localPoints, setLocalPoints] = useState<{ x: number; y: number }[]>([]);
  const [remotePoints, setRemotePoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showDisconnectedMessage, setShowDisconnectedMessage] = useState(false);
  const [copied, setCopied] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<"waiting" | "countdown" | "playing" | "finished">(
    "waiting"
  );
  const [countdown, setCountdown] = useState(5);
  const [gameTimer, setGameTimer] = useState(30);
  const [localScore, setLocalScore] = useState(0);
  const [remoteScore, setRemoteScore] = useState(0);
  const [winner, setWinner] = useState<"local" | "remote" | "tie" | null>(null);
  const [bestLocalScore, setBestLocalScore] = useState(0);
  const [bestRemoteScore, setBestRemoteScore] = useState(0);
  const [scoreAnimation, setScoreAnimation] = useState<{
    key: number;
    score: number;
    side: "local" | "remote";
  } | null>(null);

  // NEW: 승리 조건(총점 or 최고 점수)과 시도 횟수 상태를 추가합니다.
  const [scoringMode, setScoringMode] = useState<"total" | "best">("total");
  const [localDrawCount, setLocalDrawCount] = useState(0);
  const [remoteDrawCount, setRemoteDrawCount] = useState(0);

  // 계산된 진행률 (게임 타이머)
  const progressPercent = gameState === "playing" ? (gameTimer / 30) * 100 : 0;

  // URL 쿼리 파라미터에서 mode 읽기
  const searchParams = useSearchParams();
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "total" || modeParam === "best") {
      setScoringMode(modeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 한 번만 실행

  // Game flow effect
  useEffect(() => {
    if (isConnected) {
      setGameState("countdown");
      setShowDisconnectedMessage(false);
    } else {
      setGameState("waiting");
      setLocalScore(0);
      setRemoteScore(0);
      setWinner(null);
      setBestLocalScore(0);
      setBestRemoteScore(0);
    }
  }, [isConnected]);

  useEffect(() => {
    if (gameState === "countdown") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState("playing");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing") {
      const timer = setInterval(() => {
        setGameTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "finished") {
      const localMetric = scoringMode === "total" ? localScore : bestLocalScore;
      const remoteMetric = scoringMode === "total" ? remoteScore : bestRemoteScore;

      if (localMetric > remoteMetric) {
        setWinner("local");
      } else if (remoteMetric > localMetric) {
        setWinner("remote");
      } else {
        // 동점 시, 더 적은 시도 횟수로 승자를 결정합니다.
        if (localDrawCount < remoteDrawCount) {
          setWinner("local");
        } else if (remoteDrawCount < localDrawCount) {
          setWinner("remote");
        } else {
          setWinner("tie");
        }
      }
    }
  }, [
    gameState,
    scoringMode,
    localScore,
    remoteScore,
    bestLocalScore,
    bestRemoteScore,
    localDrawCount,
    remoteDrawCount,
  ]);

  // 1. Initialize PeerJS and act as host
  useEffect(() => {
    const initPeer = async () => {
      const { default: Peer } = await import("peerjs");
      // To prevent server-side execution
      if (typeof window === "undefined") return;

      const newPeer = new Peer();
      peerRef.current = newPeer;

      newPeer.on("open", (id) => {
        setMyId(id);
      });

      // We are the host, waiting for a guest to connect.
      newPeer.on("connection", (conn) => {
        connRef.current = conn;
        conn.on("open", () => {
          // Host waits for guest's SYN
        });
        conn.on("data", (data: unknown) => {
          if (typeof data === "object" && data && "type" in data && data.type === "handshake-syn") {
            // Handshake: Host receives SYN, sends ACK
            conn.send({ type: "handshake-ack" });
            setIsConnected(true);
            setShowDisconnectedMessage(false);
          } else if (
            typeof data === "object" &&
            data &&
            "type" in data &&
            data.type === "points" &&
            "points" in data
          ) {
            setRemotePoints(data.points as { x: number; y: number }[]);
          } else if (typeof data === "object" && data && "type" in data && data.type === "score") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const d = data as any;
            if ("totalScore" in d && "lastScore" in d && "bestScore" in d) {
              setRemoteScore(d.totalScore as number);
              setBestRemoteScore(d.bestScore as number);
              if ("drawCount" in d) {
                setRemoteDrawCount(d.drawCount as number);
              }
              setScoreAnimation({ key: Date.now(), score: d.lastScore as number, side: "remote" });
            }
          }
        });

        conn.on("close", () => {
          setIsConnected(false);
          setRemotePoints([]);
          setRemoteScore(0);
          setBestRemoteScore(0);
          setRemoteDrawCount(0);
          setShowDisconnectedMessage(true);
        });
      });

      newPeer.on("error", (err) => {
        console.error("PeerJS error:", err);
      });
    };

    initPeer();

    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  // 2. If we are a guest, connect to the host
  useEffect(() => {
    if (myId && gameId !== myId && peerRef.current) {
      // We are the guest, trying to connect to the host.
      const conn = peerRef.current.connect(gameId);
      connRef.current = conn;

      conn.on("open", () => {
        // Handshake: Guest sends SYN
        conn.send({ type: "handshake-syn" });
      });

      conn.on("data", (data: unknown) => {
        if (typeof data === "object" && data && "type" in data && data.type === "handshake-ack") {
          setIsConnected(true);
          setShowDisconnectedMessage(false);
        } else if (
          typeof data === "object" &&
          data &&
          "type" in data &&
          data.type === "points" &&
          "points" in data
        ) {
          setRemotePoints(data.points as { x: number; y: number }[]);
        } else if (typeof data === "object" && data && "type" in data && data.type === "score") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = data as any;
          if ("totalScore" in d && "lastScore" in d && "bestScore" in d) {
            setRemoteScore(d.totalScore as number);
            setBestRemoteScore(d.bestScore as number);
            if ("drawCount" in d) {
              setRemoteDrawCount(d.drawCount as number);
            }
            setScoreAnimation({ key: Date.now(), score: d.lastScore as number, side: "remote" });
          }
        }
      });

      conn.on("close", () => {
        setIsConnected(false);
        setRemotePoints([]);
        setRemoteScore(0);
        setBestRemoteScore(0);
        setRemoteDrawCount(0);
        setShowDisconnectedMessage(true);
      });
    }
  }, [myId, gameId]);

  // Draw on local canvas
  useEffect(() => {
    const canvas = localCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (context) {
      context.clearRect(0, 0, canvas!.width, canvas!.height);
      context.beginPath();
      context.strokeStyle = "black";
      context.lineWidth = 2;
      if (localPoints.length > 0) {
        context.moveTo(localPoints[0].x, localPoints[0].y);
        for (let i = 1; i < localPoints.length; i++) {
          context.lineTo(localPoints[i].x, localPoints[i].y);
        }
      }
      context.stroke();
    }
  }, [localPoints]);

  // Draw on remote canvas
  useEffect(() => {
    const canvas = remoteCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (context) {
      context.clearRect(0, 0, canvas!.width, canvas!.height);
      context.beginPath();
      context.strokeStyle = "red";
      context.lineWidth = 2;
      if (remotePoints.length > 0) {
        context.moveTo(remotePoints[0].x, remotePoints[0].y);
        for (let i = 1; i < remotePoints.length; i++) {
          context.lineTo(remotePoints[i].x, remotePoints[i].y);
        }
      }
      context.stroke();
    }
  }, [remotePoints]);

  const calculateScore = (pointsToCalculate: { x: number; y: number }[]) => {
    if (pointsToCalculate.length < 2) {
      return 0;
    }

    let sumX = 0;
    let sumY = 0;
    for (const p of pointsToCalculate) {
      sumX += p.x;
      sumY += p.y;
    }
    const centerX = sumX / pointsToCalculate.length;
    const centerY = sumY / pointsToCalculate.length;

    const distances = pointsToCalculate.map((p) =>
      Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
    );
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    if (avgRadius === 0) {
      return 0;
    }

    const variance =
      distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    const roundness = (1 - stdDev / avgRadius) * 100;

    const startPoint = pointsToCalculate[0];
    const endPoint = pointsToCalculate[pointsToCalculate.length - 1];
    const distance = Math.sqrt(
      Math.pow(startPoint.x - endPoint.x, 2) + Math.pow(startPoint.y - endPoint.y, 2)
    );
    const closeness_penalty = Math.max(0, 1 - distance / (avgRadius * 2));
    let finalScore = roundness * closeness_penalty;

    finalScore = Math.min(100, Math.max(0, finalScore));
    return Math.round(finalScore * 100) / 100;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    setIsDrawing(true);
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLocalPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || gameState !== "playing") return;
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPoints = [...localPoints, { x, y }];
    setLocalPoints(newPoints);
    if (connRef.current) {
      connRef.current.send({ type: "points", points: newPoints });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (localPoints.length > 10) {
      const currentScore = calculateScore(localPoints);
      const newTotalScore = localScore + currentScore;
      const newBestScore = Math.max(bestLocalScore, currentScore);
      const newDrawCount = localDrawCount + 1;

      setLocalScore(newTotalScore);
      setBestLocalScore(newBestScore);
      setLocalDrawCount(newDrawCount);
      if (currentScore > 0) {
        setScoreAnimation({ key: Date.now(), score: currentScore, side: "local" });
      }

      if (connRef.current) {
        connRef.current.send({
          type: "score",
          totalScore: newTotalScore,
          lastScore: currentScore,
          bestScore: newBestScore,
          drawCount: newDrawCount,
        });
      }
    }
  };

  const invitationLink = myId ? `${window.location.origin}/play/${myId}?mode=${scoringMode}` : "";

  const handleCopy = async () => {
    if (!invitationLink) return;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      toast.error("복사에 실패했습니다");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-background via-background/80 to-muted relative overflow-hidden">
      {/* Decorative blurred shapes */}
      <motion.div
        className="pointer-events-none absolute -z-10 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl"
        initial={{ opacity: 0.4, scale: 0.9, x: "-50%", y: "-30%" }}
        animate={{ opacity: 0.6, scale: 1.1, x: "-40%", y: "-35%" }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{ top: 0, left: "50%" }}
      />
      <motion.div
        className="pointer-events-none absolute -z-10 w-[500px] h-[500px] bg-indigo-400/15 dark:bg-indigo-600/15 rounded-full blur-3xl"
        initial={{ opacity: 0.3, scale: 0.8, x: "-50%", y: "60%" }}
        animate={{ opacity: 0.5, scale: 1.0, x: "-45%", y: "55%" }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{ bottom: 0, left: "50%" }}
      />
      <Button asChild className="mb-12 mr-auto">
        <Link href="/">← 뒤로 가기</Link>
      </Button>
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6 text-center">
        2인용 원 그리기 대결
      </h1>
      <div className="mb-6 w-full mx-auto text-center min-h-[120px] flex flex-col justify-center items-center">
        {gameState === "waiting" && myId && !isConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
            className="w-full max-w-md"
          >
            <Card className="w-full shadow-sm border border-primary/20">
              <CardHeader>
                <CardTitle>상대방 초대하기</CardTitle>
                <CardDescription>다른 사람을 초대하려면 아래 링크를 공유하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 items-center">
                  <Input value={invitationLink} readOnly className="flex-1" />
                  <Button type="button" onClick={handleCopy} disabled={copied}>
                    {copied ? "복사됨!" : "복사"}
                  </Button>
                </div>
                {gameState === "waiting" && !isConnected && (
                  <div className="mt-4 flex items-center gap-4">
                    <span className="font-medium">승리 조건:</span>
                    <select
                      value={scoringMode}
                      onChange={(e) => setScoringMode(e.target.value as "total" | "best")}
                      className="border rounded px-2 py-1 bg-background"
                      disabled={isConnected}
                    >
                      <option value="total">총점</option>
                      <option value="best">최고 점수</option>
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        {isConnected && gameState === "countdown" && (
          <AnimatePresence mode="wait">
            <motion.p
              key={countdown}
              className="text-primary font-extrabold text-7xl lg:text-8xl drop-shadow-sm"
              initial={{ scale: 0.4, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
            >
              {countdown}
            </motion.p>
          </AnimatePresence>
        )}
        {gameState === "playing" && (
          <>
            <p className="text-destructive font-extrabold text-5xl mb-2">
              남은 시간: {gameTimer}초
            </p>
            <div className="w-full max-w-3xl mb-4">
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </>
        )}
        {gameState === "finished" && winner && (
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">게임 종료!</p>
            {winner === "local" && (
              <p className="text-2xl mt-2 text-green-600">당신이 이겼습니다! 🏆</p>
            )}
            {winner === "remote" && (
              <p className="text-2xl mt-2 text-red-600">상대방이 이겼습니다.</p>
            )}
            {winner === "tie" && <p className="text-2xl mt-2 text-primary">무승부입니다!</p>}
          </div>
        )}

        {gameState === "waiting" && !isConnected && showDisconnectedMessage && (
          <p className="text-destructive font-bold mt-4">🔌 연결이 끊어졌습니다.</p>
        )}
        {gameState === "waiting" && !isConnected && !showDisconnectedMessage && !myId && (
          <p className="text-muted-foreground font-bold mt-4">🔗 Peer ID를 생성하는 중...</p>
        )}
        {gameState === "waiting" && !isConnected && !showDisconnectedMessage && myId && (
          <p className="text-muted-foreground font-bold mt-4">⏳ 상대방을 기다리는 중...</p>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
        <Card className="w-full shadow-sm border border-primary/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-primary">나</CardTitle>
            <CardDescription>
              총점: {Math.round(localScore)} | 최고 점수: {Math.round(bestLocalScore)}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative p-4">
            {scoreAnimation?.side === "local" && (
              <div
                key={scoreAnimation.key}
                className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl font-bold text-green-500 animate-score-up z-10"
              >
                +{Math.round(scoreAnimation.score)}
              </div>
            )}
            <div className="w-full aspect-square max-w-[400px] mx-auto">
              <canvas
                ref={localCanvasRef}
                width="400"
                height="400"
                className={`border border-gray-300 rounded-lg bg-card ${
                  gameState === "playing" ? "cursor-crosshair" : "cursor-not-allowed"
                } w-full h-full`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="w-full shadow-sm border border-primary/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-primary">상대방</CardTitle>
            <CardDescription>
              총점: {Math.round(remoteScore)} | 최고 점수: {Math.round(bestRemoteScore)}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative p-4">
            {scoreAnimation?.side === "remote" && (
              <div
                key={scoreAnimation.key}
                className="absolute top-0 left-1/2 -translate-x-1/2 text-3xl font-bold text-primary animate-score-up z-10"
              >
                +{Math.round(scoreAnimation.score)}
              </div>
            )}
            <div className="w-full aspect-square max-w-[400px] mx-auto">
              <canvas
                ref={remoteCanvasRef}
                width="400"
                height="400"
                className="border border-gray-300 rounded-lg bg-card w-full h-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PlayGame;
