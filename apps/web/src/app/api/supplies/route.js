import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    const households =
      await sql`SELECT id FROM households WHERE user_id = ${session.user.id} LIMIT 1`;
    if (!households.length) return Response.json({ supplies: [] });
    const householdId = households[0].id;

    const supplies =
      await sql`SELECT * FROM supplies WHERE household_id = ${householdId} ORDER BY category, item_name`;
    return Response.json({ supplies });
  } catch (err) {
    console.error("GET /api/supplies error", err);
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
      item_name,
      category,
      quantity_remaining,
      avg_days_to_restock,
      auto_add_to_list,
    } = body;
    if (!item_name)
      return Response.json({ error: "Item name required" }, { status: 400 });

    const result = await sql`
      INSERT INTO supplies (household_id, item_name, category, quantity_remaining, avg_days_to_restock, last_restocked, auto_add_to_list)
      VALUES (${householdId}, ${item_name}, ${category || "general"}, ${quantity_remaining ?? 100}, ${avg_days_to_restock || null}, ${new Date().toISOString().split("T")[0]}, ${auto_add_to_list || false})
      RETURNING *
    `;
    return Response.json({ supply: result[0] });
  } catch (err) {
    console.error("POST /api/supplies error", err);
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
      item_name,
      category,
      quantity_remaining,
      avg_days_to_restock,
      auto_add_to_list,
      last_restocked,
    } = body;
    if (!id) return Response.json({ error: "ID required" }, { status: 400 });

    const setClauses = [];
    const values = [];
    if (item_name !== undefined) {
      values.push(item_name);
      setClauses.push(`item_name = $${values.length}`);
    }
    if (category !== undefined) {
      values.push(category);
      setClauses.push(`category = $${values.length}`);
    }
    if (quantity_remaining !== undefined) {
      values.push(quantity_remaining);
      setClauses.push(`quantity_remaining = $${values.length}`);
    }
    if (avg_days_to_restock !== undefined) {
      values.push(avg_days_to_restock);
      setClauses.push(`avg_days_to_restock = $${values.length}`);
    }
    if (auto_add_to_list !== undefined) {
      values.push(auto_add_to_list);
      setClauses.push(`auto_add_to_list = $${values.length}`);
    }
    if (last_restocked !== undefined) {
      values.push(last_restocked);
      setClauses.push(`last_restocked = $${values.length}`);
    }
    if (!setClauses.length)
      return Response.json({ error: "No fields" }, { status: 400 });

    values.push(id);
    const result = await sql(
      `UPDATE supplies SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return Response.json({ supply: result[0] });
  } catch (err) {
    console.error("PUT /api/supplies error", err);
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
    await sql`DELETE FROM supplies WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/supplies error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
