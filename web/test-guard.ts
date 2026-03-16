import { config } from "dotenv";
config({ path: ".env.local" });
import { guardImage } from "./src/lib/mediaGuard";
import fs from "fs";

async function test() {
  const buf = fs.readFileSync("src/app/favicon.ico");
  try {
    console.log("Running guardImage...");
    const res = await guardImage(buf, "test-user-id", { originalName: "favicon.ico", size: buf.length, type: "image/x-icon" }, "http://test");
    console.log("Success:", res);
  } catch (err) {
    console.error("CAUGHT ERROR:", err);
  }
}
test();
