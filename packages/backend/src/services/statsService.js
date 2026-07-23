/**
 * Given a set of 'YYYY-MM-DD' activity dates, returns the current streak
 * length in days, counting back from today (or yesterday, if today has no
 * activity yet — the streak isn't broken until the day is over).
 */
export function computeStreakDays(activityDates) {
  const dateSet = new Set(activityDates);

  const toKey = (date) => date.toISOString().slice(0, 10);

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  if (!dateSet.has(toKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!dateSet.has(toKey(cursor))) return 0;
  }

  let streak = 0;
  while (dateSet.has(toKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
