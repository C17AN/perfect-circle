'use client';

import CircleDrawer from '@/components/CircleDrawer';
import RankingBoard from '@/components/RankingBoard';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Peer } from 'peerjs';

export default function Home() {
  const router = useRouter();
  const [peer, setPeer] = useState<Peer | null>(null);
  
  useEffect(() => {
    import('peerjs').then(({ default: Peer }) => {
      const newPeer = new Peer();
      setPeer(newPeer);
    });

    return () => {
      peer?.destroy();
    }
  }, []);

  const startMultiplayerGame = () => {
    if(peer) {
        router.push(`/play/${peer.id}`);
    } else {
        alert('연결 서비스를 초기화하는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <main className="flex min-h-screen items-start justify-center p-10 bg-gray-50">
      <div className="flex w-full max-w-7xl gap-10">
        <div className="w-2/3">
          <CircleDrawer />
        </div>
        <div className="flex flex-col gap-4 w-1/3">
          <button
            onClick={startMultiplayerGame}
            className="w-full px-4 py-3 font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-800 transition-colors"
          >
            2인용 게임 시작하기
          </button>
          <RankingBoard />
        </div>
      </div>
    </main>
  );
}
