import { expect, test } from "vitest";
import {
  unDigitifyPolarityNodes,
  programToAdjacencyList,
  getResistorAdjacencyList,
  mergeAdjancencyLists,
  roblgorithm,
  getSwitchAdjacencyList,
} from "./simulator";
import type { AdjacencyList } from "./simulator.t";

test("unDigitifyPolarityNodes", () => {
  expect(unDigitifyPolarityNodes("1+")).toBe("+");
  expect(unDigitifyPolarityNodes("1-")).toBe("-");
  expect(unDigitifyPolarityNodes("1X")).toBe("1X");
  expect(unDigitifyPolarityNodes("1A")).toBe("1A");
  expect(unDigitifyPolarityNodes("2X")).toBe("2X");
});

test("programToAdjacencyList", () => {
  let out = programToAdjacencyList(`
    1+/1A
    1B/1-
  `);
  expect(out).toStrictEqual({
    "+": ["1A"],
    "1A": ["+"],
    "1B": ["-"],
    "-": ["1B"],
  });

  out = programToAdjacencyList(`
    1+/1Y
    1X/1A
    1B/1-
    1Y/2Y
    2X/1X
  `);
  expect(out).toStrictEqual({
    "+": ["1Y"],
    "1Y": ["+", "2Y"],
    "1X": ["1A", "2X"],
    "1A": ["1X"],
    "1B": ["-"],
    "-": ["1B"],
    "2Y": ["1Y"],
    "2X": ["1X"],
  });
});

test("getResistorAdjacencyList", () => {
  expect(
    getResistorAdjacencyList({
      "+": ["1A"],
      "1A": ["+"],
      "1B": ["-"],
      "-": ["1B"],
    }),
  ).toStrictEqual({
    "1A": ["1B"],
    "1B": ["1A"],
  });

  // not a real circuit, would short circuit
  expect(
    getResistorAdjacencyList({
      "+": ["1Y"],
      "1Y": ["+"],
      "1X": ["-"],
      "-": ["1X"],
    }),
  ).toStrictEqual({});

  // just the relay light
  expect(
    getResistorAdjacencyList({
      "+": ["1C"],
      "1C": ["+"],
      "1E": ["-"],
      "-": ["1E"],
    }),
  ).toStrictEqual({
    "1C": ["1E"],
    "1E": ["1C"],
  });

  // just the relay coil
  expect(
    getResistorAdjacencyList({
      "+": ["1E"],
      "1E": ["+"],
      "1F": ["-"],
      "-": ["1F"],
    }),
  ).toStrictEqual({
    "1E": ["1F"],
    "1F": ["1E"],
  });

  // relay light+coil
  expect(
    getResistorAdjacencyList({
      "+": ["1C"],
      "1C": ["+"],
      "1F": ["-"],
      "-": ["1F"],
    }),
  ).toStrictEqual({
    "1C": ["1F"],
    "1F": ["1C"],
  });
});

test("mergeAdjancencyLists", () => {
  const list1: AdjacencyList = {
    "+": ["1A"],
    "1A": ["+"],
    "1B": ["-"],
    "-": ["1B"],
  };
  const list2: AdjacencyList = {
    "+": ["2A"],
    "2A": ["+"],
    "2B": ["-"],
    "-": ["2B"],
  };
  const list3: AdjacencyList = {
    "+": ["3A"],
    "3A": ["+"],
    "3B": ["-"],
    "-": ["3B"],
  };
  const merged = mergeAdjancencyLists([list1, list2, list3]);
  expect(merged).toStrictEqual({
    "+": ["1A", "2A", "3A"],
    "-": ["1B", "2B", "3B"],
    "1A": ["+"],
    "1B": ["-"],
    "2A": ["+"],
    "2B": ["-"],
    "3A": ["+"],
    "3B": ["-"],
  });
});

test("roblgorithm", () => {
  // const programAdjacencyList = {
  //   "+": ["1A", "2A"],
  //   "1A": ["+"],
  //   "1B": ["-"],
  //   "-": ["1B", "2B"],
  //   "2B": ["-", "2Z"],
  //   "2A": ["+"],
  //   "2Z": ["2B"],
  // };
  // const resistorAdjacencyList = {
  //   "1A": ["1B"],
  //   "1B": ["1A"],
  //   "2A": ["2B"],
  //   "2B": ["2A"],
  // };
  // const switchAdjacencyList = {};
  // roblgorithm({
  //   programAdjacencyList,
  //   resistorAdjacencyList,
  //   switchAdjacencyList,
  // });

  // two buttons in OR formation,
  // when either one is pressed, light turns on, otherwise
  // light stays off
  const programAdjacencyList = programToAdjacencyList(`
    1+/1Y
    1X/1A
    1B/1-
    1Y/2Y
    2X/1X
  `);
  const resistorAdjacencyList = getResistorAdjacencyList(programAdjacencyList);
  // button state
  const switchAdjacencyList = getSwitchAdjacencyList([false, false]);
  roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
});
