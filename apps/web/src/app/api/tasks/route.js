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
    if (!households.length) return Response.json({ tasks: [] });

    const householdId = households[0].id;
    const url = new URL(request.url);
    const completed = url.searchParams.get("completed");
    const category = url.searchParams.get("category");

    let query =
      "SELECT t.*, hm.member_name as assigned_name FROM tasks t LEFT JOIN household_members hm ON t.assigned_to = hm.id WHERE t.household_id = $1";
    const values = [householdId];
    let paramCount = 1;

    if (completed !== null && completed !== "") {
      paramCount++;
      query += ` AND t.is_completed = $${paramCount}`;
      values.push(completed === "true");
    }
    if (category) {
      paramCount++;
      query += ` AND t.category = $${paramCount}`;
      values.push(category);
    }

    // Order by priority (urgent first), then due date, then created
    query += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 2 END ASC, t.due_date ASC NULLS LAST, t.created_at DESC`;
    const tasks = await sql(query, values);
    return Response.json({ tasks });
  } catch (err) {
    console.error("GET /api/tasks error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${userId} LIMIT 1`;
    if (!households.length)
      return Response.json({ error: "No household found" }, { status: 400 });

    const householdId = households[0].id;
    const body = await request.json();
    const {
      title,
      description,
      frequency,
      category,
      assigned_to,
      due_date,
      priority,
    } = body;

    if (!title)
      return Response.json({ error: "Title is required" }, { status: 400 });

    const result = await sql`
      INSERT INTO tasks (household_id, title, description, frequency, category, assigned_to, due_date, priority)
      VALUES (${householdId}, ${title}, ${description || null}, ${frequency || "once"}, ${category || null}, ${assigned_to || null}, ${due_date || null}, ${priority || "medium"})
      RETURNING *
    `;
    return Response.json({ task: result[0] });
  } catch (err) {
    console.error("POST /api/tasks error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      id,
      title,
      description,
      frequency,
      category,
      assigned_to,
      due_date,
      is_completed,
      priority,
    } = body;

    if (!id)
      return Response.json({ error: "Task ID is required" }, { status: 400 });

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
    if (frequency !== undefined) {
      values.push(frequency);
      setClauses.push(`frequency = $${values.length}`);
    }
    if (category !== undefined) {
      values.push(category);
      setClauses.push(`category = $${values.length}`);
    }
    if (assigned_to !== undefined) {
      values.push(assigned_to);
      setClauses.push(`assigned_to = $${values.length}`);
    }
    if (due_date !== undefined) {
      values.push(due_date);
      setClauses.push(`due_date = $${values.length}`);
    }
    if (is_completed !== undefined) {
      values.push(is_completed);
      setClauses.push(`is_completed = $${values.length}`);
    }
    if (priority !== undefined) {
      values.push(priority);
      setClauses.push(`priority = $${values.length}`);
    }

    if (!setClauses.length)
      return Response.json({ error: "No fields to update" }, { status: 400 });

    values.push(id);
    const finalQuery = `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const result = await sql(finalQuery, values);
    const updatedTask = result[0];

    if (is_completed === true && updatedTask) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hourOfDay = now.getHours();
      await sql`
        INSERT INTO task_completions (task_id, household_id, task_title, category, day_of_week, hour_of_day)
        VALUES (${updatedTask.id}, ${updatedTask.household_id}, ${updatedTask.title}, ${updatedTask.category}, ${dayOfWeek}, ${hourOfDay})
      `;
    }

    return Response.json({ task: updatedTask });
  } catch (err) {
    console.error("PUT /api/tasks error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id)
      return Response.json({ error: "Task ID required" }, { status: 400 });
    await sql`DELETE FROM tasks WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
