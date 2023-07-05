import { MongoClient} from "mongodb";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

//Mongo
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
    await mongoClient.connect()
    db = mongoClient.db()
} catch (err) {
    console.log(err.message)
}

//Ferramentas
const app = express()
app.use(express.json())
app.use(cors())
dotenv.config()

//Porta
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));