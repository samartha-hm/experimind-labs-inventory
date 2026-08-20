import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { KitBom } from "./KitBom";

@Entity("kits")
export class Kit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  description?: string;

  @Column({ type: "varchar", nullable: true })
  image_url?: string;

  @OneToMany("KitBom", "kit")
  boms: KitBom[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}