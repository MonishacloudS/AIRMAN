/**
 * Email notification stub (console logger).
 * Replace with real SMTP/SendGrid in production.
 */
export function sendEmailStub(params: {
  to: string;
  subject: string;
  body: string;
  correlationId?: string;
}): void {
  const ts = new Date().toISOString();
  console.log(`[EMAIL-STUB] ${ts} correlationId=${params.correlationId ?? "n/a"}`);
  console.log(`  To: ${params.to}`);
  console.log(`  Subject: ${params.subject}`);
  console.log(`  Body: ${params.body}`);
}
