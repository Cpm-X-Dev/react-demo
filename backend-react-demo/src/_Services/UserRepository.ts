/**
 * User Repository - Data access layer for users.
 *
 * Wraps the underlying data source (currently mock data).
 * In production, this would query a database.
 */

import {
    findUserByEmail as mockFindByEmail,
    findUserById as mockFindById,
    getAllUsers as mockGetAll,
} from "../_Models/_Mocks/mockUsers.js";
import type { IUserRepository } from "../_Models/Interfaces/IUserRepository.js";

export const UserRepository: IUserRepository = {
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    getAll: mockGetAll,
};
