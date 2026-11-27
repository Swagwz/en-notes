export interface CleanWordMeaning {
  definition: string;
  examples: string[];
}

export interface CleanWordEntry {
  word: string;
  partOfSpeech: string;
  phonetic: string;
  audioUrl: string | null;
  meanings: CleanWordMeaning[];
}

export interface WebsterLearnersDictionaryEntry {
  entryKey: string;
  headword: string;
  partOfSpeech: string | null;
  pronunciation: string | null;
  audioFilename: string | null;
  shortDefinitionsJson: string;
  entryJson: string;
  position: number;
}

export interface WebsterLearnersAdaptation {
  cleanEntries: CleanWordEntry[];
  dictionaryEntries: WebsterLearnersDictionaryEntry[];
}

export class WebsterLearnersAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsterLearnersAdapterError";
  }
}

const CROSS_REFERENCE_TOKENS = new Set([
  "a_link",
  "d_link",
  "dxt",
  "et_link",
  "i_link",
  "mat",
  "sx",
]);

export function adaptWebsterLearnersResponse(response: unknown): WebsterLearnersAdaptation {
  if (!Array.isArray(response)) {
    throw new WebsterLearnersAdapterError("Expected the dictionary response to be an array");
  }

  const cleanEntries: CleanWordEntry[] = [];
  const dictionaryEntries: WebsterLearnersDictionaryEntry[] = [];

  response.forEach((value, position) => {
    if (typeof value === "string") return;
    if (!isRecord(value)) {
      throw new WebsterLearnersAdapterError(
        `Expected a dictionary entry or spelling suggestion at position ${position}`,
      );
    }

    const meta = isRecord(value.meta) ? value.meta : {};
    const headwordInfo = isRecord(value.hwi) ? value.hwi : {};
    const rawHeadword = typeof headwordInfo.hw === "string" ? headwordInfo.hw : "";
    const word = rawHeadword.replace(/\*/g, "").trim() || getHeadwordFromId(meta.id);
    if (!word) {
      throw new WebsterLearnersAdapterError(
        `Dictionary entry at position ${position} is missing a headword`,
      );
    }

    const shortDefinitions = getShortDefinitions(value.shortdef, position);
    const pronunciation =
      Array.isArray(headwordInfo.prs) && isRecord(headwordInfo.prs[0]) ? headwordInfo.prs[0] : {};
    const sound = isRecord(pronunciation.sound) ? pronunciation.sound : {};
    const phonetic = firstString(pronunciation.mw, pronunciation.ipa) ?? "";
    const audioFilename = typeof sound.audio === "string" ? sound.audio : null;
    const partOfSpeech = typeof value.fl === "string" ? cleanMWText(value.fl) : "";
    const meanings = getMeanings(value.def);
    if (meanings.length === 0) {
      meanings.push(
        ...shortDefinitions
          .map(cleanDefinitionText)
          .filter(Boolean)
          .map((definition) => ({ definition, examples: [] })),
      );
    }

    cleanEntries.push({
      word,
      partOfSpeech,
      phonetic,
      audioUrl: buildMWAudioUrl(audioFilename),
      meanings,
    });

    dictionaryEntries.push({
      entryKey: typeof meta.id === "string" && meta.id.length > 0 ? meta.id : `${word}:${position}`,
      headword: word,
      partOfSpeech: partOfSpeech || null,
      pronunciation: phonetic || null,
      audioFilename,
      shortDefinitionsJson: JSON.stringify(shortDefinitions),
      entryJson: JSON.stringify(value),
      position,
    });
  });

  return { cleanEntries, dictionaryEntries };
}

