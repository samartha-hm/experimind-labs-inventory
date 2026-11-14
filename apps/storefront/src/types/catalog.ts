export interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl?: string;
  description?: string;
  basePrice: number;
  price?: number;
  gradeLevel: string;
  stockQty: number;
  badge?: string;
  rating: number;
  reviewsCount: number;
}
export interface ShopLine {
  id: string;
  item_id: string;
  item_name: string;
  item?: CatalogProduct;
  quantity: number;
  unit_price: number;
}
export interface ShopOrder {
  id: string;
  invoice_number?: string;
  order_number: string;
  customer_address: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  carrier: string;
  tracking_number: string;
  razorpay_payment_id?: string;
  status: string;
  created_at: string;
  total_amount: number;
  lines: ShopLine[];
}
