import { expect, test } from "vitest";
import {
  unDigitifyPolarityNodes,
  programToAdjacencyList,
  getResistorAdjacencyList,
  mergeAdjancencyLists,
  roblgorithm,
  getButtonSwitchRelayAdjacencyList,
  computeOutputStateFromPotentials,
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
    "+": new Set(["1A"]),
    "1A": new Set(["+"]),
    "1B": new Set(["-"]),
    "-": new Set(["1B"]),
  });

  out = programToAdjacencyList(`
    1+/1Y
    1X/1A
    1B/1-
    1Y/2Y
    2X/1X
  `);
  expect(out).toStrictEqual({
    "+": new Set(["1Y"]),
    "1Y": new Set(["+", "2Y"]),
    "1X": new Set(["1A", "2X"]),
    "1A": new Set(["1X"]),
    "1B": new Set(["-"]),
    "-": new Set(["1B"]),
    "2Y": new Set(["1Y"]),
    "2X": new Set(["1X"]),
  });

  // test case of programToAdjacencyList receiving C E and see that
  // C E is there, test E F, test that it's there, then test C F
  // and check and C E and E F are there
  out = programToAdjacencyList(`
    1+/1C
    1E/1-
    `);
  expect(out).toStrictEqual({
    "+": new Set(["1C"]),
    "1C": new Set(["+"]),
    "1E": new Set(["-"]),
    "-": new Set(["1E"]),
  });

  out = programToAdjacencyList(`
    1+/1E
    1F/1-
  `);
  expect(out).toStrictEqual({
    "+": new Set(["1E"]),
    "1E": new Set(["+"]),
    "1F": new Set(["-"]),
    "-": new Set(["1F"]),
  });

  out = programToAdjacencyList(`
    1+/1C
    1F/1-
  `);
  expect(out).toStrictEqual({
    "+": new Set(["1C"]),
    "1C": new Set(["+", "1E"]),
    "1E": new Set(["1C", "1F"]),
    "1F": new Set(["1E", "-"]),
    "-": new Set(["1F"]),
  });
});

test("getResistorAdjacencyList", () => {
  expect(
    getResistorAdjacencyList({
      "+": new Set(["1A"]),
      "1A": new Set(["+"]),
      "1B": new Set(["-"]),
      "-": new Set(["1B"]),
    }),
  ).toStrictEqual({
    "1A": new Set(["1B"]),
    "1B": new Set(["1A"]),
  });

  // not a real circuit, would short circuit
  expect(
    getResistorAdjacencyList({
      "+": new Set(["1Y"]),
      "1Y": new Set(["+"]),
      "1X": new Set(["-"]),
      "-": new Set(["1X"]),
    }),
  ).toStrictEqual({});

  // just the relay light
  expect(
    getResistorAdjacencyList({
      "+": new Set(["1C"]),
      "1C": new Set(["+"]),
      "1E": new Set(["-"]),
      "-": new Set(["1E"]),
    }),
  ).toStrictEqual({
    "1C": new Set(["1E"]),
    "1E": new Set(["1C"]),
  });

  // just the relay coil
  expect(
    getResistorAdjacencyList({
      "+": new Set(["1E"]),
      "1E": new Set(["+"]),
      "1F": new Set(["-"]),
      "-": new Set(["1F"]),
    }),
  ).toStrictEqual({
    "1E": new Set(["1F"]),
    "1F": new Set(["1E"]),
  });

  // relay light+coil
  expect(
    getResistorAdjacencyList({
      "+": new Set(["1C"]),
      // programToAdjacencyList always redo's
      // CF conections to be CE + EF
      "1C": new Set(["+", "1E"]),
      "1E": new Set(["1C", "1F"]),
      "1F": new Set(["1E", "-"]),
      "-": new Set(["1F"]),
    }),
  ).toStrictEqual({
    "1C": new Set(["1E"]),
    "1E": new Set(["1C", "1F"]),
    "1F": new Set(["1E"]),
  });
});

test("mergeAdjancencyLists", () => {
  const list1: AdjacencyList = {
    "+": new Set(["1A"]),
    "1A": new Set(["+"]),
    "1B": new Set(["-"]),
    "-": new Set(["1B"]),
  };
  const list2: AdjacencyList = {
    "+": new Set(["2A"]),
    "2A": new Set(["+"]),
    "2B": new Set(["-"]),
    "-": new Set(["2B"]),
  };
  const list3: AdjacencyList = {
    "+": new Set(["3A"]),
    "3A": new Set(["+"]),
    "3B": new Set(["-"]),
    "-": new Set(["3B"]),
  };
  const merged = mergeAdjancencyLists([list1, list2, list3]);
  expect(merged).toStrictEqual({
    "+": new Set(["1A", "2A", "3A"]),
    "-": new Set(["1B", "2B", "3B"]),
    "1A": new Set(["+"]),
    "1B": new Set(["-"]),
    "2A": new Set(["+"]),
    "2B": new Set(["-"]),
    "3A": new Set(["+"]),
    "3B": new Set(["-"]),
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
  const switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: true, 2: false },
    relayStates: {},
  });
  // TODO FIXME write a test
  // TODO FIXME write a test
  // TODO FIXME write a test
  roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
});

