import * as puppeteer from 'puppeteer';
// @ts-ignore
import {generateHtml} from 'html-to-markdown';
// @ts-ignore
import * as markdownStyles from 'markdown-styles';
import * as fs from "fs";
import path from "path";
import Turndown from 'turndown';
// @ts-ignore
import {gfm} from 'turndown-plugin-gfm';
// @ts-ignore
const turndown = new Turndown();
turndown.use(gfm);

async function getHtml(url: string): Promise<string> {
    // 启动浏览器
    const browser = await puppeteer.launch();
    // 打开新页面
    const page = await browser.newPage();
    // 访问页面
    await page.goto(url);
    // 等待页面加载完成
    await page.waitForSelector('footer');
    // 获取 HTML
    // @ts-ignore
    const html = await page.evaluate(() => document.querySelector('main.main').innerHTML);
    // 关闭浏览器
    await browser.close();
    // 压缩 HTML
    return html
}


async function convertToMarkdown(html: string): Promise<string> {
    // 替换在线URL
    const baseUrl = 'https://vue3.chengpeiquan.com/';
    html = html.replace(/src="\/(.*?)"/g, `src="${baseUrl}/$1"`);
    // 将 HTML 转换为 markdown
    return turndown.turndown(html);
}

async function saveToFile(html: string, fileName: string) {
    fs.writeFileSync(fileName, html);
}


async function crawlPage(url: string) {
    // 启动 puppeteer
    const browser = await puppeteer.launch();
    // 打开新页面
    const page = await browser.newPage();
    // 访问网页
    await page.goto(url);
    // 提取信息
    const data = await page.evaluate(() => {
        const result: { [key: string]: {url: string, title: string}[] } = {};
        // 获取所有大分类
        const sections = document.querySelectorAll('div.group');
        // sections 去除 undefined
        // 遍历所有大分类
        for (const section of sections) {
            // 获取大分类名称
            // @ts-ignore
            let titleElement = section.querySelector('h2.title-text');
            let heading
            if (titleElement!= null){
                heading = titleElement.textContent
                // 获取大分类中的所有小分类
                const links = section.querySelectorAll('a.VPLink');

                // 将小分类的 URL 保存到结果中
                // @ts-ignore
                result[heading] = Array.from(links).map(({href, textContent: title}) => {
                    // 返回 {url: href, title: textContent}
                    return {url: href, title};
                });
            }

        }
        return result;
    });

    // 关闭浏览器
    await browser.close();
    return data;
}

function mkdirRecursiveSync(dirname: string) {
    if (fs.existsSync(dirname)) {
        return;
    }
    mkdirRecursiveSync(path.dirname(dirname));
    fs.mkdirSync(dirname);
}

async function downloadBook() {
    console.log('开始下载...');
    // 访问目录页面
    const data = await crawlPage('https://vue3.chengpeiquan.com/');
    console.log(data)
    // 创建文件夹
    for (const heading of Object.keys(data)) {
        const dirname = `documents/vue3/${heading}`;
        mkdirRecursiveSync(dirname);
    }
    // 下载文章
    for (const heading of Object.keys(data)) {
        for (const {url, title} of data[heading]) {
            console.log(`正在下载 ${title}...`);
            // 获取 HTML
            const html = await getHtml(url);
            // 将 HTML 转换为 markdown
            const markdown = await convertToMarkdown(html);
            // 保存文件
            const dirname = `documents/vue3/${heading}`;
            const fileName = `${dirname}/${title}.md`;
            await saveToFile(markdown, fileName);
        }
    }
    console.log('下载完成！');
}


downloadBook().then();
