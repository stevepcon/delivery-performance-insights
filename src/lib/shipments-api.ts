export const API_BASE =
  "https://script.google.com/macros/s/AKfycbzXYxQ-mFY0IXZNPnAFL4y8dSmeV-nvRTyg607wKVvnjLAt3Srk2l1UY2Une2Qat2X5CA/exec";

export interface Shipment {
  id: string;
  shipment_id: string;
  order_id: string;
  tracking_code: string;
  reference_number: string;
  order_date: string;
  promised_delivery_date: string;
  planned_pickup_datetime: string;
  order_state: string;
  boarding_complete: boolean;
  shipment_status: string;
  carrier: { name: string; country: string };
  carrier_service: string;
  carrier_tracking_url: string;
  warehouse: string;
  departure_country: string;
  incoterm: string;
  recipient_name: string;
  recipient_city: string;
  recipient_country: string;
  weight: number;
  goods_value: number;
  goods_value_currency: string;
  is_return: boolean;
  return_parcel: boolean;
  product_name: string;
  product_category: string;
  sales_price: number;
  qty: number;
  return_reason: string;
}

interface PageResponse {
  total: number;
  page: number;
  items_per_page: number;
  data: Shipment[];
}

export async function fetchShipmentsPage(page: number, itemsPerPage = 100): Promise<PageResponse> {
  const url = `${API_BASE}?path=/v2/shipments&page=${page}&itemsPerPage=${itemsPerPage}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** Fetch up to maxPages pages of shipments in parallel batches. */
export async function fetchAllShipments(
  maxPages = 10,
  itemsPerPage = 100,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Shipment[]> {
  const first = await fetchShipmentsPage(1, itemsPerPage);
  const totalPages = Math.min(maxPages, Math.ceil(first.total / itemsPerPage));
  const all: Shipment[] = [...first.data];
  onProgress?.(all.length, Math.min(first.total, maxPages * itemsPerPage));

  const batchSize = 4;
  for (let start = 2; start <= totalPages; start += batchSize) {
    const batch: Promise<PageResponse>[] = [];
    for (let p = start; p < start + batchSize && p <= totalPages; p++) {
      batch.push(fetchShipmentsPage(p, itemsPerPage));
    }
    const results = await Promise.all(batch);
    for (const r of results) all.push(...r.data);
    onProgress?.(all.length, Math.min(first.total, maxPages * itemsPerPage));
  }
  return all;
}