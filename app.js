const express = require("express");
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// DB connect
const { DB_USER, DB_PASS, DB_NAME } = process.env;
const uri = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_NAME}.gjrjyxv.mongodb.net/?retryWrites=true&w=majority&appName=${DB_NAME}`;

mongoose
  .connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

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

const Link = mongoose.model("Link", linkSchema);

// Helpers
const generateCode = () => nanoid(7);

function toAbsoluteUrl(req, code) {
  const host = req.get("host");
  const protocol = req.protocol;
  return `${protocol}://${host}/${code}`;
}

function normalizeUrl(url) {
  try {
    // If no protocol, assume http
    if (!/^https?:\/\//i.test(url)) {
      return `http://${url}`;
    }
    return url;
  } catch {
    return url;
  }
}

// Routes
// POST /api/shorten -> create short URL and return QR code data URL
app.post("/api/shorten", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url" });
    }

    const originalUrl = normalizeUrl(url.trim());
    try {
      // Validate URL
      new URL(originalUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    // Generate unique code
    let code;
    // Try limited attempts to avoid rare collision
    for (let i = 0; i < 5; i++) {
      code = generateCode();
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
});

// GET /api/info/:code -> return link info
app.get("/api/info/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const link = await Link.findOne({ code });
    if (!link) return res.status(404).json({ error: "Not found" });
    const shortUrl = toAbsoluteUrl(req, link.code);
    return res.json({
      code: link.code,
      originalUrl: link.originalUrl,
      shortUrl,
      clicks: link.clicks,
      createdAt: link.createdAt,
      lastAccessedAt: link.lastAccessedAt || null,
    });
  } catch (err) {
    console.error("/api/info error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /:code -> redirect and increment clicks
app.get("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;
    // Ignore if path is just '/' (handled by static index.html)
    if (!code) return next();
    const link = await Link.findOneAndUpdate(
      { code },
      { $inc: { clicks: 1 }, $set: { lastAccessedAt: new Date() } },
      { new: true }
    );
    if (!link) return res.status(404).send("Short link not found");
    return res.redirect(link.originalUrl);
  } catch (err) {
    console.error("redirect error", err);
    return res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
