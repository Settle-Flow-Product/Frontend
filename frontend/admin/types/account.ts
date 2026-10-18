import type { Role } from './role';

export interface Account {
  id: string;
  email: string;
  roles: Role[];
  active: boolean;
  tokenEpoch: number;
}
