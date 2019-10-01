import puppeteer from 'puppeteer';

(async () => {
    const urlList = [
        "https://qiita.com/nobodytolove123/items/5fbb35d3a036989acc04",
        "https://qiita.com/nobodytolove123/items/895463907df00aba912f",
        "https://qiita.com/nobodytolove123/items/112562699f8ac8d36937",
    ];

    const work = async (url) => {
        let browser: puppeteer.Browser;

        try {
            browser = await puppeteer.launch({
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            }).catch(e => { throw (e) });

            const page: puppeteer.Page = await browser.newPage();

            await page.goto(url, { waitUntil: "domcontentloaded" });

            console.log(await page.title());
        } catch (e) {
            throw (e);
        } finally {
            if (browser) {
                browser.close();
            }

            if (urlList.length) {
                work(urlList.shift());
            }
        }
    }

    try {
        work(urlList.shift());
    } catch(e) {
        console.log(e);
        process.exit(-1);
    }
})();