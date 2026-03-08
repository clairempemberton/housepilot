import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${userId} LIMIT 1`;
    if (!households.length) return Response.json({ goals: [] });

    const goals =
      await sql`SELECT * FROM goals WHERE household_id = ${households[0].id} ORDER BY created_at DESC`;
    return Response.json({ goals });
  } catch (err) {
    console.error("GET /api/goals error", err);
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

    const body = await request.json();
    const { title, description, frequency_target } = body;
    if (!title)
      return Response.json({ error: "Title is required" }, { status: 400 });

    const result = await sql`
      INSERT INTO goals (household_id, title, description, frequency_target)
      VALUES (${households[0].id}, ${title}, ${description || null}, ${frequency_target || null})
      RETURNING *
    `;
    return Response.json({ goal: result[0] });
  } catch (err) {
    console.error("POST /api/goals error", err);
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
      frequency_target,
      current_streak,
      is_active,
    } = body;
    if (!id)
      return Response.json({ error: "Goal ID required" }, { status: 400 });

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
    if (frequency_target !== undefined) {
      values.push(frequency_target);
      setClauses.push(`frequency_target = $${values.length}`);
    }
    if (current_streak !== undefined) {
      values.push(current_streak);
      setClauses.push(`current_streak = $${values.length}`);
    }
    if (is_active !== undefined) {
      values.push(is_active);
      setClauses.push(`is_active = $${values.length}`);
    }
    if (!setClauses.length)
      return Response.json({ error: "No fields to update" }, { status: 400 });

    values.push(id);
    const result = await sql(
      `UPDATE goals SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return Response.json({ goal: result[0] });
  } catch (err) {
    console.error("PUT /api/goals error", err);
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
      return Response.json({ error: "Goal ID required" }, { status: 400 });

    await sql`DELETE FROM goals WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/goals error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
