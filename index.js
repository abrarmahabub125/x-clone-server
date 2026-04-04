import "dotenv/config";

import { connectDB } from "./src/config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server is running on port", PORT);
    });
  })
  .catch((err) => {
    console.log(
      "Server isn't started because database connection failed!",
      err,
    );
  });
