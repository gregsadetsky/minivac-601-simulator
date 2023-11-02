// TODO define key as type that will only match
// actual minivac node names?? can types be regexes?
// and/or do https://stackoverflow.com/a/68526558 ?

export type AdjacencyList = Record<string, Set<string>>;

export type Potentials = Record<string, number>;

// {1: true, 2: false, etc.}
export type PushbuttonState = Record<number, boolean>;
// switches are just permanent pushbuttons, but still human operated
export type SwitchState = PushbuttonState;

export type RelayState = Record<number, boolean>;
export type LightState = Record<number, boolean>;

export type NodeName = string;
