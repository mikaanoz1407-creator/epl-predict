import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!res.ok) throw new Error('Failed to fetch FPL data');

    const data = await res.json();

    // Map team names to player lists and logo URLs
    const teams = {};
    const teamLogos = {};

    data.teams.forEach((team) => {
      teams[team.id] = team.name;
      // Official Premier League CDN badge URL format (using team code)
      teamLogos[team.name] = `https://resources.premierleague.com/premierleague/badges/70/t${team.code}.png`;
    });

    const playersByTeam = {};
    data.elements.forEach((player) => {
      const teamName = teams[player.team];
      const fullName = `${player.first_name} ${player.second_name}`;
      if (!playersByTeam[teamName]) playersByTeam[teamName] = [];
      playersByTeam[teamName].push(fullName);
    });

    return NextResponse.json({
      players: playersByTeam,
      logos: teamLogos
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}