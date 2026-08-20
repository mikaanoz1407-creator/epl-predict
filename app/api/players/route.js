import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch official Premier League bootstrap data
    const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!res.ok) throw new Error('Failed to fetch from Premier League API');

    const data = await res.json();

    // Map team IDs to team names
    const teams = {};
    data.teams.forEach((team) => {
      teams[team.id] = team.name;
    });

    // Group players by team name
    const playersByTeam = {};
    data.elements.forEach((player) => {
      const teamName = teams[player.team];
      const fullName = `${player.first_name} ${player.second_name}`;
      
      if (!playersByTeam[teamName]) {
        playersByTeam[teamName] = [];
      }
      playersByTeam[teamName].push(fullName);
    });

    return NextResponse.json(playersByTeam);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}