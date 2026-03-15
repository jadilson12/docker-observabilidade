import type { AddressData, UserModel } from './user.model.js';

export interface UserPresenter {
  id: string;
  name: string;
  email: string;
  address: AddressData | null;
  createdAt: string;
  updatedAt: string;
}

export function toUserPresenter(model: UserModel): UserPresenter {
  return {
    id: model.id,
    name: model.name,
    email: model.email,
    address: model.address,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

export function toUserPresenterList(models: UserModel[]): UserPresenter[] {
  return models.map(toUserPresenter);
}
