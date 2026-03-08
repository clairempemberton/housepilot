import sql from "@/app/api/utils/sql";
import Stripe from "stripe";

export const POST = async (request) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event;

    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      try {
        event = stripe.webhooks.constructEvent(
          body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return Response.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // In dev without webhook secret, parse directly
      event = JSON.parse(body);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (userId && subscriptionId) {
          // Fetch the subscription to get trial/period info
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const status = sub.status;
          const trialStart = sub.trial_start
            ? new Date(sub.trial_start * 1000).toISOString()
            : null;
          const trialEnd = sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null;
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          // Upsert subscription record
          await sql(
            `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, subscription_status, trial_start_date, trial_end_date, current_period_end, plan_type, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'premium', NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET
               stripe_customer_id = $2,
               stripe_subscription_id = $3,
               subscription_status = $4,
               trial_start_date = $5,
               trial_end_date = $6,
               current_period_end = $7,
               updated_at = NOW()`,
            [
              parseInt(userId),
              customerId,
              subscriptionId,
              status,
              trialStart,
              trialEnd,
              periodEnd,
            ],
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const subscriptionId = sub.id;
        const status = sub.status;
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await sql(
          `UPDATE subscriptions
           SET subscription_status = $1,
               trial_end_date = $2,
               current_period_end = $3,
               updated_at = NOW()
           WHERE stripe_subscription_id = $4`,
          [status, trialEnd, periodEnd, subscriptionId],
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const subscriptionId = sub.id;

        await sql(
          `UPDATE subscriptions
           SET subscription_status = 'canceled',
               updated_at = NOW()
           WHERE stripe_subscription_id = $1`,
          [subscriptionId],
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;

          await sql(
            `UPDATE subscriptions
             SET subscription_status = 'active',
                 current_period_end = $1,
                 updated_at = NOW()
             WHERE stripe_subscription_id = $2`,
            [periodEnd, subscriptionId],
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          await sql(
            `UPDATE subscriptions
             SET subscription_status = 'past_due',
                 updated_at = NOW()
             WHERE stripe_subscription_id = $1`,
            [subscriptionId],
          );
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return Response.json({ error: "Webhook handler failed" }, { status: 500 });
  }
};
