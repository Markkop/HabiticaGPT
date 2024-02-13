require("dotenv").config();
const Inquirer = require("inquirer");
const axios = require("axios");
const fs = require("fs").promises;
const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TaskTypes = {
  HABIT: "Habit",
  DAILY: "Daily",
  TODO: "Todo",
  REWARD: "Reward",
};

const InputTypes = {
  MANUAL: "Manually add Task",
  FROM_FILE: "Add from File", // Placeholder, actual string will be generated dynamically
};

const filenameMap = {
  [TaskTypes.HABIT]: "habits.txt",
  [TaskTypes.DAILY]: "dailies.txt",
  [TaskTypes.TODO]: "todos.txt",
  [TaskTypes.REWARD]: "rewards.txt",
};

async function getUserInput() {
  try {
    const taskTypeSelection = await Inquirer.prompt([
      {
        type: "list",
        name: "taskType",
        message: "What type of task would you like to create?",
        choices: Object.values(TaskTypes),
        default: TaskTypes.TODO,
      },
      {
        type: "list",
        name: "inputType",
        message: "Would you like to manually add a task or read from a file?",
        choices: (answers) => [
          InputTypes.MANUAL,
          `Add all tasks from tasks/${filenameMap[answers.taskType]}`,
        ],
      },
    ]);

    InputTypes.FROM_FILE = `Add all tasks from tasks/${
      filenameMap[taskTypeSelection.taskType]
    }`;

    if (taskTypeSelection.inputType === InputTypes.MANUAL) {
      const manualTaskDetails = await Inquirer.prompt([
        {
          type: "input",
          name: "title",
          message: "Enter the title of your task:",
          validate: (input) => input.trim() !== "" || "Title cannot be empty",
        },
        {
          type: "input",
          name: "priority",
          message:
            "Set the priority of your task (0.1 - low, 1 - medium, 1.5 - high, 2 - very high):",
          when: (answers) => answers.taskType !== TaskTypes.REWARD,
          default: "1", // Provide a default medium priority
          validate: (input) =>
            !isNaN(parseFloat(input)) || "Priority must be a number",
        },
        {
          type: "input",
          name: "rewardCost",
          message: "Set the cost of your reward:",
          when: (answers) => answers.taskType === TaskTypes.REWARD,
          default: "10", // Set default rewardCost to 10
          validate: (input) =>
            !isNaN(parseFloat(input)) || "Reward cost must be a number",
        },
      ]);
      return { ...taskTypeSelection, ...manualTaskDetails };
    }

    return {
      ...taskTypeSelection,
      filename: filenameMap[taskTypeSelection.taskType],
      priority:
        taskTypeSelection.taskType !== TaskTypes.REWARD ? "1" : undefined, // Default priority for non-reward tasks
      rewardCost:
        taskTypeSelection.taskType === TaskTypes.REWARD ? "10" : undefined, // Default cost for rewards
    };
  } catch (error) {
    console.error("Error getting user input:", error);
    return null;
  }
}

async function processTasksFromFile(filename, taskDetails) {
  try {
    const path = `${__dirname}/tasks/${filename}`;
    const tasks = await fs.readFile(path, "utf-8");
    const titles = tasks.split("\n").filter((title) => title.trim() !== "");
    for (let title of titles) {
      await createTaskInHabitica({
        ...taskDetails,
        title,
      });
    }
  } catch (error) {
    console.error("Error processing tasks from file:", error);
  }
}

async function getEmoji(title) {
  try {
    const prompt = `Give me an emoji related to this task: ${title}. Answer nothing more.`;
    const response = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 150,
    });
    const emoji = response.choices[0].message.content.trim();
    console.log("Got emoji from OpenAI's GPT", {
      title,
      emoji,
    });
    return emoji;
  } catch (error) {
    console.error("Error getting emoji:", error);
    return null;
  }
}

async function createTaskInHabitica(taskDetails) {
  const { taskType, title, priority, rewardCost } = taskDetails;
  const emoji = await getEmoji(title);
  const emojiTitle = emoji ? `${emoji} ${title}` : title;
  const taskTypeEndpointMap = {
    Habit: "/api/v3/tasks/user",
    Daily: "/api/v3/tasks/user",
    Todo: "/api/v3/tasks/user",
    Reward: "/api/v3/tasks/user",
  };
  const endpoint = taskTypeEndpointMap[taskType];
  const data = {
    type: taskType.toLowerCase(),
    text: emojiTitle,
    priority: priority || undefined,
    value: rewardCost || undefined,
  };

  try {
    const response = await axios.post(`https://habitica.com${endpoint}`, data, {
      headers: {
        "x-client": "your_user_id-your_app_name",
        "x-api-user": process.env.HABITICA_USER_ID,
        "x-api-key": process.env.HABITICA_API_TOKEN,
      },
    });
    console.log("Task created successfully:", {
      title: response.data.data.text,
    });
  } catch (error) {
    console.error("Error creating task in Habitica:", error);
  }
}

async function main() {
  try {
    const taskDetails = await getUserInput();
    if (!taskDetails) {
      return;
    }
    if (taskDetails.inputType.startsWith("Add all")) {
      await processTasksFromFile(taskDetails.filename, taskDetails);
      return;
    }
    await createTaskInHabitica(taskDetails);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();

module.exports = {
  getUserInput,
  processTasksFromFile,
  getEmoji,
  createTaskInHabitica,
};
