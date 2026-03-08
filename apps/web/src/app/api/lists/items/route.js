import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { list_id, title } = body;
    if (!list_id || !title)
      return Response.json(
        { error: "list_id and title required" },
        { status: 400 },
      );

    const result = await sql`
      INSERT INTO list_items (list_id, title) VALUES (${list_id}, ${title}) RETURNING *
    `;
    return Response.json({ item: result[0] });
  } catch (err) {
    console.error("POST /api/lists/items error", err);
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
    const { id, is_checked, title } = body;
    if (!id)
      return Response.json({ error: "Item ID required" }, { status: 400 });

    const setClauses = [];
    const values = [];
    if (is_checked !== undefined) {
      values.push(is_checked);
      setClauses.push(`is_checked = $${values.length}`);
    }
    if (title !== undefined) {
      values.push(title);
      setClauses.push(`title = $${values.length}`);
    }
    if (!setClauses.length)
      return Response.json({ error: "No fields to update" }, { status: 400 });

    values.push(id);
    const result = await sql(
      `UPDATE list_items SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return Response.json({ item: result[0] });
  } catch (err) {
    console.error("PUT /api/lists/items error", err);
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
      return Response.json({ error: "Item ID required" }, { status: 400 });

    await sql`DELETE FROM list_items WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/lists/items error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
