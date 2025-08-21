const mongoose = require("mongoose");

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

function toAbsoluteUrl(req, code) {
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}/${code}`;
}

module.exports = async (req, res) => {
  await connectDB();

  const { code } = req.query;

  try {
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
};
