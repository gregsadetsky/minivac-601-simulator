import type {
  AdjacencyList,
  RelayStates,
  PushbuttonStates,
  SimulationStepOutput,
} from "./simulator.t.ts";

import {
  programToAdjacencyList,
  getResistorAdjacencyList,
  getButtonSwitchRelayAdjacencyList,
  roblgorithm,
  computeOutputStateFromPotentials,
} from "./simulator.ts";

export class MinivacSimulator {
  programAdjacencyList: AdjacencyList;
  resistorAdjacencyList: AdjacencyList;
  relayStates: RelayStates = new Array(6).fill(false);

  constructor(program: string) {
    this.programAdjacencyList = programToAdjacencyList(program);
    this.resistorAdjacencyList = getResistorAdjacencyList(
      this.programAdjacencyList,
    );
  }

  simulationStep(buttonStates: PushbuttonStates): SimulationStepOutput {
    const switchAdjacencyList = getButtonSwitchRelayAdjacencyList({
      buttonStates,
      relayStates: this.relayStates,
    });
    const potentials = roblgorithm({
      programAdjacencyList: this.programAdjacencyList,
      resistorAdjacencyList: this.resistorAdjacencyList,
      switchAdjacencyList,
    });
    const outputState = computeOutputStateFromPotentials(potentials);
    // compute delta of relays i.e. which relays have switched states?
    let changedRelays = [];
    for (let i = 0; i < 6; i++) {
      if (this.relayStates[i] !== outputState.relayStates[i]) {
        changedRelays.push(i);
      }
    }
    this.relayStates = outputState.relayStates;

    return {
      changedRelays,
      ...outputState,
    };
  }
}
