import Image from "next/image";

type PayableOrder = { total_amount?: number | string; status?: string; razorpay_payment_id?: string };

export default function UpiPaymentLink({ order }: { order: PayableOrder }) {
  const address = process.env.NEXT_PUBLIC_UPI_PAYEE_ADDRESS?.trim();
  const amount = Number(order.total_amount);
  if (!address || !Number.isFinite(amount) || amount <= 0 || order.status !== "created" || order.razorpay_payment_id) return null;
  const href = `upi://pay?pa=${encodeURIComponent(address)}&pn=Experimind%20Labs&am=${amount.toFixed(2)}&cu=INR`;
  return <div className="flex flex-wrap items-center gap-2">
    <a className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition" href={href}>Pay by UPI</a>
    <span className="text-sm font-semibold tabular-nums">{amount.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</span>
    <details className="w-full text-xs">
      <summary className="w-fit cursor-pointer rounded-lg px-2 py-1 font-semibold underline">Show payment QR</summary>
      <Image src="/assets/payment-qr.jpeg" alt="Experimind Labs UPI payment QR code" width={200} height={200} unoptimized className="mt-2 h-auto rounded-lg border bg-white p-2" />
    </details>
  </div>;
}
