import type { PostBuilder } from "./post-builder";

function coffeePost(post: PostBuilder) {
  const green = "#173D2E";
  const cream = "#F7F2E8";
  const gold = "#F4C35B";
  post.text("Coffee brand", "MORNING / CLUB", [64, 56, 650, 44], 28, green, {
    fontWeight: "bold",
    letterSpacing: 3,
  });
  post.text("Coffee edition", "FRESHLY ROASTED", [760, 66, 256, 28], 18, green, { align: "right" });
  post.rect("Coffee divider", [64, 124, 952, 2], "#C7D1BF");
  post.text("Coffee headline", "Good days\nstart slow.", [64, 184, 720, 270], 112, green, {
    fontFamily: "Georgia",
    fontWeight: "bold",
  });
  post.text(
    "Coffee description",
    "Small-batch coffee.\nA little ritual, just for you.",
    [64, 478, 550, 106],
    28,
    green,
  );
  post.ellipse("New blend badge", [800, 218, 190, 190], gold);
  post.text("New blend label", "NEW\nBLEND", [815, 262, 160, 90], 28, green, {
    align: "center",
    fontWeight: "bold",
  });
  post.rect("Coffee offer card", [64, 654, 952, 362], green, 40);
  post.text("Coffee offer", "Meet your new\nmorning favorite.", [104, 704, 500, 112], 38, cream, {
    fontWeight: "bold",
  });
  post.text("Coffee details", "250g / Whole bean / Made to savor", [104, 838, 520, 38], 22, cream);
  post.rect("Coffee CTA background", [104, 912, 286, 62], gold, 31);
  post.text("Coffee CTA", "SHOP THE DROP", [116, 932, 262, 30], 20, green, {
    align: "center",
    fontWeight: "bold",
  });
  const cup = [
    post.ellipse("Cup shadow", [662, 884, 286, 34], "#102C21"),
    post.ellipse("Cup handle outer", [864, 690, 142, 146], cream),
    post.ellipse("Cup handle opening", [900, 720, 76, 84], green),
    post.rect("Cup body", [672, 674, 248, 222], cream, 36),
    post.ellipse("Cup rim", [670, 634, 252, 92], "#E6DCCA"),
    post.ellipse("Fresh coffee", [690, 649, 212, 60], "#71432D"),
    post.rect("Steam left", [712, 560, 14, 46], "#A8B99B", 7),
    post.rect("Steam middle", [764, 538, 14, 64], "#A8B99B", 7),
    post.rect("Steam right", [816, 560, 14, 46], "#A8B99B", 7),
    post.text("Cup label", "SLOW\nMORNINGS", [702, 754, 188, 82], 24, green, {
      align: "center",
      fontWeight: "bold",
    }),
  ];
  post.group("Editable coffee illustration", cup);
  post.text(
    "Coffee footer",
    "ROASTED WITH CARE. ENJOYED EVERYWHERE.",
    [64, 1034, 952, 28],
    16,
    green,
    { letterSpacing: 1 },
  );
}

