//const express = require("express")

import express from "express";
import cors from "cors";
import "dotenv/config";

// import authRoutes from "./routes/authRoutes.js";
import petRoutes from "./routes/petRoutes.js";
// import connectDB from "./lib/db.js";
import connectDB from "./lib/db.js"

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

app.use("/api/auth",authRoutes);
app.use("/api/pets",petRoutes);

console.log({ PORT });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}"`);
    connectDB();
});