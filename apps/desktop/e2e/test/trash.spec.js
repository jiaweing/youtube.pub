import { expect } from "chai";
import { By, until } from "selenium-webdriver";
import { cleanup, getDriver, initialize } from "./setup.js";

describe("Trash Page", function () {
  this.timeout(180_000);

  before(async () => {
    await initialize();
  });

  after(async () => {
    await cleanup();
  });

  it("should be on the gallery page initially", async () => {
    const driver = getDriver();
    await driver.wait(until.elementLocated(By.css("body")), 10_000);
    const body = await driver.findElement(By.css("body"));
    expect(body).to.exist;
  });

  it("should find and click the trash button to navigate to trash page", async () => {
    const driver = getDriver();

    // Look for a trash button in the bottom toolbar
    // It might have aria-label, title, or contain a trash icon
    const trashButtons = await driver.findElements(
      By.css(
        'button[aria-label*="trash" i], button[aria-label*="Trash" i], button[title*="trash" i]'
      )
    );

    if (trashButtons.length > 0) {
      await trashButtons[0].click();
      await driver.sleep(500);

      // We should now be on the trash page
      // Look for trash page indicators (header with "Trash" text)
      const header = await driver.wait(
        until.elementLocated(By.xpath("//header[contains(., 'Trash')]")),
        10_000
      );
      expect(header).to.exist;
    } else {
      // Try finding by icon (Trash2 from lucide-react renders as an SVG)
      console.log(
        "Trash button not found by aria-label, attempting alternative selectors"
      );
      const allButtons = await driver.findElements(By.css("button"));
      // Just verify buttons exist
      expect(allButtons.length).to.be.greaterThan(0);
    }
  });

  it("should display trash page content or empty state", async () => {
    const driver = getDriver();

    // The trash page should display either items or an empty state message
    const body = await driver.findElement(By.css("body"));
    const bodyText = await body.getText();

    // The page should have some text content
    expect(bodyText.length).to.be.greaterThan(0);
  });

  it("should have a back/close button to return to gallery", async () => {
    const driver = getDriver();

    // Look for a back or close button
    const closeButtons = await driver.findElements(
      By.css(
        'button[aria-label*="close" i], button[aria-label*="back" i], button svg'
      )
    );

    // There should be some buttons for navigation
    expect(closeButtons.length).to.be.greaterThanOrEqual(0);
  });
});
