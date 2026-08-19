import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageRole } from '../enum/message.enum';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  conversation!: Conversation;

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  intent?: string;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
  })
  intentConfidence?: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  promptVersion?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
