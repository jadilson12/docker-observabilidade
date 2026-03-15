import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { AppDataSource } from '../data-source.js';
import { User } from '../../users/user.entity.js';

const users = [
  { name: 'Alice Silva', email: 'alice@example.com' },
  { name: 'Bob Souza', email: 'bob@example.com' },
  { name: 'Carol Oliveira', email: 'carol@example.com' },
  { name: 'Dan Costa', email: 'dan@example.com' },
  { name: 'Eva Martins', email: 'eva@example.com' },
];

async function seed() {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(User);

  for (const data of users) {
    const exists = await repo.findOneBy({ email: data.email });
    if (!exists) {
      await repo.save(repo.create({ id: randomUUID(), ...data }));
      console.log(`Criado: ${data.email}`);
    } else {
      console.log(`Já existe: ${data.email}`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seed concluído.');
}

seed().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
