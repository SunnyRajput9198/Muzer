"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAppToken = exports.generateAppToken = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
// ✅ Utility to generate token with provided secret (optional fallback to env)
var generateAppToken = function (payload, secret) {
    if (secret === void 0) { secret = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET; }
    if (!secret) {
        throw new Error("Missing JWT secret");
    }
    return jsonwebtoken_1.default.sign(payload, secret, {
        expiresIn: "24h",
    });
};
exports.generateAppToken = generateAppToken;
// ✅ Utility to verify token with provided secret (optional fallback to env)
var verifyAppToken = function (token, secret) {
    if (secret === void 0) { secret = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET; }
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (err) {
        console.error("Token verification failed:", err);
        return null;
    }
};
exports.verifyAppToken = verifyAppToken;