test("computeOutputStateFromPotentials", () => {
  expect(
    // not a circuit i.e. a short, but ok whatever
    computeOutputStateFromPotentials({
      "+": 0,
      "-": 0,
    }),
  ).toStrictEqual({
    outputLightState: new Array(6).fill(false),
    relayLightState: new Array(6).fill(false),
    relayState: new Array(6).fill(false),
  });

  expect(
    computeOutputStateFromPotentials({
      // a single light connected across power
      "+": 1,
      "1B": 1,
      "1A": 0,
      "-": 0,
    }),
  ).toStrictEqual({
    outputLightState: [true, ...new Array(5).fill(false)],
    relayLightState: new Array(6).fill(false),
    relayState: new Array(6).fill(false),
  });

  expect(
    computeOutputStateFromPotentials({
      // two lights in parallel
      "+": 2,
      "2B": 2,
      "2A": 1,
      "1B": 1,
      "1A": 0,
      "-": 0,
    }),
  ).toStrictEqual({
    outputLightState: [true, true, ...new Array(4).fill(false)],
    relayLightState: new Array(6).fill(false),
    relayState: new Array(6).fill(false),
  });

  // // --------------------------

  // // TODO move this to a utility test func to not repeat??
  // // TODO move this to a utility test func to not repeat??
  // // TODO give it separate name i.e. use test/describe..?
  // // to show up in the tests that we're testing this particular circuit?

  // two buttons in OR formation,
  // when either one is pressed, light turns on, otherwise
  // light stays off
  let programAdjacencyList = programToAdjacencyList(`
    1+/1Y
    1X/1A
    1B/1-
    1Y/2Y
    2X/1X
  `);
  let resistorAdjacencyList = getResistorAdjacencyList(programAdjacencyList);
  let switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: true, 2: false },
    relayStates: {},
  });
  let potentials = roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });

  expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
    outputLightState: [true, ...new Array(5).fill(false)],
    relayLightState: new Array(6).fill(false),
    relayState: new Array(6).fill(false),
  });

  // -----------------------

  // a circuit with a relay!! pdf p.17
  programAdjacencyList = programToAdjacencyList(`
    1+/1Y
    1X/1E
    1F/1-
    1+/1H
    1J/2A
    2B/2-
    1G/1A
    1B/1-
  `);
  resistorAdjacencyList = getResistorAdjacencyList(programAdjacencyList);
  switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: false },
    relayStates: { 1: false },
  });
  potentials = roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
  expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
    // normally closed - 1H connects to 1J, light 2 turns on
    outputLightState: [false, true, ...new Array(4).fill(false)],
    relayLightState: new Array(6).fill(false),
    relayState: new Array(6).fill(false),
  });

  // turn pushbutton 1 on, enabling the relay - step 1
  // the relay will show as on, but the relay arms have not moved yet
  switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: true },
    relayStates: { 1: false },
  });
  potentials = roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
  expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
    outputLightState: [false, true, ...new Array(4).fill(false)],
    relayLightState: new Array(6).fill(false),
    // the relay turns on!!
    relayState: [true, ...new Array(5).fill(false)],
  });

  // CHEAT here but not just re-passing what we got from computeOutputStateFromPotentials
  // but do change back state to boolean[] since it's otherwise confusing/hard
  // to pass between output and input (i.e. we know that all 6 relays are off
  // as output - we "can't" know that the original circuit only uses 1 circuit).
  // the fear was that passing all false relay states would create
  // too many unused connections..... but graph search can deal with searches
  // across nodes that don't connect to anything...!!

  // turn pushbutton 1 on, enabling the relay - step 2
  switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: true },
    relayStates: { 1: true },
  });
  potentials = roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
  expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
    // light 1 turns on, light 2 turns off
    outputLightState: [true, false, ...new Array(4).fill(false)],
    relayLightState: new Array(6).fill(false),
    // the relay is still on
    relayState: [true, ...new Array(5).fill(false)],
  });

  // turn pushbutton 1 off, disabling the relay - step 1
  switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: false },
    relayStates: { 1: true },
  });
  potentials = roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
  expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
    // light 1 is still on, light 2 is still off
    outputLightState: [true, false, ...new Array(4).fill(false)],
    relayLightState: new Array(6).fill(false),
    // the relay turns off
    relayState: new Array(6).fill(false),
  });

  // turn pushbutton 1 off, disabling the relay - step 2
  switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
    buttonStates: { 1: false },
    relayStates: { 1: false },
  });
  potentials = roblgorithm({
    programAdjacencyList,
    resistorAdjacencyList,
    switchAdjacencyList,
  });
  expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
    // light 1 turns off, light 2 turns on
    outputLightState: [false, true, ...new Array(4).fill(false)],
    relayLightState: new Array(6).fill(false),
    // the relay stays off
    relayState: new Array(6).fill(false),
  });
});
