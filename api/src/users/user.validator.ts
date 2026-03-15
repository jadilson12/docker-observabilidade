import { UnprocessableEntityException } from '@nestjs/common';
import { Email } from '../common/domain/email.vo.js';
import { UserFields } from './user.model.js';

const NAME_MIN = 2;
const NAME_MAX = 100;

export function validateUserOrThrow(data: Partial<UserFields>): void {
  const errors: { field: string; message: string }[] = [];

  if (data.name !== undefined) {
    const v = data.name.trim();
    if (!v) {
      errors.push({ field: 'name', message: 'nome não pode ser vazio' });
    } else if (v.length < NAME_MIN) {
      errors.push({
        field: 'name',
        message: `nome deve ter ao menos ${NAME_MIN} caracteres`,
      });
    } else if (v.length > NAME_MAX) {
      errors.push({
        field: 'name',
        message: `nome deve ter no máximo ${NAME_MAX} caracteres`,
      });
    }
  }

  if (data.email !== undefined) {
    if (!data.email.trim()) {
      errors.push({ field: 'email', message: 'e-mail não pode ser vazio' });
    } else if (!Email.isValid(data.email)) {
      errors.push({ field: 'email', message: 'e-mail inválido' });
    }
  }

  if (errors.length > 0) throw new UnprocessableEntityException(errors);
}
