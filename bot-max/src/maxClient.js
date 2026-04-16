const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const logFile = path.resolve(__dirname, '../bot.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] [maxClient] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(logFile, line + '\n'); } catch (_) {}
}

class MaxClient {
  constructor(token, baseUrl = 'https://botapi.max.ru') {
    this.token = token;
    this.baseUrl = baseUrl;
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    this.listeners = {
      message: [],
      callback: [],
      command: new Map(),
    };
    this.marker = null;
    this.running = false;
  }

  onCommand(cmd, handler) {
    this.listeners.command.set(cmd, handler);
  }

  onMessage(handler) {
    this.listeners.message.push(handler);
  }

  onCallback(handler) {
    this.listeners.callback.push(handler);
  }

  async getMe() {
    const { data } = await this.http.get('/me');
    return data;
  }

  async sendMessage(chatId, text, options = {}) {
    const body = { text };
    if (options.format) body.format = options.format;
    if (options.attachments) body.attachments = options.attachments;
    if (options.reply_markup && options.reply_markup.inline_keyboard) {
      body.attachments = (body.attachments || []).concat([
        {
          type: 'inline_keyboard',
          payload: { buttons: options.reply_markup.inline_keyboard },
        },
      ]);
    }

    try {
      const { data } = await this.http.post('/messages', body, {
        params: { chat_id: chatId },
      });
      return data;
    } catch (error) {
      log(`sendMessage ERROR chat=${chatId} status=${error.response?.status} data=${JSON.stringify(error.response?.data)}`);
      return null;
    }
  }

  async answerCallback(callbackId, notification = null) {
    try {
      const body = {};
      if (notification) body.notification = notification;
      const { data } = await this.http.post('/answers', body, {
        params: { callback_id: callbackId },
      });
      return data;
    } catch (error) {
      log(`answerCallback ERROR: ${error.response?.status} ${error.message}`);
      return null;
    }
  }

  async uploadImage(fileBuffer, filename) {
    try {
      const { data: uploadInfo } = await this.http.post('/uploads', null, {
        params: { type: 'image' },
      });
      if (!uploadInfo?.url) {
        log(`uploadImage: no upload url returned`);
        return null;
      }

      const form = new FormData();
      form.append('data', fileBuffer, filename);

      const { data: uploadRes } = await axios.post(uploadInfo.url, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      return uploadRes;
    } catch (error) {
      log(`uploadImage ERROR: ${error.response?.status} ${error.message}`);
      return null;
    }
  }

  async downloadFile(url) {
    try {
      const { data } = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(data);
    } catch (error) {
      log(`downloadFile ERROR: ${error.message}`);
      return null;
    }
  }

  async getUpdates() {
    const params = {
      limit: 100,
      timeout: 30,
      types: 'message_created,message_callback',
    };
    if (this.marker) params.marker = this.marker;

    try {
      const { data } = await this.http.get('/updates', {
        params,
        timeout: 40000,
      });
      return data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.response?.status === 408) {
        return { updates: [], marker: this.marker };
      }
      log(`getUpdates ERROR: ${error.response?.status} ${error.message}`);
      throw error;
    }
  }

  async startPolling() {
    this.running = true;
    log(`startPolling baseUrl=${this.baseUrl}`);

    while (this.running) {
      try {
        const result = await this.getUpdates();
        if (result?.marker) this.marker = result.marker;

        for (const update of result?.updates || []) {
          this._dispatch(update).catch((e) => log(`dispatch error: ${e.message}`));
        }
      } catch (error) {
        log(`polling loop error: ${error.message}. Retry in 5s`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  async _dispatch(update) {
    if (update.update_type === 'message_created') {
      const message = update.message;
      const text = message?.body?.text || '';

      if (text.startsWith('/')) {
        const cmd = text.split(/\s+/)[0].replace(/@.*/, '');
        const handler = this.listeners.command.get(cmd);
        if (handler) {
          await handler(message);
          return;
        }
      }

      for (const h of this.listeners.message) {
        await h(message);
      }
    } else if (update.update_type === 'message_callback') {
      const cb = update.callback;
      for (const h of this.listeners.callback) {
        await h({ ...cb, message: update.message });
      }
    }
  }

  stop() {
    this.running = false;
  }
}

module.exports = { MaxClient };
