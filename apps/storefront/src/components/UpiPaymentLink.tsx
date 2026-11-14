type PayableOrder = { total_amount?: number | string; status?: string; razorpay_payment_id?: string };

export default function UpiPaymentLink({ order }: { order: PayableOrder }) {
  const address = process.env.NEXT_PUBLIC_UPI_PAYEE_ADDRESS?.trim();
  const amount = Number(order.total_amount);
  if (!address || !Number.isFinite(amount) || amount <= 0 || order.status !== "created" || order.razorpay_payment_id) return null;
  const href = `upi://pay?pa=${encodeURIComponent(address)}&pn=Experimind%20Labs&am=${amount.toFixed(2)}&cu=INR`;
  return <a className="font-semibold underline" href={href}>Pay by UPI</a>;
}
