'use client';

import { useEffect, useRef, useState } from 'react';
import type { Peer, DataConnection } from 'peerjs';

const PlayPage = ({ params }: { params: { gameId: string } }) => {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState('');
  const connRef = useRef<DataConnection | null>(null);

  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement>(null);

  const [localPoints, setLocalPoints] = useState<{ x: number; y: number }[]>([]);
  const [remotePoints, setRemotePoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize PeerJS
  useEffect(() => {
    import('peerjs').then(({ default: Peer }) => {
      const newPeer = new Peer();
      setPeer(newPeer);

      newPeer.on('open', (id) => {
        setMyId(id);
        if (params.gameId !== id) {
          const conn = newPeer.connect(params.gameId);
          connRef.current = conn;
          conn.on('open', () => {
             setIsConnected(true);
          });
          conn.on('data', (data: unknown) => {
            if (typeof data === 'object' && data && 'type' in data && data.type === 'points' && 'points' in data) {
              setRemotePoints(data.points as { x: number; y: number }[]);
            }
          });
        }
      });

      newPeer.on('connection', (conn) => {
        connRef.current = conn;
        conn.on('open', () => {
            setIsConnected(true);
        });
        conn.on('data', (data: unknown) => {
          if (typeof data === 'object' && data && 'type' in data && data.type === 'points' && 'points' in data) {
            setRemotePoints(data.points as { x: number; y: number }[]);
          }
        });
      });
    });

    return () => {
      peer?.destroy();
    };
  }, [params.gameId]);

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


  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLocalPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPoints = [...localPoints, { x, y }];
    setLocalPoints(newPoints);
    if (connRef.current) {
        connRef.current.send({type: 'points', points: newPoints});
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const invitationLink = myId ? `${window.location.origin}/play/${myId}` : '';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">2인용 원 그리기</h1>
      <div className='mb-4 text-center'>
        {myId && !isConnected && (
            <div className='p-4 bg-yellow-100 border border-yellow-300 rounded-lg'>
                <p className='mb-2'>다른 사람을 초대하려면 아래 링크를 공유하세요:</p>
                <input type="text" value={invitationLink} readOnly className="w-full p-2 text-center bg-white border rounded" />
            </div>
        )}
        {isConnected ? <p className='text-green-600 font-bold mt-4'>✅ 상대방과 연결되었습니다!</p> : <p className='text-orange-500 font-bold mt-4'>⏳ 상대방을 기다리는 중...</p>}
      </div>
      <div className="flex gap-8">
        <div className="flex flex-col items-center">
          <h2 className="text-xl mb-2">나</h2>
          <canvas
            ref={localCanvasRef}
            width="400"
            height="400"
            className="border border-gray-400 rounded-lg bg-white cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-xl mb-2">상대방</h2>
          <canvas
            ref={remoteCanvasRef}
            width="400"
            height="400"
            className="border border-gray-400 rounded-lg bg-white"
          />
        </div>
      </div>
    </main>
  );
};

export default PlayPage; 