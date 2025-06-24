import multer from "multer";
import cloudinary from "./api/cloudinary.js";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export const uploadFile = upload.single("image");

export const uploadImage = async (req, res) => {
  const imageFile = req.file.buffer;

  const uploadResult = await new Promise((resolve) => {
    cloudinary.uploader
      .upload_stream((error, uploadResult) => {
        return resolve(uploadResult);
      })
      .end(imageFile);
  });

  const uploadedImageRef = uploadResult.public_id;

  res.send({ image: uploadedImageRef });
};
