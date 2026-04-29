const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-pro'; 
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar:true
  });

  win.loadFile(path.join(__dirname, 'renderer/index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ✅ Gemini API Handler
ipcMain.handle('generate-text', async (event, formattedPrompt, tone) => {
  const model = 'gemini-2.5-flash';  // or whichever model you expect
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: formattedPrompt }]
      }
    ]
  };
  
  try {
    const resp = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      }
    });
    console.log("✅ Gemini response status:", resp.status);
    console.log("✅ Gemini response data:", JSON.stringify(resp.data, null, 2));
    const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("⚠️ No text field in Gemini response", resp.data);
      throw new Error("No content in Gemini response");
    }
    return { text };
  } catch (err) {
    console.error("=== Gemini API Error ===");
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Response body:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error message:", err.message);
    }
    throw new Error("Failed to generate text from Gemini API.");
  }
});
