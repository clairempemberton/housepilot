import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length) return Response.json({ tasks: [] });
    const householdId = households[0].id;

    const tasks =
      await sql`SELECT * FROM maintenance_tasks WHERE household_id = ${householdId} ORDER BY next_due ASC NULLS LAST, created_at DESC`;
    return Response.json({ tasks });
  } catch (err) {
    console.error("GET /api/maintenance error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
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
      title,
      description,
      frequency_months,
      last_completed,
      category,
      is_seasonal,
      season,
    } = body;
    if (!title)
      return Response.json({ error: "Title required" }, { status: 400 });

    const freq = frequency_months || 3;
    const lastDate = last_completed || null;
    let nextDue = null;
    if (lastDate) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + freq);
      nextDue = d.toISOString().split("T")[0];
    }

    const result = await sql`
      INSERT INTO maintenance_tasks (household_id, title, description, frequency_months, last_completed, next_due, category, is_seasonal, season)
      VALUES (${householdId}, ${title}, ${description || null}, ${freq}, ${lastDate}, ${nextDue}, ${category || "general"}, ${is_seasonal || false}, ${season || null})
      RETURNING *
    `;
    return Response.json({ task: result[0] });
  } catch (err) {
    console.error("POST /api/maintenance error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const {
      id,
      title,
      description,
      frequency_months,
      last_completed,
      category,
      is_seasonal,
      season,
      mark_done,
    } = body;
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });

    // If marking as done, update last_completed and recalculate next_due
    if (mark_done) {
      const today = new Date().toISOString().split("T")[0];
      const existing =
        await sql`SELECT frequency_months FROM maintenance_tasks WHERE id = ${id}`;
      const freq = existing[0]?.frequency_months || 3;
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + freq);
      const nextDue = nextDate.toISOString().split("T")[0];

      const result =
        await sql`UPDATE maintenance_tasks SET last_completed = ${today}, next_due = ${nextDue} WHERE id = ${id} RETURNING *`;
      return Response.json({ task: result[0] });
    }

    const setClauses = [];
    const values = [];
    if (title !== undefined) {
      values.push(title);
      setClauses.push(`title = $${values.length}`);
    }
    if (description !== undefined) {
      values.push(description);
      setClauses.push(`description = $${values.length}`);
    }
    if (frequency_months !== undefined) {
      values.push(frequency_months);
      setClauses.push(`frequency_months = $${values.length}`);
    }
    if (last_completed !== undefined) {
      values.push(last_completed);
      setClauses.push(`last_completed = $${values.length}`);
    }
    if (category !== undefined) {
      values.push(category);
      setClauses.push(`category = $${values.length}`);
    }
    if (is_seasonal !== undefined) {
      values.push(is_seasonal);
      setClauses.push(`is_seasonal = $${values.length}`);
    }
    if (season !== undefined) {
      values.push(season);
      setClauses.push(`season = $${values.length}`);
    }
    if (!setClauses.length)
      return Response.json({ error: "No fields" }, { status: 400 });

    // Recalculate next_due if frequency or last_completed changed
    if (frequency_months !== undefined || last_completed !== undefined) {
      const existing =
        await sql`SELECT frequency_months, last_completed FROM maintenance_tasks WHERE id = ${id}`;
      const freq = frequency_months ?? existing[0]?.frequency_months ?? 3;
      const lastDate = last_completed ?? existing[0]?.last_completed;
      if (lastDate) {
        const d = new Date(lastDate);
        d.setMonth(d.getMonth() + freq);
        values.push(d.toISOString().split("T")[0]);
        setClauses.push(`next_due = $${values.length}`);
      }
    }

    values.push(id);
    const result = await sql(
      `UPDATE maintenance_tasks SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return Response.json({ task: result[0] });
  } catch (err) {
    console.error("PUT /api/maintenance error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });
    await sql`DELETE FROM maintenance_tasks WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/maintenance error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
