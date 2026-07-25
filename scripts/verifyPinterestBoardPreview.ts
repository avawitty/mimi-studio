import {
  extractPinterestBoardPreview,
  parsePinterestBoardUrl,
} from "../lib/pinterestBoardPreview";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const boardUrl = "https://www.pinterest.com/mimi/editorial-reference/";
const html = `
  <html>
    <head>
      <title>Editorial Reference | Pinterest</title>
      <meta property="og:title" content="Editorial Reference | Pinterest" />
    </head>
    <body>
      <a href="/pin/111/">
        <img
          alt="Architectural black coat"
          src="https://i.pinimg.com/236x/aa/bb/cc/first.jpg"
          srcset="https://i.pinimg.com/236x/aa/bb/cc/first.jpg 236w, https://i.pinimg.com/736x/aa/bb/cc/first.jpg 736w"
        />
      </a>
      <a href="/pin/222/">
        <img
          alt="Editorial concrete interior"
          src="https://i.pinimg.com/564x/dd/ee/ff/second.jpg"
        />
      </a>
      <img
        alt="Profile image"
        src="https://i.pinimg.com/75x75_RS/00/11/22/avatar.jpg"
      />
    </body>
  </html>
`;

const preview = extractPinterestBoardPreview(html, boardUrl);
assert(preview.title === "Editorial Reference", "Pinterest suffix should be removed from the title");
assert(preview.pins.length === 2, "Only actual Pin thumbnails should be returned");
assert(
  preview.pins[0].src.includes("/736x/"),
  "The highest-resolution srcset candidate should win",
);
assert(
  preview.pins[0].url === "https://www.pinterest.com/pin/111/",
  "Pin provenance URL should be preserved",
);
assert(preview.limited, "A two-image public preview should be marked as limited");
assert(Boolean(preview.warning), "Limited previews should explain how to get complete access");

assert(
  parsePinterestBoardUrl("pinterest.com/mimi/editorial-reference/").hostname ===
    "pinterest.com",
  "Scheme-less Pinterest links should normalize",
);

let rejectedUnsafeHost = false;
try {
  parsePinterestBoardUrl("http://127.0.0.1/private");
} catch {
  rejectedUnsafeHost = true;
}
assert(rejectedUnsafeHost, "Non-Pinterest URLs must be rejected before server fetch");

console.log("Pinterest public board parser: PASS");
console.log("High-resolution thumbnail selection: PASS");
console.log("Provenance and limited-preview messaging: PASS");
console.log("Pinterest-only URL validation: PASS");
