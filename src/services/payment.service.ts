import { OrderStatus, PaymentMethod, PaymentStatus, ProductStatus, ProductType } from "@prisma/client";
import { env } from "../config/env.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sendOrderConfirmation } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";

export type CheckoutItemInput = { productId: string; quantity: number };

type ProviderResult = {
  redirectUrl?: string;
  instructions?: string;
  providerReference?: string;
};

function reference(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function paypalBaseUrl() {
  return env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken() {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new ApiError(503, "PayPal is not configured yet.", "PAYMENT_METHOD_UNAVAILABLE");
  }

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) {
    throw new ApiError(502, data.error_description ?? "PayPal could not initialize this payment.", "PAYPAL_ERROR");
  }
  return data.access_token;
}

async function createStripeSession(order: {
  id: string; orderNumber: string; totalCents: number; currency: string; buyerEmail: string;
}) {
  if (!env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, "Stripe is not configured yet.", "PAYMENT_METHOD_UNAVAILABLE");
  }
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${env.APP_URL}/checkout/confirmation?order=${encodeURIComponent(order.id)}&provider=stripe`);
  body.set("cancel_url", `${env.APP_URL}/checkout?payment=cancelled`);
  body.set("customer_email", order.buyerEmail);
  body.set("client_reference_id", order.id);
  body.set("metadata[orderId]", order.id);
  body.set("line_items[0][price_data][currency]", order.currency.toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(order.totalCents));
  body.set("line_items[0][price_data][product_data][name]", `HSello order ${order.orderNumber}`);
  body.set("line_items[0][quantity]", "1");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) {
    throw new ApiError(502, data.error?.message ?? "Stripe could not initialize this payment.", "STRIPE_ERROR");
  }
  return { redirectUrl: data.url, providerReference: data.id };
}

async function createPaypalOrder(order: {
  id: string; orderNumber: string; totalCents: number; currency: string;
}) {
  const accessToken = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "paypal-request-id": order.id
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: order.id,
        custom_id: order.orderNumber,
        amount: { currency_code: order.currency, value: (order.totalCents / 100).toFixed(2) }
      }],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: "PAY_NOW",
            return_url: `${env.APP_URL}/checkout/confirmation?order=${encodeURIComponent(order.id)}&provider=paypal`,
            cancel_url: `${env.APP_URL}/checkout?payment=cancelled`
          }
        }
      }
    })
  });
  const data = await response.json() as { id?: string; links?: Array<{ rel: string; href: string }>; message?: string };
  const approve = data.links?.find((link) => ["payer-action", "approve"].includes(link.rel));
  if (!response.ok || !data.id || !approve) {
    throw new ApiError(502, data.message ?? "PayPal could not initialize this payment.", "PAYPAL_ERROR");
  }
  return { redirectUrl: approve.href, providerReference: data.id };
}

export function availablePaymentMethods() {
  return [
    { id: PaymentMethod.STRIPE, label: "Card / Stripe", available: Boolean(env.STRIPE_SECRET_KEY), kind: "hosted" },
    { id: PaymentMethod.PAYPAL, label: "PayPal", available: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET), kind: "hosted" },
    { id: PaymentMethod.BANK_TRANSFER, label: "Local bank transfer", available: Boolean(env.BANK_TRANSFER_INSTRUCTIONS), kind: "manual" },
    { id: PaymentMethod.CRYPTO, label: "Crypto", available: Boolean(env.CRYPTO_PAYMENT_INSTRUCTIONS), kind: "manual" },
    { id: PaymentMethod.MANUAL, label: "Manual approval", available: true, kind: "manual" }
  ];
}

export async function createCheckout(
  buyerId: string,
  items: CheckoutItemInput[],
  method: PaymentMethod,
  couponCode?: string
) {
  const paymentOption = availablePaymentMethods().find((option) => option.id === method);
  if (!paymentOption?.available) {
    throw new ApiError(400, "That payment method is not available.", "PAYMENT_METHOD_UNAVAILABLE");
  }

  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer || buyer.isSuspended) throw new ApiError(403, "This account cannot place orders.", "ACCOUNT_RESTRICTED");

  const normalized = new Map<string, number>();
  for (const item of items) normalized.set(item.productId, (normalized.get(item.productId) ?? 0) + item.quantity);
  const productIds = [...normalized.keys()];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: ProductStatus.APPROVED, seller: { isSuspended: false, sellerProfile: { isSuspended: false } } },
    include: {
      files: { where: { isActive: true } },
      inventoryItems: { where: { isActive: true, orderItemId: null }, select: { id: true } }
    }
  });
  if (!products.length || products.length !== productIds.length) {
    throw new ApiError(400, "One or more products are unavailable.", "PRODUCT_UNAVAILABLE");
  }
  for (const product of products) {
    const requestedQuantity = normalized.get(product.id) ?? 1;
    const isLineInventoryProduct = product.type === ProductType.DOWNLOAD && product.files.length === 0;
    if (isLineInventoryProduct && product.inventoryItems.length < requestedQuantity) {
      throw new ApiError(400, `${product.name} does not have enough available inventory.`, "PRODUCT_OUT_OF_STOCK");
    }
  }

  const subtotalCents = products.reduce((total, product) => total + product.priceCents * (normalized.get(product.id) ?? 1), 0);
  const now = new Date();
  const coupon = couponCode ? await prisma.coupon.findFirst({
    where: {
      code: couponCode.trim().toUpperCase(), isActive: true, startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    }
  }) : null;

  if (couponCode && !coupon) throw new ApiError(400, "Coupon is invalid or expired.", "COUPON_INVALID");
  if (coupon && coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw new ApiError(400, "Coupon has reached its redemption limit.", "COUPON_LIMIT");
  }
  if (coupon && subtotalCents < coupon.minimumCents) throw new ApiError(400, "Order does not meet the coupon minimum.", "COUPON_MINIMUM");
  const discountCents = coupon
    ? Math.min(subtotalCents, coupon.percentOff ? Math.round(subtotalCents * coupon.percentOff / 100) : coupon.amountOffCents ?? 0)
    : 0;

  const order = await prisma.order.create({
    data: {
      orderNumber: reference("HS"), invoiceNumber: reference("INV"), buyerId,
      couponId: coupon?.id, subtotalCents, discountCents, totalCents: subtotalCents - discountCents,
      buyerEmail: buyer.email, buyerName: `${buyer.firstName} ${buyer.lastName}`,
      items: { create: products.map((product) => ({
        productId: product.id, sellerId: product.sellerId, productName: product.name,
        quantity: normalized.get(product.id) ?? 1, unitPriceCents: product.priceCents,
        totalCents: product.priceCents * (normalized.get(product.id) ?? 1)
      })) },
      payment: { create: { method, amountCents: subtotalCents - discountCents, currency: "USD", status: PaymentStatus.REQUIRES_ACTION } }
    },
    include: { payment: true, items: true }
  });

  let provider: ProviderResult;
  try {
    if (method === PaymentMethod.STRIPE) provider = await createStripeSession(order);
    else if (method === PaymentMethod.PAYPAL) provider = await createPaypalOrder(order);
    else if (method === PaymentMethod.BANK_TRANSFER) provider = { instructions: env.BANK_TRANSFER_INSTRUCTIONS };
    else if (method === PaymentMethod.CRYPTO) provider = { instructions: env.CRYPTO_PAYMENT_INSTRUCTIONS };
    else provider = { instructions: `Order ${order.orderNumber} is awaiting staff approval. Add proof of payment in support if requested.` };
  } catch (error) {
    await prisma.payment.update({ where: { orderId: order.id }, data: { status: PaymentStatus.FAILED, failureReason: error instanceof Error ? error.message : "Provider error" } });
    throw error;
  }

  if (provider.providerReference) {
    await prisma.payment.update({ where: { orderId: order.id }, data: { providerReference: provider.providerReference } });
  }
  if (coupon) await prisma.coupon.update({ where: { id: coupon.id }, data: { redemptionCount: { increment: 1 } } });

  return { order, ...provider };
}

export async function completePayment(orderId: string, approvedById?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, items: { include: { product: { include: { files: { where: { isActive: true } } } } } } }
  });
  if (!order?.payment) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  if (order.payment.status === PaymentStatus.PAID) return order;

  const rawLinks: Array<{ name: string; token: string }> = [];
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { orderId }, data: { status: PaymentStatus.PAID, approvedById, approvedAt: approvedById ? new Date() : undefined } });
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.PAID, paidAt: new Date() } });
    for (const item of order.items) {
      await tx.product.update({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } });
      await tx.sellerProfile.updateMany({ where: { userId: item.sellerId }, data: { totalSales: { increment: item.quantity } } });
      if (item.product.type === ProductType.DOWNLOAD) {
        for (const file of item.product.files) {
          const token = randomToken(40);
          await tx.downloadGrant.create({
            data: {
              orderItemId: item.id, productFileId: file.id, tokenHash: sha256(token),
              maxDownloads: item.product.downloadLimit,
              expiresAt: new Date(Date.now() + item.product.downloadExpiryHours * 60 * 60 * 1000)
            }
          });
          rawLinks.push({ name: `${item.productName} — ${file.displayName}`, token });
        }

        const inventoryRows = await tx.productInventoryItem.findMany({
          where: { productId: item.productId, isActive: true, orderItemId: null },
          orderBy: { createdAt: "asc" },
          take: item.quantity,
          select: { id: true }
        });
        if (item.product.files.length === 0 && inventoryRows.length < item.quantity) {
          throw new ApiError(409, `${item.productName} no longer has enough available inventory.`, "PRODUCT_OUT_OF_STOCK");
        }
        if (inventoryRows.length) {
          await tx.productInventoryItem.updateMany({
            where: { id: { in: inventoryRows.map((row) => row.id) } },
            data: { orderItemId: item.id, deliveredAt: new Date() }
          });
        }
      }
    }
  });

  await sendOrderConfirmation(
    order.buyerEmail, order.buyerName, order.orderNumber, order.invoiceNumber,
    money(order.totalCents, order.currency),
    rawLinks.map((link) => ({ name: link.name, url: `${env.API_URL}/api/commerce/download/token/${encodeURIComponent(link.token)}` }))
  );
  return prisma.order.findUnique({ where: { id: orderId }, include: { payment: true, items: true } });
}

export async function confirmHostedPayment(orderId: string, buyerId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, buyerId }, include: { payment: true } });
  if (!order?.payment) throw new ApiError(404, "Order not found.", "ORDER_NOT_FOUND");
  if (order.payment.status === PaymentStatus.PAID) return order;
  const providerReference = order.payment.providerReference;
  if (!providerReference) throw new ApiError(400, "Payment has no provider reference.", "PAYMENT_REFERENCE_MISSING");

  if (order.payment.method === PaymentMethod.STRIPE) {
    if (!env.STRIPE_SECRET_KEY) throw new ApiError(503, "Stripe is unavailable.", "PAYMENT_METHOD_UNAVAILABLE");
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(providerReference)}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    const data = await response.json() as { payment_status?: string; client_reference_id?: string; error?: { message?: string } };
    if (!response.ok || data.payment_status !== "paid" || data.client_reference_id !== order.id) {
      throw new ApiError(402, data.error?.message ?? "Stripe payment is not confirmed.", "PAYMENT_NOT_CONFIRMED");
    }
  } else if (order.payment.method === PaymentMethod.PAYPAL) {
    const accessToken = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(providerReference)}/capture`, {
      method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", "paypal-request-id": `${order.id}-capture` }
    });
    const data = await response.json() as { status?: string; message?: string; purchase_units?: Array<{ payments?: { captures?: Array<{ id: string }> } }> };
    if (!response.ok || data.status !== "COMPLETED") throw new ApiError(402, data.message ?? "PayPal payment is not confirmed.", "PAYMENT_NOT_CONFIRMED");
    const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    if (captureId) {
      await prisma.payment.update({ where: { orderId: order.id }, data: { providerPayload: { captureId } } });
    }
  } else {
    throw new ApiError(400, "This payment requires staff approval.", "MANUAL_APPROVAL_REQUIRED");
  }
  return completePayment(order.id);
}

