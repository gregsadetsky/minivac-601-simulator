import type {
  AdjacencyList,
  Potentials,
  LightStates,
  RelayStates,
  NodeName,
  PushbuttonStates,
} from "./simulator.t";

const LOGGING = false;
// @ts-ignore -- log is used sporadically, so don't warn about it when it's not used
function log(...args: any[]) {
  if (LOGGING) {
    console.log(...args);
  }
}

export function unDigitifyPolarityNodes(nodeName: NodeName): string {
  return nodeName.replace(/\d([\+\-])/, "$1");
}

export function programToAdjacencyList(program: string): AdjacencyList {
  let adjacencyList: AdjacencyList = {};
  program
    .trim()
    .split("\n")
    .forEach((line) => {
      let [from, to] = line.trim().split("/");

      // @jryio: "all polarities are one." (not exact quote)
      from = unDigitifyPolarityNodes(from);
      to = unDigitifyPolarityNodes(to);

      if (!adjacencyList[from]) {
        // connections are sets i.e. are unique and unordered
        adjacencyList[from] = new Set();
      }
      if (!adjacencyList[to]) {
        adjacencyList[to] = new Set();
      }
      adjacencyList[from].add(to);
      adjacencyList[to].add(from);
    });

  return adjacencyList;
}

export function getResistorAdjacencyList(
  programAdjacencyList: AdjacencyList,
): AdjacencyList {
  let resistorAdjacencyList: Record<string, Set<string>> = {};

  // go through programAdjacencyList
  // add keys to set of nodes
  // also add all values to set of nodes
  let nodes = new Set<string>();
  Object.keys(programAdjacencyList).forEach((node) => {
    nodes.add(node);
    programAdjacencyList[node].forEach((neighbor) => {
      nodes.add(neighbor);
    });
  });

  // then go through nodes and find resistive connections
  // which are -> .A .B, .C .E, .E .F, .C .F
  // i.e. if 1A and 1B are there, add 1A: [1B] and 1B: [1A] to resistorAdjacencyList
  for (let relayIdx = 1; relayIdx <= 6; relayIdx++) {
    if (nodes.has(`${relayIdx}A`) && nodes.has(`${relayIdx}B`)) {
      resistorAdjacencyList[`${relayIdx}A`] = new Set([`${relayIdx}B`]);
      resistorAdjacencyList[`${relayIdx}B`] = new Set([`${relayIdx}A`]);
    }
    // (C) light (E) coil (F) possibilities:
    // - only C E
    // - only E F
    // - only C F (specially handled above to add CE and EF)
    // - C E F (will be added by CE and EF cases as well)
    if (
      nodes.has(`${relayIdx}C`) &&
      nodes.has(`${relayIdx}F`) &&
      !nodes.has(`${relayIdx}E`)
    ) {
      resistorAdjacencyList[`${relayIdx}C`] = new Set([`${relayIdx}E`]);
      resistorAdjacencyList[`${relayIdx}E`] = new Set([
        `${relayIdx}C`,
        `${relayIdx}F`,
      ]);
      resistorAdjacencyList[`${relayIdx}F`] = new Set([`${relayIdx}E`]);
    } else {
      if (nodes.has(`${relayIdx}C`) && nodes.has(`${relayIdx}E`)) {
        resistorAdjacencyList[`${relayIdx}C`] = new Set([`${relayIdx}E`]);
        resistorAdjacencyList[`${relayIdx}E`] = new Set([`${relayIdx}C`]);
      }
      if (nodes.has(`${relayIdx}E`) && nodes.has(`${relayIdx}F`)) {
        // E potentially already exists as a set since we just handled CE
        // and might have created it
        if (!resistorAdjacencyList[`${relayIdx}E`]) {
          resistorAdjacencyList[`${relayIdx}E`] = new Set();
        }
        resistorAdjacencyList[`${relayIdx}E`].add(`${relayIdx}F`);
        resistorAdjacencyList[`${relayIdx}F`] = new Set([`${relayIdx}E`]);
      }
    }
  }

  // TODO: motor!
  // TODO: motor!
  // TODO: motor!

  return resistorAdjacencyList;
}

