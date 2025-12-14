const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  Events,
  Partials,
} = require("discord.js");

require("dotenv").config();

//1154470037156003922
const BROADCAST_ROLE_ID = "1154470037156003922"; // ID الرتبة الموجهة
//1396881006987968683
const BROADCAST_COMMAND_ROLE_ID = "1396881006987968683"; // ID الرتبة المصرح لها

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// أمر !broadcast لإظهار زر البرودكاست
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content !== "!broadcast") return;

  const hasRole = message.member.roles.cache.has(BROADCAST_COMMAND_ROLE_ID);
  if (!hasRole) {
    return message.reply("❌ لا تملك الصلاحية لاستخدام هذا الأمر.");
  }

  const embed = new EmbedBuilder()
    .setTitle("📨 إرسال برودكاست")
    .setDescription("اضغط على الزر لاختيار نوع البرودكاست.")
    .setColor("Purple")
    .setImage(
      "https://cdn.discordapp.com/attachments/1260376323994554400/1395034143745642587/Picsart_25-07-16_16-26-19-419.jpg",
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("start_broadcast")
      .setLabel("Send")
      .setStyle(ButtonStyle.Primary),
  );

  message.channel.send({ embeds: [embed], components: [row] });
});

// بعد الضغط على "Send"
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "start_broadcast") {
    const hasRole = interaction.member.roles.cache.has(
      BROADCAST_COMMAND_ROLE_ID,
    );
    if (!hasRole) {
      return interaction.reply({
        content: "❌ لا تملك صلاحية استخدام هذا الزر.",
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("broadcast_all")
        .setLabel("📤 Broadcast to All Members")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("broadcast_family")
        .setLabel("🏷️ Broadcast to Family Role")
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      content: "👥 اختر من تريد إرسال البرودكاست له:",
      components: [row],
      ephemeral: true,
    });
  }

  // بعد اختيار نوع البرودكاست
  if (
    interaction.customId === "broadcast_all" ||
    interaction.customId === "broadcast_family"
  ) {
    const modal = new ModalBuilder()
      .setCustomId(`broadcast_modal_${interaction.customId}`)
      .setTitle("📨 رسالة البرودكاست");

    const input = new TextInputBuilder()
      .setCustomId("broadcast_message")
      .setLabel("نص الرسالة")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
});

// بعد إدخال الرسالة في الـ Modal
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith("broadcast_modal_")) return;

  const messageContent =
    interaction.fields.getTextInputValue("broadcast_message");
  const target = interaction.customId.includes("family") ? "family" : "all";

  await interaction.reply({ content: "📤 جاري الإرسال...", ephemeral: true });

  const members = await interaction.guild.members.fetch();
  const recipients = members.filter((member) => {
    if (member.user.bot) return false;
    if (target === "family") {
      return member.roles.cache.has(BROADCAST_ROLE_ID);
    }
    return true;
  });

  const dmEmbed = new EmbedBuilder()
    .setTitle("📨 رسالة من إدارة العائلة")
    .setDescription(messageContent)
    .setColor("Purple")
    .setTimestamp()
    .setImage(
      "https://cdn.discordapp.com/attachments/1260376323994554400/1395027568733982730/Picsart_25-07-16_15-59-57-985.jpg",
    );

  const failedUsers = [];
  const sentUsers = [];

  for (const [id, member] of recipients) {
    try {
      await member.send({ embeds: [dmEmbed] });
      sentUsers.push(member.user.tag);
    } catch {
      failedUsers.push(member.user.tag);
    }

    await new Promise((resolve) => setTimeout(resolve, 15000)); // 15 ثانية بين كل إرسال
  }

  // إرسال ملخص في الشات
  const resultEmbed = new EmbedBuilder()
    .setTitle("📊 Broadcast Report")
    .setColor("Green")
    .addFields(
      {
        name: "✅ Sent To",
        value: `${sentUsers.length} Members`,
        inline: true,
      },
      {
        name: "❌ Failed To Send",
        value: `${failedUsers.length} Members`,
        inline: true,
      },
      {
        name: "📛 Failed Usernames",
        value:
          failedUsers.length > 0
            ? failedUsers.slice(0, 10).join("\n") +
              (failedUsers.length > 10
                ? `\n...and ${failedUsers.length - 10} more`
                : "")
            : "None",
      },
    )
    .setTimestamp();

  const logChannel = interaction.guild.channels.cache.get(
    interaction.channelId,
  );
  if (logChannel) {
    logChannel.send({ embeds: [resultEmbed] });
  }
});

const config = require("./config.json");
client.login(config.token);
