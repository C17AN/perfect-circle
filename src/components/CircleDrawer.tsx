'use client';

import { useState, useRef, useEffect } from 'react';
import { useSWRConfig } from 'swr';

const CircleDrawer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedToday, setSubmittedToday] = useState(false);
  const [showRankForm, setShowRankForm] = useState(false);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    let id = localStorage.getItem('perfect-circle-userId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('perfect-circle-userId', id);
    }
    setUserId(id);

    const lastSubmission = localStorage.getItem('perfect-circle-lastSubmission');
    if (lastSubmission) {
      const today = new Date().toISOString().slice(0, 10);
      if (lastSubmission === today) {
        setSubmittedToday(true);
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.strokeStyle = 'black';
    context.lineWidth = 2;

    if (points.length > 0) {
      context.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
      }
    }
    context.stroke();
  }, [points]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints([{ x, y }]);
    setScore(null);
    setShowRankForm(false);
    setMessage('');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((prevPoints) => [...prevPoints, { x, y }]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (points.length > 10) {
      calculateScore();
    }
  };

  const calculateScore = () => {
    if (points.length < 2) {
      setScore(0);
      return;
    }

    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    const distances = points.map((p) =>
      Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
    );
    const avgRadius =
      distances.reduce((sum, d) => sum + d, 0) / distances.length;

    if (avgRadius === 0) {
      setScore(0);
      return;
    }

    const variance =
      distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) /
      distances.length;
    const stdDev = Math.sqrt(variance);
    const roundness = (1 - stdDev / avgRadius) * 100;

    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const distance = Math.sqrt(
      Math.pow(startPoint.x - endPoint.x, 2) +
        Math.pow(startPoint.y - endPoint.y, 2)
    );
    const closeness_penalty = Math.max(0, 1 - distance / (avgRadius * 2));
    let finalScore = roundness * closeness_penalty;

    finalScore = Math.min(100, Math.max(0, finalScore));
    setScore(Math.round(finalScore * 100) / 100);
  };

  const handleRegisterRank = async () => {
    if (!score || !userId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, message, userId }),
      });

      if (res.ok) {
        alert('랭킹이 등록되었습니다!');
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem('perfect-circle-lastSubmission', today);
        setSubmittedToday(true);
        setShowRankForm(false);
        mutate('/api/rankings'); // 랭킹 보드 데이터 갱신
      } else {
        const errorData = await res.json();
        alert(`등록 실패: ${errorData.error}`);
      }
    } catch (error) {
      alert('등록 중 오류가 발생했습니다.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 bg-white border border-gray-200 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold">가장 완벽한 원을 그려보세요!</h1>
      <canvas
        ref={canvasRef}
        width="500"
        height="500"
        className="border border-gray-400 rounded-lg cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => {
            setPoints([]);
            setScore(null);
            setShowRankForm(false);
            setMessage('');
          }}
          className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
        >
          다시 그리기
        </button>
        {score !== null && !submittedToday && !showRankForm && (
          <button
            onClick={() => setShowRankForm(true)}
            className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700"
          >
            랭킹 등록하기
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center h-28 w-full">
        {score !== null && !showRankForm && (
          <div className="p-4 text-xl font-bold bg-gray-100 rounded-lg animate-pulse">
            당신의 점수: <span className="text-blue-600">{score}</span> 점!
          </div>
        )}
        {showRankForm && (
          <div className="flex flex-col gap-2 w-full max-w-sm">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="메시지를 남겨주세요 (선택, 최대 100자)"
              className="p-2 border rounded-lg"
              maxLength={100}
            />
            <button
              onClick={handleRegisterRank}
              disabled={isSubmitting}
              className="px-4 py-2 font-bold text-white bg-green-500 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSubmitting ? '등록 중...' : '등록 완료'}
            </button>
          </div>
        )}
        {submittedToday && score !== null && (
          <p className="text-green-600 mt-4 text-center">
            오늘은 이미 랭킹을 등록했습니다. 내일 다시 도전해주세요!
          </p>
        )}
      </div>
    </div>
  );
};

export default CircleDrawer; 