# Puppeteerでメモリリーク対策

### 初めに

Dockerコンテナ上でPuppeteerを使ってスクレイピングをしていたら`Possible EventEmitter memory leak detected.`なるエラーが発生。

`emitter.setMaxListeners()`を使ってもエラーが解消されず困っていたのですが、この問題に関する[issue](https://github.com/GoogleChrome/puppeteer/issues/594)を参照したら解消したので、備忘録として残しておきます。

今回のサンプルを[Github](https://github.com/watanabeJunna/pup-sample)にあげましたので、適度確認下さい。

### 環境情報

環境として`Windows 10 Pro`の`Docker(Docker Desktop)`上の`Node.js`で`TypeScript + Puppeteer`のプログラムを実行しています。

```sh
$ docker.exe --version
Docker version 19.03.2, build 6a30dfc

$ docker-compose.exe --version
docker-compose version 1.24.1, build 4667896b

$ docker-compose.exe run scraping node --version
v10.15.3
```

```json:package.json
{
  "dependencies": {
    "@types/node": "^12.7.8",
    "@types/puppeteer": "^1.19.1",
    "puppeteer": "^1.20.0",
    "ts-node": "^8.4.1",
    "tsc": "^1.20150623.0",
    "typescript": "^3.6.3"
  }
}
```

### 問題があったコード

```ts:index.ts
import puppeteer from 'puppeteer';

(async () => {
    const urlList = [
        "https://qiita.com/nobodytolove123/items/5fbb35d3a036989acc04",
        "https://qiita.com/nobodytolove123/items/895463907df00aba912f",
        "https://qiita.com/nobodytolove123/items/112562699f8ac8d36937@"
    ];

    let browser: puppeteer.Browser;

    try {
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        }).catch(e => { throw(e) });

        const page: puppeteer.Page = await browser.newPage();

        urlList.forEach(async (url) => {
            await page.goto(url, { waitUntil: "domcontentloaded" }).catch(e => {
                throw (e.message);
            });

            console.log(await page.title());
        });
    } catch(e) {
        throw (e.message);
    } finally {
        if (browser) {
            browser.close();
        }
    }
})();
```

### エラー

```
$ docker-compose run scraping
(node:1) UnhandledPromiseRejectionWarning: Navigation failed because browser has disconnected!
(node:1) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). (rejection id: 1)
(node:1) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
(node:1) UnhandledPromiseRejectionWarning: Navigation failed because browser has disconnected!
(node:1) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). (rejection id: 2)
(node:1) UnhandledPromiseRejectionWarning: Navigation failed because browser has disconnected!
(node:1) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). (rejection id: 3)
```

### 対応策

上記のエラーを解消するため、[issue](https://github.com/GoogleChrome/puppeteer/issues/594)を参照した所、複数回に渡って連続で`page.goto`する場合、毎回`browser.close()`をするとよいとの回答がありました。

なので、`work`という`goto`毎に`browser.close()`を行うジョブ関数を定義し、`work`関数が再起という形で自信を呼び出す実装を行います。

```ts:index.ts
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
```

```sh
$ docker-compose.exe run scraping
最近傍点の抽出 - Qiita
Babelでnamespace、moduleをトランスパイルする - Qiita
Docker + Laravel 学習メモ - Qiita
```

### クラス分割

以降はおまけです、ソースをスッキリするためにクラスを分割してみます。

```main.ts
import CrewlWorker from './crewl_worker';

(new CrewlWorker()).run();
```

```crewl_worker.ts
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
```

```puppeteer.ts
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
```

```sh
$ docker-compose.exe run scraping ./node_modules/.bin/ts-node main.ts
最近傍点の抽出 - Qiita
Babelでnamespace、moduleをトランスパイルする - Qiita
Docker + Laravel 学習メモ - Qiita
```


### 最後に

上記で`Puppeteer`を使ったスクレイピングを行いました。

しかし私は`Puppeteer`や`TypeScript`は初心者ですので、何か突っ込みがあればコメントにてお待ちしております。