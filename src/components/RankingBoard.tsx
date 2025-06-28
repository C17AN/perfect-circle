'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Ranking {
  id: number;
  created_at: string;
  score: number;
  message: string;
}

const RankingBoard = () => {
  const { data, error, isLoading } = useSWR<Ranking[]>('/api/rankings', fetcher, {
    refreshInterval: 5000,
  });

  return (
    <div className="flex flex-col gap-3 p-3 border border-gray-300 rounded-lg h-[624px] bg-white shadow-sm">
      <h2 className="text-xl font-bold text-center">🏆 랭킹 보드 🏆</h2>
      <div className="overflow-y-auto">
        {error && <div>랭킹을 불러오는데 실패했습니다.</div>}
        {isLoading && <div className="text-center">로딩 중...</div>}
        {data && (
          <ul className="flex flex-col gap-2">
            {data?.map((ranking, index) => (
              <li key={ranking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-center w-7">{index + 1}</span>
                  <div>
                    <p className="font-semibold text-blue-600">{ranking.score.toFixed(2)}점</p>
                    <p className="text-sm text-gray-600">{ranking.message || '남겨진 메시지가 없습니다.'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(ranking.created_at).toLocaleDateString('ko-KR')}
                </span>
              </li>
            ))}
          </ul>
        )}
         {data && data.length === 0 && <div className="text-center text-gray-500">아직 등록된 랭킹이 없습니다.</div>}
      </div>
    </div>
  );
};

export default RankingBoard; 