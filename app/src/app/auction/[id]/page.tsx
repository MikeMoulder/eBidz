import dynamicImport from 'next/dynamic';

const AuctionDetailClient = dynamicImport(
  () => import('@/components/auction/AuctionDetailClient').then((m) => m.AuctionDetailClient),
  { ssr: false },
);

export const dynamic = 'force-dynamic';

export default function AuctionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const isRealPubkey = params.id.length >= 32;
  return <AuctionDetailClient auctionId={params.id} isRealPubkey={isRealPubkey} />;
}
