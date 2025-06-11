const { keccak256 } = require("ethereum-cryptography/keccak");
const { secp256k1 } = require("ethereum-cryptography/secp256k1");
const { toHex, utf8ToBytes } = require("ethereum-cryptography/utils");

const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;

app.use(cors());
app.use(express.json());

const balances = {
  "02725df4f910e8b322e1a4bfc0f66d6ab428239e4d4b7969d23e0a89b95ad56fd6": 100,
  "03330e89e857539754ccd6e03f2fff6b4c5b4a1bffe2057a8c2154a2c95745dd39": 50,
  "03ffc07b4e03a4dded478f946b2ef061217da6d2ea3c9b6dc18ebecf213403f307": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", (req, res) => {
  const transaction = req.body;
  console.log("Received transaction:", transaction);
  
  const { sender, recipient, amount, signature, recoveryBit } = transaction;
  
  // Проверяем наличие всех полей
  if (!sender || !recipient || !amount || !signature || recoveryBit === undefined) {
    return res.status(400).send({ message: "Missing transaction fields" });
  }

  // Создаем хеш всех полей транзакции
  const message = JSON.stringify({ sender, amount, recipient });
  const messageHash = keccak256(utf8ToBytes(message));
  
  try {
    // Конвертируем подпись из hex в Uint8Array
    const signatureBytes = hexToBytes(signature);
    
    // Восстанавливаем публичный ключ
    const publicKey = secp256k1.recoverPublicKey(messageHash, signatureBytes, recoveryBit);
    const senderAddress = toHex(publicKey);
    
    // Проверяем подпись и соответствие отправителя
    const isSigned = secp256k1.verify(signatureBytes, messageHash, publicKey);
    const isSenderValid = senderAddress === sender;

    if (!isSigned || !isSenderValid) {
      return res.status(400).send({ message: "Invalid signature or sender mismatch" });
    }

    // Обрабатываем транзакцию
    setInitialBalance(sender);
    setInitialBalance(recipient);

    if (balances[sender] < amount) {
      return res.status(400).send({ message: "Not enough funds!" });
    }

    balances[sender] -= amount;
    balances[recipient] += amount;
    res.send({ balance: balances[sender] });

  } catch (error) {
    console.error("Transaction error:", error);
    res.status(400).send({ message: "Error processing transaction" });
  }
});

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});