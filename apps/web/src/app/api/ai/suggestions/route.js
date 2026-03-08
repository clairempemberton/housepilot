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
    const { module } = body;

    const households =
      await sql`SELECT * FROM households WHERE user_id = ${userId} LIMIT 1`;
    if (!households.length) return Response.json({ suggestions: [] });
    const household = households[0];
    const hid = household.id;

    const members =
      await sql`SELECT * FROM household_members WHERE household_id = ${hid}`;
    const tasks =
      await sql`SELECT * FROM tasks WHERE household_id = ${hid} ORDER BY created_at DESC LIMIT 50`;
    const supplies =
      await sql`SELECT * FROM supplies WHERE household_id = ${hid}`;
    const lists = await sql`SELECT * FROM lists WHERE household_id = ${hid}`;
    const listItems =
      lists.length > 0
        ? await sql`SELECT li.*, l.title as list_title FROM list_items li JOIN lists l ON li.list_id = l.id WHERE l.household_id = ${hid} ORDER BY li.created_at DESC LIMIT 100`
        : [];

    const incompleteTasks = tasks.filter((t) => !t.is_completed);
    const lowSupplies = supplies.filter((s) => s.quantity_remaining < 40);
    const categories = [
      ...new Set(tasks.map((t) => t.category).filter(Boolean)),
    ];

    const dataContext = `HOUSEHOLD: ${household.household_name}, ${household.people_count} people
MEMBERS: ${members.map((m) => `${m.member_name} (${m.member_type}${m.age ? ", age " + m.age : ""})`).join(", ") || "none"}
PETS: ${household.has_pets ? household.pet_details || "Yes" : "No"}
COOKS: ${household.cooks_meals ? "Yes" : "No"}
GROCERY FREQ: ${household.grocery_frequency || "unknown"}
PAIN POINTS: ${household.pain_points || "none"}
GOALS: ${household.goals || "none"}
EXISTING TASKS (${incompleteTasks.length} active): ${
      incompleteTasks
        .slice(0, 20)
        .map((t) => t.title)
        .join(", ") || "none"
    }
TASK CATEGORIES USED: ${categories.join(", ") || "none"}
EXISTING SUPPLIES: ${supplies.map((s) => `${s.item_name} (${s.quantity_remaining}%)`).join(", ") || "none"}
LOW SUPPLIES: ${lowSupplies.map((s) => s.item_name).join(", ") || "none"}
EXISTING LISTS: ${lists.map((l) => l.title).join(", ") || "none"}`;

    let promptInstruction = "";

    if (module === "tasks") {
      promptInstruction = `Generate 4-6 specific task suggestions for this household. Consider their members, pain points, goals, pets, children, cooking habits, and what tasks they already have. DO NOT suggest tasks they already have. Suggest things they likely need but haven't added yet.

Return ONLY valid JSON array. Each item must have:
- "title": string (the task name, short and clear)
- "priority": "urgent" | "high" | "medium" | "low"
- "category": string (like "cleaning", "cooking", "errands", "childcare", "pet care", "maintenance", "organization")
- "reason": string (1 sentence explaining WHY this is relevant to them)`;
    } else if (module === "lists") {
      promptInstruction = `Generate 3-5 specific list suggestions for this household. Consider their lifestyle, members, cooking habits, and what lists they already have. DO NOT suggest lists they already have.

Return ONLY valid JSON array. Each item must have:
- "title": string (the list name)
- "items": string[] (3-6 starter items for the list, specific to their household)
- "reason": string (1 sentence explaining WHY this list would help them)`;
    } else if (module === "supplies") {
      promptInstruction = `Generate 4-6 specific supply tracking suggestions for this household. Consider their pets, cooking habits, children, and what they already track. DO NOT suggest supplies they already track.

Return ONLY valid JSON array. Each item must have:
- "item_name": string (the supply name)
- "category": string (like "kitchen", "bathroom", "cleaning", "pet", "baby", "laundry", "paper goods")
- "reason": string (1 sentence explaining WHY they should track this)`;
    } else {
      return Response.json({ suggestions: [] });
    }

    const systemPrompt = `You are HousePilot's suggestion engine. You analyze household data and generate highly personalized, actionable suggestions. Be specific to THIS household — reference their members by name, their pets, their cooking habits, etc. Never be generic. ${promptInstruction}

RESPOND WITH ONLY A JSON ARRAY. No markdown, no code blocks, no extra text.`;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/chat-gpt/conversationgpt4`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: dataContext },
          ],
        }),
      },
    );

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();
    const rawMessage = data.choices?.[0]?.message?.content || "[]";

    let suggestions = [];
    try {
      const cleaned = rawMessage
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      suggestions = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI suggestions:", parseErr);
      suggestions = [];
    }

    return Response.json({ suggestions });
  } catch (err) {
    console.error("POST /api/ai/suggestions error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
