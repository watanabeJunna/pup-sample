import Puppeteer from './puppeteer'

export default class CrewlWorker {
    urls: string[];

    public async run() {
        this.urls = await this.getWorkUrls();
        this.crawlPage(this.urls.shift());
    }

    public async getWorkUrls(): Promise<string[]> {
        return new Promise((resolve) => {
            resolve([
                "https://qiita.com/nobodytolove123/items/5fbb35d3a036989acc04",
                "https://qiita.com/nobodytolove123/items/895463907df00aba912f",
                "https://qiita.com/nobodytolove123/items/112562699f8ac8d36937",
            ]);
        });
    }

    async crawlPage(url: string) {
        let pup: Puppeteer;

        try {
            pup = await new Puppeteer().initialize();

            await pup.page.goto(url, { waitUntil: "domcontentloaded" });

            console.log(await pup.page.title());
        } catch (e) {
            throw (e);
        } finally {
            if (pup) {
                pup.browser.close();
            }

            if (this.urls.length) {
                this.crawlPage(this.urls.shift())
            } else {
                process.exit(0);
            }
        }
    }
}