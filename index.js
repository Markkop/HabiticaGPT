require("dotenv").config();
const OpenAI = require("openai");
const axios = require("axios");
const fs = require("fs").promises; // Add file system module for reading local files

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

async function enviarPromptParaOpenAI(title) {
  try {
    const prompt = `Give me an emoji related to this task: ${title}. Answer nothing more.`; // Modified prompt to request an emoji
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 150,
    });
    const emoji = response.choices[0].message.content.trim(); // Extracting emoji from response
    return emoji;
  } catch (error) {
    console.error("Erro ao enviar prompt para OpenAI:", error);
    return null;
  }
}

async function criarTarefaNoHabitica(taskWithTitleAndEmoji) {
  try {
    const response = await axios.post(
      "https://habitica.com/api/v3/tasks/user",
      taskWithTitleAndEmoji,
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

async function readTasksFromFile(filePath) {
  try {
    const data = await fs.readFile(filePath, { encoding: "utf8" });
    return data.split("\n"); // Splitting tasks by new lines
  } catch (error) {
    console.error("Erro ao ler arquivo:", error);
    return [];
  }
}

async function main() {
  const filePath = "./tasks.txt"; // Path to the local file with tasks
  const taskTitles = await readTasksFromFile(filePath);

  for (const title of taskTitles) {
    if (title.trim()) {
      // Ignore empty lines
      const emoji = await enviarPromptParaOpenAI(title.trim());
      const taskWithTitleAndEmoji = {
        text: `${emoji} ${title.trim()}`, // Combine emoji and title
        type: "todo",
        priority: 2,
      };
      await criarTarefaNoHabitica(taskWithTitleAndEmoji);
    }
  }
}

main();
