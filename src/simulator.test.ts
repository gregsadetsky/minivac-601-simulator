import { expect, test, describe } from "vitest";
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
import { MinivacSimulator } from "./minivac";

test("unDigitifyPolarityNodes", () => {
  expect(unDigitifyPolarityNodes("1+")).toBe("+");
  expect(unDigitifyPolarityNodes("1-")).toBe("-");
  expect(unDigitifyPolarityNodes("1X")).toBe("1X");
  expect(unDigitifyPolarityNodes("1A")).toBe("1A");
  expect(unDigitifyPolarityNodes("2X")).toBe("2X");
});

describe("programToAdjacencyList", () => {
  test("single light", () => {
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
  });

  test("C E, E F, C E F", () => {
    let out = programToAdjacencyList(`
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

    // test case of programToAdjacencyList receiving C E and see that
    // C E is there, test E F, test that it's there, then test C F
    // and check that it's unchanged....!!!! we should NOT
    // break up C F in the program adjacency list... we should break
    // them up in the getResistorAdjacencyList!!!!
    out = programToAdjacencyList(`
      1+/1C
      1F/1-
    `);
    expect(out).toStrictEqual({
      "+": new Set(["1C"]),
      "1C": new Set(["+"]),
      "1F": new Set(["-"]),
      "-": new Set(["1F"]),
    });
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
  const out = getResistorAdjacencyList({
    "+": new Set(["1C"]),
    "1C": new Set(["+"]),
    "1F": new Set(["-"]),
    "-": new Set(["1F"]),
  });
  expect(
    // test that getResistorAdjacencyList
    // breaks up CF into C E and E F resistors!!
    out,
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

test("computeOutputStateFromPotentials", () => {
  expect(
    // not a circuit i.e. a short, but ok whatever
    computeOutputStateFromPotentials({
      "+": 0,
      "-": 0,
    }),
  ).toStrictEqual({
    outputLightStates: new Array(6).fill(false),
    relayLightStates: new Array(6).fill(false),
    relayStates: new Array(6).fill(false),
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
    outputLightStates: [true, ...new Array(5).fill(false)],
    relayLightStates: new Array(6).fill(false),
    relayStates: new Array(6).fill(false),
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
    outputLightStates: [true, true, ...new Array(4).fill(false)],
    relayLightStates: new Array(6).fill(false),
    relayStates: new Array(6).fill(false),
  });
});

describe("roblgorithm", () => {
  // two buttons in OR formation,
  // when either one is pressed, light turns on, otherwise
  // light stays off
  test("2 buttons in OR formation - button is not pressed - check potentials", () => {
    const programAdjacencyList = programToAdjacencyList(`
      1+/1Y
      1X/1A
      1B/1-
      1Y/2Y
      2X/1X
    `);
    const resistorAdjacencyList =
      getResistorAdjacencyList(programAdjacencyList);
    const switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: new Array(6).fill(false),
      relayStates: new Array(6).fill(false),
    });
    const potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    expect(potentials).toStrictEqual({
      "-": 0,
      "1B": 0,
    });
  });

  test("2 buttons in OR formation - button is pressed - check potentials", () => {
    const programAdjacencyList = programToAdjacencyList(`
      1+/1Y
      1X/1A
      1B/1-
      1Y/2Y
      2X/1X
    `);
    const resistorAdjacencyList =
      getResistorAdjacencyList(programAdjacencyList);
    const switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: [true, ...new Array(5).fill(false)],
      relayStates: new Array(6).fill(false),
    });
    const potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    expect(potentials).toStrictEqual({
      "-": 0,
      "1B": 0,
      "1A": 1,
      "1X": 1,
      "1Y": 1,
      "2Y": 1,
      "2Z": 1,
      "+": 1,
      "2X": 1,
    });
  });

  test("2 buttons in OR formation - button is pressed - check output state", () => {
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
      buttonStates: [true, ...new Array(5).fill(false)],
      relayStates: new Array(6).fill(false),
    });
    let potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });

    expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
      outputLightStates: [true, ...new Array(5).fill(false)],
      relayLightStates: new Array(6).fill(false),
      relayStates: new Array(6).fill(false),
    });
  });
});

describe("roblgorithm - circuits", () => {
  test("a circuit with a relay!! pdf p.17", () => {
    let programAdjacencyList = programToAdjacencyList(`
      1+/1Y
      1X/1E
      1F/1-
      1+/1H
      1J/2A
      2B/2-
      1G/1A
      1B/1-
    `);
    let resistorAdjacencyList = getResistorAdjacencyList(programAdjacencyList);
    let switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: new Array(6).fill(false),
      relayStates: new Array(6).fill(false),
    });
    let potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
      // normally closed - 1H connects to 1J, light 2 turns on
      outputLightStates: [false, true, ...new Array(4).fill(false)],
      relayLightStates: new Array(6).fill(false),
      relayStates: new Array(6).fill(false),
    });

    // turn pushbutton 1 on, enabling the relay - step 1
    // the relay will show as on, but the relay arms have not moved yet
    switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: [true, ...new Array(5).fill(false)],
      relayStates: new Array(6).fill(false),
    });
    potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });

    let computedState = computeOutputStateFromPotentials(potentials);
    expect(computedState).toStrictEqual({
      outputLightStates: [false, true, ...new Array(4).fill(false)],
      relayLightStates: new Array(6).fill(false),
      // the relay turns on!!!!!!
      relayStates: [true, ...new Array(5).fill(false)],
    });

    // turn pushbutton 1 on, enabling the relay - step 2
    switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: [true, ...new Array(5).fill(false)],
      relayStates: computedState.relayStates,
    });
    potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    computedState = computeOutputStateFromPotentials(potentials);
    expect(computedState).toStrictEqual({
      // light 1 turns on, light 2 turns off
      outputLightStates: [true, false, ...new Array(4).fill(false)],
      relayLightStates: new Array(6).fill(false),
      // the relay is still on
      relayStates: [true, ...new Array(5).fill(false)],
    });

    // turn pushbutton 1 off, disabling the relay - step 1
    switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: new Array(6).fill(false),
      relayStates: computedState.relayStates,
    });
    potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    computedState = computeOutputStateFromPotentials(potentials);
    expect(computedState).toStrictEqual({
      // light 1 is still on, light 2 is still off
      outputLightStates: [true, false, ...new Array(4).fill(false)],
      relayLightStates: new Array(6).fill(false),
      // the relay turns off
      relayStates: new Array(6).fill(false),
    });

    // turn pushbutton 1 off, disabling the relay - step 2
    switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: new Array(6).fill(false),
      relayStates: computedState.relayStates,
    });
    potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
      // light 1 turns off, light 2 turns on
      outputLightStates: [false, true, ...new Array(4).fill(false)],
      relayLightStates: new Array(6).fill(false),
      // the relay stays off
      relayStates: new Array(6).fill(false),
    });
  });

  test("a relay controls another, pdf p.18", () => {
    let programAdjacencyList = programToAdjacencyList(`
      1+/1Y
      1X/1C
      1F/1-
      1+/1H
      1G/2C
      2F/2-
      2+/2H
      2G/2A
      2B/2-
    `);
    let resistorAdjacencyList = getResistorAdjacencyList(programAdjacencyList);
    let switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates: [true, ...new Array(5).fill(false)],
      relayStates: new Array(6).fill(false),
    });
    let potentials = roblgorithm({
      programAdjacencyList,
      resistorAdjacencyList,
      switchAdjacencyList,
    });
    expect(computeOutputStateFromPotentials(potentials)).toStrictEqual({
      outputLightStates: new Array(6).fill(false),
      relayLightStates: [true, ...new Array(5).fill(false)],
      relayStates: [true, ...new Array(5).fill(false)],
    });
  });
});

describe("Minivac class", () => {
  test("basic class usage works", () => {
    const m = new MinivacSimulator(`
      1+/1Y
      1X/1A
      1-/1B
    `);
    // no buttons pressed, lights stay off
    expect(m.simulationStep(new Array(6).fill(false))).toStrictEqual({
      changedRelays: [],
      outputLightStates: new Array(6).fill(false),
      relayLightStates: new Array(6).fill(false),
      relayStates: new Array(6).fill(false),
    });

    // press a button, see light turn on
    expect(m.simulationStep([true, ...new Array(5).fill(false)])).toStrictEqual(
      {
        changedRelays: [],
        outputLightStates: [true, ...new Array(5).fill(false)],
        relayLightStates: new Array(6).fill(false),
        relayStates: new Array(6).fill(false),
      },
    );
  });

  test("one relay controls another, pdf p.18", () => {
    const m = new MinivacSimulator(`
      1+/1Y
      1X/1C
      1F/1-
      1+/1H
      1G/2C
      2F/2-
      2+/2H
      2G/2A
      2B/2-
    `);
    // no buttons pressed, lights stay off
    expect(m.simulationStep(new Array(6).fill(false))).toStrictEqual({
      changedRelays: [],
      outputLightStates: new Array(6).fill(false),
      relayLightStates: new Array(6).fill(false),
      relayStates: new Array(6).fill(false),
    });
    // press button, relay light 1 and coil 1 turn on
    expect(m.simulationStep([true, ...new Array(5).fill(false)])).toStrictEqual(
      {
        changedRelays: [0],
        outputLightStates: new Array(6).fill(false),
        relayLightStates: [true, ...new Array(5).fill(false)],
        relayStates: [true, ...new Array(5).fill(false)],
      },
    );
    // another simulation step -> light 2 and coil 2 turn on
    expect(m.simulationStep([true, ...new Array(5).fill(false)])).toStrictEqual(
      {
        changedRelays: [1],
        outputLightStates: new Array(6).fill(false),
        relayLightStates: [true, true, ...new Array(4).fill(false)],
        relayStates: [true, true, ...new Array(4).fill(false)],
      },
    );
    // another simulation step -> output light 2 turns on
    expect(m.simulationStep([true, ...new Array(5).fill(false)])).toStrictEqual(
      {
        changedRelays: [],
        outputLightStates: [false, true, ...new Array(4).fill(false)],
        relayLightStates: [true, true, ...new Array(4).fill(false)],
        relayStates: [true, true, ...new Array(4).fill(false)],
      },
    );
    // another simulation step -- no change
    expect(m.simulationStep([true, ...new Array(5).fill(false)])).toStrictEqual(
      {
        changedRelays: [],
        outputLightStates: [false, true, ...new Array(4).fill(false)],
        relayLightStates: [true, true, ...new Array(4).fill(false)],
        relayStates: [true, true, ...new Array(4).fill(false)],
      },
    );
  });
});
