import { IStorageRepository } from '../domain/IStorageRepository.js';

export class LocalStorageRepository extends IStorageRepository {
  getItem(key) {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  }

  setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key) {
    localStorage.removeItem(key);
  }
}
