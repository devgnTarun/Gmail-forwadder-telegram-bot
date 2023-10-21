const { google } = require("googleapis");
const axios = require('axios')
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs')
const generateConfig = require('./generateConfig');


// Creating telegram bot 
const chatId = -1002118992993;
const bot = new TelegramBot("6816938574:AAGx0LtYVnUT5vvkTFd8h_ds03eWe2NLlz4", { polling: true });

// Function to send a message to the Telegram channel
async function sendToTelegramChannel(message) {
    try {
        await bot.sendMessage(chatId, message);
        console.log('Message sent to Telegram channel:', message);
    } catch (error) {
        console.error('Error sending message to Telegram channel:', error);
    }
}

// checking already processed emails 
const processedEmailsFile = 'processed-emails.json';
let processedEmails = [];

if (fs.existsSync(processedEmailsFile)) {
    try {
        const fileData = fs.readFileSync(processedEmailsFile, 'utf-8');
        processedEmails = JSON.parse(fileData);


        if (!Array.isArray(processedEmails)) {
            processedEmails = []; // Ensure that processedEmails is an array
        }
    } catch (error) {
        console.error('Error parsing processed emails file:', error);
    }
}


// Auth keys 
const auth = {
    type: "OAuth2",
    user: "sid.cd.varma@gmail.com",
    clientId: "488958903302-oc86ijfdu47v3a2uq4n1oiba5prtsmr1.apps.googleusercontent.com",
    clientSecret: "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",
    refreshToken: "1//04_j5Ub5S8zQTCgYIARAAGAQSNwF-L9Ir1rui4adoAq0Xy6SMhrb1fP81hDs5zEYu6Na4EBgDAescrjFF9XDZFneSmqYBMyI81Rc",
};

// Oauhth client keys 
const oAuth2Client = new google.auth.OAuth2(
    "488958903302-oc86ijfdu47v3a2uq4n1oiba5prtsmr1.apps.googleusercontent.com",
    "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",
    "https://developers.google.com/oauthplayground"
);

// settting refresh token 
oAuth2Client.setCredentials({ refresh_token: "1//04_j5Ub5S8zQTCgYIARAAGAQSNwF-L9Ir1rui4adoAq0Xy6SMhrb1fP81hDs5zEYu6Na4EBgDAescrjFF9XDZFneSmqYBMyI81Rc" });


const readSingleMail = async (id) => {
    try {
        const url = `https://gmail.googleapis.com/gmail/v1/users/devtar27k@gmail.com/messages/${id}`;
        const { token } = await oAuth2Client.getAccessToken();
        const config = generateConfig(url, token);
        const response = await axios(config);

        let data = await response.data;

        // Access specific email data elements
        const senderEmail = data.payload.headers.find((header) => header.name === 'From')?.value || 'Sender not found';
        const recipientEmail = data.payload.headers.find((header) => header.name === 'To')?.value || 'Recipient not found';
        const subject = data.payload.headers.find((header) => header.name === 'Subject')?.value || 'Subject not found';
        const emailBody = data.snippet || 'Email body not found';

        const message = `
  From: ${senderEmail}
  To:${recipientEmail}
  Subject: ${subject}
    Email Body:  ${emailBody}
`;
        await sendToTelegramChannel(message)
    } catch (error) {
        console.log(error)
    }
}


// inboxEmails()

const readAndSendMail = async (req, res) => {
    try {
        const url = `https://gmail.googleapis.com/gmail/v1/users/devtar27k@gmail.com/messages?labelIds=INBOX&maxResults=10`;
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
        fs.writeFile(processedEmailsFile, JSON.stringify(processedEmails), (err) => {
            if (err) {
                console.error('Error writing processed emails file:', err);
            } else {
                console.log('Processed emails file updated.');
            }
        });


    } catch (error) {
        console.log(error)
    }
}

const interval = 5 * 60 * 1000
setInterval(readAndSendMail, interval);



// Extra things to learn

// get latest ten emails
// const inboxEmails = async (id) => {
//     try {
//         const url = `https://gmail.googleapis.com/gmail/v1/users/devtar27k@gmail.com/messages?labelIds=INBOX&maxResults=10`;
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
//         const url = `https://gmail.googleapis.com/gmail/v1/users/devtar27k@gmail.com/messages/18b51abc3d18da77`;
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
