import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
       type: String,
       required: true,
    },
    caption: {
       type: String,
       required: true,
    },
    image: {
       type: String,
       required: true,
    },
    rating: {
       type: Number,
       required: true,
       min: 1,
       max: 5,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
  },
  { timestamps: true }
);

const Book = mongoose.model("Book", userSchema);
export default Book;

// import mongoose from "mongoose";

// const petSchema = new mongoose.Schema(
//   {
//     petName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     breed: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     gender: {
//       type: String,
//       required: true,
//       enum: ["Male", "Female", "Unknown"],
//     },
//     age: {
//       type: String,
//       required: true,
//     },
//     color: {
//       type: String,
//     },
//     height: {
//       type: String,
//     },
//     weight: {
//       type: String,
//     },
//     image: {
//       type: String, // เก็บ URL จาก Cloudinary
//     },
//     owner: {
//       type: String, // Firebase UID
//       ref: "User",
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// const Pet = mongoose.model("Pet", petSchema);
// export default Pet;