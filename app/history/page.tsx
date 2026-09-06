import { Metadata } from 'next';
import { getCategorizedPrices, getAllPublishedDates } from '@/lib/data';
import { formatDateShort } from '@/lib/price-formatter';
import { HistoryView } from '@/components/HistoryView';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: { date?: string; product?: string; from?: string; to?: string };
}): Promise<Metadata> {
  const date = searchParams?.date || '2026-08-14';
  return {
    title: `Historical Wholesale Rates (${formatDateShort(date)}) - DailyGurus Price List`,
    description: `Browse past wholesale vegetable and fruit mandi prices from Koyambedu Market Chennai for ${formatDateShort(date)}. Track price fluctuations and historical market archives.`,
  };
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: { date?: string; product?: string; from?: string; to?: string };
}) {
  const requestedDate = searchParams?.date;
  const publishedDates = await getAllPublishedDates();
  const pricePayload = await getCategorizedPrices(requestedDate);

  return (
    <HistoryView
      initialData={pricePayload.data}
      selectedDate={pricePayload.date}
      latestDate={pricePayload.latestDate}
      dateInfo={pricePayload.dateInfo}
      stats={pricePayload.stats}
      publishedDates={publishedDates}
      initialProductId={searchParams?.product}
      initialFrom={searchParams?.from}
      initialTo={searchParams?.to}
    />
  );
}
