import { NextRequest, NextResponse } from 'next/server';
import { getCategorizedPrices, getAllPublishedDates } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get('date') || undefined;

    const payload = await getCategorizedPrices(requestedDate);
    const availableDates = await getAllPublishedDates();

    return NextResponse.json({
      success: true,
      date: payload.date,
      priceDateInfo: payload.dateInfo,
      data: payload.data,
      stats: payload.stats,
      availableDates,
    });
  } catch (error: any) {
    console.error('Error fetching prices from static data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
