const app = require('./app');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
      
      await connectDB();

      
      app.listen(PORT, () => {
          console.log(`🚀 Server is running on http://localhost:${PORT}`);
      });

  } catch (error) {
      console.error("❌ Error starting server:", error);
  }
};

startServer();

