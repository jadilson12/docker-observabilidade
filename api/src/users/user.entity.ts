import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  cep: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  logradouro: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  numero: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  complemento: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  bairro: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  cidade: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true, default: null })
  estado: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
