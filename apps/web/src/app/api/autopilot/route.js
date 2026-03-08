import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length) return Response.json({ settings: null });
    const householdId = households[0].id;

    const settings =
      await sql`SELECT * FROM autopilot_settings WHERE household_id = ${householdId} LIMIT 1`;
    if (!settings.length) {
      // Create default settings
      const result =
        await sql`INSERT INTO autopilot_settings (household_id) VALUES (${householdId}) ON CONFLICT (household_id) DO NOTHING RETURNING *`;
      const created = result.length
        ? result[0]
        : (
            await sql`SELECT * FROM autopilot_settings WHERE household_id = ${householdId} LIMIT 1`
          )[0];
      return Response.json({ settings: created });
    }
    return Response.json({ settings: settings[0] });
  } catch (err) {
    console.error("GET /api/autopilot error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length)
      return Response.json({ error: "No household" }, { status: 400 });
    const householdId = households[0].id;
    const body = await request.json();

    const {
      is_enabled,
      auto_schedule_chores,
      auto_grocery_reminders,
      auto_maintenance_reminders,
      auto_meal_suggestions,
      preferred_chore_day,
      preferred_grocery_day,
    } = body;

    const setClauses = [];
    const values = [];
    if (is_enabled !== undefined) {
      values.push(is_enabled);
      setClauses.push(`is_enabled = $${values.length}`);
    }
    if (auto_schedule_chores !== undefined) {
      values.push(auto_schedule_chores);
      setClauses.push(`auto_schedule_chores = $${values.length}`);
    }
    if (auto_grocery_reminders !== undefined) {
      values.push(auto_grocery_reminders);
      setClauses.push(`auto_grocery_reminders = $${values.length}`);
    }
    if (auto_maintenance_reminders !== undefined) {
      values.push(auto_maintenance_reminders);
      setClauses.push(`auto_maintenance_reminders = $${values.length}`);
    }
    if (auto_meal_suggestions !== undefined) {
      values.push(auto_meal_suggestions);
      setClauses.push(`auto_meal_suggestions = $${values.length}`);
    }
    if (preferred_chore_day !== undefined) {
      values.push(preferred_chore_day);
      setClauses.push(`preferred_chore_day = $${values.length}`);
    }
    if (preferred_grocery_day !== undefined) {
      values.push(preferred_grocery_day);
      setClauses.push(`preferred_grocery_day = $${values.length}`);
    }
    if (!setClauses.length)
      return Response.json({ error: "No fields" }, { status: 400 });

    values.push(householdId);
    const result = await sql(
      `UPDATE autopilot_settings SET ${setClauses.join(", ")} WHERE household_id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.length) {
      // Insert if doesn't exist
      await sql`INSERT INTO autopilot_settings (household_id, is_enabled) VALUES (${householdId}, ${is_enabled || false}) ON CONFLICT (household_id) DO NOTHING`;
      const created =
        await sql`SELECT * FROM autopilot_settings WHERE household_id = ${householdId} LIMIT 1`;
      return Response.json({ settings: created[0] });
    }
    return Response.json({ settings: result[0] });
  } catch (err) {
    console.error("PUT /api/autopilot error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
