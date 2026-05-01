import { AuctionDetailClient } from '@/components/auction/AuctionDetailClient';

// Dynamic route — works with both mock IDs and real Solana pubkeys.
export const dynamic = 'force-dynamic';

export default function AuctionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const isRealPubkey = params.id.length >= 32 && !params.id.startsWith('auc_');
  return <AuctionDetailClient auctionId={params.id} isRealPubkey={isRealPubkey} />;
}
