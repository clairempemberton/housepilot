import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${userId} LIMIT 1`;
    if (!households.length) return Response.json({ progress: null });

    const householdId = households[0].id;
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "week";

    let startDate;
    const now = new Date();
    if (period === "day") {
      startDate = now.toISOString().split("T")[0];
    } else if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
    } else {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split("T")[0];
    }

    // Task stats
    const allTasks =
      await sql`SELECT * FROM tasks WHERE household_id = ${householdId}`;
    const completedInPeriod = await sql`
      SELECT * FROM task_completions 
      WHERE household_id = ${householdId} AND completed_at >= ${startDate}::timestamp
      ORDER BY completed_at DESC
    `;

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.is_completed).length;
    const activeTasks = totalTasks - completedTasks;
    const overdueTasks = allTasks.filter(
      (t) => !t.is_completed && t.due_date && new Date(t.due_date) < now,
    ).length;

    // Completion rate
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Day of week breakdown
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayBreakdown = dayNames.map((name, idx) => ({
      day: name,
      count: completedInPeriod.filter((c) => c.day_of_week === idx).length,
    }));

    // Category breakdown
    const categoryMap = {};
    for (const c of completedInPeriod) {
      const cat = c.category || "other";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const categoryBreakdown = Object.entries(categoryMap).map(
      ([name, count]) => ({ name, count }),
    );

    // Goals progress
    const goals =
      await sql`SELECT * FROM goals WHERE household_id = ${householdId} AND is_active = true`;
    const goalsSummary = goals.map((g) => ({
      title: g.title,
      streak: g.current_streak || 0,
      target: g.frequency_target,
    }));

    // Streaks - count consecutive days with at least one completion
    const completionDates = new Set(
      completedInPeriod.map((c) => {
        const d = new Date(c.completed_at);
        return d.toISOString().split("T")[0];
      }),
    );
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      if (completionDates.has(dateStr)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Most productive day
    const bestDayEntry = dayBreakdown.reduce(
      (best, curr) => (curr.count > best.count ? curr : best),
      { day: "-", count: 0 },
    );

    // Previous period comparison
    let prevStartDate;
    if (period === "week") {
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      prevStartDate = twoWeeksAgo.toISOString().split("T")[0];
    } else {
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      prevStartDate = twoMonthsAgo.toISOString().split("T")[0];
    }
    const prevCompletions = await sql`
      SELECT COUNT(*) as cnt FROM task_completions 
      WHERE household_id = ${householdId} AND completed_at >= ${prevStartDate}::timestamp AND completed_at < ${startDate}::timestamp
    `;
    const prevCount = parseInt(prevCompletions[0]?.cnt || 0);
    const currentCount = completedInPeriod.length;
    const trend =
      prevCount > 0
        ? Math.round(((currentCount - prevCount) / prevCount) * 100)
        : 0;

    return Response.json({
      progress: {
        period,
        completionRate,
        totalTasks,
        completedTasks,
        activeTasks,
        overdueTasks,
        completedInPeriod: currentCount,
        currentStreak,
        bestDay: bestDayEntry.day,
        trend,
        dayBreakdown,
        categoryBreakdown,
        goalsSummary,
      },
    });
  } catch (err) {
    console.error("GET /api/progress error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
