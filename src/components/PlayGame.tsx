'use client';

import { useEffect, useRef, useState } from 'react';
import type { Peer, DataConnection } from 'peerjs';
import Link from 'next/link';

interface PlayGameProps {
  gameId: string;
}

const PlayGame = ({ gameId }: PlayGameProps) => {
  const peerRef = useRef<Peer | null>(null);
  const [myId, setMyId] = useState('');
  const connRef = useRef<DataConnection | null>(null);

  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);

  const [localPoints, setLocalPoints] = useState<{ x: number; y: number }[]>([]);
  const [remotePoints, setRemotePoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showDisconnectedMessage, setShowDisconnectedMessage] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'finished'>('waiting');
  const [countdown, setCountdown] = useState(5);
  const [gameTimer, setGameTimer] = useState(30);
  const [localScore, setLocalScore] = useState(0);
  const [remoteScore, setRemoteScore] = useState(0);
  const [winner, setWinner] = useState<'local' | 'remote' | 'tie' | null>(null);
  const [bestLocalScore, setBestLocalScore] = useState(0);
  const [bestRemoteScore, setBestRemoteScore] = useState(0);
  const [scoreAnimation, setScoreAnimation] = useState<{ key: number, score: number, side: 'local' | 'remote' } | null>(null);

  // Game flow effect
  useEffect(() => {
    if (isConnected) {
      setGameState('countdown');
      setShowDisconnectedMessage(false);
    } else {
      setGameState('waiting');
      setLocalScore(0);
      setRemoteScore(0);
      setWinner(null);
      setBestLocalScore(0);
      setBestRemoteScore(0);
    }
  }, [isConnected]);

  useEffect(() => {
    if (gameState === 'countdown') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('playing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setGameTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'finished') {
      if (localScore > remoteScore) {
        setWinner('local');
      } else if (remoteScore > localScore) {
        setWinner('remote');
      } else {
        setWinner('tie');
      }
    }
  }, [gameState, localScore, remoteScore]);

  // 1. Initialize PeerJS and act as host
  useEffect(() => {
    const initPeer = async () => {
      const { default: Peer } = await import('peerjs');
      // To prevent server-side execution
      if (typeof window === 'undefined') return;

      const newPeer = new Peer();
      peerRef.current = newPeer;

      newPeer.on('open', (id) => {
        setMyId(id);
      });

      // We are the host, waiting for a guest to connect.
      newPeer.on('connection', (conn) => {
        connRef.current = conn;
        conn.on('open', () => {
          // Host waits for guest's SYN
        });
        conn.on('data', (data: unknown) => {
          if (
            typeof data === 'object' &&
            data &&
            'type' in data &&
            data.type === 'handshake-syn'
          ) {
            // Handshake: Host receives SYN, sends ACK
            conn.send({ type: 'handshake-ack' });
            setIsConnected(true);
            setShowDisconnectedMessage(false);
          } else if (
            typeof data === 'object' &&
            data &&
            'type' in data &&
            data.type === 'points' &&
            'points' in data
          ) {
            setRemotePoints(data.points as { x: number; y: number }[]);
          } else if (
            typeof data === 'object' &&
            data &&
            'type' in data &&
            data.type === 'score' &&
            'totalScore' in data &&
            'lastScore' in data &&
            'bestScore' in data
          ) {
            setRemoteScore(data.totalScore as number);
            setBestRemoteScore(data.bestScore as number);
            setScoreAnimation({ key: Date.now(), score: data.lastScore as number, side: 'remote' });
          }
        });

        conn.on('close', () => {
          setIsConnected(false);
          setRemotePoints([]);
          setShowDisconnectedMessage(true);
        });
      });

      newPeer.on('error', (err) => {
        console.error('PeerJS error:', err);
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

      conn.on('open', () => {
        // Handshake: Guest sends SYN
        conn.send({ type: 'handshake-syn' });
      });

      conn.on('data', (data: unknown) => {
        if (
          typeof data === 'object' &&
          data &&
          'type' in data &&
          data.type === 'handshake-ack'
        ) {
          setIsConnected(true);
          setShowDisconnectedMessage(false);
        } else if (
          typeof data === 'object' &&
          data &&
          'type' in data &&
          data.type === 'points' &&
          'points' in data
        ) {
          setRemotePoints(data.points as { x: number; y: number }[]);
        } else if (
          typeof data === 'object' &&
          data &&
          'type' in data &&
          data.type === 'score' &&
          'totalScore' in data &&
          'lastScore' in data &&
          'bestScore' in data
        ) {
          setRemoteScore(data.totalScore as number);
          setBestRemoteScore(data.bestScore as number);
          setScoreAnimation({ key: Date.now(), score: data.lastScore as number, side: 'remote' });
        }
      });

      conn.on('close', () => {
        setIsConnected(false);
        setRemotePoints([]);
        setShowDisconnectedMessage(true);
      });
    }
  }, [myId, gameId]);

  // Draw on local canvas
  useEffect(() => {
    const canvas = localCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas!.width, canvas!.height);
      context.beginPath();
      context.strokeStyle = 'black';
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
    const context = canvas?.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas!.width, canvas!.height);
      context.beginPath();
      context.strokeStyle = 'red';
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
    const avgRadius =
      distances.reduce((sum, d) => sum + d, 0) / distances.length;

    if (avgRadius === 0) {
      return 0;
    }

    const variance =
      distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) /
      distances.length;
    const stdDev = Math.sqrt(variance);
    const roundness = (1 - stdDev / avgRadius) * 100;

    const startPoint = pointsToCalculate[0];
    const endPoint = pointsToCalculate[pointsToCalculate.length - 1];
    const distance = Math.sqrt(
      Math.pow(startPoint.x - endPoint.x, 2) +
        Math.pow(startPoint.y - endPoint.y, 2)
    );
    const closeness_penalty = Math.max(0, 1 - distance / (avgRadius * 2));
    let finalScore = roundness * closeness_penalty;

    finalScore = Math.min(100, Math.max(0, finalScore));
    return Math.round(finalScore * 100) / 100;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    setIsDrawing(true);
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLocalPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || gameState !== 'playing') return;
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPoints = [...localPoints, { x, y }];
    setLocalPoints(newPoints);
    if (connRef.current) {
      connRef.current.send({ type: 'points', points: newPoints });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (localPoints.length > 10) {
      const currentScore = calculateScore(localPoints);
      const newTotalScore = localScore + currentScore;
      const newBestScore = Math.max(bestLocalScore, currentScore);

      setLocalScore(newTotalScore);
      setBestLocalScore(newBestScore);
      if (currentScore > 0) {
        setScoreAnimation({ key: Date.now(), score: currentScore, side: 'local' });
      }

      if (connRef.current) {
        connRef.current.send({
          type: 'score',
          totalScore: newTotalScore,
          lastScore: currentScore,
          bestScore: newBestScore,
        });
      }
    }
  };

  const invitationLink = myId ? `${window.location.origin}/play/${myId}` : '';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-10 bg-gray-100 relative">
       <Link href="/" className="absolute top-4 left-4 sm:top-8 sm:left-8 px-4 py-2 font-bold text-white bg-gray-500 rounded hover:bg-gray-700">
        ← 뒤로 가기
      </Link>
      <h1 className="text-3xl font-bold mb-4 text-center">2인용 원 그리기 대결</h1>
      <div className="mb-4 text-center h-24">
        {gameState === 'waiting' && myId && !isConnected && (
          <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="mb-2">다른 사람을 초대하려면 아래 링크를 공유하세요:</p>
            <input
              type="text"
              value={invitationLink}
              readOnly
              className="w-full p-2 text-center bg-white border rounded"
            />
          </div>
        )}
        {isConnected && gameState === 'countdown' && (
          <p className="text-blue-600 font-bold text-5xl animate-ping">
            {countdown}
          </p>
        )}
        {gameState === 'playing' && (
          <p className="text-red-600 font-bold text-4xl">
            남은 시간: {gameTimer}초
          </p>
        )}
        {gameState === 'finished' && winner && (
           <div className="text-center">
            <p className="text-4xl font-bold text-purple-700">게임 종료!</p>
            {winner === 'local' && <p className="text-2xl text-green-600">당신이 이겼습니다! 🏆</p>}
            {winner === 'remote' && <p className="text-2xl text-red-600">상대방이 이겼습니다.</p>}
            {winner === 'tie' && <p className="text-2xl text-blue-600">무승부입니다!</p>}
          </div>
        )}

        {gameState === 'waiting' && !isConnected && showDisconnectedMessage && (
          <p className="text-red-500 font-bold mt-4">
            🔌 연결이 끊어졌습니다.
          </p>
        )}
         {gameState === 'waiting' && !isConnected && !showDisconnectedMessage && (
          <p className="text-orange-500 font-bold mt-4">
            ⏳ 상대방을 기다리는 중...
          </p>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        <div className="flex flex-col items-center relative w-full">
          <div className="text-center h-16">
            <h2 className="text-xl mb-1">나</h2>
            <p className="text-lg">총점: {Math.round(localScore)}</p>
            <p className="text-sm text-gray-600">최고 점수: {Math.round(bestLocalScore)}</p>
          </div>
           {scoreAnimation?.side === 'local' && (
            <div key={scoreAnimation.key} className="absolute top-0 text-2xl font-bold text-green-500 animate-score-up z-10">
              +{Math.round(scoreAnimation.score)}
            </div>
          )}
          <div className="w-full aspect-square max-w-[400px]">
            <canvas
              ref={localCanvasRef}
              width="400"
              height="400"
              className={`border border-gray-400 rounded-lg bg-white ${gameState === 'playing' ? 'cursor-crosshair' : 'cursor-not-allowed'} w-full h-full`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
        <div className="flex flex-col items-center relative w-full">
          <div className="text-center h-16">
            <h2 className="text-xl mb-1">상대방</h2>
            <p className="text-lg">총점: {Math.round(remoteScore)}</p>
            <p className="text-sm text-gray-600">최고 점수: {Math.round(bestRemoteScore)}</p>
          </div>
          {scoreAnimation?.side === 'remote' && (
            <div key={scoreAnimation.key} className="absolute top-0 text-2xl font-bold text-purple-500 animate-score-up z-10">
              +{Math.round(scoreAnimation.score)}
            </div>
          )}
           <div className="w-full aspect-square max-w-[400px]">
            <canvas
              ref={remoteCanvasRef}
              width="400"
              height="400"
              className="border border-gray-400 rounded-lg bg-white w-full h-full"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default PlayGame; 