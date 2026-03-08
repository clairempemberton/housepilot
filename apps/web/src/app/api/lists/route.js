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
    if (!households.length) return Response.json({ lists: [] });

    const householdId = households[0].id;
    const lists =
      await sql`SELECT * FROM lists WHERE household_id = ${householdId} ORDER BY created_at DESC`;

    const listsWithItems = [];
    for (const list of lists) {
      const items =
        await sql`SELECT * FROM list_items WHERE list_id = ${list.id} ORDER BY created_at`;
      listsWithItems.push({ ...list, items });
    }

    return Response.json({ lists: listsWithItems });
  } catch (err) {
    console.error("GET /api/lists error", err);
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
    const { title, list_type, items } = body;
    if (!title)
      return Response.json({ error: "Title is required" }, { status: 400 });

    const result = await sql`
      INSERT INTO lists (household_id, title, list_type)
      VALUES (${households[0].id}, ${title}, ${list_type || "custom"})
      RETURNING *
    `;
    const list = result[0];

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await sql`INSERT INTO list_items (list_id, title) VALUES (${list.id}, ${item})`;
      }
    }

    return Response.json({ list });
  } catch (err) {
    console.error("POST /api/lists error", err);
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
      return Response.json({ error: "List ID required" }, { status: 400 });

    await sql`DELETE FROM lists WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/lists error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
