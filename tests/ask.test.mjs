import test from "node:test";
import assert from "node:assert/strict";
import { askIntent, cropInText } from "../docs/js/ask.js";

test("the eight questions in Hindi", () => {
  assert.equal(askIntent("कौन सी फसल बोऊं?"), "grow");
  assert.equal(askIntent("क्या मेरा खेत गेहूं के लिए ठीक है?"), "suit");
  assert.equal(askIntent("सिंचाई कब करूं?"), "water");
  assert.equal(askIntent("क्या बारिश आएगी?"), "rain");
  assert.equal(askIntent("मेरी फसल क्यों कमज़ोर हो रही है?"), "why");
  assert.equal(askIntent("कौन सी खाद डालूं?"), "fert");
  assert.equal(askIntent("कटाई कब करूं?"), "harvest");
  assert.equal(askIntent("किस मंडी में भाव अच्छा है?"), "mandi");
});

test("the eight questions in English", () => {
  assert.equal(askIntent("Which crop should I grow?"), "grow");
  assert.equal(askIntent("Is my field right for wheat?"), "suit");
  assert.equal(askIntent("When should I irrigate?"), "water");
  assert.equal(askIntent("Is rain expected?"), "rain");
  assert.equal(askIntent("Why is my crop getting weaker?"), "why");
  assert.equal(askIntent("Which fertiliser should I use?"), "fert");
  assert.equal(askIntent("When should I harvest?"), "harvest");
  assert.equal(askIntent("Which mandi has a better price?"), "mandi");
});

test("spoken without a question mark still works", () => {
  assert.equal(askIntent("सरसों के लिए मेरा खेत सही है क्या"), "suit");
  assert.equal(askIntent("बारिश कब आएगी"), "rain");
});

test("a place name is not a question", () => {
  assert.equal(askIntent("बैरसाल करनाल"), null);
  assert.equal(askIntent("Mandi Dabwali"), null);
  assert.equal(askIntent("132001"), null);
  assert.equal(askIntent("Nilokheri"), null);
});

test("crop named in a sentence", () => {
  assert.equal(cropInText("क्या मेरा खेत गेहूं के लिए ठीक है"), "wheat");
  assert.equal(cropInText("is my field right for mustard"), "mustard");
  assert.equal(cropInText("नरमा लगा सकता हूं क्या"), "cotton");
  assert.equal(cropInText("कुछ भी"), null);
});
