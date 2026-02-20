import mongoose from "mongoose";

const IamUserSchema = new mongoose.Schema({
    externalId: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, trim: true },
    active: { type: Boolean, default: true },
    roles: { type: [String], default: [] },
    perms: { type: [String], default: [] },
    provider: {
      type: String,
      enum: ["local", "auth0"],
      default: "auth0",
      index: true,
    },
    passwordHash: { type: String, select: false },
    passwordChangedAt: { type: Date },
    passwordExpiresAt: { type: Date },
    mustChangePassword: { type: Boolean, default: true },
    passwordResetCodeHash: { type: String, select: false },
    passwordResetCodeExpiresAt: { type: Date, select: false },
    passwordResetCodeAttempts: { type: Number, default: 0, select: false },
    passwordResetCodeLockedUntil: { type: Date, select: false },
    passwordResetCodeSentAt: { type: Date, select: false },
    passwordResetVerifiedAt: { type: Date, select: false },
  },
  { timestamps: true, collection: "iamusers" },
);

// Email único
IamUserSchema.index({ email: 1 }, { unique: true });

// externalId único (permite null/undefined)
IamUserSchema.index({ externalId: 1 }, { unique: true, sparse: true });

export default mongoose.model("IamUser", IamUserSchema);
