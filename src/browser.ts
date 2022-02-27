import puppeteer from "puppeteer";

export class Browser {
  private instance: puppeteer.Browser | undefined;
  private status: "stopped" | "running" | "error";

  constructor() {
    this.status = "stopped";
  }

  private getData = async (
    page: puppeteer.Page
  ): Promise<string | undefined> => {
    const copy = await page.waitForSelector("#copy");
    if (copy) {
      await copy.focus();
      await copy.click();
      const loaded = await page.waitForSelector("#loaded");
      if (loaded) {
        const input = await page.waitForSelector("#image-base64");
        if (input) {
          //Had to do it to em
          //@ts-ignore
          const data = await input.evaluate((el) => el.value);
          return data as string;
        }
      }
    }
  };

  public start = async (): Promise<void> => {
    console.log("Starting browser...");
    if (this.status === "stopped") {
      try {
        this.instance = await puppeteer.launch({
          headless: true,
          defaultViewport: {
            width: 1080,
            height: 2280,
          },
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
          ],
        });
        this.status = "running";
        console.log("Browser started!");
      } catch (error) {
        console.error(error);
      }
    }
  };

  public stop = async (): Promise<void> => {
    console.log("Stopping browser...");
    if (this.status === "running" && this.instance) {
      try {
        await this.instance.close();
        this.status = "stopped";
        console.log("Browser stopped");
      } catch (error) {
        console.error(error);
      }
    }
  };

  public generate = async (path: string): Promise<Buffer> => {
    if (this.status !== "running" || !this.instance) {
      throw Error("Browser is not running");
    }

    const origin = "https://shareddit.com";
    const page = await this.instance.newPage();
    await page.goto(`${origin}${path}`, {
      waitUntil: "networkidle0",
    });
    const data = await this.getData(page);
    await page.close();

    if (!data) {
      throw Error("No image data returned from shareddit");
    }

    const b64 = data.split(",")[1];
    const buf = Buffer.from(b64, "base64");

    return buf;
  };
}
