import puppeteer from 'puppeteer';

export default class Puppeteer {
    public browser: puppeteer.Browser;
    public page: puppeteer.Page;

    private launchArg: any = {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    };

    public async initialize() {
        return new Promise<this>(async (resolve, reject) => {
            try {
                this.browser = await puppeteer.launch(this.launchArg);
                this.page = await this.browser.newPage();
            } catch (e) {
                reject(e);
            }

            resolve(this);
        });
    }
}