function studioPost(post: PostBuilder) {
  const ink = "#17192F";
  const paper = "#F4F1EB";
  const lime = "#D9FF70";
  post.text("Studio brand", "OPEN STUDIO", [64, 58, 650, 48], 30, paper, {
    fontWeight: "bold",
    letterSpacing: 5,
  });
  post.text("Studio edition", "NO. 024 / LIVE", [770, 68, 246, 30], 20, paper, { align: "right" });
  post.rect("Studio category badge", [64, 150, 366, 52], lime, 26);
  post.text("Studio category", "A FREE CREATIVE SESSION", [84, 167, 326, 28], 18, ink, {
    fontWeight: "bold",
    align: "center",
  });
  post.text("Studio headline", "Make room\nfor better\nideas.", [64, 250, 952, 390], 112, paper, {
    fontWeight: "bold",
  });
  const artwork = [
    post.ellipse("Violet disc", [568, 664, 440, 440], "#9174E8"),
    post.rotate(post.rect("Violet pillar", [168, 698, 148, 354], "#9174E8", 74), 18),
    post.rotate(post.rect("Lime cross horizontal", [324, 804, 336, 92], lime, 46), -22),
    post.rotate(post.rect("Lime cross vertical", [446, 682, 92, 336], lime, 46), -22),
    post.ellipse("Peach ring outer", [770, 738, 176, 176], "#FFAA88"),
    post.ellipse("Peach ring opening", [814, 782, 88, 88], "#9174E8"),
  ];
  post.group("Editable studio artwork", artwork);
  post.text(
    "Studio invitation",
    "Bring your curiosity.\nLeave with a new perspective.",
    [64, 1080, 900, 92],
    30,
    paper,
  );
  post.rect("Studio footer divider", [64, 1192, 952, 2], "#515366");
  post.text(
    "Studio event details",
    "THU 12 NOV / 6:30 PM\nOnline. Open to everyone.",
    [64, 1224, 620, 78],
    23,
    paper,
  );
  post.rect("Studio CTA background", [754, 1224, 262, 72], lime, 36);
  post.text("Studio CTA", "SAVE YOUR SEAT", [770, 1249, 230, 30], 19, ink, {
    fontWeight: "bold",
    align: "center",
  });
}

function resetPost(post: PostBuilder) {
  const ink = "#393246";
  const green = "#315443";
  post.text("Notes brand", "FIELD NOTES", [64, 58, 680, 46], 29, ink, {
    fontWeight: "bold",
    letterSpacing: 4,
  });
  post.rect("Notes issue badge", [844, 54, 172, 48], "#DDE5D4", 24);
  post.text("Notes issue", "ISSUE 03", [860, 68, 140, 28], 18, ink, {
    align: "center",
    fontWeight: "bold",
  });
  post.text("Notes headline", "Less noise.\nMore space.", [64, 192, 952, 270], 106, ink, {
    fontFamily: "Georgia",
    fontWeight: "bold",
  });
  post.text(
    "Notes introduction",
    "A small reminder to slow down\nand make room for what matters.",
    [64, 496, 900, 96],
    28,
    ink,
  );
  post.ellipse("Notes accent", [64, 644, 24, 24], "#E47E59");
  post.text("Notes reminder", "Your weekend,\nat your own pace.", [64, 724, 570, 146], 42, ink);
  const plant = [
    post.ellipse("Plant backdrop", [630, 604, 360, 360], "#F2BEA5"),
    post.rect("Plant stem", [820, 620, 14, 220], green, 7),
    post.rotate(post.ellipse("Plant leaf left", [692, 654, 150, 74], green), 30),
    post.rotate(post.ellipse("Plant leaf right", [830, 690, 156, 78], green), -30),
    post.rotate(post.ellipse("Plant leaf top left", [736, 556, 120, 68], "#55765B"), 55),
    post.rotate(post.ellipse("Plant leaf top right", [830, 582, 120, 68], "#55765B"), -30),
    post.rect("Plant pot", [744, 812, 172, 174], "#A28BBF", 28),
    post.ellipse("Plant pot rim", [744, 790, 172, 52], "#B7A3D0"),
  ];
  post.group("Editable plant illustration", plant);
  post.text("Notes footer", "SAVE THIS FOR LATER", [64, 974, 580, 34], 20, ink, {
    letterSpacing: 2,
    fontWeight: "bold",
  });
  post.rect("Notes footer divider", [64, 1040, 952, 2], ink);
}

export const SOCIAL_POSTS = [
  { name: "Slow Mornings", width: 1080, height: 1080, background: "#F7F2E8", build: coffeePost },
  { name: "Open Studio", width: 1080, height: 1350, background: "#17192F", build: studioPost },
  { name: "Weekend Reset", width: 1080, height: 1080, background: "#F2EEE9", build: resetPost },
] as const;
