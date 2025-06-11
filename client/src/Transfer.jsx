import { useState } from "react";
import server from "./server";
import * as secp from "ethereum-cryptography/secp256k1";
import { toHex, utf8ToBytes } from "ethereum-cryptography/utils";
import { keccak256 } from "ethereum-cryptography/keccak";

function Transfer({ address, setBalance, privateKey }) {
  const [sendAmount, setSendAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const setValue = (setter) => (evt) => setter(evt.target.value);

  async function transfer(evt) {
    evt.preventDefault();
    
    try {
      // Создаем сообщение для подписи
      const message = {
        sender: address,
        amount: parseInt(sendAmount),
        recipient
      };
      
      // Хешируем сообщение
      const messageHash = keccak256(utf8ToBytes(JSON.stringify(message)));
      
      // Создаем подпись
      const [signature, recoveryBit] = await secp.sign(messageHash, privateKey, { recovered: true });
      
      // Отправляем транзакцию на сервер
      const response = await server.post(`send`, {
        ...message,
        signature: toHex(signature),
        recoveryBit
      });
      
      setBalance(response.data.balance);
    } catch (ex) {
      alert(ex.response?.data?.message || "Transaction failed");
    }
  }

  return (
    <form className="container transfer" onSubmit={transfer}>
      <h1>Send Transaction</h1>

      <label>
        Send Amount
        <input
          placeholder="1, 2, 3..."
          value={sendAmount}
          onChange={setValue(setSendAmount)}
          type="number"
          min="1"
          required
        />
      </label>

      <label>
        Recipient
        <input
          placeholder="Type recipient address"
          value={recipient}
          onChange={setValue(setRecipient)}
          required
        />
      </label>

      <button type="submit">Transfer</button>
    </form>
  );
}

export default Transfer;