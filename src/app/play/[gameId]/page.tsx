import PlayGame from '@/components/PlayGame';

interface PlayPageProps {
  params: Promise<{ gameId: string }>;
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { gameId } = await params;

  return <PlayGame gameId={gameId} />;
}
