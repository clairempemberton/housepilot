import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import Stripe from "stripe";

export const GET = async () => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const rows = await sql`
      SELECT
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        trial_start_date,
        trial_end_date,
        current_period_end,
        plan_type
      FROM subscriptions
      WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return Response.json({
        hasAccess: false,
        isInTrial: false,
        trialDaysRemaining: 0,
        status: "none",
        currentPeriodEnd: null,
      });
    }

    const sub = rows[0];
    const now = new Date();
    const trialEnd = sub.trial_end_date ? new Date(sub.trial_end_date) : null;
    const trialingNow =
      sub.subscription_status === "trialing" && trialEnd && trialEnd > now;
    const activeNow = sub.subscription_status === "active";
    const access = activeNow || trialingNow;

    let daysLeft = 0;
    if (trialingNow && trialEnd) {
      daysLeft = Math.max(
        0,
        Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)),
      );
    }

    // If subscription exists but status might be stale, check Stripe
    if (
      sub.stripe_subscription_id &&
      !access &&
      sub.subscription_status !== "canceled"
    ) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const stripeSub = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id,
        );
        const freshStatus = stripeSub.status;
        const freshTrialEnd = stripeSub.trial_end
          ? new Date(stripeSub.trial_end * 1000).toISOString()
          : null;
        const freshPeriodEnd = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : null;

        await sql(
          `UPDATE subscriptions
           SET subscription_status = $1,
               trial_end_date = $2,
               current_period_end = $3,
               updated_at = NOW()
           WHERE user_id = $4`,
          [freshStatus, freshTrialEnd, freshPeriodEnd, userId],
        );

        const freshTrialEndDate = freshTrialEnd
          ? new Date(freshTrialEnd)
          : null;
        const freshTrialing =
          freshStatus === "trialing" &&
          freshTrialEndDate &&
          freshTrialEndDate > now;
        const freshActive = freshStatus === "active";
        const freshAccess = freshActive || freshTrialing;

        let freshDaysLeft = 0;
        if (freshTrialing && freshTrialEndDate) {
          freshDaysLeft = Math.max(
            0,
            Math.ceil((freshTrialEndDate - now) / (1000 * 60 * 60 * 24)),
          );
        }

        return Response.json({
          hasAccess: freshAccess,
          isInTrial: freshTrialing,
          trialDaysRemaining: freshDaysLeft,
          status: freshStatus,
          currentPeriodEnd: freshPeriodEnd,
        });
      } catch (stripeErr) {
        console.error("Stripe status check error:", stripeErr);
      }
    }

    return Response.json({
      hasAccess: access,
      isInTrial: trialingNow,
      trialDaysRemaining: daysLeft,
      status: sub.subscription_status,
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (err) {
    console.error("Subscription status error:", err);
    return Response.json(
      { error: "Failed to check subscription" },
      { status: 500 },
    );
  }
};
