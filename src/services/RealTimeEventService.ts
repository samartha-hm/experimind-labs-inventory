import { Response } from "express";

export interface RealTimeEventPayload {
  type: "STOCK_UPDATE" | "PO_UPDATE" | "SO_UPDATE" | "TRANSFER_UPDATE" | "CYCLE_COUNT_UPDATE" | "QMS_ALERT" | "HEARTBEAT";
  organizationId: string;
  data: any;
  timestamp: string;
}

interface ConnectedClient {
  id: string;
  organizationId: string;
  userId: string;
  res: Response;
}

export class RealTimeEventService {
  private static clients: Map<string, ConnectedClient> = new Map();
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  public static initialize() {
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        this.broadcastHeartbeat();
      }, 25000); // 25s keepalive
    }
  }

  public static registerClient(id: string, organizationId: string, userId: string, res: Response) {
    this.clients.set(id, { id, organizationId, userId, res });

    // Send initial handshake event
    const handshakeEvent: RealTimeEventPayload = {
      type: "HEARTBEAT",
      organizationId,
      data: { message: "Connected to Experimind Live Realtime Event Stream", clientId: id },
      timestamp: new Date().toISOString(),
    };
    this.sendEventToResponse(res, handshakeEvent);
  }

  public static unregisterClient(id: string) {
    this.clients.delete(id);
  }

  public static broadcastEvent(event: RealTimeEventPayload) {
    const targetOrgId = event.organizationId;
    for (const [, client] of this.clients) {
      if (client.organizationId === targetOrgId || targetOrgId === "00000000-0000-0000-0000-000000000000") {
        this.sendEventToResponse(client.res, event);
      }
    }
  }

  public static broadcastStockUpdate(orgId: string, itemId: string, newQty: number, binLocation?: string) {
    this.broadcastEvent({
      type: "STOCK_UPDATE",
      organizationId: orgId,
      data: { itemId, quantity: newQty, binLocation },
      timestamp: new Date().toISOString(),
    });
  }

  private static broadcastHeartbeat() {
    const timestamp = new Date().toISOString();
    for (const [, client] of this.clients) {
      this.sendEventToResponse(client.res, {
        type: "HEARTBEAT",
        organizationId: client.organizationId,
        data: { ping: true },
        timestamp,
      });
    }
  }

  private static sendEventToResponse(res: Response, payload: RealTimeEventPayload) {
    try {
      res.write(`event: ${payload.type}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // Stream may have closed
    }
  }
}

RealTimeEventService.initialize();
