import assert from "node:assert/strict";
import test from "node:test";
import {
  adaptWebsterLearnersResponse,
  WebsterLearnersAdapterError,
} from "../src/adapters/webster-learners.adapter.ts";

test("cleans definitions, examples, nested senses, pronunciation, and audio", () => {
  const entry = {
    meta: { id: "run:1" },
    hwi: {
      hw: "ru*n",
      prs: [{ mw: "ˈrən", sound: { audio: "bixrun01" } }],
    },
    fl: "verb",
    shortdef: ["to move rapidly"],
    def: [
      {
        sseq: [
          [
            ["bs", { sense: { dt: [["text", "{bc}an example of"]] } }],
            [
              "sense",
              {
                dt: [
                  ["text", "{bc}{it}running{/it} {d_link|quickly|quick}"],
                  ["vis", [{ t: "She {wi}runs{/wi} each day." }]],
                ],
                sdsense: {
                  sd: "especially",
                  dt: [["text", "{bc}in races"]],
                },
              },
            ],
            ["sense", { dt: [["text", "{bc}moving fast"]] }],
            ["pseq", [["sense", { dt: [["text", "{bc}by foot"]] }]]],
          ],
        ],
      },
      {
        sseq: [[["sense", { dt: [["text", "{bc}the act of running"]] }]]],
      },
    ],
  };

  const result = adaptWebsterLearnersResponse(["runner", entry]);

  assert.deepEqual(result.cleanEntries, [
    {
      word: "run",
      partOfSpeech: "verb",
      phonetic: "ˈrən",
      audioUrl: "https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bixrun01.mp3",
      meanings: [
        {
          definition: "an example of: running quickly; especially in races",
          examples: ["She runs each day."],
        },
        { definition: "an example of: moving fast", examples: [] },
        { definition: "an example of: by foot", examples: [] },
        { definition: "the act of running", examples: [] },
      ],
    },
  ]);
  assert.equal(result.dictionaryEntries[0]?.entryKey, "run:1");
  assert.equal(result.dictionaryEntries[0]?.position, 1);
  assert.equal(result.dictionaryEntries[0]?.entryJson, JSON.stringify(entry));
});

test("uses IPA and short definitions when full definitions are unavailable", () => {
  const result = adaptWebsterLearnersResponse([
    {
      meta: { id: "hello" },
      hwi: { hw: "hello", prs: [{ ipa: "həˈloʊ" }] },
      shortdef: ["{bc}a greeting"],
    },
  ]);

  assert.deepEqual(result.cleanEntries, [
    {
      word: "hello",
      partOfSpeech: "",
      phonetic: "həˈloʊ",
      audioUrl: null,
      meanings: [{ definition: "a greeting", examples: [] }],
    },
  ]);
  assert.deepEqual(JSON.parse(result.dictionaryEntries[0]?.shortDefinitionsJson ?? "null"), [
    "{bc}a greeting",
  ]);
});

test("routes audio filenames beginning with punctuation to the number folder", () => {
  const result = adaptWebsterLearnersResponse([
    {
      hwi: { hw: "word", prs: [{ mw: "wɝd", sound: { audio: "_word01" } }] },
    },
  ]);

  assert.equal(
    result.cleanEntries[0]?.audioUrl,
    "https://media.merriam-webster.com/audio/prons/en/us/mp3/number/_word01.mp3",
  );
});

test("rejects responses or entries that cannot be represented", () => {
  assert.throws(
    () => adaptWebsterLearnersResponse({ error: "bad response" }),
    WebsterLearnersAdapterError,
  );
  assert.throws(() => adaptWebsterLearnersResponse([null]), WebsterLearnersAdapterError);
  assert.throws(
    () => adaptWebsterLearnersResponse([{ meta: { id: "" } }]),
    WebsterLearnersAdapterError,
  );
  assert.throws(
    () => adaptWebsterLearnersResponse([{ hwi: { hw: "hello" }, shortdef: [1] }]),
    WebsterLearnersAdapterError,
  );
});
