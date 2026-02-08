import type { IUser } from "../Interfaces/IUser.js";

/**
 * Mock users for demo/educational purposes.
 *
 * In production, users would come from a database.
 * Passwords here are stored as plain text for readability,
 * but will be hashed when the auth system initializes.
 */

interface MockUserSeed {
    id: string;
    email: string;
    password: string; // Plain text - will be hashed
    role: string;
}

// Seed data with plain passwords (for demo readability)
const MOCK_USER_SEEDS: MockUserSeed[] = [
    {
        id: "user-1",
        email: "demo@example.com",
        password: "password123",
        role: "user",
    },
    {
        id: "user-2",
        email: "admin@example.com",
        password: "admin123",
        role: "admin",
    },
];

// Storage for users with hashed passwords
const userStore = new Map<string, IUser>();

/**
 * Initialize mock users with hashed passwords.
 * Call this once at server startup.
 */
export const initializeMockUsers = async (
    hashFunction: (password: string) => Promise<string>
): Promise<void> => {
    for (const seed of MOCK_USER_SEEDS) {
        const hashedPassword = await hashFunction(seed.password);

        const user: IUser = {
            id: seed.id,
            email: seed.email,
            passwordHash: hashedPassword,
            role: seed.role,
        };

        userStore.set(user.email, user);
    }

    console.log(`✅ Initialized ${userStore.size} mock user(s)`);
};

/**
 * Find a user by email.
 */
export const findUserByEmail = (email: string): IUser | undefined => {
    return userStore.get(email);
};

/**
 * Find a user by ID.
 */
export const findUserById = (id: string): IUser | undefined => {
    for (const user of userStore.values()) {
        if (user.id === id) {
            return user;
        }
    }
    return undefined;
};

/**
 * Get all mock users (for debugging).
 */
export const getAllUsers = (): IUser[] => {
    return Array.from(userStore.values());
};
