export type VaultEntry = {
  id: string;
  title: string;
  username: string;
  email: string;
  password: string;
  website: string;
  description: string;
  notes: string;
  categories: string[];
  person: string;
  images: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type VaultData = {
  version: 1;
  entries: VaultEntry[];
};

export const newVault = (): VaultData => ({ version: 1, entries: [] });

export const blankEntry = (): VaultEntry => ({
  id: crypto.randomUUID(),
  title: '',
  username: '',
  email: '',
  password: '',
  website: '',
  description: '',
  notes: '',
  categories: [],
  person: '',
  images: [],
  favorite: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
});