export async function issueRefund(refundId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: { include: { payment: true } } }
  });
  if (!refund?.order.payment) throw new ApiError(404, "Refund or payment not found.", "REFUND_NOT_FOUND");
  const payment = refund.order.payment;
  let providerRefundId: string | undefined;

  if (payment.method === PaymentMethod.STRIPE) {
    if (!env.STRIPE_SECRET_KEY || !payment.providerReference) throw new ApiError(503, "Stripe refund is not configured.", "REFUND_PROVIDER_UNAVAILABLE");
    const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(payment.providerReference)}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
    const session = await sessionResponse.json() as { payment_intent?: string; error?: { message?: string } };
    if (!sessionResponse.ok || !session.payment_intent) throw new ApiError(502, session.error?.message ?? "Stripe payment could not be retrieved.", "STRIPE_ERROR");
    const body = new URLSearchParams({ payment_intent: session.payment_intent, amount: String(refund.amountCents), "metadata[hselloRefundId]": refund.id });
    const response = await fetch("https://api.stripe.com/v1/refunds", { method: "POST", headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body });
    const data = await response.json() as { id?: string; status?: string; error?: { message?: string } };
    if (!response.ok || !data.id) throw new ApiError(502, data.error?.message ?? "Stripe refund failed.", "STRIPE_REFUND_ERROR");
    providerRefundId = data.id;
  } else if (payment.method === PaymentMethod.PAYPAL) {
    const payload = payment.providerPayload as { captureId?: string } | null;
    if (!payload?.captureId) throw new ApiError(400, "PayPal capture reference is missing.", "PAYPAL_CAPTURE_MISSING");
    const accessToken = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v2/payments/captures/${encodeURIComponent(payload.captureId)}/refund`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", "paypal-request-id": refund.id },
      body: JSON.stringify({ amount: { currency_code: refund.order.currency, value: (refund.amountCents / 100).toFixed(2) } })
    });
    const data = await response.json() as { id?: string; message?: string };
    if (!response.ok || !data.id) throw new ApiError(502, data.message ?? "PayPal refund failed.", "PAYPAL_REFUND_ERROR");
    providerRefundId = data.id;
  }

  const fullRefund = refund.amountCents >= refund.order.totalCents;
  await prisma.$transaction([
    prisma.refund.update({ where: { id: refund.id }, data: { status: "COMPLETED", providerReference: providerRefundId, resolvedAt: new Date() } }),
    prisma.order.update({ where: { id: refund.orderId }, data: { status: fullRefund ? "REFUNDED" : undefined } }),
    prisma.payment.update({ where: { orderId: refund.orderId }, data: { status: fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" } }),
    prisma.downloadGrant.updateMany({ where: { orderItem: { orderId: refund.orderId } }, data: { revokedAt: fullRefund ? new Date() : undefined } })
  ]);
  return prisma.refund.findUnique({ where: { id: refund.id } });
}
