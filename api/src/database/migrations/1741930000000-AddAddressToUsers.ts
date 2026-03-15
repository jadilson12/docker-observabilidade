import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAddressToUsers1741930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({ name: 'cep', type: 'varchar', isNullable: true, default: null }),
      new TableColumn({ name: 'logradouro', type: 'varchar', isNullable: true, default: null }),
      new TableColumn({ name: 'numero', type: 'varchar', isNullable: true, default: null }),
      new TableColumn({ name: 'complemento', type: 'varchar', isNullable: true, default: null }),
      new TableColumn({ name: 'bairro', type: 'varchar', isNullable: true, default: null }),
      new TableColumn({ name: 'cidade', type: 'varchar', isNullable: true, default: null }),
      new TableColumn({ name: 'estado', type: 'varchar', length: '2', isNullable: true, default: null }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('users', [
      'cep',
      'logradouro',
      'numero',
      'complemento',
      'bairro',
      'cidade',
      'estado',
    ]);
  }
}