// TODO test
// TODO test
// TODO test
export function getButtonSwitchRelayAdjacencyList({
  buttonStates,
  relayStates,
}: {
  buttonStates: PushbuttonStates;
  // TODO switchStates: boolean[],
  relayStates: RelayStates;
}): AdjacencyList {
  let switchAdjacencyList: AdjacencyList = {};
  for (let relayIdx = 1; relayIdx <= 6; relayIdx++) {
    // buttons
    if (buttonStates[relayIdx - 1] === true) {
      // connect the 'normally open' X Y nodes
      switchAdjacencyList[`${relayIdx}X`] = new Set([`${relayIdx}Y`]);
      switchAdjacencyList[`${relayIdx}Y`] = new Set([`${relayIdx}X`]);
    } else if (buttonStates[relayIdx - 1] === false) {
      // connect the 'normally closed' Y Z nodes
      switchAdjacencyList[`${relayIdx}Y`] = new Set([`${relayIdx}Z`]);
      switchAdjacencyList[`${relayIdx}Z`] = new Set([`${relayIdx}Y`]);
    }

    // relays
    // if relay state is true (normally open), connect G H and K L
    // if relay state is false (normally closed), connect H J and L N
    // NB this does potentially generate ''spurious'' i.e. potentially disconnected
    // nodes i.e. if circuit uses only H J nodes or H J G but not
    // K / L / N nodes, the L-K and/or L-N connections will still be generated
    // this should not matter.
    if (relayStates[relayIdx - 1] === true) {
      switchAdjacencyList[`${relayIdx}G`] = new Set([`${relayIdx}H`]);
      switchAdjacencyList[`${relayIdx}H`] = new Set([`${relayIdx}G`]);
      switchAdjacencyList[`${relayIdx}K`] = new Set([`${relayIdx}L`]);
      switchAdjacencyList[`${relayIdx}L`] = new Set([`${relayIdx}K`]);
    } else if (relayStates[relayIdx - 1] === false) {
      switchAdjacencyList[`${relayIdx}H`] = new Set([`${relayIdx}J`]);
      switchAdjacencyList[`${relayIdx}J`] = new Set([`${relayIdx}H`]);
      switchAdjacencyList[`${relayIdx}L`] = new Set([`${relayIdx}N`]);
      switchAdjacencyList[`${relayIdx}N`] = new Set([`${relayIdx}L`]);
    }

    // TODO support switches
    // TODO support switches
    // TODO support switches
  }

  return switchAdjacencyList;
}

export function mergeAdjancencyLists(
  adjacencyLists: AdjacencyList[],
): AdjacencyList {
  let merged: AdjacencyList = {};
  adjacencyLists.forEach((list) => {
    Object.keys(list).forEach((node) => {
      if (!merged[node]) {
        merged[node] = new Set();
      }
      // extend the set
      merged[node] = new Set([...merged[node], ...list[node]]);
    });
  });
  return merged;
}

// TODO test
// TODO test
// TODO test
function findConnectedComponent(
  node: string,
  adjacencyLists: AdjacencyList[],
): string[] {
  let merged = mergeAdjancencyLists(adjacencyLists);
  // if you are at 1E for example 'between' 1C and 1F,
  // you are not ""connected to anything"" i.e. there are no other
  // components with the same potential.
  if (!merged[node]) {
    return [node];
  }

  let connectedComponent: string[] = [];
  let unexploredNodes = [node];
  while (unexploredNodes.length > 0) {
    let node = unexploredNodes.pop()!;
    if (connectedComponent.includes(node)) {
      continue;
    }
    connectedComponent.push(node);
    unexploredNodes.push(...merged[node]);
  }
  return connectedComponent;
}

// TODO test
// TODO test
// TODO test
// TODO test
// TODO test
function canResistorOtherSideReachPlus(
  originalResistor: NodeName,
  otherSideNode: NodeName,
  adjacencyLists: AdjacencyList[],
): boolean {
  let otherNode = "+";
  let merged = mergeAdjancencyLists(adjacencyLists);
  let unexploredNodes = [otherSideNode];
  let visitedNodes = new Set<string>();
  while (unexploredNodes.length > 0) {
    let node = unexploredNodes.pop()!;
    if (visitedNodes.has(node)) {
      continue;
    }
    visitedNodes.add(node);
    if (node === otherNode) {
      return true;
    }

    const connectedNodes = merged[node];
    // don't go back 'through' original node
    if (node === otherSideNode && connectedNodes.has(originalResistor)) {
      connectedNodes.delete(originalResistor);
    }

    unexploredNodes.push(...connectedNodes);
  }
  return false;
}

// TODO test
// TODO test
// TODO test
export function getResistanceMirrorNodes(
  node: NodeName,
  resistorAdjacencyList: AdjacencyList,
): NodeName[] {
  // for light, return A when passed B, and vice-versa
  // for relay, for C return E, for F return E
  // for E, return C and/or F based on whether C and/or F are present

  // light
  if (node.endsWith("A")) {
    return [node.replace("A", "B")];
  }
  if (node.endsWith("B")) {
    return [node.replace("B", "A")];
  }
  // relay
  if (node.endsWith("C")) {
    return [node.replace("C", "E")];
  }
  if (node.endsWith("F")) {
    return [node.replace("F", "E")];
  }
  if (node.endsWith("E")) {
    // if C and F are present, return both
    let mirrorNodesOut: NodeName[] = [];
    if (resistorAdjacencyList[node].has(node.replace("E", "C"))) {
      mirrorNodesOut.push(node.replace("E", "C"));
    }
    if (resistorAdjacencyList[node].has(node.replace("E", "F"))) {
      mirrorNodesOut.push(node.replace("E", "F"));
    }
    return mirrorNodesOut;
  }

  return [];
}

