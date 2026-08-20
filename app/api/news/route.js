import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.NEWS_API_KEY;

  // If no API key is set, return default news items
  if (!apiKey) {
    return NextResponse.json([
      {
        id: 1,
        title: "Premier League Title Race Heats Up Ahead of Weekend Fixtures",
        source: "BBC Sport",
        url: "https://www.bbc.com/sport/football",
        image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
        time: "1 hour ago"
      },
      {
        id: 2,
        title: "Manager Press Conferences: Key Tactical Insights & Lineup Hints",
        source: "Sky Sports",
        url: "https://www.skysports.com/football",
        image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
        time: "3 hours ago"
      },
      {
        id: 3,
        title: "Scouting Report: Top Performing Midfielders in Recent Gameweeks",
        source: "Premier League Official",
        url: "https://www.premierleague.com",
        image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
        time: "6 hours ago"
      }
    ]);
  }

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=Premier+League&sortBy=publishedAt&pageSize=3&apiKey=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );
    const data = await res.json();

    const formattedArticles = (data.articles || []).map((art, index) => ({
      id: index,
      title: art.title,
      source: art.source?.name || 'Football News',
      url: art.url,
      image: art.urlToImage || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      time: new Date(art.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return NextResponse.json(formattedArticles);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}