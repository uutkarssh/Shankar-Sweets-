import QRCode from 'qrcode'

export const UPI_CONFIG = {
  payeeId: process.env.UPI_PAYEE_ID ?? 'vishalagrahari7317@okaxis',
  payeeName: process.env.UPI_PAYEE_NAME ?? 'Shankar Sweets',
}

/**
 * Build the upi:// deep link for a payment.
 * All params are URL-encoded per the UPI spec.
 */
export function buildUpiDeepLink(params: {
  payeeId: string
  payeeName: string
  amount: number
  txnRef: string
  note?: string
}): string {
  const { payeeId, payeeName, amount, txnRef, note } = params
  const u = (s: string) => encodeURIComponent(s)
  const amountStr = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  const parts = [
    `pa=${u(payeeId)}`,
    `pn=${u(payeeName)}`,
    `am=${u(amountStr)}`,
    `tn=${u(note ?? `Order ${txnRef}`)}`,
    `tr=${u(txnRef)}`,
  ]
  return `upi://pay?${parts.join('&')}`
}

/**
 * Generate a QR code as a base64 data URL (image/png) from any string.
 * Used to render the UPI deep link as a scannable QR for desktop users.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
