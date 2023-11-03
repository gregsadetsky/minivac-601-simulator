// TODO define key as type that will only match
// actual minivac node names?? can types be regexes?
// and/or do https://stackoverflow.com/a/68526558 ?

export type AdjacencyList = Record<string, Set<string>>;

export type Potentials = Record<string, number>;

// 6 booleans i.e. state per 'module'
export type PushbuttonStates = boolean[];
// switches are just permanent pushbuttons, but still human operated
export type SwitchStates = PushbuttonStates;

export type RelayStates = boolean[];
export type LightStates = boolean[];

export type NodeName = string;

export type SimulationStepOutput = {
  changedRelays: number[];
  outputLightStates: LightStates;
  relayLightStates: LightStates;
  relayStates: RelayStates;
};
