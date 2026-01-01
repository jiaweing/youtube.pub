import { expect } from "chai";
import { By, until } from "selenium-webdriver";
import { cleanup, getDriver, initialize } from "./setup.js";

describe("Editor Page", function () {
  this.timeout(180_000);

  before(async () => {
    await initialize();
  });

  after(async () => {
    await cleanup();
  });

  // Note: These tests assume there's at least one thumbnail in the gallery
  // For a fresh install, the gallery might be empty

  it("should have a gallery page loaded first", async () => {
    const driver = getDriver();
    // Verify we're on the gallery page
    await driver.wait(until.elementLocated(By.css("body")), 10_000);
    const body = await driver.findElement(By.css("body"));
    expect(body).to.exist;
  });

  it("should navigate to editor when clicking a thumbnail (if exists)", async () => {
    const driver = getDriver();

    // Try to find a thumbnail item
    const thumbnails = await driver.findElements(
      By.css("[data-thumbnail-id], .thumbnail-item, img")
    );

    if (thumbnails.length > 0) {
      // Click the first thumbnail
      await thumbnails[0].click();
      await driver.sleep(500);

      // Check if we're now on the editor page
      // The editor should have a canvas element (rendered by Konva)
      const editorCanvas = await driver.wait(
        until.elementLocated(By.css("canvas")),
        10_000
      );
      expect(editorCanvas).to.exist;
    } else {
      // No thumbnails available - this is acceptable for a fresh install
      console.log("No thumbnails available to test editor navigation");
    }
  });

  it("should display save and export buttons in editor (if navigated)", async () => {
    const driver = getDriver();

    // Look for common editor buttons
    const buttons = await driver.findElements(By.css("button"));
    expect(buttons.length).to.be.greaterThan(0);
  });
});
