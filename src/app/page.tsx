import CircleDrawer from '@/components/CircleDrawer';
import RankingBoard from '@/components/RankingBoard';

export default function Home() {
  return (
    <main className="flex min-h-screen items-start justify-center p-10 bg-gray-50">
      <div className="flex w-full max-w-7xl gap-10">
        <div className="w-2/3">
          <CircleDrawer />
        </div>
        <div className="w-1/3">
          <RankingBoard />
        </div>
      </div>
    </main>
  );
}
