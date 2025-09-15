require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://10.52.250.197:3000'
}));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

// Schema
const petSchema = new mongoose.Schema({
  petName: String,
  breed: String,
  gender: String,
  age: String,
  color: String,
  height: String,
  weight: String,
  image: { data: Buffer, contentType: String },
});

const Pet = mongoose.model("Pet", petSchema);

// multer (upload to memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// API: Save Pet
app.post("/api/pets", upload.single("image"), async (req, res) => {
  console.log("Received body:", req.body);
  console.log("Received file:", req.file);
  try {
    const pet = new Pet({
      petName: req.body.petName,
      breed: req.body.breed,
      gender: req.body.gender,
      age: req.body.age,
      color: req.body.color,
      height: req.body.height,
      weight: req.body.weight,
    });
    if (req.file) {
      pet.image.data = req.file.buffer;
      pet.image.contentType = req.file.mimetype;
    }
    await pet.save();
    res.json({ success: true, pet });
  } catch (err) {
    console.error("Error saving pet:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get All Pets
app.get("/api/pets", async (req, res) => {
  const pets = await Pet.find().select("-image");
  res.json(pets);
});

// API: Get Pet Image
app.get("/api/pets/:id/image", async (req, res) => {
  const pet = await Pet.findById(req.params.id);
  if (!pet || !pet.image || !pet.image.data) return res.status(404).send("No image");
  res.contentType(pet.image.contentType);
  res.send(pet.image.data);
});

app.listen(process.env.PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running at http://localhost:${process.env.PORT}`)
);