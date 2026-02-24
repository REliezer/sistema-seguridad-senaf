import mongoose from "mongoose";

const SystemParameterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: ["security", "password", "general", "system"],
      default: "general",
      index: true,
    },
    dataType: {
      type: String,
      enum: ["string", "number", "boolean"],
      default: "string",
    },
    updatedBy: {
      type: String,
      trim: true,
      default: "system",
    },
  },
  { timestamps: true, collection: "system_parameters" }
);

export default mongoose.model("SystemParameter", SystemParameterSchema);
