/**
 * Tests for password hashing, verification, and strength validation
 */

import { describe, expect, it } from "vitest";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../password";

const BCRYPT_TEST_TIMEOUT_MS = 20_000;

// ============================================================
// hashPassword() - BCrypt Hashing
// ============================================================

describe("hashPassword", () => {
  it(
    "should return a string different from the input",
    async () => {
      const password = "MySecurePassword123!";
      const hashed = await hashPassword(password);
      expect(hashed).toBeTypeOf("string");
      expect(hashed).not.toBe(password);
    },
    BCRYPT_TEST_TIMEOUT_MS,
  );

  it(
    "should return a valid bcrypt hash",
    async () => {
      const hashed = await hashPassword("TestPassword1!");
      // bcrypt hashes start with $2a$ or $2b$
      expect(hashed).toMatch(/^\$2[ab]\$/);
    },
    BCRYPT_TEST_TIMEOUT_MS,
  );

  it(
    "should produce different hashes for the same password (unique salts)",
    async () => {
      const password = "SamePassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    },
    BCRYPT_TEST_TIMEOUT_MS,
  );
});

// ============================================================
// verifyPassword() - BCrypt Comparison
// ============================================================

describe("verifyPassword", () => {
  it(
    "should return true for a correct password",
    async () => {
      const password = "CorrectPassword123!";
      const hashed = await hashPassword(password);
      const result = await verifyPassword(password, hashed);
      expect(result).toBe(true);
    },
    BCRYPT_TEST_TIMEOUT_MS,
  );

  it(
    "should return false for an incorrect password",
    async () => {
      const password = "CorrectPassword123!";
      const hashed = await hashPassword(password);
      const result = await verifyPassword("WrongPassword456!", hashed);
      expect(result).toBe(false);
    },
    BCRYPT_TEST_TIMEOUT_MS,
  );

  it(
    "should return false for an empty password against a valid hash",
    async () => {
      const hashed = await hashPassword("SomePassword123!");
      const result = await verifyPassword("", hashed);
      expect(result).toBe(false);
    },
    BCRYPT_TEST_TIMEOUT_MS,
  );
});

// ============================================================
// validatePasswordStrength() - Strength Validation
// ============================================================

describe("validatePasswordStrength", () => {
  // ==========================================
  // Failure Branches
  // ==========================================

  describe("Failure Branches", () => {
    it("should fail when password is too short (< 12 chars)", () => {
      const result = validatePasswordStrength("Aa1!short");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 12 characters");
    });

    it("should fail when missing a lowercase letter", () => {
      const result = validatePasswordStrength("ALLUPPERCASE1234!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain a lowercase letter");
    });

    it("should fail when missing an uppercase letter", () => {
      const result = validatePasswordStrength("alllowercase1234!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain an uppercase letter");
    });

    it("should fail when missing a number", () => {
      const result = validatePasswordStrength("NoNumbersHere!@#$");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain a number");
    });

    it("should fail when missing a special character", () => {
      const result = validatePasswordStrength("NoSpecialChar123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain a special character");
    });

    it("should return multiple errors for a very weak password", () => {
      const result = validatePasswordStrength("abc");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================
  // Valid Passwords
  // ==========================================

  describe("Valid Passwords", () => {
    it("should pass for a strong password meeting all criteria", () => {
      const result = validatePasswordStrength("StrongPass123!@");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should pass for a password with exactly 12 characters", () => {
      const result = validatePasswordStrength("Abcdefgh12!!");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
