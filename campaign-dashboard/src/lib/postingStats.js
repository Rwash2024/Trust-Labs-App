// Aggregates when competitors post (Cairo time), from the sampled posts stored on each competitor.
export function summarizePosting(competitors) {
  const hourCounts = {}
  const dayCounts = {}
  let totalPosts = 0
  for (const c of competitors) {
    const p = c.posting
    if (!p) continue
    for (const h of p.topHours || []) {
      hourCounts[h.hour] = (hourCounts[h.hour] || 0) + h.count
      totalPosts += h.count
    }
    for (const d of p.topDays || []) dayCounts[d.day] = (dayCounts[d.day] || 0) + d.count
  }
  const evening = Object.entries(hourCounts).filter(([h]) => Number(h) >= 19).reduce((a, [, n]) => a + n, 0)
  return {
    hourCounts,
    totalPosts,
    eveningShare: totalPosts ? evening / totalPosts : 0,
    busiestHours: Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => Number(h)),
    busiestDays: Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([day, count]) => ({ day, count })),
  }
}
