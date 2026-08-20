export function calculateMatchPoints(prediction, actual) {
  if (!actual || !actual.is_finished) return 0;

  let points = 0;

  // Exact Scoreline = 5 Points
  const isExactScore = 
    prediction.pred_home_goals === actual.actual_home_goals &&
    prediction.pred_away_goals === actual.actual_away_goals;

  if (isExactScore) {
    points += 5;
  } else {
    // Correct Outcome (Win/Loss/Draw) = 3 Points
    const predResult = Math.sign(prediction.pred_home_goals - prediction.pred_away_goals);
    const actualResult = Math.sign(actual.actual_home_goals - actual.actual_away_goals);

    if (predResult === actualResult) {
      points += 3;
    }
  }

  // Man of the Match = 2 Points
  if (
    prediction.pred_motm && 
    actual.actual_motm &&
    prediction.pred_motm.trim().toLowerCase() === actual.actual_motm.trim().toLowerCase()
  ) {
    points += 2;
  }

  return points;
}