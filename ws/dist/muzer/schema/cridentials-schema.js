"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
exports.emailSchema = zod_1.z
    .string({ message: "Email is required" })
    .email({ message: "Invalid email" });
exports.passwordSchema = zod_1.z
    .string({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
});
