'use client';

import CircleDrawer from '@/components/CircleDrawer';
import RankingBoard from '@/components/RankingBoard';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const startMultiplayerGame = async () => {
    const { default: Peer } = await import('peerjs');
    const peer = new Peer();
    peer.on('open', (id) => {
      router.push(`/play/${id}`);
    });
    peer.on('error', (err) => {
        alert('연결 서비스를 초기화하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        console.error(err);
    })
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
