const { random } = require('user-agents');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const { Worker, workerData, isMainThread } = require('worker_threads');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fetchOtpCode = require('./fetchOtpCode')

const config = require('../inputs/config.ts');
const csvWriter = createCsvWriter({
  path: './result.csv',
  header: [
    { id: 'email', title: 'Email' },
    { id: 'proxy', title: 'Proxy' },
  ],
  append: true,
});

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
const numThreads = config.numThreads;
const customDelay = config.customDelay;


function parseProxies(filePath: string) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const proxies: string[] = [];

  lines.forEach((line: string) => {
    const proxy = line.trim();
    proxies.push(proxy);
  });

  return proxies;
}
function parseEmails(filePath: string) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const emails: { email: string; imapPass: string }[] = [];

  lines.forEach((line: string) => {
    const [email = '', imapPass = ''] = line.split(':');
    emails.push({ email: email.trim(), imapPass: imapPass.trim() });
  });

  return emails;
}

const proxies = parseProxies('./inputs/proxies.txt');
const emails = parseEmails('./inputs/emails.txt');

async function reg( email: any, proxy: string) {
  const headers = {
    Host: 'api-passwordless.web3auth.io',
    'User-Agent': random().toString(),
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US;q=0.5,en;q=0.3',
    'Content-Type': 'application/json',
    Origin: 'https://passwordless.web3auth.io',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };
  const session = axios.create({
    headers: headers,
    httpsAgent:
    config.proxyType === 'http' ? new HttpsProxyAgent(`http://${proxy}`) : new SocksProxyAgent(`socks5://${proxy}`),
  });
  config.isRotatingProxy ? await axios.get(config.proxyRefreshLink) : null;
  config.isRotatingProxy ? await delay(config.sleepAfterRefresh) : null;
  function getRandomChars(length: number) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars.charAt(randomIndex);
    }
    return result;
  }
  const sendCode = async (client_id:string,web3auth_client_id:string) => {
    const data = { "client_id": client_id, "web3auth_client_id": web3auth_client_id, "connection": "email", "login_hint": email.email, "whitelabel": { "name": "", "url": "", "language": "en", "logo": "", "theme": {} }, "version": "v3", "network": "sapphire_mainnet", "flow_type": "code" }

    const res = await session.post('https://api-passwordless.web3auth.io/api/v3/auth/passwordless/start', data);
    return res.data.data.trackingId
  }
  const client_id=getRandomChars(32)
  const web3auth_client_id=getRandomChars(87)

  const trackingId = await sendCode(client_id,web3auth_client_id)
  console.log(trackingId)

  await delay(15000)
  const code = await fetchOtpCode(email)
  const data = { "client_id": client_id, "login_hint": email.email, "code": code, "connection": "email", "tracking_id": trackingId, "version": "v3", "network": "sapphire_mainnet", "flow_type": "code" }
  const res = await session.post('https://api-passwordless.web3auth.io/api/v3/auth/passwordless/verify')
  console.log(res.data)



  const resultData = [
    {
      email: email.email,
      proxy: proxy,
    },
  ];
  await csvWriter
    .writeRecords(resultData)
    .then(() => {
      console.log('CSV file has been saved.');
    })
    .catch((error: any) => {
      console.error(error);
    });
}

function regRecursive( proxies: any, emails: any, index = 0, numThreads = 4) {
  if (index >= emails.length) {
    return;
  }

  const worker = new Worker(__filename, {
    workerData: {
      proxy: config.isRotatingProxy ? proxies[0] : proxies[index],
      email: emails[index],
    },
  });
  worker.on('message', (message: any) => {
    console.log(message);
  });
  worker.on('error', (error: any) => {
    console.error(error);
  });
  worker.on('exit', (code: any) => {
    if (code !== 0) {
      console.error(`Thread Exit ${code}`);
    }
    regRecursive( proxies, emails, index + numThreads, numThreads);
  });
}
const main = async () => {
  if (isMainThread) {
    for (let i = 0; i < numThreads; i++) {
      await delay(customDelay);
      regRecursive( proxies, emails, i, numThreads);
    }
  } else {
    await delay(customDelay);
    const { email, proxy } = workerData;
    reg( email, proxy);
  }
};
main();
