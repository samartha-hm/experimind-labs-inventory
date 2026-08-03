import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from "typeorm";

@Entity("settings")
@Unique(["setting_type", "value"])
export class Setting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: ["category", "room", "shelf", "box"],
  })
  setting_type: string;

  @Column({ type: "varchar" })
  value: string;
}