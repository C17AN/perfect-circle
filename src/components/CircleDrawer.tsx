'use client';

import { useState, useRef, useEffect } from 'react';

const CircleDrawer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints([{ x, y }]);
    setScore(null);
    clearCanvas();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPoints((prevPoints) => [...prevPoints, { x, y }]);
    draw();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (points.length > 10) { // Only score if there are enough points
      calculateScore();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    clearCanvas();

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
  };

  const calculateScore = () => {
    if (points.length < 2) {
      setScore(0);
      return;
    }

    // 1. Find the geometric center (centroid) of the points
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    // 2. Calculate the average distance (radius) from the center to each point
    const distances = points.map(p => Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)));
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;

    if (avgRadius === 0) {
      setScore(0);
      return;
    }

    // 3. Calculate the standard deviation of the distances
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    
    // 4. Normalize the score. This is a simple heuristic.
    // A lower std dev means a more perfect circle.
    // We can map the std dev to a 0-100 score.
    // Let's say a "perfect" drawing might have a std dev of ~1-2 pixels
    // and a bad one might have > 20.
    // We can use a formula like: score = 100 * (1 - (stdDev / avgRadius))
    // This score represents the roundness as a percentage.
    const roundness = (1 - (stdDev / avgRadius)) * 100;

    // Let's refine the score. A simple line will have a very high roundness score.
    // We need to check if it's a closed shape.
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const distance = Math.sqrt(Math.pow(startPoint.x - endPoint.x, 2) + Math.pow(startPoint.y - endPoint.y, 2));
    
    // The "closness" penalty. If the shape is not closed, penalize score.
    // Max distance can be diameter, so avgRadius * 2.
    const closeness_penalty = Math.max(0, 1 - (distance / (avgRadius*2)));

    let finalScore = roundness * closeness_penalty;

    // Cap score at 100 and floor it.
    finalScore = Math.min(100, Math.max(0, finalScore));
    setScore(Math.floor(finalScore));
  };
  
  useEffect(() => {
    draw();
  }, [points]);


  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">가장 완벽한 원을 그려보세요!</h1>
      <canvas
        ref={canvasRef}
        width="500"
        height="500"
        className="border border-gray-400 rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves canvas
      />
      <button 
        onClick={() => {
          setPoints([]);
          setScore(null);
          clearCanvas();
        }}
        className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
      >
        다시 그리기
      </button>
      {score !== null && (
        <div className="p-4 mt-4 text-xl font-bold bg-gray-100 rounded-lg">
          당신의 점수: <span className="text-blue-600">{score}</span> 점!
        </div>
      )}
    </div>
  );
};

export default CircleDrawer; 