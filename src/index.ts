import express from "express";
import cors from "cors";
import UserRoutes from "./routes/UserRoutes";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/users", UserRoutes);

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
});
