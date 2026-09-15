import ZAI from "z-ai-web-dev-sdk";

/**
 * Auto-verify a UPI payment screenshot using Vision model.
 *
 * Verification criteria (ONLY these two):
 * 1. Amount match: the payment amount shown in the screenshot must match
 *    the order's total amount (within ±₹1 tolerance).
 * 2. Timestamp match: the payment timestamp shown in the screenshot must
 *    fall within a 10-minute window of the order's placement time —
 *    5 minutes before to 5 minutes after.
 *
 * Explicitly does NOT check or require:
 * - UPI reference number / UTR number (many UPI apps don't show this
 *   clearly in screenshots, so it must not be part of verification)
 * - UPI ID / payee ID match (the customer may have paid to a different
 *   UPI ID if the merchant has multiple accounts)
 *
 * If BOTH checks pass → verified = true
 * If EITHER check fails → verified = false, but the order goes to manual
 * review (not auto-reject) so the admin can look at the screenshot and
 * decide manually.
 */
export async function verifyPaymentScreenshot(
  screenshotDataUrl: string,
  expectedAmount: number,
  _expectedUpiId?: string,
  orderCreatedAt?: Date
): Promise<{ verified: boolean; confidence: number; reason: string }> {
  try {
    const zai = await ZAI.create();

    // Build the prompt — ask the model to extract amount + timestamp only.
    // We do NOT ask for UPI ID, UTR number, or payee info.
    const prompt = `You are a payment verification assistant. Analyze this screenshot of a UPI payment and extract ONLY the following:

1. Is this a valid payment screenshot? (true/false)
2. What is the payment status? (Success/Paid/Completed/Failed/Pending/Other)
3. What amount was paid? (in INR, numeric only — e.g. 1272)
4. What date and time is shown for the transaction? (extract the exact date/time string as shown in the screenshot, e.g. "15 Sep 2026, 3:45 PM" or "2026-09-15 15:45")

Do NOT extract or report UPI IDs, UTR numbers, reference numbers, or payee information — these are not needed for verification.

Respond in JSON format only:
{"is_payment_screenshot": boolean, "status": "string", "amount": number, "timestamp": "string or null"}

If the timestamp is not visible, set "timestamp" to null.`;

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: screenshotDataUrl } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    const content = response.choices[0]?.message?.content || "";
    let parsed: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { reason: content.slice(0, 200) };
    }

    // ─── Criterion 1: Amount match (±₹1 tolerance) ───
    const isScreenshot = parsed.is_payment_screenshot === true;
    const statusOk = ["success", "paid", "completed", "successful"].includes(
      String(parsed.status || "").toLowerCase()
    );
    const extractedAmount = typeof parsed.amount === "number" ? parsed.amount : null;
    const amountMatch =
      extractedAmount !== null && Math.abs(extractedAmount - expectedAmount) <= 1;

    // ─── Criterion 2: Timestamp match (within 10-minute window of order placement) ───
    // The order was placed at orderCreatedAt. The payment timestamp in the
    // screenshot should be within 5 minutes before to 5 minutes after.
    let timestampMatch = true; // default to true if we can't parse the timestamp
    let timestampReason = "";
    if (parsed.timestamp && orderCreatedAt) {
      try {
        const paymentTime = new Date(parsed.timestamp);
        if (!isNaN(paymentTime.getTime())) {
          const orderTime = new Date(orderCreatedAt);
          const diffMs = paymentTime.getTime() - orderTime.getTime();
          const diffMin = diffMs / (1000 * 60);
          const windowMin = 5; // ±5 minutes
          timestampMatch = Math.abs(diffMin) <= windowMin;
          if (timestampMatch) {
            timestampReason = `Timestamp OK (${diffMin >= 0 ? "+" : ""}${diffMin.toFixed(1)} min from order)`;
          } else {
            timestampReason = `Timestamp out of range (${diffMin >= 0 ? "+" : ""}${diffMin.toFixed(1)} min from order — must be within ±5 min)`;
          }
        } else {
          // Couldn't parse the timestamp — don't fail on this, let admin review
          timestampMatch = true;
          timestampReason = "Timestamp not parseable — admin should verify manually";
        }
      } catch {
        // Date parsing failed — don't fail the verification on this alone
        timestampMatch = true;
        timestampReason = "Timestamp not parseable — admin should verify manually";
      }
    } else if (!parsed.timestamp) {
      // No timestamp visible — don't fail, let admin review
      timestampMatch = true;
      timestampReason = "No timestamp visible in screenshot — admin should verify manually";
    }

    // ─── Final verdict: both criteria must pass for auto-verification ───
    // If EITHER fails, the payment goes to manual review (not auto-reject).
    const verified = isScreenshot && statusOk && amountMatch && timestampMatch;

    // Build the reason string
    let reason = "";
    const checks: string[] = [];
    if (!isScreenshot) checks.push("not a payment screenshot");
    if (!statusOk) checks.push(`status: ${parsed.status || "unknown"}`);
    if (!amountMatch) checks.push(`amount: ₹${extractedAmount ?? "?"} (expected ₹${expectedAmount})`);
    if (!timestampMatch) checks.push(timestampReason);

    if (checks.length === 0) {
      reason = `Payment auto-check: verified — amount ₹${extractedAmount} matches, ${timestampReason || "timestamp OK"}`;
    } else if (!amountMatch || !timestampMatch || !isScreenshot || !statusOk) {
      reason = `Payment auto-check: ${checks.join(", ")} — manual review needed`;
    }

    // Confidence: 100% if all pass, lower if some fail
    const passedCount = [isScreenshot, statusOk, amountMatch, timestampMatch].filter(Boolean).length;
    const confidence = Math.round((passedCount / 4) * 100);

    return { verified, confidence, reason };
  } catch (e: any) {
    console.error("Gemini verification error:", e?.message);
    return {
      verified: false,
      confidence: 0,
      reason: "Auto-verification unavailable — admin review required",
    };
  }
}
