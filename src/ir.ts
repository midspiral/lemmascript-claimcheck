// Minimal shape of the `lsc extract` JSON that this tool reads. LemmaScript's
// full Raw IR (rawir.ts) has many more fields; we declare only what we consume,
// so the package depends on the stable `lsc extract` output contract rather than
// on LemmaScript's source layout. `contract` is present since lemmascript 0.5.7.
export interface RawParam {
  name: string;
  tsType: string;
}

export interface RawFunction {
  name: string;
  typeParams: string[];
  params: RawParam[];
  returnType: string;
  requires: string[];
  ensures: string[];
  contract: string[];
}

export interface RawModule {
  functions: RawFunction[];
}
