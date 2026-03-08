import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import Stripe from "stripe";

export const POST = async (request) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const userId = session.user.id;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // no-op
    }

    const returnUrl =
      body.returnUrl ||
      (process.env.AUTH_URL || "http://localhost:4000") + "/dashboard/billing";

    const rows = await sql`
      SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId}
    `;

    if (rows.length === 0 || !rows[0].stripe_customer_id) {
      return Response.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 404 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: returnUrl,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error("Billing portal error:", err);
    return Response.json(
      { error: "Failed to open billing portal" },
      { status: 500 },
    );
  }
};
