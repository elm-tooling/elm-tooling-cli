import { toJSON } from "../src/Helpers";
import { stringSnapshotSerializer } from "./Helpers";

expect.addSnapshotSerializer(stringSnapshotSerializer);

describe("toJSON", () => {
  test("undefined", () => {
    expect(toJSON(undefined)).toMatchInlineSnapshot(`
      null

    `);
  });

  test("null", () => {
    expect(toJSON(null)).toMatchInlineSnapshot(`
      null

    `);
  });

  test("boolean", () => {
    expect(toJSON(true)).toMatchInlineSnapshot(`
      true

    `);
  });

  test("number", () => {
    expect(toJSON(1.5)).toMatchInlineSnapshot(`
      1.5

    `);
  });

  test("string", () => {
    expect(toJSON(`"It's me!" he said.`)).toMatchInlineSnapshot(`
      "\\"It's me!\\" he said."

    `);
  });

  test("empty array", () => {
    expect(toJSON([])).toMatchInlineSnapshot(`
      []

    `);
  });

  test("undefined in array", () => {
    expect(toJSON([undefined, null])).toMatchInlineSnapshot(`
      [ null, null ]

    `);
  });

  test("undefined in object", () => {
    expect(toJSON({ a: undefined, b: null })).toMatchInlineSnapshot(`
      {
          "b": null
      }

    `);
  });

  test("empty object", () => {
    expect(toJSON({})).toMatchInlineSnapshot(`
      {}

    `);
  });

  test("array of only primitives", () => {
    expect(toJSON([null, false, true, 0, 1.5, ".".repeat(46)]))
      .toMatchInlineSnapshot(`
      [ null, false, true, 0, 1.5, ".............................................." ]

    `);
  });

  test("too long array of only primitives", () => {
    // Could technically be on one line, but only on the top level (no comma).
    expect(toJSON([null, false, true, 0, 1.5, ".".repeat(47)]))
      .toMatchInlineSnapshot(`
      [
          null,
          false,
          true,
          0,
          1.5,
          "..............................................."
      ]

    `);
  });

  test("array of primitives and array", () => {
    expect(toJSON([null, false, true, 0, 1.5, "string", []]))
      .toMatchInlineSnapshot(`
      [
          null,
          false,
          true,
          0,
          1.5,
          "string",
          []
      ]

    `);
  });

  test("array of primitives and object", () => {
    expect(toJSON([null, false, true, 0, 1.5, "string", {}]))
      .toMatchInlineSnapshot(`
      [
          null,
          false,
          true,
          0,
          1.5,
          "string",
          {}
      ]

    `);
  });

  test("object with two keys of arrays of primitives", () => {
    const array = [null, false, true, 0, 1.5, ".".repeat(35)];
    expect(toJSON({ key: array, bee: array })).toMatchInlineSnapshot(`
      {
          "key": [ null, false, true, 0, 1.5, "..................................." ],
          "bee": [ null, false, true, 0, 1.5, "..................................." ]
      }

`);
  });

  test("object with two keys of arrays of too long primitives", () => {
    // Technically the second one would fit (because no comma), but that would
    // cause more unnecessary diff if you add a third item.
    const array = [null, false, true, 0, 1.5, ".".repeat(36)];
    expect(toJSON({ key: array, bee: array })).toMatchInlineSnapshot(`
      {
          "key": [
              null,
              false,
              true,
              0,
              1.5,
              "...................................."
          ],
          "bee": [
              null,
              false,
              true,
              0,
              1.5,
              "...................................."
          ]
      }

    `);
  });

  test("elm-tooling.json with few entrypoints and empty tools", () => {
    expect(
      toJSON({ entrypoints: ["./src/Main.elm", "./src/Admin.elm"], tools: {} })
    ).toMatchInlineSnapshot(`
      {
          "entrypoints": [ "./src/Main.elm", "./src/Admin.elm" ],
          "tools": {}
      }

    `);
  });

  test("elm-tooling.json with many entrypoints and one tool", () => {
    expect(
      toJSON({
        entrypoints: [
          "./src/Main.elm",
          "./src/Admin.elm",
          "./src/Game/Main.elm",
        ],
        tools: { elm: "0.19.1" },
      })
    ).toMatchInlineSnapshot(`
      {
          "entrypoints": [
              "./src/Main.elm",
              "./src/Admin.elm",
              "./src/Game/Main.elm"
          ],
          "tools": {
              "elm": "0.19.1"
          }
      }

    `);
  });

  test("elm-tooling.json with many tools", () => {
    expect(
      toJSON({
        tools: {
          elm: "0.19.1",
          "elm-format": "0.8.5",
          "elm-json": "0.2.10",
        },
      })
    ).toMatchInlineSnapshot(`
      {
          "tools": {
              "elm": "0.19.1",
              "elm-format": "0.8.5",
              "elm-json": "0.2.10"
          }
      }

    `);
  });

  test("elm-watch", () => {
    expect(
      toJSON({
        "x-elm-watch": {
          postprocess: ["elm-watch-node", "postprocess.js"],
          outputs: {
            "build/ApplicationMain.js": {
              inputs: ["src/ApplicationMain.elm"],
            },

            "build/DocumentMain.js": {
              inputs: [
                "src/DocumentMain.elm",
                "src/DocumentHelpers/DocumentDemo.elm",
              ],
            },
          },
        },
      })
    ).toMatchInlineSnapshot(`
      {
          "x-elm-watch": {
              "postprocess": [ "elm-watch-node", "postprocess.js" ],
              "outputs": {
                  "build/ApplicationMain.js": {
                      "inputs": [ "src/ApplicationMain.elm" ]
                  },
                  "build/DocumentMain.js": {
                      "inputs": [
                          "src/DocumentMain.elm",
                          "src/DocumentHelpers/DocumentDemo.elm"
                      ]
                  }
              }
          }
      }

    `);
  });
});
