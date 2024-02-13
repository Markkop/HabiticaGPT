require("dotenv").config();
const OpenAI = require("openai");
const axios = require("axios");

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

async function enviarPromptParaOpenAI(prompt) {
  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 150,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro ao enviar prompt para OpenAI:", error);
    return null;
  }
}

async function criarTarefaNoHabitica(tarefa) {
  try {
    const response = await axios.post(
      "https://habitica.com/api/v3/tasks/user",
      tarefa,
      {
        headers: {
          "x-client": "seu_id_usuario-seu_nome_app",
          "x-api-user": process.env.HABITICA_USER_ID,
          "x-api-key": process.env.HABITICA_API_TOKEN,
        },
      }
    );
    console.log("Tarefa criada com sucesso:", response.data.data);
  } catch (error) {
    console.error("Erro ao criar tarefa no Habitica:", error);
  }
}

async function main() {
  const prompt = "Qual é a sua tarefa para hoje?";
  const respostaOpenAI = await enviarPromptParaOpenAI(prompt);

  if (respostaOpenAI) {
    console.log("Resposta da OpenAI:", respostaOpenAI);
    const tarefa = {
      text: respostaOpenAI,
      type: "todo",
      priority: 2,
    };
    await criarTarefaNoHabitica(tarefa);
  }
}

main();
