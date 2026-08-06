import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dymbuurbt',
  api_key: process.env.CLOUDINARY_API_KEY || '756999889696227',
  api_secret: process.env.CLOUDINARY_API_SECRET || '3usBlmHewpb_RVhB-AR3Uj9_iVw',
});

export default cloudinary;
