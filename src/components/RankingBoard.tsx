"use client";

import useSWR from "swr";

interface Ranking {
  id: number;
  created_at: string;
  score: number;
  message: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getMedal = (index: number) => {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return index + 1;
};

const RankingBoard = () => {
  const { data: rankings, error } = useSWR<Ranking[]>("/api/rankings", fetcher, {
    refreshInterval: 600_000, // 10분 간격으로 갱신
    revalidateOnFocus: false,
  });

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md w-full">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-primary">
        명예의 전당 🏆
      </h2>
      {error && <div className="text-red-500">랭킹을 불러오는 데 실패했습니다.</div>}
      {!rankings && <div className="text-gray-500 text-center">랭킹을 불러오는 중...</div>}
      {rankings && rankings.length === 0 && (
        <div className="text-gray-500 text-center">아직 랭킹이 없습니다.</div>
      )}
      <ul className="space-y-3">
        {rankings?.map((rank: Ranking, index: number) => (
          <li
            key={rank.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg sm:text-xl font-bold w-8 text-center">
                {getMedal(index)}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-base sm:text-lg">
                  {rank.message || "익명의 도전자"}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {new Date(rank.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary">
              {rank.score.toFixed(2)}점
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RankingBoard;
