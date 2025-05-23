import { v2 as cloudinary } from "cloudinary";

const cloudinaryImageCache = {};

export const getCloudinaryImage = async (imageName) => {
  if (cloudinaryImageCache[imageName]) {
    return cloudinaryImageCache[imageName];
  }
  const image = await cloudinary.api.resource(imageName.replace("../", ""));
  cloudinaryImageCache[imageName] = image.url;
  return cloudinaryImageCache[imageName];
};

// When adding support for editing a profile image, remember to call this function to keep the cache clean!
export const invalidateCacheKey = (prevImageName) => {
  delete cloudinaryImageCache[prevImageName];
};
