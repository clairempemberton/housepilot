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
    if (!households.length) return Response.json({ members: [] });

    const members =
      await sql`SELECT * FROM household_members WHERE household_id = ${households[0].id} ORDER BY created_at`;
    return Response.json({ members });
  } catch (err) {
    console.error("GET /api/members error", err);
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
      return Response.json({ error: "No household" }, { status: 400 });

    const body = await request.json();
    const { member_name, member_type, age, responsibilities, preferences } =
      body;
    if (!member_name)
      return Response.json({ error: "Name is required" }, { status: 400 });

    const result = await sql`
      INSERT INTO household_members (household_id, member_name, member_type, age, responsibilities, preferences)
      VALUES (${households[0].id}, ${member_name}, ${member_type || "adult"}, ${age || null}, ${responsibilities || null}, ${preferences || null})
      RETURNING *
    `;
    return Response.json({ member: result[0] });
  } catch (err) {
    console.error("POST /api/members error", err);
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
      return Response.json({ error: "Member ID required" }, { status: 400 });

    await sql`DELETE FROM household_members WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/members error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
