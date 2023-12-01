const Imap = require('imap');
const MailParser = require('mailparser').MailParser;
const simpleParser = require('mailparser').simpleParser;

function verifyEmail(email: any) {
  const imapConfig = {
    user: email.email,
    password: email.imapPass,
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
  };
  const milo = email.email;
  const [mail = '', maildomain = ''] = milo.split('@');
  const [mailservice = '', langzonemail = ''] = maildomain.split('.');

  console.log(mailservice);

  if (mailservice == 'outlook') {
    console.log('хост для Imap почты по умолчанию');
  } else if (mailservice == 'hotmail') {
    console.log('хост для Imap почты по умолчанию');
  } else if (mailservice == 'rambler') {
    console.log('хост имап для рамблера');
    imapConfig.host = 'imap.rambler.ru';
  } else if (mailservice == 'mail' && langzonemail == 'ru') {
    console.log('хост имап для мейлру');
    imapConfig.host = 'imap.mail.ru';
  } else if (mailservice == 'yahoo') {
    console.log('хост имап для яху');
    imapConfig.host = 'imap.mail.yahoo.com';
  } else if (mailservice == 'gmx') {
    console.log('хост имап для гмх');
    imapConfig.host = 'imap.gmx.com';
  } else if (mailservice == 'firstmail' && langzonemail == 'ltd') {
    console.log('хост имап для firstmail.ltd');
    imapConfig.host = 'imap.firstmail.ltd';
  } else if (mailservice == 'firstmail' && langzonemail == 'ru') {
    console.log('хост имап для firstmail.ru');
    imapConfig.host = 'imap.firstmail.ru';
  } else if (mailservice == 'aol') {
    console.log('хост имап для aol.com');
    imapConfig.host = 'imap.aol.com';
  } else if (mailservice == 'onet') {
    console.log('хост имап для onet.pl');
    imapConfig.host = 'imap.poczta.onet.pl';
  } else if (mailservice == 'gazeta') {
    console.log('хост имап для gazeta.pl');
    imapConfig.host = 'imap.gazeta.pl';
  }

  return new Promise((resolve, reject) => {
    const searchCriteria = [['FROM', 'no-reply@web3auth.io']];

    const imap = new Imap(imapConfig);

    function openInbox(cb: any) {
      imap.openBox('Junk', true, cb);
    }

    imap.once('ready', function () {
      openInbox(function (err: string, box: string) {
        if (err) reject(err);
        imap.search(searchCriteria, function (err: string, results: string) {
          if (err) reject(err);

          const fetch = imap.fetch(results, { bodies: '' });

          fetch.on('message', function (msg: any, seqno: string) {
            const mailparser = new MailParser();

            msg.on('body', (stream: string, info: string) => {
              simpleParser(stream, (err: string, parsed: any) => {
                if (err) reject(err);
                const regex = /\d+/g;
                const matches = parsed.text.match(regex)[3];
                if (matches) {
                  resolve(matches);
                } else {
                  resolve([]);
                }
              });
            });

            mailparser.on('end', function () {});
          });

          fetch.once('error', function (err: string) {
            console.log('Fetch error:', err);
            reject(err);
          });

          fetch.once('end', function () {
            imap.end();
          });
        });
      });
    });

    imap.once('error', function (err: string) {
      console.log('IMAP error:', err);
      reject(err);
    });

    imap.once('end', function () {
      console.log('Connection ended');
    });

    imap.connect();
  });
}

module.exports = verifyEmail;
