import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

// Household Memory System — analyzes all patterns across the system
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const households =
      await sql`SELECT * FROM households WHERE user_id = ${userId} LIMIT 1`;
    if (!households.length) return Response.json({ memory: null });
    const household = households[0];
    const householdId = household.id;

    // ---- Task Completion Patterns ----
    const completions =
      await sql`SELECT * FROM task_completions WHERE household_id = ${householdId} ORDER BY completed_at DESC LIMIT 500`;

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Day-of-week pattern
    const dayFreq = {};
    for (const c of completions) {
      const d = c.day_of_week;
      if (d !== null && d !== undefined) dayFreq[d] = (dayFreq[d] || 0) + 1;
    }
    const sortedDays = Object.entries(dayFreq).sort((a, b) => b[1] - a[1]);
    const mostProductiveDay = sortedDays.length
      ? dayNames[parseInt(sortedDays[0][0])]
      : null;
    const leastProductiveDay =
      sortedDays.length > 1
        ? dayNames[parseInt(sortedDays[sortedDays.length - 1][0])]
        : null;

    // Hour pattern
    const hourFreq = {};
    for (const c of completions) {
      if (c.hour_of_day !== null)
        hourFreq[c.hour_of_day] = (hourFreq[c.hour_of_day] || 0) + 1;
    }
    const sortedHours = Object.entries(hourFreq).sort((a, b) => b[1] - a[1]);
    const peakHour = sortedHours.length ? parseInt(sortedHours[0][0]) : null;
    const peakTimeBucket =
      peakHour !== null
        ? peakHour < 12
          ? "morning"
          : peakHour < 17
            ? "afternoon"
            : "evening"
        : null;

    // Category completion rates
    const allTasks =
      await sql`SELECT * FROM tasks WHERE household_id = ${householdId}`;
    const categoryStats = {};
    for (const t of allTasks) {
      const cat = t.category || "uncategorized";
      if (!categoryStats[cat])
        categoryStats[cat] = { total: 0, completed: 0, postponed: 0 };
      categoryStats[cat].total++;
      if (t.is_completed) categoryStats[cat].completed++;
      // Consider overdue incomplete tasks as "postponed"
      if (!t.is_completed && t.due_date && new Date(t.due_date) < new Date()) {
        categoryStats[cat].postponed++;
      }
    }
    const categoryRates = Object.entries(categoryStats).map(([name, s]) => ({
      name,
      total: s.total,
      completed: s.completed,
      postponed: s.postponed,
      rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    }));

    // ---- Friction Detection ----
    const frictionPoints = [];

    // Frequently postponed categories
    const postponedCategories = categoryRates
      .filter((c) => c.postponed > 0)
      .sort((a, b) => b.postponed - a.postponed);
    for (const pc of postponedCategories.slice(0, 3)) {
      if (pc.postponed >= 1) {
        frictionPoints.push({
          type: "postponed_category",
          severity: pc.postponed >= 3 ? "high" : "medium",
          message: `${pc.name} tasks are frequently postponed (${pc.postponed} overdue).`,
          suggestion: `Consider scheduling ${pc.name} tasks on ${mostProductiveDay || "your most productive day"}.`,
        });
      }
    }

    // Overdue tasks
    const overdueTasks = allTasks.filter(
      (t) => !t.is_completed && t.due_date && new Date(t.due_date) < new Date(),
    );
    if (overdueTasks.length >= 3) {
      frictionPoints.push({
        type: "overdue_buildup",
        severity: overdueTasks.length >= 5 ? "high" : "medium",
        message: `${overdueTasks.length} tasks are overdue and piling up.`,
        suggestion: "Consider a catch-up session to clear the backlog.",
      });
    }

    // ---- Schedule Analysis ----
    const today = new Date().toISOString().split("T")[0];
    const twoWeeksOut = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .split("T")[0];
    const events =
      await sql`SELECT * FROM calendar_events WHERE household_id = ${householdId} AND event_date >= ${today} AND event_date <= ${twoWeeksOut} ORDER BY event_date`;

    // Events per day
    const eventsByDate = {};
    for (const e of events) {
      const d = e.event_date.toString().split("T")[0];
      if (!eventsByDate[d]) eventsByDate[d] = [];
      eventsByDate[d].push(e);
    }

    const overloadedDays = Object.entries(eventsByDate)
      .filter(([_, evts]) => evts.length >= 3)
      .map(([date, evts]) => ({
        date,
        eventCount: evts.length,
        dayName: dayNames[new Date(date).getDay()],
        events: evts.map((e) => e.title),
      }));

    if (overloadedDays.length > 0) {
      for (const od of overloadedDays.slice(0, 2)) {
        frictionPoints.push({
          type: "overloaded_day",
          severity: od.eventCount >= 4 ? "high" : "medium",
          message: `${od.dayName} (${od.date}) has ${od.eventCount} events: ${od.events.join(", ")}.`,
          suggestion: `Consider spreading activities to adjacent days.`,
        });
      }
    }

    // ---- Supply Predictions ----
    const supplies =
      await sql`SELECT * FROM supplies WHERE household_id = ${householdId}`;
    const supplyPredictions = [];
    for (const s of supplies) {
      if (s.avg_days_to_restock && s.last_restocked) {
        const lastDate = new Date(s.last_restocked);
        const predictedRunout = new Date(
          lastDate.getTime() + s.avg_days_to_restock * 86400000,
        );
        const daysUntilRunout = Math.ceil(
          (predictedRunout - new Date()) / 86400000,
        );
        supplyPredictions.push({
          item: s.item_name,
          category: s.category,
          currentLevel: s.quantity_remaining,
          daysUntilRunout: Math.max(0, daysUntilRunout),
          predictedDate: predictedRunout.toISOString().split("T")[0],
        });
      } else if (s.quantity_remaining < 30) {
        supplyPredictions.push({
          item: s.item_name,
          category: s.category,
          currentLevel: s.quantity_remaining,
          daysUntilRunout: null,
          predictedDate: null,
        });
      }
    }

    // ---- Maintenance Predictions ----
    const maintenance =
      await sql`SELECT * FROM maintenance_tasks WHERE household_id = ${householdId}`;
    const maintenanceAlerts = maintenance
      .filter((m) => m.next_due)
      .map((m) => {
        const daysUntil = Math.ceil(
          (new Date(m.next_due) - new Date()) / 86400000,
        );
        return {
          title: m.title,
          category: m.category,
          nextDue: m.next_due,
          daysUntil,
          isOverdue: daysUntil < 0,
          lastCompleted: m.last_completed,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // ---- Weekly rhythm ----
    const completionsByDay = dayNames.map((name, idx) => ({
      day: name,
      count: dayFreq[idx] || 0,
    }));

    // ---- Mental load snapshot (who does what) ----
    const tasksByAssignee = {};
    const completionsByAssignee = {};
    const members =
      await sql`SELECT * FROM household_members WHERE household_id = ${householdId}`;

    for (const t of allTasks) {
      const assignee = t.assigned_to || "unassigned";
      if (!tasksByAssignee[assignee])
        tasksByAssignee[assignee] = { total: 0, completed: 0, categories: {} };
      tasksByAssignee[assignee].total++;
      if (t.is_completed) tasksByAssignee[assignee].completed++;
      const cat = t.category || "general";
      tasksByAssignee[assignee].categories[cat] =
        (tasksByAssignee[assignee].categories[cat] || 0) + 1;
    }

    const mentalLoadBreakdown = members.map((m) => {
      const data = tasksByAssignee[m.id] || {
        total: 0,
        completed: 0,
        categories: {},
      };
      const totalAssignedAcrossAll = Object.values(tasksByAssignee).reduce(
        (s, d) => s + d.total,
        0,
      );
      return {
        memberId: m.id,
        memberName: m.member_name,
        memberType: m.member_type,
        tasksAssigned: data.total,
        tasksCompleted: data.completed,
        loadPercentage:
          totalAssignedAcrossAll > 0
            ? Math.round((data.total / totalAssignedAcrossAll) * 100)
            : 0,
        topCategories: Object.entries(data.categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count })),
      };
    });

    // Add unassigned
    const unassignedData = tasksByAssignee["unassigned"];
    if (unassignedData && unassignedData.total > 0) {
      const totalAssignedAcrossAll = Object.values(tasksByAssignee).reduce(
        (s, d) => s + d.total,
        0,
      );
      mentalLoadBreakdown.push({
        memberId: null,
        memberName: "Unassigned",
        memberType: "system",
        tasksAssigned: unassignedData.total,
        tasksCompleted: unassignedData.completed,
        loadPercentage:
          totalAssignedAcrossAll > 0
            ? Math.round((unassignedData.total / totalAssignedAcrossAll) * 100)
            : 0,
        topCategories: Object.entries(unassignedData.categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count })),
      });
    }

    // Mental load imbalance detection
    const assignedMembers = mentalLoadBreakdown.filter(
      (m) => m.memberType !== "system" && m.tasksAssigned > 0,
    );
    if (assignedMembers.length >= 2) {
      const maxLoad = Math.max(...assignedMembers.map((m) => m.loadPercentage));
      const minLoad = Math.min(...assignedMembers.map((m) => m.loadPercentage));
      if (maxLoad - minLoad > 30) {
        const overloaded = assignedMembers.find(
          (m) => m.loadPercentage === maxLoad,
        );
        frictionPoints.push({
          type: "mental_load_imbalance",
          severity: maxLoad - minLoad > 50 ? "high" : "medium",
          message: `${overloaded.memberName} handles ${overloaded.loadPercentage}% of household tasks.`,
          suggestion:
            "Consider redistributing some responsibilities for better balance.",
        });
      }
    }

    return Response.json({
      memory: {
        patterns: {
          mostProductiveDay,
          leastProductiveDay,
          peakTimeBucket,
          peakHour,
          completionsByDay,
          totalCompletions: completions.length,
        },
        categoryRates,
        frictionPoints,
        scheduleAnalysis: {
          overloadedDays,
          totalUpcomingEvents: events.length,
        },
        supplyPredictions,
        maintenanceAlerts,
        mentalLoad: mentalLoadBreakdown,
        householdProfile: {
          name: household.household_name,
          people: household.people_count,
          painPoints: household.pain_points,
          goals: household.goals,
        },
      },
    });
  } catch (err) {
    console.error("GET /api/ai/memory error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