export function cleanMWText(raw: string): string {
  const text = raw.replace(/\{([^{}]*)\}/g, (_token, contents: string) => {
    const [name, ...fields] = contents.split("|");
    if (name.startsWith("/")) return "";
    if (name === "bc") return ": ";
    if (name === "ldquo") return "“";
    if (name === "rdquo") return "”";
    if (name === "amp") return "&";
    if (name === "p_br") return " ";
    if (CROSS_REFERENCE_TOKENS.has(name)) return fields[0] || fields[1] || "";
    return "";
  });

  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function cleanDefinitionText(raw: string): string {
  return cleanMWText(raw).replace(/^:\s*/, "").trim();
}

export function buildMWAudioUrl(audioFilename: string | null): string | null {
  if (!audioFilename) return null;

  const folder = audioFilename.startsWith("bix")
    ? "bix"
    : audioFilename.startsWith("gg")
      ? "gg"
      : /^[0-9_\W]/.test(audioFilename)
        ? "number"
        : audioFilename[0].toLowerCase();

  return `https://media.merriam-webster.com/audio/prons/en/us/mp3/${folder}/${encodeURIComponent(audioFilename)}.mp3`;
}

function getMeanings(definitions: unknown): CleanWordMeaning[] {
  if (!Array.isArray(definitions)) return [];

  const meanings: CleanWordMeaning[] = [];
  for (const definition of definitions) {
    if (isRecord(definition)) collectSenseSequences(definition.sseq, meanings);
  }
  return meanings;
}

function collectSenseSequences(
  value: unknown,
  meanings: CleanWordMeaning[],
  bindingDefinition = "",
): void {
  if (!Array.isArray(value)) return;

  if (isTaggedTuple(value)) {
    const [tag, payload] = value;
    if (tag === "sense" || tag === "sen") {
      if (isRecord(payload)) appendSense(payload, meanings, bindingDefinition);
      return;
    }
    if (tag === "pseq") {
      collectSenseSequences(payload, meanings, bindingDefinition);
    }
    return;
  }

  let currentBinding = bindingDefinition;
  for (const child of value) {
    if (isTaggedTuple(child) && child[0] === "bs") {
      const payload = child[1];
      const sense = isRecord(payload) && isRecord(payload.sense) ? payload.sense : null;
      if (sense) currentBinding = extractDefinition(sense.dt).definition;
    } else {
      collectSenseSequences(child, meanings, currentBinding);
    }
  }
}

function appendSense(
  sense: Record<string, unknown>,
  meanings: CleanWordMeaning[],
  bindingDefinition: string,
): void {
  const content = extractDefinition(sense.dt);
  const dividedSense = isRecord(sense.sdsense) ? sense.sdsense : null;
  const dividedContent = dividedSense ? extractDefinition(dividedSense.dt) : emptyDefinition();
  const divider =
    dividedSense && typeof dividedSense.sd === "string" ? cleanMWText(dividedSense.sd) : "";
  const definitionParts = [content.definition];

  if (dividedContent.definition) {
    definitionParts.push([divider, dividedContent.definition].filter(Boolean).join(" "));
  }

  const definition = definitionParts.filter(Boolean).join("; ");
  if (!definition) return;

  meanings.push({
    definition: combineBindingDefinition(bindingDefinition, definition),
    examples: [...content.examples, ...dividedContent.examples],
  });
}

function combineBindingDefinition(bindingDefinition: string, definition: string): string {
  if (!bindingDefinition) return definition;
  const separator = /[:;,\u2014-]$/.test(bindingDefinition) ? " " : ": ";
  return `${bindingDefinition}${separator}${definition}`;
}

function extractDefinition(value: unknown): CleanWordMeaning {
  const textParts: string[] = [];
  const examples: string[] = [];
  collectDefinitionContent(value, textParts, examples);
  return {
    definition: textParts.join(" ").replace(/\s+/g, " ").replace(/^:\s*/, "").trim(),
    examples,
  };
}

function emptyDefinition(): CleanWordMeaning {
  return { definition: "", examples: [] };
}

function collectDefinitionContent(value: unknown, textParts: string[], examples: string[]): void {
  if (isTaggedTuple(value)) {
    const [tag, content] = value;
    if ((tag === "text" || tag === "t") && typeof content === "string") {
      const text = cleanMWText(content);
      if (text) textParts.push(text);
      return;
    }
    if (tag === "vis") {
      collectExamples(content, examples);
      return;
    }
    collectDefinitionContent(content, textParts, examples);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectDefinitionContent(item, textParts, examples);
    return;
  }

  if (isRecord(value)) {
    if (typeof value.rie === "string") {
      const text = cleanMWText(value.rie);
      if (text) textParts.push(text);
      return;
    }
    for (const item of Object.values(value)) {
      collectDefinitionContent(item, textParts, examples);
    }
  }
}

function collectExamples(value: unknown, examples: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectExamples(item, examples);
    return;
  }

  if (!isRecord(value)) return;
  if (typeof value.t === "string") {
    const example = cleanMWText(value.t);
    if (example) examples.push(example);
    return;
  }

  for (const item of Object.values(value)) collectExamples(item, examples);
}

function getShortDefinitions(value: unknown, position: number): string[] {
  if (value === undefined || value === null) return [];
  if (
    !Array.isArray(value) ||
    !value.every((definition): definition is string => typeof definition === "string")
  ) {
    throw new WebsterLearnersAdapterError(
      `Dictionary entry at position ${position} has an invalid shortdef`,
    );
  }
  return value;
}

function getHeadwordFromId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.split(":")[0]?.replace(/\*/g, "").trim() ?? "";
}

function firstString(...values: unknown[]): string | null {
  return (
    values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null
  );
}

function isTaggedTuple(value: unknown): value is [string, unknown] {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
