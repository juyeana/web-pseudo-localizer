const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// require('./chars.json')
/**
 * @desc takes url and options to test website localizability
 * @param{string} url
 * @param {object} options : prefix, suffix, expansion, bidi
 */
const pseudoLocalizer = async (url, options) => {
  let prefix = '[',
    suffix = ']',
    expansion = 1,
    bidi = 'ltr';

  try {
    if (options) {
      prefix = options.prefix;
      suffix = options.suffix;
      expansion = options.expansion;
      bidi = options.bidi.toLowerCase();
    }

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto(url);

    // reading pseudo characters from the chars.json file
    await page.exposeFunction('readChars', async (filePath) => {
      return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, text) => {
          if (err) return reject(err);
          else resolve(text);
        });
      });
    });

    // get chars.json file path
    await page.exposeFunction('getPath', (fileName) =>
      path.join(__dirname, fileName)
    );
    await page.evaluate(
      async (prefix, suffix, expansion, bidi) => {
        const filePath = await window.getPath('chars.json');
        const chars = await window.readChars(filePath);
        const charLookup = JSON.parse(chars);

        convertText(document.body);

        // change the text direction RTL/LTR
        document.body.style.direction = bidi;

        // convert texts to pseudo characters with options
        /**
         * @desc takes Web_scraping (document.body) and manipulates texts with options and send them back to the browser as node.nodeValue
         * @param {document.body} node
         */
        function convertText(node) {
          // nodeType 3 : text
          if (node.nodeType === 3 && node.nodeName != 'SCRIPT') {
            let st = node.nodeValue.trim();

            if (st) {
              // replacing chacters with pseudo characters
              st = replaceStrings(st, expansion);

              // add prefix and suffix
              // default value: prefix ='[' suffix=']'
              st = prefix + st + suffix;

              // put the altered characters back to html nodeValue
              node.nodeValue = st;
            }

            // nodeType 1: element
          } else if (
            node.nodeType === 1 &&
            node.nodeName !== 'SCRIPT' &&
            node.nodeName !== 'STYLE'
          ) {
            let child = node.firstChild;
            while (child) {
              convertText(child);
              child = child.nextSibling;
            }
          }
        }

        /**
         * @desc convert texts to pseudo characters with an option of text expansion
         * @param {string} st
         * @param {number} expansion
         * @return { string }
         */
        function replaceStrings(st, expansion) {
          let arr = [];
          for (let i = 0; i < st.length; i++) {
            if (charLookup[st[i]]) arr[i] = charLookup[st[i]];
            else arr[i] = st[i];
          }

          //add extra white space by expansion percentage
          let padding = Math.round(arr.length * expansion * 0.01);
          let textExpansion = Array(padding).fill('\xA0').join(' ');
          arr.push(textExpansion);
          return arr.join('');
        }
      },
      prefix,
      suffix,
      expansion,
      bidi
    );
  } catch (e) {
    console.log(e.message);
  }
};

module.exports = pseudoLocalizer;