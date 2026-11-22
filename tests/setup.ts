import "@testing-library/jest-dom/vitest";
import { randomBytes } from "node:crypto";

process.env.AUTH_SECRET = randomBytes(48).toString("base64");
process.env.MOCK_USER_PASSWORD = randomBytes(24).toString("base64");
