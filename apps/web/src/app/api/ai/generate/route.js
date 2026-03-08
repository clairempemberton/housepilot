import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await request.json();
    const { prompt, context } = body;

    const households =
      await sql`SELECT * FROM households WHERE user_id = ${userId} LIMIT 1`;
    const household = households?.[0] || null;

    let members = [];
    let tasks = [];
    let events = [];
    let goals = [];
    let supplies = [];
    let maintenance = [];
    let completions = [];
    let lists = [];

    if (household) {
      members =
        await sql`SELECT * FROM household_members WHERE household_id = ${household.id}`;
      tasks =
        await sql`SELECT * FROM tasks WHERE household_id = ${household.id} ORDER BY due_date ASC NULLS LAST LIMIT 30`;
      const today = new Date().toISOString().split("T")[0];
      const twoWeeks = new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .split("T")[0];
      events =
        await sql`SELECT * FROM calendar_events WHERE household_id = ${household.id} AND event_date >= ${today} AND event_date <= ${twoWeeks} ORDER BY event_date, event_time`;
      goals =
        await sql`SELECT * FROM goals WHERE household_id = ${household.id} AND is_active = true`;
      supplies =
        await sql`SELECT * FROM supplies WHERE household_id = ${household.id}`;
      maintenance =
        await sql`SELECT * FROM maintenance_tasks WHERE household_id = ${household.id} ORDER BY next_due ASC NULLS LAST LIMIT 10`;
      completions =
        await sql`SELECT * FROM task_completions WHERE household_id = ${household.id} ORDER BY completed_at DESC LIMIT 50`;
      lists =
        await sql`SELECT * FROM lists WHERE household_id = ${household.id}`;
    }

    const incompleteTasks = tasks.filter((t) => !t.is_completed);
    const overdueTasks = incompleteTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date(),
    );
    const lowSupplies = supplies.filter((s) => s.quantity_remaining < 30);
    const dueMaintenance = maintenance.filter(
      (m) =>
        m.next_due &&
        new Date(m.next_due) <= new Date(Date.now() + 30 * 86400000),
    );

    const systemPrompt = `You are HousePilot, an intelligent AI household operating system. You have complete knowledge of this household and can give specific, data-driven advice.

${
  household
    ? `HOUSEHOLD PROFILE:
- Name: ${household.household_name}
- People: ${household.people_count}
- Children ages: ${household.children_ages || "None"}
- Pets: ${household.has_pets ? household.pet_details || "Yes" : "No"}
- Cooks meals: ${household.cooks_meals ? "Yes" : "No"}
- Grocery frequency: ${household.grocery_frequency || "Not specified"}
- Pain points: ${household.pain_points || "Not specified"}
- Goals: ${household.goals || "Not specified"}

MEMBERS:
${members.map((m) => `- ${m.member_name} (${m.member_type}${m.age ? ", age " + m.age : ""})`).join("\n")}

ACTIVE TASKS (${incompleteTasks.length} pending, ${overdueTasks.length} overdue):
${
  incompleteTasks
    .slice(0, 15)
    .map(
      (t) =>
        `- ${t.title}${t.due_date ? " (due " + t.due_date + ")" : ""}${t.category ? " [" + t.category + "]" : ""}`,
    )
    .join("\n") || "None"
}

UPCOMING EVENTS (next 2 weeks):
${
  events
    .slice(0, 10)
    .map(
      (e) =>
        `- ${e.title} on ${e.event_date}${e.event_time ? " at " + e.event_time : ""}`,
    )
    .join("\n") || "None"
}

GOALS:
${goals.map((g) => `- ${g.title} (streak: ${g.current_streak || 0})`).join("\n") || "None"}

SUPPLIES:
${lowSupplies.length > 0 ? "Low: " + lowSupplies.map((s) => `${s.item_name} (${s.quantity_remaining}%)`).join(", ") : "All stocked"}

MAINTENANCE:
${dueMaintenance.map((m) => `- ${m.title} (due ${m.next_due})`).join("\n") || "None due soon"}

LISTS: ${lists.map((l) => l.title).join(", ") || "None"}

RECENT ACTIVITY: ${completions.length} tasks completed recently`
    : "No household set up yet."
}

${context ? `Additional context: ${context}` : ""}

RULES:
- Be specific. Reference actual tasks, events, and data.
- Give actionable, concise advice.
- Use bullet points when listing things.
- Keep responses under 300 words.
- Be warm and supportive, like a helpful family assistant.
- When asked about groceries, reference actual supplies data.
- When asked about scheduling, reference actual calendar events.
- When asked about chores, reference actual tasks and completion patterns.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/chat-gpt/conversationgpt4`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      },
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const message =
      data.choices?.[0]?.message?.content ||
      "Sorry, I could not generate a response.";

    return Response.json({ message });
  } catch (err) {
    console.error("POST /api/ai/generate error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
