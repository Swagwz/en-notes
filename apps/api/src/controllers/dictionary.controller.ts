import type { Context } from "hono";
import {
  adaptWebsterLearnersResponse,
  WebsterLearnersAdapterError,
} from "../adapters/webster-learners.adapter.js";
import type { AppEnv } from "../app-types.js";
import * as dictionaryModel from "../models/dictionary.model.js";
import { validationError } from "../utils/http.js";

export async function lookupDictionaryEntry(c: Context<AppEnv>) {
  const term = c.req.query("term")?.trim();
  if (!term || term.length > 100) {
    return validationError(c, "term is required and must be at most 100 characters");
  }

  const normalizedTerm = term.toLocaleLowerCase();
  const cached = await dictionaryModel.getCachedLookup(c.get("db"), normalizedTerm);
  if (cached) {
    if (cached.normalizedJson !== null) {
      const cleanEntries = JSON.parse(cached.normalizedJson);
      return c.json({ data: cleanEntries, cached: true });
    }

    const cachedData: unknown = JSON.parse(cached.responseJson);
    let adapted;
    try {
      adapted = adaptWebsterLearnersResponse(cachedData);
    } catch (error) {
      if (!(error instanceof WebsterLearnersAdapterError)) throw error;
      return dictionaryFormatError(c);
    }

    await dictionaryModel.saveNormalizedLookup(
      c.get("db"),
      normalizedTerm,
      adapted.cleanEntries,
    );
    return c.json({ data: adapted.cleanEntries, cached: true });
  }

  const apiKey = c.env.WEBSTER_LEARNERS_API_KEY;
  if (!apiKey) {
    return c.json(
      {
        error: {
          code: "DICTIONARY_NOT_CONFIGURED",
          message: "Webster's Learner's Dictionary API key is not configured",
        },
      },
      503,
    );
  }

  const url = new URL(
    `https://www.dictionaryapi.com/api/v3/references/learners/json/${encodeURIComponent(term)}`,
  );
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);
  if (!response.ok) {
    return c.json(
      {
        error: { code: "DICTIONARY_PROVIDER_ERROR", message: "Dictionary provider request failed" },
      },
      502,
    );
  }

  const dictionaryData: unknown = await response.json();
  let adapted;
  try {
    adapted = adaptWebsterLearnersResponse(dictionaryData);
  } catch (error) {
    if (!(error instanceof WebsterLearnersAdapterError)) throw error;
    return dictionaryFormatError(c);
  }
  await dictionaryModel.saveLookup(
    c.get("db"),
    normalizedTerm,
    dictionaryData,
    adapted.cleanEntries,
    adapted.dictionaryEntries,
    Date.now(),
  );
  return c.json({ data: adapted.cleanEntries, cached: false });
}

function dictionaryFormatError(c: Context<AppEnv>) {
  return c.json(
    {
      error: {
        code: "DICTIONARY_PROVIDER_ERROR",
        message: "Dictionary provider returned an unsupported response",
      },
    },
    502,
  );
}
