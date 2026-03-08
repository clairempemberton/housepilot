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
    if (!households.length) return Response.json({ events: [] });

    const householdId = households[0].id;
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start");
    const endDate = url.searchParams.get("end");

    let query =
      "SELECT ce.*, hm.member_name FROM calendar_events ce LEFT JOIN household_members hm ON ce.member_id = hm.id WHERE ce.household_id = $1";
    const values = [householdId];
    let paramCount = 1;

    if (startDate) {
      paramCount++;
      query += ` AND ce.event_date >= $${paramCount}`;
      values.push(startDate);
    }
    if (endDate) {
      paramCount++;
      query += ` AND ce.event_date <= $${paramCount}`;
      values.push(endDate);
    }

    query += " ORDER BY ce.event_date ASC, ce.event_time ASC";
    const events = await sql(query, values);
    return Response.json({ events });
  } catch (err) {
    console.error("GET /api/calendar error", err);
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
    const {
      title,
      description,
      event_date,
      event_time,
      end_time,
      calendar_type,
      member_id,
    } = body;
    if (!title || !event_date)
      return Response.json(
        { error: "Title and date are required" },
        { status: 400 },
      );

    const result = await sql`
      INSERT INTO calendar_events (household_id, title, description, event_date, event_time, end_time, calendar_type, member_id)
      VALUES (${households[0].id}, ${title}, ${description || null}, ${event_date}, ${event_time || null}, ${end_time || null}, ${calendar_type || "family"}, ${member_id || null})
      RETURNING *
    `;
    return Response.json({ event: result[0] });
  } catch (err) {
    console.error("POST /api/calendar error", err);
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
      return Response.json({ error: "Event ID required" }, { status: 400 });

    await sql`DELETE FROM calendar_events WHERE id = ${id}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/calendar error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
