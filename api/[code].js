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

module.exports = async (req, res) => {
  await connectDB();

  const { code } = req.query;

  try {
    // Ignore if path is just '/' (handled by static index.html)
    if (!code) {
      return res.status(404).send("Not found");
    }

    const link = await Link.findOneAndUpdate(
      { code },
      { $inc: { clicks: 1 }, $set: { lastAccessedAt: new Date() } },
      { new: true }
    );

    if (!link) {
      return res.status(404).send("Short link not found");
    }

    // Redirect
    res.writeHead(302, { Location: link.originalUrl });
    res.end();
  } catch (err) {
    console.error("redirect error", err);
    return res.status(500).send("Server error");
  }
};
