import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const rows =
      await sql`SELECT * FROM households WHERE user_id = ${userId} LIMIT 1`;
    const household = rows?.[0] || null;

    if (!household) {
      return Response.json({ household: null });
    }

    const members =
      await sql`SELECT * FROM household_members WHERE household_id = ${household.id} ORDER BY created_at`;
    return Response.json({ household, members });
  } catch (err) {
    console.error("GET /api/household error", err);
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
    const body = await request.json();
    const {
      household_name,
      people_count,
      children_ages,
      has_pets,
      pet_details,
      cooks_meals,
      grocery_frequency,
      outsource_cleaning,
      pain_points,
      goals,
      members,
    } = body;

    const result = await sql`
      INSERT INTO households (user_id, household_name, people_count, children_ages, has_pets, pet_details, cooks_meals, grocery_frequency, outsource_cleaning, pain_points, goals)
      VALUES (${userId}, ${household_name || "My Home"}, ${people_count || 1}, ${children_ages || null}, ${has_pets || false}, ${pet_details || null}, ${cooks_meals !== undefined ? cooks_meals : true}, ${grocery_frequency || null}, ${outsource_cleaning || false}, ${pain_points || null}, ${goals || null})
      RETURNING *
    `;
    const household = result[0];

    if (members && Array.isArray(members) && members.length > 0) {
      for (const member of members) {
        await sql`
          INSERT INTO household_members (household_id, member_name, member_type, age)
          VALUES (${household.id}, ${member.name}, ${member.type || "adult"}, ${member.age || null})
        `;
      }
    }

    await sql`UPDATE auth_users SET onboarding_completed = TRUE, trial_started_at = COALESCE(trial_started_at, NOW()) WHERE id = ${userId}`;

    return Response.json({ household });
  } catch (err) {
    console.error("POST /api/household error", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
