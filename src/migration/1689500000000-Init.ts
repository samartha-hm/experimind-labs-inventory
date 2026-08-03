import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1689500000000 implements MigrationInterface {
    name = 'Init1689500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'editor', 'viewer', 'employee')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firebase_uid" varchar NOT NULL, "email" varchar NOT NULL, "name" varchar NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'viewer', "password_hash" varchar, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("firebase_uid"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be4" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inventory_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sku" varchar NOT NULL, "name" varchar NOT NULL, "description" varchar, "base_price" decimal NOT NULL, "price_markup_pct" integer NOT NULL DEFAULT 30, "quantity" integer NOT NULL, "unit" varchar NOT NULL DEFAULT 'pcs', "threshold" integer NOT NULL, "is_common" boolean NOT NULL DEFAULT false, "is_subassembly" boolean NOT NULL DEFAULT false, "is_sellable" boolean NOT NULL DEFAULT true, "is_hidden" boolean NOT NULL DEFAULT false, "image_url" varchar, "warehouse_id" uuid, "bin_location" varchar, "serial_number" varchar, "batch_number" varchar, "expiry_date" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_bef5b5f88df0d9f0f7b3c4e0f4e" UNIQUE ("sku"), CONSTRAINT "PK_c1da316b6d2084ef0a31b2d35a3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" varchar NOT NULL, "name" varchar NOT NULL, "address" jsonb, "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8d93ff879cd76add13b8f8b7f6e" UNIQUE ("code"), CONSTRAINT "PK_4d63fef6b4afe61663b1f5d7dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "warehouse_id" uuid NOT NULL, "code" varchar NOT NULL, "description" varchar, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5f367e97ec1994c87e4b94c7d7e" UNIQUE ("code"), CONSTRAINT "PK_431ea7c254f71120b3ec08b6ef3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "kits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" varchar NOT NULL, "description" varchar, "image_url" varchar, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5e588474cd915dbc79d3ca2e76f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "kit_bom" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kit_id" uuid NOT NULL, "inventory_item_id" uuid NOT NULL, "qty_per_kit" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9a8f4b2f2f9a3d4a8b7f5e4c3a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "vendors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vendor_code" varchar NOT NULL, "name" varchar NOT NULL, "contact_name" varchar, "email" varchar, "phone" varchar, "address" jsonb, "payment_terms" varchar, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_60f0a1d6e4b8f9c0d1e2f3a4b5c" UNIQUE ("vendor_code"), CONSTRAINT "PK_593356c3bab8b8b7b7a0b3e0f7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "po_number" varchar NOT NULL, "vendor_id" uuid NOT NULL, "order_date" date NOT NULL, "expected_date" date, "status" varchar NOT NULL DEFAULT 'draft', "total_amount" numeric(12,2) NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8d0a6d9b3c3d4e5f6a7b8c9d0e1" UNIQUE ("po_number"), CONSTRAINT "PK_6b012e3c4d5f6a7b8c9d0e1f2a3b4c5d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "purchase_order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_order_id" uuid NOT NULL, "inventory_item_id" uuid NOT NULL, "qty_ordered" integer NOT NULL, "qty_received" integer NOT NULL DEFAULT 0, "unit_cost" numeric(12,4) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customer_code" varchar NOT NULL, "name" varchar NOT NULL, "contact_name" varchar, "email" varchar, "phone" varchar, "billing_address" jsonb, "shipping_address" jsonb, "credit_limit" numeric(12,2) NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8d9e0f1a2b3c4d5e6f7g8h9i0j" UNIQUE ("customer_code"), CONSTRAINT "PK_9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sales_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "so_number" varchar NOT NULL, "customer_id" uuid NOT NULL, "order_date" date NOT NULL, "required_date" date, "status" varchar NOT NULL DEFAULT 'draft', "total_amount" numeric(12,2) NOT NULL DEFAULT 0, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9f0e1d2c3b4a5b6c7d8e9f0a1b2c3d" UNIQUE ("so_number"), CONSTRAINT "PK_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sales_order_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sales_order_id" uuid NOT NULL, "inventory_item_id" uuid NOT NULL, "qty_ordered" integer NOT NULL, "qty_picked" integer NOT NULL DEFAULT 0, "qty_shipped" integer NOT NULL DEFAULT 0, "unit_price" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "reference_type" varchar NOT NULL, "reference_uuid" uuid, "occurred_at" TIMESTAMP NOT NULL DEFAULT now(), "notes" varchar, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transaction_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_id" uuid NOT NULL, "inventory_item_id" uuid NOT NULL, "quantity_change" integer NOT NULL, "unit_cost" numeric(12,4) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "setting_type" varchar NOT NULL, "value" varchar NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e5f6a7b8c9d0e1f2a3b4c5d6e7f8g9h0" UNIQUE ("setting_type", "value"), CONSTRAINT "PK_e6f7a8b9c0d1e2f3a4b5c6d7e8f9g0h1" PRIMARY KEY ("id"))`);

        // Add foreign keys
        await queryRunner.query(`ALTER TABLE "inventory_items" ADD CONSTRAINT "FK_warehouse_inventory" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL`);
        await queryRunner.query(`ALTER TABLE "bins" ADD CONSTRAINT "FK_bin_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "kit_bom" ADD CONSTRAINT "FK_kit_bom_kit" FOREIGN KEY ("kit_id") REFERENCES "kits"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "kit_bom" ADD CONSTRAINT "FK_kit_bom_inventory" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "FK_po_vendor" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_poline_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "FK_poline_inventory" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sales_orders" ADD CONSTRAINT "FK_so_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sales_order_lines" ADD CONSTRAINT "FK_soline_so" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sales_order_lines" ADD CONSTRAINT "FK_soline_inventory" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_transaction_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "transaction_lines" ADD CONSTRAINT "FK_tline_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE`);
        await queryRunner.query(`ALTER TABLE "transaction_lines" ADD CONSTRAINT "FK_tline_inventory" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "transaction_lines"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TABLE "sales_order_lines"`);
        await queryRunner.query(`DROP TABLE "sales_orders"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP TABLE "purchase_order_lines"`);
        await queryRunner.query(`DROP TABLE "purchase_orders"`);
        await queryRunner.query(`DROP TABLE "vendors"`);
        await queryRunner.query(`DROP TABLE "kit_bom"`);
        await queryRunner.query(`DROP TABLE "kits"`);
        await queryRunner.query(`DROP TABLE "bins"`);
        await queryRunner.query(`DROP TABLE "warehouses"`);
        await queryRunner.query(`DROP TABLE "inventory_items"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }
}