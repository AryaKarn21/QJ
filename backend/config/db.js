const mongoose = require("mongoose");
const dns = require("dns");

// Force Node's DNS resolver to use Google's DNS.
// Fixes "querySrv ECONNREFUSED" errors caused by Node's internal
// resolver not picking up the system/Windows DNS settings correctly.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected sucessfully");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};
module.exports = connectDB;