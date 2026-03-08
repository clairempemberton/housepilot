import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const apiKey = process.env.REVENUE_CAT_API_KEY;
    const projectId = process.env.REVENUE_CAT_PROJECT_ID;

    const results = await sql`
      SELECT subscription_status, last_check_subscription_status_at, trial_started_at
      FROM auth_users
      WHERE id = ${userId}
    `;

    if (!results.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const {
      subscription_status,
      last_check_subscription_status_at,
      trial_started_at,
    } = results[0];

    // Calculate trial info
    let trialDaysRemaining = 0;
    let isInTrial = false;
    if (trial_started_at) {
      const trialEnd = new Date(
        new Date(trial_started_at).getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const now = new Date();
      if (now < trialEnd) {
        isInTrial = true;
        trialDaysRemaining = Math.ceil(
          (trialEnd - now) / (24 * 60 * 60 * 1000),
        );
      }
    }

    // If in trial, grant access
    if (isInTrial) {
      return Response.json({
        hasAccess: true,
        isInTrial: true,
        trialDaysRemaining,
      });
    }

    // Check RevenueCat if API key is configured
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isStatusStale =
      !last_check_subscription_status_at ||
      new Date(last_check_subscription_status_at) < oneDayAgo;

    if (apiKey && projectId && (!subscription_status || isStatusStale)) {
      try {
        const response = await fetch(
          `https://api.revenuecat.com/v2/projects/${projectId}/customers/${encodeURIComponent(userId)}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const activeEntitlements = data.active_entitlements?.items || [];
          const hasAccess = activeEntitlements.length > 0;

          await sql`
            UPDATE auth_users
            SET subscription_status = ${hasAccess ? "active" : "inactive"},
                last_check_subscription_status_at = NOW()
            WHERE id = ${userId}
          `;

          return Response.json({
            hasAccess,
            isInTrial: false,
            trialDaysRemaining: 0,
          });
        } else if (response.status === 404) {
          await sql`
            UPDATE auth_users
            SET subscription_status = 'inactive',
                last_check_subscription_status_at = NOW()
            WHERE id = ${userId}
          `;
        }
      } catch (error) {
        console.error("Error fetching from RevenueCat:", error);
      }
    }

    if (subscription_status) {
      const hasAccess = subscription_status === "active";
      return Response.json({
        hasAccess,
        isInTrial: false,
        trialDaysRemaining: 0,
      });
    }

    return Response.json({
      hasAccess: false,
      isInTrial: false,
      trialDaysRemaining: 0,
    });
  } catch (error) {
    console.error("Error in subscription info:", error);
    return Response.json(
      { error: error.message || "Failed to load subscription info" },
      { status: 500 },
    );
  }
}
