export function storefrontOrgId() {
  const org = process.env.STOREFRONT_ORG_ID;
  if (!org || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(org)) {
    throw new Error("Configure STOREFRONT_ORG_ID for the public shop");
  }
  return org;
}

export const publicItem = `inventory_items.organization_id = $1 AND is_sellable AND NOT is_hidden
  AND lower(coalesce(category, '')) NOT IN ('box', 'others')`;

export const availableToPromise = `greatest(0, quantity - coalesce(reserved_quantity, 0) -
  coalesce((select sum(current_quantity) from stock_lots
    where organization_id = inventory_items.organization_id and item_id = inventory_items.id
      and status = 'QUARANTINE'), 0))`;
