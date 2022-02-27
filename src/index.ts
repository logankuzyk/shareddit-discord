import {
  Client,
  Intents,
  ApplicationCommandData,
  Interaction,
} from "discord.js";
import axios from "axios";
import axiosRetry from "axios-retry";

require("dotenv").config();

import { Browser } from "./browser";

const browser = new Browser();

axiosRetry(axios, {
  retries: 2,
  // TypeScript didn't like me returning the condition directly.
  retryCondition: (error) => {
    if (error.response && error.response.status === 502) {
      return true;
    } else {
      return false;
    }
  },
});

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
const commands: ApplicationCommandData[] = [
  {
    name: "shareddit",
    description: "Show image previews of reddit posts and comment threads.",
    type: "CHAT_INPUT",
    options: [
      {
        name: "reddit-url",
        description: "The reddit permalink of the submission or comment.",
        type: "STRING",
        required: true,
      },
    ],
  },
];

bot.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  const label = "time";
  console.time(label);
  await interaction.reply("Loading...");
  const inputUrl = interaction.options.data[0].value! as string;
  console.log(`Received ${inputUrl}`);

  try {
    const redditUrl = new URL(inputUrl);
    const path = redditUrl.pathname;

    const buf = await browser.generate(path);
    console.log("Image generated!");
    interaction.editReply({
      content: "Image generated!",
      files: [
        {
          attachment: buf,
          name: "shareddit.png",
          description: "via shareddit.com",
        },
      ],
    });
    console.timeEnd(label);
  } catch (error: any) {
    if (error.code && error.code === "ERR_INVALID_URL") {
      console.log("Invalid URL");
      await interaction.editReply(`\`${inputUrl}\` is not a valid reddit URL`);
    } else {
      console.error(error);
      await interaction.editReply(`Something went wrong. \`${error.message}\``);
    }
  }
});

bot.on("guildCreate", async (guild) => {
  try {
    console.log("Joined server");
    console.log("Registering commands");
    commands.forEach((command) => {
      bot.application?.commands.create(command, guild.id);
    });
    console.log("Commands registered");
  } catch (error) {
    console.error(error);
  }
});

bot.on("ready", async () => {
  await browser.start();
});

bot.login(process.env.TOKEN!);
