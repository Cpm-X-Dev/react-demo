import type { IUser } from "./IUser.js";

export interface IUserRepository {
    findByEmail: (email: string) => IUser | undefined;
    findById: (id: string) => IUser | undefined;
    getAll: () => IUser[];
}