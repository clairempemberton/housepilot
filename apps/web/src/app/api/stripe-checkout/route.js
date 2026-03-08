import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import Stripe from "stripe";

export const POST = async (request) => {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const userId = session.user.id;
    const email = session.user.email;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // no-op
    }

    const redirectURL =
      body.redirectURL || process.env.AUTH_URL || "http://localhost:4000";

    // Check if user already has a subscription record
    const existing = await sql`
      SELECT stripe_customer_id, stripe_subscription_id, subscription_status
      FROM subscriptions
      WHERE user_id = ${userId}
    `;

    let stripeCustomerId = existing[0]?.stripe_customer_id;

    // If already has active subscription or trialing, no need to checkout again
    const currentStatus = existing[0]?.subscription_status;
    if (currentStatus === "active" || currentStatus === "trialing") {
      return Response.json(
        {
          error: "You already have an active subscription.",
          status: currentStatus,
        },
        { status: 400 },
      );
    }

    // Create or reuse Stripe customer
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { user_id: String(userId) },
      });
      stripeCustomerId = customer.id;
    }

    // Create checkout session with 3-day trial
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "HousePilot Premium" },
            recurring: { interval: "month" },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 3,
        metadata: { user_id: String(userId) },
      },
      success_url: `${redirectURL}/dashboard?checkout=success`,
      cancel_url: `${redirectURL}/upgrade?checkout=cancelled`,
      metadata: { user_id: String(userId) },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
};
