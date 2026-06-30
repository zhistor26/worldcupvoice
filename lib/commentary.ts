import type { CommentaryMatch, MatchContext } from '@/types/conversation';
import worldcupDemo2026 from '@/data/matches/worldcup-demo-2026.json';

// ─── Match context ────────────────────────────────────────────────────────────
// Each match is one JSON file in `data/matches/`. Metadata is sent to the AI as
// a prompt (not shown verbatim to viewers). The booth uses COMMENTARY_MATCHES[0].
//
// Default: generic 2026 demo aligned with `samples/worldcupvoice-demo-kick.mp4`.
// For a real match clip, copy `data/matches/_template.json`, fill it in, import
// here, and list YOUR match first. See `data/matches/README.md`.
export const COMMENTARY_MATCHES: CommentaryMatch[] = [
  worldcupDemo2026 as unknown as CommentaryMatch,
];

export function toMatchContext(match: CommentaryMatch): MatchContext {
  return {
    sport: match.sport,
    title: match.title,
    competition: match.competition,
    venue: match.venue,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    gameDate: match.gameDate,
    localTipTime: match.localTipTime,
    finalScore: match.finalScore,
    homeTeamAbbr: match.homeTeamAbbr,
    awayTeamAbbr: match.awayTeamAbbr,
    homeJerseyColor: match.homeJerseyColor,
    awayJerseyColor: match.awayJerseyColor,
    homeRoster: match.homeRoster,
    awayRoster: match.awayRoster,
    playerIdentificationNotes: match.playerIdentificationNotes,
    broadcastNotes: match.broadcastNotes,
    storyline: match.storyline,
  };
}
