const express = require("express");
const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");
const QRCode = require("qrcode");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB connect
const { DB_USER, DB_PASS, DB_NAME } = process.env;
const uri = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_NAME}.gjrjyxv.mongodb.net/?retryWrites=true&w=majority&appName=${DB_NAME}`;

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(uri);
    console.log("MongoDB connected");
    return cachedConnection;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}

// Model: database 'shortenurl', collection 'link'
const linkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    clicks: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
  },
  { collection: "link", timestamps: { createdAt: true, updatedAt: true } }
);

const Link = mongoose.models.Link || mongoose.model("Link", linkSchema);

// Helpers
const nanoid = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  7
);

function toAbsoluteUrl(req, code) {
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}/${code}`;
}

function normalizeUrl(url) {
  try {
    if (!/^https?:\/\//i.test(url)) {
      return `http://${url}`;
    }
    return url;
  } catch {
    return url;
  }
}

module.exports = async (req, res) => {
  await connectDB();

  if (req.method === "POST" && req.url === "/api/shorten") {
    try {
      const { url } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing url" });
      }

      const originalUrl = normalizeUrl(url.trim());
      try {
        new URL(originalUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      let code;
      for (let i = 0; i < 5; i++) {
        code = nanoid();
        const exists = await Link.exists({ code });
        if (!exists) break;
        code = null;
      }
      if (!code)
        return res.status(500).json({ error: "Failed to generate code" });

      const link = await Link.create({ code, originalUrl });
      const shortUrl = toAbsoluteUrl(req, link.code);
      const qrcode = await QRCode.toDataURL(shortUrl);

      return res.json({
        code: link.code,
        originalUrl: link.originalUrl,
        shortUrl,
        clicks: link.clicks,
        createdAt: link.createdAt,
        qrcode,
      });
    } catch (err) {
      console.error("/api/shorten error", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(404).json({ error: "Not found" });
};
