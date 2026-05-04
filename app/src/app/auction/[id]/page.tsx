import { AuctionDetailClient } from '@/components/auction/AuctionDetailClient';

export const dynamic = 'force-dynamic';

export default function AuctionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const isRealPubkey = params.id.length >= 32;
  return <AuctionDetailClient auctionId={params.id} isRealPubkey={isRealPubkey} />;
}
