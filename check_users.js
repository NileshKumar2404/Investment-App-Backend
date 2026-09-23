
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const users = await mongoose.connection.collection('users').find({}).toArray();
console.log('Total users in DB:', users.length);
for (const u of users) {
    console.log(-  | role:  | fullName: );
}
await mongoose.disconnect();
