/**
 * Experimind Labs Inventory & WMS API — OpenAPI 3.0 Specification
 */

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Experimind Labs Inventory Platform API",
    version: "1.0.0",
    description: `
Enterprise-grade multi-tenant Inventory, Warehouse, and Quality Management System API.
Features immutable stock ledger with pessimistic locking, GS1-128 barcode encoding, 21 CFR Part 11 e-signatures, and hash-chained audit trails.
    `,
    contact: {
      name: "Experimind Labs Engineering",
      email: "support@experimindlabs.com",
      url: "https://inventory.experimindlabs.com"
    }
  },
  servers: [
    {
      url: "/api/v1",
      description: "Primary v1 API (Relative)"
    },
    {
      url: "https://inventory.experimindlabs.com/api/v1",
      description: "Production Server"
    },
    {
      url: "http://localhost:3000/api/v1",
      description: "Local Development Server"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Bearer token obtained from /auth/login"
      },
      TenantHeader: {
        type: "apiKey",
        in: "header",
        name: "x-organization-id",
        description: "Optional tenant organization ID override (defaults to user token org)"
      }
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
          message: { type: "string" }
        }
      },
      InventoryItem: {
        type: "object",
        properties: {
          id: { type: "string", example: "item_123" },
          name: { type: "string", example: "Digital Multimeter Pro" },
          sku: { type: "string", example: "SKU-DMM-001" },
          category: { type: "string", example: "Electronics" },
          quantity: { type: "number", example: 45 },
          threshold: { type: "number", example: 10 },
          unit: { type: "string", example: "pcs" },
          unitCost: { type: "number", example: 450.00 },
          basePrice: { type: "number", example: 650.00 },
          binLocation: { type: "string", example: "A-01-RACK-2" },
          barcode: { type: "string", example: "EL-5" }
        }
      },
      StockAdjustment: {
        type: "object",
        required: ["delta"],
        properties: {
          delta: { type: "number", example: 5, description: "Positive to add stock, negative to deduct" },
          reason: { type: "string", example: "Received supplier replenishment shipment" },
          referenceId: { type: "string", example: "PO-2026-081" }
        }
      },
      StockLedgerEntry: {
        type: "object",
        properties: {
          id: { type: "string" },
          inventory_item_id: { type: "string" },
          transaction_type: { type: "string", enum: ["PURCHASE_RECEIPT", "SO_FULFILLMENT", "CYCLE_COUNT_ADJUSTMENT", "SCRAP", "TRANSFER_IN", "TRANSFER_OUT"] },
          quantity_delta: { type: "number" },
          running_balance: { type: "number" },
          unit_cost: { type: "number" },
          reference_id: { type: "string" },
          notes: { type: "string" },
          created_at: { type: "string", format: "date-time" }
        }
      },
      SerialNumber: {
        type: "object",
        properties: {
          id: { type: "string" },
          serialNumber: { type: "string", example: "SN-98234-EXP" },
          inventoryItemId: { type: "string" },
          status: { type: "string", enum: ["IN_STOCK", "ALLOCATED", "INSTALLED", "IN_TRANSIT", "RMA_RETURNED", "SCRAPPED"] },
          warehouseId: { type: "string" },
          binId: { type: "string" },
          batchNumber: { type: "string" },
          unitCost: { type: "number" }
        }
      },
      QualityInspection: {
        type: "object",
        properties: {
          id: { type: "string" },
          inspectionNumber: { type: "string", example: "QI-2026-0042" },
          itemId: { type: "string" },
          lotNumber: { type: "string" },
          status: { type: "string", enum: ["PENDING_INSPECTION", "IN_PROGRESS", "PASSED", "FAILED", "CONDITIONALLY_RELEASED"] },
          defectCount: { type: "number", example: 0 },
          inspectorName: { type: "string" }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    "/auth/login": {
      post: {
        summary: "User Authentication & JWT Token Issuance",
        tags: ["Authentication"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@experimindlabs.com" },
                  password: { type: "string", example: "AdminPass123!" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Login successful with JWT access token and user claims",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string" },
                    refreshToken: { type: "string" },
                    user: { type: "object" }
                  }
                }
              }
            }
          },
          401: { description: "Invalid credentials or account locked" }
        }
      }
    },
    "/auth/refresh-token": {
      post: {
        summary: "Silent Refresh Token Rotation",
        tags: ["Authentication"],
        security: [],
        responses: {
          200: { description: "New access token generated" },
          401: { description: "Invalid or expired refresh token" }
        }
      }
    },
    "/inventory": {
      get: {
        summary: "List Inventory Items with Filtering & Pagination",
        tags: ["Inventory Core"],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Page number" },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "Items per page" },
          { name: "q", in: "query", schema: { type: "string" }, description: "Search query across name, SKU, and barcode" },
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by category" }
        ],
        responses: {
          200: {
            description: "Array of inventory items with real-time stock levels",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/InventoryItem" }
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Create New Inventory Catalog Item",
        tags: ["Inventory Core"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InventoryItem" }
            }
          }
        },
        responses: {
          201: { description: "Item created successfully" }
        }
      }
    },
    "/inventory/{id}/adjust": {
      post: {
        summary: "Post Concurrency-Safe Stock Adjustment via Immutable Ledger",
        tags: ["Inventory Core"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StockAdjustment" }
            }
          }
        },
        responses: {
          200: { description: "Stock balance updated in ACID transaction" }
        }
      }
    },
    "/stock-ledger": {
      get: {
        summary: "Audit Trail of Immutable Stock Movements",
        tags: ["Stock Ledger"],
        parameters: [
          { name: "itemId", in: "query", schema: { type: "string" } },
          { name: "transactionType", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } }
        ],
        responses: {
          200: {
            description: "Chronological ledger transactions with running balance",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/StockLedgerEntry" }
                }
              }
            }
          }
        }
      }
    },
    "/serials/lookup/{serialNumber}": {
      get: {
        summary: "Single Serial Number Lookup for Barcode Scanner & Pedigree Audit",
        tags: ["Serial Numbers"],
        parameters: [
          { name: "serialNumber", in: "path", required: true, schema: { type: "string" }, example: "EL-15" }
        ],
        responses: {
          200: {
            description: "Serial number details or null if not serialized",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/SerialNumber" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/qms/inspections": {
      get: {
        summary: "List Quality Inspections",
        tags: ["Quality Management (QMS)"],
        responses: {
          200: {
            description: "Quality inspection records",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/QualityInspection" }
                }
              }
            }
          }
        }
      }
    },
    "/warehouse": {
      get: {
        summary: "List Warehouses and Storage Zones",
        tags: ["Warehouse Management"],
        responses: {
          200: { description: "Active warehouse facilities" }
        }
      }
    },
    "/audit-events/verify": {
      get: {
        summary: "Cryptographic SHA-256 Hash Chain Integrity Verification",
        tags: ["Compliance & Audit"],
        responses: {
          200: {
            description: "Verification results confirming zero tampering across event sequence",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    isChainValid: { type: "boolean" },
                    totalEvents: { type: "number" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/bom/tree/{itemId}": {
      get: {
        summary: "Recursive Multi-Level BOM Assembly Tree",
        tags: ["Hardware & BOM"],
        parameters: [
          { name: "itemId", in: "path", required: true, schema: { type: "string" }, description: "Parent PCBA / Assembly Item UUID" }
        ],
        responses: {
          200: {
            description: "Full hierarchical assembly tree with live stock health, scrap compounding, and alternate components",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } }
          }
        }
      }
    },
    "/bom/shortage-analysis/{itemId}": {
      get: {
        summary: "Production Run Shortage & Alternate Feasibility Analyzer",
        tags: ["Hardware & BOM"],
        parameters: [
          { name: "itemId", in: "path", required: true, schema: { type: "string" } },
          { name: "quantity", in: "query", schema: { type: "integer", default: 10 }, description: "Target production batch size" }
        ],
        responses: {
          200: { description: "Production run shortage analysis with alternate parts resolution" }
        }
      }
    },
    "/bom/ingest-cad": {
      post: {
        summary: "Ingest and Parse EDA CAD BOM (KiCad, Altium, EasyEDA, CSV)",
        tags: ["Hardware & BOM"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["csvContent"],
                properties: {
                  csvContent: { type: "string", description: "Raw CSV/TSV contents from CAD tool" },
                  formatHint: { type: "string", enum: ["AUTO", "KICAD", "ALTIUM", "EASYEDA", "GENERIC"], default: "AUTO" },
                  parentItemId: { type: "string", description: "Optional parent assembly item ID to calculate BOM diff" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Parsed CAD components with expanded reference designators and catalog auto-matching" }
        }
      }
    },
    "/hardware/workbench": {
      get: {
        summary: "High-Density Component Workbench Query",
        tags: ["Hardware & Electronics Lab"],
        parameters: [
          { name: "footprint", in: "query", schema: { type: "string" }, description: "Filter by package footprint (e.g. 0603, QFN-32)" },
          { name: "mountingType", in: "query", schema: { type: "string", enum: ["SMD", "THT", "CHASSIS", "PANEL", "OTHER"] } },
          { name: "mslRating", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by MPN, SKU, or name" }
        ],
        responses: {
          200: { description: "List of electronic components with lot reels, MSL status, and stock availability" }
        }
      }
    },
    "/hardware/lots/{id}/split": {
      post: {
        summary: "Reel Fractionation (Split Reel to Cut-Tape)",
        tags: ["Hardware & Electronics Lab"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Master Reel StockLot UUID" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["splitQuantity"],
                properties: {
                  splitQuantity: { type: "number", example: 50 },
                  targetPackageType: { type: "string", enum: ["CUT_TAPE", "FULL_REEL", "TUBE_STICK", "TRAY", "BULK_BAG", "SAMPLE_BOX"], default: "CUT_TAPE" },
                  targetFeederSlot: { type: "string", example: "F-04B" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Created child lot with inherited pedigree and 2D GS1/DataMatrix barcode data" }
        }
      }
    },
    "/hardware/lots/{id}/msl-action": {
      post: {
        summary: "Update Moisture Sensitivity Level (MSL) Exposure State",
        tags: ["Hardware & Electronics Lab"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["OPEN", "SEAL", "BAKE"] },
                  bakeTempC: { type: "number", example: 125 },
                  bakeHours: { type: "number", example: 24 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Updated MSL exposure timer and bake history" }
        }
      }
    },
    "/inventory/{id}/valuation": {
      get: {
        summary: "Real-Time Stock Valuation (FIFO Layers & Moving Average Cost)",
        tags: ["Valuation & Cost Accounting"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Inventory Item UUID" }
        ],
        responses: {
          200: {
            description: "Detailed valuation breakdown including moving average unit cost and FIFO cost layers",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    itemId: { type: "string" },
                    itemSku: { type: "string" },
                    itemName: { type: "string" },
                    totalQuantity: { type: "number" },
                    movingAverageCost: { type: "number" },
                    totalMovingAverageValue: { type: "number" },
                    totalFifoValue: { type: "number" },
                    layers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          lotNumber: { type: "string" },
                          receivedDate: { type: "string" },
                          quantity: { type: "number" },
                          unitCost: { type: "number" },
                          totalLayerValue: { type: "number" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/inventory/{id}/cogs-preview": {
      post: {
        summary: "Simulate COGS Consumption Breakdown (FIFO or Moving Average)",
        tags: ["Valuation & Cost Accounting"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: { type: "number", example: 50 },
                  strategy: { type: "string", enum: ["FIFO", "MOVING_AVERAGE"], default: "FIFO" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Simulated COGS with layer-by-layer depletion breakdown"
          }
        }
      }
    },
    "/wms/allocate-lots": {
      post: {
        summary: "FEFO / FIFO Batch Lot Allocation for Warehouse Picking",
        tags: ["Warehouse Operations"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["itemId", "requestedQty"],
                properties: {
                  itemId: { type: "string" },
                  requestedQty: { type: "number", example: 100 },
                  strategy: { type: "string", enum: ["FEFO", "FIFO"], default: "FEFO" }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Recommended picking lots ordered by earliest expiration date (FEFO) or receipt date (FIFO)"
          }
        }
      }
    },
    "/report/reorder-recommendations": {
      get: {
        summary: "Dynamic Demand Forecasting, 30-Day Velocity & Reorder Recommendations",
        tags: ["Reports & Analytics"],
        parameters: [
          { name: "leadTimeDays", in: "query", schema: { type: "integer", default: 7 } },
          { name: "serviceLevelZ", in: "query", schema: { type: "number", default: 1.65 } }
        ],
        responses: {
          200: {
            description: "Comprehensive replenishment forecast with dynamic reorder points and urgency badges"
          }
        }
      }
    }
  }
};

/**
 * Generates lightweight, standalone HTML page rendering Swagger UI via CDN
 */
export function renderSwaggerUiHtml(specEndpoint: string = "/api/docs/openapi.json"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Experimind Labs API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    body { margin: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { color: #38bdf8 !important; }
    .swagger-ui { color: #f8fafc; }
    .swagger-ui .scheme-container { background: #1e293b; box-shadow: none; border-bottom: 1px solid #334155; }
    .swagger-ui select { background: #0f172a; color: #f8fafc; border: 1px solid #475569; }
    .swagger-ui .opblock { border-radius: 12px; border: 1px solid #334155; margin-bottom: 12px; }
    .swagger-ui .opblock .opblock-summary { padding: 10px 16px; }
    .swagger-ui .btn.authorize { background: #6366f1; color: white; border-color: #4f46e5; border-radius: 8px; }
    .swagger-ui .btn.authorize svg { fill: white; }
    .swagger-ui .opblock.opblock-get { background: rgba(14, 165, 233, 0.08); border-color: rgba(14, 165, 233, 0.4); }
    .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.4); }
    .swagger-ui .opblock.opblock-put, .swagger-ui .opblock.opblock-patch { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.4); }
    .swagger-ui .opblock.opblock-delete { background: rgba(244, 63, 94, 0.08); border-color: rgba(244, 63, 94, 0.4); }
    .swagger-ui input[type=text], .swagger-ui textarea { background: #1e293b; color: #f8fafc; border: 1px solid #475569; border-radius: 6px; }
    .swagger-ui table thead tr th { color: #94a3b8; }
    .swagger-ui .responses-inner { background: #0f172a; border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '${specEndpoint}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        persistAuthorization: true,
        displayRequestDuration: true
      });
    };
  </script>
</body>
</html>`;
}