// the roblgorithm takes the graph connections i.e.
// the adjacency lists
// and TODO the input (pushbutton) and current-relay state TODO
// and returns the 'new' potentials aka does a 'round' of simulation
// roblgorithm by @robsimmons
export function roblgorithm({
  programAdjacencyList,
  resistorAdjacencyList,
  switchAdjacencyList,
}: {
  programAdjacencyList: AdjacencyList;
  resistorAdjacencyList: AdjacencyList;
  switchAdjacencyList: AdjacencyList;
}): Potentials {
  /*
    set initial potential to 0
    set initial list of unexplored points to node -
    have a copy of all of the node names and their respective potential
    while there's an unexplored point:
      pick one point
      find all nodes in the same connected component on the graph consisting of programAdjacencyList + switchAdjacencyList (merged)
      give all of those nodes potential P
      ... see below
  */

  let iteration = 0;

  let potential = 0;
  // store a set of unexplored nodes, start with '-' only
  let unexploredNodes = new Set(["-"]);
  let visitedNodes = new Set<string>();
  let potentials: Record<string, number> = {};
  while (unexploredNodes.size > 0) {
    if (iteration++ > 100) {
      throw new Error("too many iterations");
    }

    // get any node from the set and delete it from the set
    let node = unexploredNodes.values().next().value;
    unexploredNodes.delete(node);

    // if we've already visited this node, skip it
    if (visitedNodes.has(node)) {
      continue;
    }
    visitedNodes.add(node);

    // set potential at node
    potentials[node] = Math.max(potentials[node] || 0, potential);

    let connectedComponent = findConnectedComponent(node, [
      programAdjacencyList,
      switchAdjacencyList,
    ]);

    connectedComponent.forEach((connectedNode) => {
      potentials[connectedNode] = Math.max(
        potentials[connectedNode] || 0,
        potential,
      );
    });

    /*
      find all of the resistors connected to all of the nodes in the connected component
      (resistors are elements in the resistorAdjacencyList)
      for each resistor:
        graph search to see if the other side of the resistor connects to +
        if not connected, ignore
        if the other side of the resistor does connect to +, mark the other side with potential P+1 and add that other side to the list of unexplored points
    */

    let resistors = connectedComponent.filter((node) =>
      Object.keys(resistorAdjacencyList).includes(node),
    );

    resistors.forEach((resistor) => {
      // find the other side(S) of the resistor

      getResistanceMirrorNodes(resistor, resistorAdjacencyList).forEach(
        (otherSide) => {
          // does other side already have a potential? if so, ignore (I think)
          if (potentials[otherSide] !== undefined) {
            return;
          }

          // can otherSide get to a '+'? if not, ignore it
          let canGetToPlus = canResistorOtherSideReachPlus(
            resistor,
            otherSide,
            [programAdjacencyList, resistorAdjacencyList, switchAdjacencyList],
          );

          if (!canGetToPlus) {
            return;
          }

          // set the potential of the other side to the max
          // of the potential there if it's set, or otherwise potential+1
          potentials[otherSide] = Math.max(
            potentials[otherSide] || 0,
            potential + 1,
          );
          unexploredNodes.add(otherSide);
        },
      );
    });

    potential++;
  }
  return potentials;
}

export function computeOutputStateFromPotentials(potentials: Potentials): {
  outputLightStates: LightStates;
  relayLightStates: LightStates;
  relayStates: RelayStates;
} {
  // find all resistor nodes in the potentials list
  // if potential across them is different, set the corresponding output state
  // a potential across A-B is a light
  // a potential across C E is the relay light,
  // a potential across E F is a relay.
  // (we pre-process the program graph to always generate CE + EF connections
  // when only given CF)

  // enabled when potential across A B
  let outputLightStates: LightStates = new Array(6).fill(false);
  // enabled when potential across C E or C F
  let relayLightStates: LightStates = new Array(6).fill(false);
  // enabled when potential across E F or C F
  let relayStates: RelayStates = new Array(6).fill(false);

  for (let relayIdx = 1; relayIdx <= 6; relayIdx++) {
    let a = potentials[`${relayIdx}A`];
    let b = potentials[`${relayIdx}B`];
    let c = potentials[`${relayIdx}C`];
    let e = potentials[`${relayIdx}E`];
    let f = potentials[`${relayIdx}F`];

    // if potential across A B is different, set the corresponding output state
    if (a !== undefined && b !== undefined && a !== b) {
      outputLightStates[relayIdx - 1] = true;
    }

    // if potential across C E is different, set the corresponding relay light state
    if (c !== undefined && e !== undefined && c !== e) {
      relayLightStates[relayIdx - 1] = true;
    }

    // if potential across E F is different, set the corresponding relay state
    if (e !== undefined && f !== undefined && e !== f) {
      relayStates[relayIdx - 1] = true;
    }
  }

  return {
    outputLightStates,
    relayLightStates,
    relayStates,
  };
}
