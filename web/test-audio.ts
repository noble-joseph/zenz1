import { config } from "dotenv";
config({ path: ".env.local" });
import { guardAudio } from "./src/lib/mediaGuard";

async function test() {
  const dummyAudio = Buffer.from("dummy audio content for testing");
  try {
    console.log("Running guardAudio (no fpcalc)...");
    const res = await guardAudio(
      dummyAudio, 
      "test-user-id", 
      { originalName: "test.mp3", size: dummyAudio.length, type: "audio/mpeg" },
      "mp3",
      "http://test-audio"
    );
    console.log("Success:", res);
  } catch (err) {
    console.error("CAUGHT ERROR:", err);
  }
}
test();
