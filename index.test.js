const { getUserInput, processTasksFromFile } = require("./index");
jest.mock("inquirer");
jest.mock("axios");
jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
}));
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

const Inquirer = require("inquirer");
const axios = require("axios");
const fs = require("fs/promises");
const OpenAI = require("openai");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getUserInput", () => {
  it("should get user input for task details for manual addition", async () => {
    Inquirer.prompt.mockResolvedValueOnce({
      taskType: "Todo",
      inputType: "Manually add Task",
    });
    const result = await getUserInput();
    expect(result).toHaveProperty("taskType", "Todo");
    expect(result).toHaveProperty("inputType", "Manually add Task");
  });

  it("should get user input for task details for adding from file", async () => {
    Inquirer.prompt.mockResolvedValueOnce({
      taskType: "Habit",
      inputType: "Add from File",
    });
    const result = await getUserInput();
    expect(result).toHaveProperty("taskType", "Habit");
    expect(result).toHaveProperty("inputType", "Add from File");
  });
});
