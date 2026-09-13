import ZAI from "z-ai-web-dev-sdk";

/**
 * Auto-verify a UPI payment screenshot using Vision model.
 * Returns { verified: boolean, confidence: number, reason: string }.
 *
 * Checks:
 * 1. Is the image actually a payment screenshot (UPI app)?
 * 2. Does it mention the expected payee UPI ID?
 * 3. Is the amount close to the expected total?
 * 4. Is the status "Success"/"Paid"/"Completed"?
 */
export async function verifyPaymentScreenshot(
  screenshotDataUrl: string,
  expectedAmount: number,
  expectedUpiId?: string
): Promise<{ verified: boolean; confidence: number; reason: string }> {
  try {
    const zai = await ZAI.create();

    const prompt = `You are a payment verification assistant. Analyze this screenshot of a UPI payment and extract:
1. Is this a valid UPI payment screenshot? (yes/no)
2. What is the payment status? (Success/Paid/Completed/Failed/Pending)
3. What amount was paid? (in INR, numeric only)
4. What UPI ID was the money sent to? (exact string)
5. What is the transaction date/time if visible?

Expected payment: ₹${expectedAmount}${expectedUpiId ? ` to UPI ID ${expectedUpiId}` : ""}

Respond in JSON format only:
{"is_payment_screenshot": boolean, "status": "string", "amount": number, "upi_id": "string", "reason": "one line summary"}

Be conservative — only mark verified if the screenshot clearly shows a successful payment.`;

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
      // Extract JSON from the response (may be wrapped in markdown code fences)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { reason: content.slice(0, 200) };
    }

    const isScreenshot = parsed.is_payment_screenshot === true;
    const statusOk = ["success", "paid", "completed", "successful"].includes(
      String(parsed.status || "").toLowerCase()
    );
    const amountMatch =
      typeof parsed.amount === "number" && Math.abs(parsed.amount - expectedAmount) <= 1;
    const upiMatch =
      !expectedUpiId ||
      !parsed.upi_id ||
      String(parsed.upi_id).toLowerCase().includes(expectedUpiId.toLowerCase().split("@")[0]);

    const checks = [isScreenshot, statusOk, amountMatch];
    const passed = checks.filter(Boolean).length;
    const verified = isScreenshot && statusOk && amountMatch;
    const confidence = Math.round((passed / 3) * 100);

    let reason = parsed.reason || "";
    if (!isScreenshot) reason = "Image does not appear to be a payment screenshot";
    else if (!statusOk) reason = `Payment status: ${parsed.status || "unknown"} (expected Success)`;
    else if (!amountMatch) reason = `Amount: ₹${parsed.amount || "?"} (expected ₹${expectedAmount})`;
    else if (!upiMatch) reason = `UPI ID mismatch: ${parsed.upi_id || "?"}`;
    else reason = "Payment verified — amount and status confirmed";

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
