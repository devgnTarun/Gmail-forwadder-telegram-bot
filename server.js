const { google } = require("googleapis");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const generateConfig = require("./generateConfig");

// Creating telegram bot
const chatId = 'CHAT_TOKEN';
const bot = new TelegramBot("BOT_TOKEN", {
  polling: true,
});

// Function to send a message to the Telegram channel
// async function sendToTelegramChannel(message) {
//   try {
//     await bot.sendMessage(chatId, message);
//     console.log("Message sent to Telegram channel:", message);
//   } catch (error) {
//     console.error("Error sending message to Telegram channel:", error);
//   }
// }

async function sendToTelegramChannel(message, attachments) {
  try {
    const options = {
      parse_mode: "HTML",
    };
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const fileOptions = {
          filename: attachment.filename,
        };
        await bot.sendDocument(
          chatId,
          attachment.content,
          options,
          fileOptions
        );
      }
    }
    await bot.sendMessage(chatId, message, options);

    console.log("Message sent to Telegram channel:", message);
  } catch (error) {
    console.error("Error sending message to Telegram channel:", error);
  }
}

// checking already processed emails
const processedEmailsFile = "processed-emails.json";
let processedEmails = [];

if (fs.existsSync(processedEmailsFile)) {
  try {
    const fileData = fs.readFileSync(processedEmailsFile, "utf-8");
    processedEmails = JSON.parse(fileData);

    if (!Array.isArray(processedEmails)) {
      processedEmails = []; // Ensure that processedEmails is an array
    }
  } catch (error) {
    console.error("Error parsing processed emails file:", error);
  }
}

// Auth keys
const auth = {
  type: "OAuth2",
  user: "YOUR_EMAIL",
  clientId:
    "CLIENT_ID",
  clientSecret: "SECRET_ID",
  refreshToken:
    "REFRESH_TOKEN",
};

// Oauhth client keys
const oAuth2Client = new google.auth.OAuth2(
  "CLIENT_ID",
  "CLIENT_SECRET",
  "https://developers.google.com/oauthplayground"
);

// settting refresh token
oAuth2Client.setCredentials({
  refresh_token:
    "REFRESH_TOKEN_AUTH",
});

const readSingleMail = async (id) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/YOUR_EMAIL/messages/${id}`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);

    let data = await response.data;

    // Extract specific email data elements
    const senderEmail =
      data.payload.headers.find((header) => header.name === "From")?.value ||
      "Sender not found";
    const recipientEmail =
      data.payload.headers.find((header) => header.name === "To")?.value ||
      "Recipient not found";
    const subject =
      data.payload.headers.find((header) => header.name === "Subject")?.value ||
      "Subject not found";
    const emailBody = data.snippet || "Email body not found";

    // Handle email attachments
    const attachments = [];
    if (data.payload.parts) {
      for (const part of data.payload.parts) {
        if (part.filename && part.body.attachmentId) {
          const attachmentId = part.body.attachmentId;
          const attachmentData = await getAttachmentData(attachmentId);
          if (attachmentData) {
            attachments.push({
              filename: part.filename,
              content: attachmentData,
            });
          }
        }
      }
    }

    //get attachments
    async function getAttachmentData(attachmentId) {
      try {
        const url = `https://gmail.googleapis.com/gmail/v1/users/YOUR_EMAIL/messages/${id}/attachments/${attachmentId}`;
        const { token } = await oAuth2Client.getAccessToken();
        const config = generateConfig(url, token);
        const response = await axios(config);

        return response.data;
      } catch (error) {
        console.error("Error fetching attachment data:", error);
        return null;
      }
    }

    // Create a message with the extracted email information
    const message = `
      From: ${senderEmail}
      To: ${recipientEmail}
      Subject: ${subject}
      Email Body: ${emailBody}
    `;

    // Send the message and attachments to the Telegram channel
    await sendToTelegramChannel(message, attachments);
  } catch (error) {
    console.log(error);
  }
};

// inboxEmails()

const readAndSendMail = async (req, res) => {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/YOUR_EMAIL/messages?labelIds=INBOX&maxResults=10`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);

    const messageIds = response.data.messages;

    // Iterate over the list and retrieve each email
    for (const message of messageIds) {
      if (!processedEmails.includes(message.id)) {
        await readSingleMail(message.id);
        processedEmails.push(message.id); // Add the email ID to the processed list.
      }
    }
    //  for loop ends

    // Write the updated 'processedEmails' array to the JSON file.
    fs.writeFile(
      processedEmailsFile,
      JSON.stringify(processedEmails),
      (err) => {
        if (err) {
          console.error("Error writing processed emails file:", err);
        } else {
          console.log("Processed emails file updated.");
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};

const interval = 5 * 60 * 1000;
setInterval(readAndSendMail, interval);

// Extra things to learn

// get latest ten emails
// const inboxEmails = async (id) => {
//     try {
//         const url = `https://gmail.googleapis.com/gmail/v1/users/YOUR_EMAIL/messages?labelIds=INBOX&maxResults=10`;
//         const { token } = await oAuth2Client.getAccessToken();
//         const config = generateConfig(url, token);
//         const response = await axios(config);

//         let data = await response.data;

//         console.log(data)
//     } catch (error) {
//         console.log(error)
//     }
// }
// const singleMailCheck = async (id) => {
//     try {
//         const url = `https://gmail.googleapis.com/gmail/v1/users/YOUR_EMAIL/messages/18b51abc3d18da77`;
//         const { token } = await oAuth2Client.getAccessToken();
//         const config = generateConfig(url, token);
//         const response = await axios(config);

//         let data = await response.data;
//         // Access specific email data elements
//         const senderEmail = data.payload.headers.find((header) => header.name === 'From')?.value || 'Sender not found';
//         const recipientEmail = data.payload.headers.find((header) => header.name === 'To')?.value || 'Recipient not found';
//         const subject = data.payload.headers.find((header) => header.name === 'Subject')?.value || 'Subject not found';
//         const emailBody = data.snippet || 'Email body not found';

//         console.log('Sender Email:', senderEmail);
//         console.log('Recipient Email:', recipientEmail);
//         console.log('Subject:', subject);
//         console.log('Email Body:', emailBody);

//     } catch (error) {
//         console.log(error)
//     }
// }
// singleMailCheck()
