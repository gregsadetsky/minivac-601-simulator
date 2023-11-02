import type { AdjacencyList } from "./simulator.t";

export function unDigitifyPolarityNodes(nodeName: string): string {
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
        adjacencyList[from] = [];
      }
      if (!adjacencyList[to]) {
        adjacencyList[to] = [];
      }
      adjacencyList[from].push(to);
      adjacencyList[to].push(from);
    });
  return adjacencyList;
}

export function getResistorAdjacencyList(
  programAdjacencyList: AdjacencyList,
): AdjacencyList {
  let resistorAdjacencyList: Record<string, string[]> = {};

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
      resistorAdjacencyList[`${relayIdx}A`] = [`${relayIdx}B`];
      resistorAdjacencyList[`${relayIdx}B`] = [`${relayIdx}A`];
    }
    // (C) light (E) coil (F) possibilities:
    // - only C E
    // - only E F
    // - only C F (will only be added if no E)
    // - C E F (will be added by CE and EF cases)
    if (nodes.has(`${relayIdx}C`) && nodes.has(`${relayIdx}E`)) {
      resistorAdjacencyList[`${relayIdx}C`] = [`${relayIdx}E`];
      resistorAdjacencyList[`${relayIdx}E`] = [`${relayIdx}C`];
    }
    if (nodes.has(`${relayIdx}E`) && nodes.has(`${relayIdx}F`)) {
      resistorAdjacencyList[`${relayIdx}E`] = [`${relayIdx}F`];
      resistorAdjacencyList[`${relayIdx}F`] = [`${relayIdx}E`];
    }
    // if C and F but not E, then C F
    if (
      nodes.has(`${relayIdx}C`) &&
      nodes.has(`${relayIdx}F`) &&
      !nodes.has(`${relayIdx}E`)
    ) {
      resistorAdjacencyList[`${relayIdx}C`] = [`${relayIdx}F`];
      resistorAdjacencyList[`${relayIdx}F`] = [`${relayIdx}C`];
    }
  }

  // TODO: motor!
  // TODO: motor!
  // TODO: motor!

  return resistorAdjacencyList;
}

export function getSwitchAdjacencyList(switchStates: boolean[]): AdjacencyList {
  let switchAdjacencyList: AdjacencyList = {};
  for (let relayIdx = 1; relayIdx <= switchStates.length; relayIdx++) {
    if (!switchStates[relayIdx - 1]) {
      // connect the 'normally closed' Y Z nodes
      switchAdjacencyList[`${relayIdx}Y`] = [`${relayIdx}Z`];
      switchAdjacencyList[`${relayIdx}Z`] = [`${relayIdx}Y`];
    } else {
      // connect the 'normally open' X Y nodes
      switchAdjacencyList[`${relayIdx}X`] = [`${relayIdx}Y`];
      switchAdjacencyList[`${relayIdx}Y`] = [`${relayIdx}X`];
    }
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
        merged[node] = [];
      }
      merged[node].push(...list[node]);
    });
  });
  return merged;
}

// TODO test
function findConnectedComponent(
  node: string,
  adjacencyList: AdjacencyList,
): string[] {
  let connectedComponent: string[] = [];
  let unexploredNodes = [node];
  while (unexploredNodes.length > 0) {
    let node = unexploredNodes.pop()!;
    if (connectedComponent.includes(node)) {
      continue;
    }
    connectedComponent.push(node);
    unexploredNodes.push(...adjacencyList[node]);
  }
  return connectedComponent;
}

// TODO test
function canNodeReachOtherNodeInMergedLists(
  node: string,
  otherNode: string,
  adjacencyLists: AdjacencyList[],
): boolean {
  let merged = mergeAdjancencyLists(adjacencyLists);
  let unexploredNodes = [node];
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
    unexploredNodes.push(...merged[node]);
  }
  return false;
}

export function roblgorithm({
  programAdjacencyList,
  resistorAdjacencyList,
  switchAdjacencyList,
}: {
  programAdjacencyList: AdjacencyList;
  resistorAdjacencyList: AdjacencyList;
  switchAdjacencyList: AdjacencyList;
}): Record<string, number> {
  // roblgorithm by @robsimmons
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
    if (iteration++ > 10) {
      throw new Error("too many iterations");
    }

    console.log("unexploredNodes", unexploredNodes);

    // get any node from the set and delete it from the set
    let node = unexploredNodes.values().next().value;
    unexploredNodes.delete(node);

    console.log("node", node);

    // if we've already visited this node, skip it
    if (visitedNodes.has(node)) {
      console.log("skipping", node);
      continue;
    }
    visitedNodes.add(node);

    // set potential at node
    potentials[node] = Math.max(potentials[node] || 0, potential);

    let connectedComponent = findConnectedComponent(
      node,
      mergeAdjancencyLists([programAdjacencyList, switchAdjacencyList]),
    );

    console.log("connectedComponent", connectedComponent);

    connectedComponent.forEach((connectedNode) => {
      console.log(
        "setting potential of",
        connectedNode,
        "to",
        Math.max(potentials[connectedNode] || 0, potential),
        "current value",
        potentials[connectedNode],
      );
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
    console.log("resistors", resistors);
    resistors.forEach((resistor) => {
      let otherSide = resistorAdjacencyList[resistor][0];

      // does other side already have a potential? if so, ignore (I think)
      if (potentials[otherSide] !== undefined) {
        return;
      }

      // ABSOLUTELY CHECK
      // GRAPH SEARCH:
      // can otherSide get to a '+'? if not, ignore it
      let canGetToPlus = canNodeReachOtherNodeInMergedLists(otherSide, "+", [
        programAdjacencyList,
        resistorAdjacencyList,
        switchAdjacencyList,
      ]);
      if (!canGetToPlus) {
        return;
      }

      // set the potential of the other side to the max
      // of the potential there if it's set, or otherwise potential+1
      console.log("setting potential of", otherSide, "to", potential + 1);
      potentials[otherSide] = Math.max(
        potentials[otherSide] || 0,
        potential + 1,
      );
      unexploredNodes.add(otherSide);
    });

    potential++;
  }
  console.log("potentials", potentials);
  return potentials;
}
