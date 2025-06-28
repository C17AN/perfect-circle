'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

const CreateGamePage = () => {
  const router = useRouter();

  useEffect(() => {
    // Generate a unique ID for the new game room
    const newGameId = uuidv4();
    // Mark this client as the host for this game room in sessionStorage
    sessionStorage.setItem('hostForGame', newGameId);
    // Redirect the user to the game room with the new ID
    router.replace(`/play/${newGameId}`);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl">새로운 게임을 생성 중입니다...</p>
    </div>
  );
};

export default CreateGamePage; 