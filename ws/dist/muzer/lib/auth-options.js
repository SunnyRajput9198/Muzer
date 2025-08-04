"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
var scrypt_1 = require("./scrypt");
var credentials_1 = require("next-auth/providers/credentials");
var auth_utils_1 = require("./auth-utils"); // ✅ Adjust the path if needed
var cridentials_schema_1 = require("../schema/cridentials-schema");
var library_1 = require("@prisma/client/runtime/library");
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
exports.authOptions = {
    providers: [
        (0, credentials_1.default)({
            credentials: {
                email: { type: "email" },
                password: { type: "password" }
            },
            authorize: function (credentials) {
                return __awaiter(this, void 0, void 0, function () {
                    var emailValidation, passwordValidation, user, hashedPassword, newUser, hashedPassword, authUser, passwordVerification, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!credentials || !credentials.email || !credentials.password) {
                                    return [2 /*return*/, null];
                                }
                                emailValidation = cridentials_schema_1.emailSchema.safeParse(credentials.email);
                                if (!emailValidation.success) {
                                    throw new Error("Invalid email");
                                }
                                passwordValidation = cridentials_schema_1.passwordSchema.safeParse(credentials.password);
                                if (!passwordValidation.success) {
                                    throw new Error(passwordValidation.error.issues[0].message);
                                }
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 10, , 11]);
                                return [4 /*yield*/, prisma.user.findUnique({
                                        where: { email: emailValidation.data }
                                    })];
                            case 2:
                                user = _a.sent();
                                if (!!user) return [3 /*break*/, 5];
                                return [4 /*yield*/, (0, scrypt_1.hash)(passwordValidation.data)];
                            case 3:
                                hashedPassword = _a.sent();
                                return [4 /*yield*/, prisma.user.create({
                                        data: {
                                            email: emailValidation.data,
                                            password: hashedPassword,
                                            provider: "Credentials"
                                        }
                                    })];
                            case 4:
                                newUser = _a.sent();
                                return [2 /*return*/, newUser];
                            case 5:
                                if (!!user.password) return [3 /*break*/, 8];
                                return [4 /*yield*/, (0, scrypt_1.hash)(passwordValidation.data)];
                            case 6:
                                hashedPassword = _a.sent();
                                return [4 /*yield*/, prisma.user.update({
                                        where: { email: emailValidation.data },
                                        data: { password: hashedPassword }
                                    })];
                            case 7:
                                authUser = _a.sent();
                                return [2 /*return*/, authUser];
                            case 8: return [4 /*yield*/, (0, scrypt_1.compare)(passwordValidation.data, user.password)];
                            case 9:
                                passwordVerification = _a.sent();
                                if (!passwordVerification) {
                                    throw new Error("Invalid password");
                                }
                                return [2 /*return*/, user];
                            case 10:
                                error_1 = _a.sent();
                                if (error_1 instanceof library_1.PrismaClientInitializationError) {
                                    throw new Error("Internal server error");
                                }
                                throw error_1;
                            case 11: return [2 /*return*/];
                        }
                    });
                });
            },
        })
    ],
    debug: true,
    // Redirect to custom login page
    pages: {
        signIn: "/auth"
    },
    // Secret used to sign the JWT token
    secret: (_a = process.env.NEXTAUTH_SECRET) !== null && _a !== void 0 ? _a : "secret",
    // Store session info in JWT instead of DB
    //what is sessionThe session callback is a function that NextAuth runs whenever a session is created or accessed — for example, when:1.A user logs in.2.The client requests their session (via getSession() or useSession()).
    session: {
        strategy: "jwt"
    },
    // Callback functions to control JWT/session logic
    callbacks: {
        jwt: function (_a) {
            return __awaiter(this, arguments, void 0, function (_b) {
                var creatorId, appToken;
                var token = _b.token, account = _b.account, user = _b.user;
                return __generator(this, function (_c) {
                    // Set user ID for session
                    if (user === null || user === void 0 ? void 0 : user.id) {
                        token.id = user.id;
                    }
                    // ✅ Generate your custom app token (only once)
                    if (!token.appToken && token.id) {
                        creatorId = user.id;
                        appToken = (0, auth_utils_1.generateAppToken)({ userId: token.id, creatorId: creatorId });
                        token.appToken = appToken;
                    }
                    return [2 /*return*/, token];
                });
            });
        },
        session: function (_a) {
            return __awaiter(this, arguments, void 0, function (_b) {
                var session = _b.session, token = _b.token;
                return __generator(this, function (_c) {
                    // Add user ID to session
                    console.log("✅ JWT in session callback:", token);
                    if (token.id)
                        session.user.id = token.id;
                    // ✅ Make appToken available to client-side code
                    if (token.appToken) {
                        session.user.token = token.appToken;
                    }
                    return [2 /*return*/, session];
                });
            });
        },
    }
};
