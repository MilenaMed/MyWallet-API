import { MongoClient, ObjectId } from "mongodb";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt"
import { v4 as uuid } from "uuid"
import dayjs from "dayjs"

//Ferramentas
const app = express()
app.use(express.json())
app.use(cors())
dotenv.config()

//Mongo
const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
    await mongoClient.connect()
    console.log("Mongo Conectado")
} catch (err) {
    console.log(err.message)
}
const db = mongoClient.db()

//POST - Cadastro
app.post('/cadastro', async (request, response) => {
    const { name, senha, email } = request.body;
    const senhaCriptografada = bcrypt.hashSync(senha, 10);
    const usuárioExiste = await db.collection("users").findOne({ email })
    if (usuárioExiste) {
        return response.sendStatus(409)
    }

    try {
        const dadosDoUsuário = {
            name: name,
            email: email,
            password: senhaCriptografada
        }
        await db.collection("users").insertOne(dadosDoUsuário)
        return response.status(201).send("Usuário Cadastrado!")
    } catch (err) {
        return response.status(500).send(err.message)
    }
})

//POST - Login
app.post("/", async (request, response) => {
    const token = uuid()
    const { email, senha } = request.body
    const usuario = await db.collection("users").findOne({ email: email })
    const senhaCerta = bcrypt.compareSync(senha, usuario.password)
    try {
        if (!usuario || !senhaCerta) {
            return response.status(401).send("usuário não cadastrado ou senha incorreta");
        }
        await db.collection("sessions").insertOne({ token, userId: usuario._id })
        response.status(200).send({ token, nomeUsuário: usuario.name })
    } catch (err) {
        response.status(500).send(err)
    }
});

//POST - Operações
//ENTRADAS
app.post("/nova-transacao/:entrada", async (request, response) => {
    const dadosEntrada = request.body
    const { authorization } = request.headers
    const token = authorization?.replace('Bearer ', '')

    try {
        const sessao = await db.collection("sessions").findOne({ token })
        if (!sessao) {
            return response.status(401).send("usuário não encontrado")
        }

        await db.collection("historico").insertOne({
            userId: sessao.userId,
            value: Number(dadosEntrada.value),
            description: dadosEntrada.description,
            day: dayjs().format('DD/MM'),
            type: "entrada",
        })
        return response.status(201).send("valor cadastrado com sucesso")
    } catch (err) {
        response.status(500).send(err);
    }
});
// SAIDAS
app.post("/nova-transacao/:saida", async (request, response) => {
    const dadosSaida = request.body
    const { authorization } = request.headers
    const token = authorization?.replace('Bearer ', '')

    try {
        const sessao = await db.collection("sessions").findOne({ token })
        if (!sessao) {
            return response.status(401).send("usuário não encontrado")
        }

        await db.collection("historic").insertOne({
            userId: sessao.userId,
            value: Number(dadosSaida.value),
            description: dadosSaida.description,
            day: dayjs().format('DD/MM'),
            type: "saida",
        })
        return response.status(201).send("valor debitado com sucesso")
    } catch (err) {
        return response.status(500).send(err);
    }
});

//GET - Operações
app.get("/home", async (request, response) => {
const { authorization } = request.headers
const token = authorization?.replace('Bearer ', '')

try {
    const sessao = await db.collection("sessions").findOne({ token })
    if (!sessao) {
        return response.status(401).send("usuário não encontrado")
    }
    const histórico = await db.collection("historic").find({userId: sessao.userId}).toArray()
        return response.send([...histórico])
} catch (err) {
    response.status(500).send(err);
}
})

//Logout
export async function logout(request, response) {
    const { authorization } = request.headers
    const token = authorization?.replace('Bearer ', '')
    console.log(token)

    try {
        const sessao = await db.collection("sessions").findOne({ token })
        if (!sessao) {
            return response.status(401).send("usuário não encontrado")
        }

        await db.collection("sessions").deleteOne({ token })
        response.status(200).send("Usuário deslogado")
    } catch (err) {
        response.status(500).send(err.message)
    }
}

//Porta
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));