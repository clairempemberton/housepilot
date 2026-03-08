import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT * FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length) return Response.json({ briefing: null });
    const household = households[0];
    const householdId = household.id;

    // Check for existing briefing this week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split("T")[0];
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const weekEnd = sunday.toISOString().split("T")[0];

    const existing =
      await sql`SELECT * FROM weekly_briefings WHERE household_id = ${householdId} AND week_start = ${weekStart} LIMIT 1`;
    if (existing.length) {
      return Response.json({ briefing: existing[0] });
    }

    // Generate a new briefing
    const members =
      await sql`SELECT * FROM household_members WHERE household_id = ${householdId}`;
    const tasks =
      await sql`SELECT * FROM tasks WHERE household_id = ${householdId} AND is_completed = false ORDER BY due_date ASC NULLS LAST LIMIT 20`;
    const events =
      await sql`SELECT * FROM calendar_events WHERE household_id = ${householdId} AND event_date >= ${weekStart} AND event_date <= ${weekEnd} ORDER BY event_date, event_time`;
    const goals =
      await sql`SELECT * FROM goals WHERE household_id = ${householdId} AND is_active = true`;
    const supplies =
      await sql`SELECT * FROM supplies WHERE household_id = ${householdId} AND quantity_remaining < 30`;
    const maintenance =
      await sql`SELECT * FROM maintenance_tasks WHERE household_id = ${householdId} AND (next_due IS NULL OR next_due <= ${weekEnd}) ORDER BY next_due ASC LIMIT 5`;
    const completions =
      await sql`SELECT * FROM task_completions WHERE household_id = ${householdId} AND completed_at >= (NOW() - INTERVAL '7 days') ORDER BY completed_at DESC`;

    const context = `
WEEKLY BRIEFING DATA for ${household.household_name}:
Members: ${members.map((m) => `${m.member_name} (${m.member_type})`).join(", ")}
Week: ${weekStart} to ${weekEnd}

UPCOMING TASKS (${tasks.length} active):
${tasks.map((t) => `- ${t.title}${t.due_date ? " (due " + t.due_date + ")" : ""}${t.category ? " [" + t.category + "]" : ""}`).join("\n") || "None"}

THIS WEEK'S EVENTS (${events.length}):
${events.map((e) => `- ${e.title} on ${e.event_date}${e.event_time ? " at " + e.event_time : ""}`).join("\n") || "None"}

ACTIVE GOALS:
${goals.map((g) => `- ${g.title} (streak: ${g.current_streak || 0})`).join("\n") || "None"}

LOW SUPPLIES:
${supplies.map((s) => `- ${s.item_name} (${s.quantity_remaining}% remaining)`).join("\n") || "All stocked"}

MAINTENANCE DUE:
${maintenance.map((m) => `- ${m.title}${m.next_due ? " (due " + m.next_due + ")" : ""}`).join("\n") || "None due"}

LAST WEEK'S COMPLETIONS: ${completions.length} tasks completed
Household pain points: ${household.pain_points || "none"}
`;

    const systemPrompt = `You are HousePilot, generating a weekly household briefing. Write a concise, warm summary for the family.

Format:
📋 **This Week at a Glance**
Brief overview of the week ahead.

📅 **Key Events**
List the most important events.

✅ **Priority Tasks**
Top tasks to focus on this week.

⚠️ **Heads Up**
Any conflicts, low supplies, or maintenance due.

💡 **Smart Tip**
One actionable suggestion based on patterns.

Keep it concise and actionable. No more than 200 words total. Use plain text with emoji headers.`;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/chat-gpt/conversationgpt4`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: context },
          ],
        }),
      },
    );

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    const briefingText =
      data.choices?.[0]?.message?.content ||
      "Unable to generate briefing this week.";

    // Save briefing
    const saved = await sql`
      INSERT INTO weekly_briefings (household_id, briefing_text, week_start, week_end)
      VALUES (${householdId}, ${briefingText}, ${weekStart}, ${weekEnd})
      RETURNING *
    `;

    return Response.json({ briefing: saved[0] });
  } catch (err) {
    console.error("GET /api/briefing error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Force regenerate
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length)
      return Response.json({ error: "No household" }, { status: 400 });

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(monday.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split("T")[0];

    await sql`DELETE FROM weekly_briefings WHERE household_id = ${households[0].id} AND week_start = ${weekStart}`;
    return Response.json({
      success: true,
      message: "Briefing cleared. Fetch again to regenerate.",
    });
  } catch (err) {
    console.error("POST /api/briefing error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
