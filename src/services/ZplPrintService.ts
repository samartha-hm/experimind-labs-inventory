export interface ZplItemLabelParams {
  itemName: string;
  sku: string;
  category?: string;
  binLocation?: string;
  basePrice?: number;
  lotNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  barcodeValue: string;
}

export class ZplPrintService {
  /**
   * Generates standard 4x2 inch (812x406 dots at 203 DPI) industrial Zebra ZPL-II label code
   */
  public static generateItemLabelZpl(params: ZplItemLabelParams): string {
    const safeName = params.itemName.replace(/[\^~]/g, "").slice(0, 32);
    const safeSku = params.sku.replace(/[\^~]/g, "");
    const safeBin = (params.binLocation || "BAY-01").replace(/[\^~]/g, "");
    const safeLot = (params.lotNumber || "N/A").replace(/[\^~]/g, "");
    const safeExp = (params.expiryDate || "N/A").replace(/[\^~]/g, "");
    const safeBarcode = params.barcodeValue.replace(/[\^~]/g, "");

    return `^XA
^PW812
^LL406
^PON
^FO40,30^A0N,36,36^FDEXPERIMIND LABS INVENTORY^FS
^FO40,75^GB732,3,3^FS
^FO40,95^A0N,32,32^FD${safeName}^FS
^FO40,135^A0N,24,24^FDSKU: ${safeSku}^FS
^FO450,135^A0N,24,24^FDBIN: ${safeBin}^FS
^FO40,170^A0N,22,22^FDLOT: ${safeLot}^FS
^FO450,170^A0N,22,22^FDEXP: ${safeExp}^FS
^FO40,210^BY3,3,100^BCN,100,Y,N,N^FD${safeBarcode}^FS
^FO40,360^GB732,2,2^FS
^FO40,375^A0N,18,18^FDGMP / ISO 13485 TRACKED ASSET - AUTHORIZED USE ONLY^FS
^XZ`;
  }

  /**
   * Generates Bin / Rack Location Barcode Tag (3x1 inch)
   */
  public static generateBinLabelZpl(binCode: string, zoneName: string, warehouseCode: string): string {
    const cleanBin = binCode.replace(/[\^~]/g, "");
    const cleanZone = zoneName.replace(/[\^~]/g, "");
    const cleanWh = warehouseCode.replace(/[\^~]/g, "");

    return `^XA
^PW609
^LL203
^FO30,20^A0N,24,24^FD${cleanWh} | ${cleanZone}^FS
^FO30,55^A0N,44,44^FD${cleanBin}^FS
^FO30,110^BY3,2,60^BCN,60,N,N,N^FD${cleanBin}^FS
^XZ`;
  }
}
