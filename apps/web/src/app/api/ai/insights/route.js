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
      await sql`SELECT * FROM households WHERE user_id = ${userId} LIMIT 1`;
    if (!households.length) return Response.json({ insights: {} });

    const household = households[0];
    const householdId = household.id;
    const url = new URL(request.url);
    const module = url.searchParams.get("module");

    // Check for cached insights
    const cachedQuery = module
      ? await sql`SELECT * FROM ai_insights WHERE household_id = ${householdId} AND module = ${module} AND expires_at > NOW() ORDER BY created_at DESC LIMIT 5`
      : await sql`SELECT * FROM ai_insights WHERE household_id = ${householdId} AND expires_at > NOW() ORDER BY created_at DESC LIMIT 30`;

    if (cachedQuery.length > 0) {
      const grouped = {};
      for (const row of cachedQuery) {
        if (!grouped[row.module]) grouped[row.module] = [];
        grouped[row.module].push({
          id: row.id,
          text: row.insight_text,
          type: row.insight_type,
        });
      }
      return Response.json({ insights: grouped, cached: true });
    }

    // Gather ALL household data for deep analysis
    const members =
      await sql`SELECT * FROM household_members WHERE household_id = ${householdId}`;
    const tasks =
      await sql`SELECT * FROM tasks WHERE household_id = ${householdId} ORDER BY created_at DESC LIMIT 100`;
    const events =
      await sql`SELECT * FROM calendar_events WHERE household_id = ${householdId} AND event_date >= CURRENT_DATE ORDER BY event_date LIMIT 30`;
    const pastEvents =
      await sql`SELECT * FROM calendar_events WHERE household_id = ${householdId} AND event_date < CURRENT_DATE ORDER BY event_date DESC LIMIT 30`;
    const goals =
      await sql`SELECT * FROM goals WHERE household_id = ${householdId}`;
    const lists =
      await sql`SELECT * FROM lists WHERE household_id = ${householdId}`;
    const completions =
      await sql`SELECT * FROM task_completions WHERE household_id = ${householdId} ORDER BY completed_at DESC LIMIT 200`;
    const supplies =
      await sql`SELECT * FROM supplies WHERE household_id = ${householdId}`;
    const maintenance =
      await sql`SELECT * FROM maintenance_tasks WHERE household_id = ${householdId}`;

    const completedTasks = tasks.filter((t) => t.is_completed);
    const incompleteTasks = tasks.filter((t) => !t.is_completed);
    const overdueTasks = incompleteTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date(),
    );
    const completionRate =
      tasks.length > 0
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 0;

    // Day of week patterns
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayCompletions = {};
    for (const c of completions) {
      if (c.day_of_week !== null)
        dayCompletions[c.day_of_week] =
          (dayCompletions[c.day_of_week] || 0) + 1;
    }
    const sortedDays = Object.entries(dayCompletions).sort(
      (a, b) => b[1] - a[1],
    );
    const mostProductiveDay = sortedDays.length
      ? dayNames[parseInt(sortedDays[0][0])]
      : null;
    const leastProductiveDay =
      sortedDays.length > 1
        ? dayNames[parseInt(sortedDays[sortedDays.length - 1][0])]
        : null;

    // Hour patterns
    const hourCompletions = {};
    for (const c of completions) {
      if (c.hour_of_day !== null)
        hourCompletions[c.hour_of_day] =
          (hourCompletions[c.hour_of_day] || 0) + 1;
    }
    const sortedHours = Object.entries(hourCompletions).sort(
      (a, b) => b[1] - a[1],
    );
    const peakHour = sortedHours.length ? parseInt(sortedHours[0][0]) : null;
    const peakTime =
      peakHour !== null
        ? peakHour < 12
          ? "morning"
          : peakHour < 17
            ? "afternoon"
            : "evening"
        : null;

    // Category stats
    const categoryTotal = {};
    const categoryCompleted = {};
    const categoryPostponed = {};
    for (const t of tasks) {
      const cat = t.category || "uncategorized";
      categoryTotal[cat] = (categoryTotal[cat] || 0) + 1;
      if (t.is_completed)
        categoryCompleted[cat] = (categoryCompleted[cat] || 0) + 1;
      if (!t.is_completed && t.due_date && new Date(t.due_date) < new Date()) {
        categoryPostponed[cat] = (categoryPostponed[cat] || 0) + 1;
      }
    }

    // Schedule analysis
    const eventDayCounts = {};
    for (const e of events) {
      const dateStr = e.event_date.toString().split("T")[0];
      eventDayCounts[dateStr] = (eventDayCounts[dateStr] || 0) + 1;
    }
    const overloadedDays = Object.entries(eventDayCounts).filter(
      ([_, count]) => count >= 3,
    );
    const busiestDay =
      Object.keys(eventDayCounts).length > 0
        ? dayNames[
            new Date(
              Object.entries(eventDayCounts).sort((a, b) => b[1] - a[1])[0][0],
            ).getDay()
          ]
        : null;

    // Supply intelligence
    const lowSupplies = supplies.filter((s) => s.quantity_remaining < 30);
    const supplyPredictions = supplies
      .filter((s) => s.avg_days_to_restock && s.last_restocked)
      .map((s) => {
        const runoutDate = new Date(
          new Date(s.last_restocked).getTime() +
            s.avg_days_to_restock * 86400000,
        );
        const daysLeft = Math.ceil((runoutDate - new Date()) / 86400000);
        return `${s.item_name} may run out in ~${Math.max(0, daysLeft)} days`;
      });

    // Maintenance intelligence
    const overdueMaint = maintenance.filter(
      (m) => m.next_due && new Date(m.next_due) < new Date(),
    );
    const upcomingMaint = maintenance.filter(
      (m) =>
        m.next_due &&
        new Date(m.next_due) >= new Date() &&
        new Date(m.next_due) <= new Date(Date.now() + 30 * 86400000),
    );

    // Mental load analysis
    const tasksByAssignee = {};
    for (const t of tasks) {
      const assignee = t.assigned_to || "unassigned";
      tasksByAssignee[assignee] = (tasksByAssignee[assignee] || 0) + 1;
    }
    const totalAssigned = Object.values(tasksByAssignee).reduce(
      (s, v) => s + v,
      0,
    );
    const memberLoadInfo = members
      .map((m) => {
        const count = tasksByAssignee[m.id] || 0;
        const pct =
          totalAssigned > 0 ? Math.round((count / totalAssigned) * 100) : 0;
        return `${m.member_name}: ${pct}% (${count} tasks)`;
      })
      .join("; ");

    // Friction detection summary
    const frictionSummary = [];
    const postponedCats = Object.entries(categoryPostponed)
      .filter(([_, c]) => c >= 1)
      .sort((a, b) => b[1] - a[1]);
    if (postponedCats.length)
      frictionSummary.push(
        `Frequently postponed: ${postponedCats.map(([k, v]) => `${k} (${v} overdue)`).join(", ")}`,
      );
    if (overloadedDays.length)
      frictionSummary.push(
        `Overloaded days: ${overloadedDays.map(([d, c]) => `${d} (${c} events)`).join(", ")}`,
      );
    if (overdueTasks.length >= 3)
      frictionSummary.push(
        `${overdueTasks.length} tasks are overdue and building up`,
      );

    const analysisContext = `
HOUSEHOLD DATA ANALYSIS:
- Household: ${household.household_name}, ${household.people_count} people
- Pain points: ${household.pain_points || "none specified"}
- Goals: ${household.goals || "none specified"}
- Members: ${members.map((m) => `${m.member_name} (${m.member_type}${m.age ? ", age " + m.age : ""})`).join(", ")}
- Has pets: ${household.has_pets ? "Yes - " + (household.pet_details || "details unknown") : "No"}
- Cooks meals: ${household.cooks_meals ? "Yes" : "No"}
- Grocery frequency: ${household.grocery_frequency || "unknown"}

TASK PATTERNS:
- Total: ${tasks.length} (${completedTasks.length} done, ${incompleteTasks.length} active, ${overdueTasks.length} overdue)
- Completion rate: ${completionRate}%
- Most productive day: ${mostProductiveDay || "not enough data"}
- Least productive day: ${leastProductiveDay || "not enough data"}
- Peak time: ${peakTime || "not enough data"}
- Categories: ${
      Object.entries(categoryTotal)
        .map(
          ([k, v]) =>
            `${k}: ${v} total, ${categoryCompleted[k] || 0} done, ${categoryPostponed[k] || 0} overdue`,
        )
        .join("; ") || "none"
    }

FRICTION DETECTED:
${frictionSummary.join("\n") || "No major friction detected"}

CALENDAR ANALYSIS:
- Upcoming events: ${events.length}
- Busiest day pattern: ${busiestDay || "not enough data"}
- Overloaded days: ${overloadedDays.length > 0 ? overloadedDays.map(([d, c]) => `${d} (${c} events)`).join(", ") : "none"}

SUPPLY INTELLIGENCE:
- ${lowSupplies.length} items running low: ${lowSupplies.map((s) => `${s.item_name} (${s.quantity_remaining}%)`).join(", ") || "all stocked"}
- Predictions: ${supplyPredictions.join("; ") || "not enough data"}

MAINTENANCE:
- ${overdueMaint.length} overdue: ${overdueMaint.map((m) => m.title).join(", ") || "none"}
- ${upcomingMaint.length} upcoming: ${upcomingMaint.map((m) => `${m.title} (${m.next_due})`).join(", ") || "none"}

MENTAL LOAD:
- ${memberLoadInfo || "no assigned tasks"}

GOALS: ${goals.map((g) => `${g.title} (streak: ${g.current_streak || 0})`).join("; ") || "none"}
LISTS: ${lists.length} active
`;

    const systemPrompt = `You are Household Intelligence, the AI brain of HomePilot.
Analyze ALL the data deeply and generate specific, pattern-aware insights for each module.

CRITICAL RULES:
- Reference actual task names, patterns, days, supply names, and member names.
- Detect friction: postponed tasks, overloaded days, imbalanced workloads.
- Predict needs: supply depletion, maintenance timing, schedule conflicts.
- Be warm but direct. Each insight should be 1-2 sentences maximum.
- Include specific suggestions to fix problems.
- For "supplies" module: predict when items will run out and suggest restocking.
- For "maintenance" module: warn about overdue and upcoming items.
- For "mental_load" module: analyze who does what and suggest balance.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "home": ["insight1", "insight2", "insight3"],
  "tasks": ["insight1", "insight2"],
  "calendar": ["insight1", "insight2"],
  "lists": ["insight1", "insight2"],
  "goals": ["insight1", "insight2"],
  "household": ["insight1", "insight2"],
  "supplies": ["insight1", "insight2"],
  "maintenance": ["insight1", "insight2"],
  "mental_load": ["insight1", "insight2"]
}

Generate 2-3 data-driven insights per module. Be specific and actionable.`;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/chat-gpt/conversationgpt4`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: analysisContext },
          ],
        }),
      },
    );

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    const rawMessage = data.choices?.[0]?.message?.content || "{}";

    let insights = {};
    try {
      const cleaned = rawMessage
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      insights = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI insights:", parseErr);
      insights = {
        home: ["Keep track of your household to get personalized suggestions."],
        tasks: ["Complete a few tasks so HomePilot can learn your patterns."],
      };
    }

    // Cache insights
    for (const [mod, insightList] of Object.entries(insights)) {
      if (Array.isArray(insightList)) {
        for (const text of insightList) {
          await sql`INSERT INTO ai_insights (household_id, module, insight_text, insight_type) VALUES (${householdId}, ${mod}, ${text}, 'suggestion')`;
        }
      }
    }

    return Response.json({ insights, cached: false });
  } catch (err) {
    console.error("GET /api/ai/insights error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length)
      return Response.json({ error: "No household" }, { status: 400 });
    await sql`DELETE FROM ai_insights WHERE household_id = ${households[0].id}`;
    return Response.json({
      success: true,
      message: "Insights cleared. Fetch again to regenerate.",
    });
  } catch (err) {
    console.error("POST /api/ai/insights error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
