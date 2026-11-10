import { describe, expect, test } from "bun:test";

import {
  BACKGROUNDS,
  BACKGROUND_FILTERS,
  filterBackgrounds,
} from "../src/lib/story";

describe("Illustrated story backgrounds", () => {
  test("ships four distinct flat scenes in a dedicated 2D category", () => {
    const illustrated = filterBackgrounds("illustrated");

    expect(illustrated.map((background) => background.id)).toEqual([
      "illustrated-meadow",
      "illustrated-city",
      "illustrated-space",
      "illustrated-lagoon",
    ]);
    expect(new Set(illustrated.map((background) => background.src)).size).toBe(4);
    expect(illustrated.every((background) => background.category === "illustrated")).toBe(true);
    expect(BACKGROUND_FILTERS).toContain("illustrated");
  });

  test("makes an illustrated scene the initial story background", () => {
    expect(BACKGROUNDS[0]?.id).toBe("illustrated-meadow");
    expect(BACKGROUNDS[0]?.category).toBe("illustrated");
  });
});
