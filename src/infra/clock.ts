// NIB-M-INFRA-UTILS — clock. Stubs only.

export interface Clock {
  nowWall(): Date;
  nowWallIso(): string;
  nowMono(): number;
}

export const defaultClock: Clock = {
  nowWall: (): Date => {
    throw new Error('Not implemented');
  },
  nowWallIso: (): string => {
    throw new Error('Not implemented');
  },
  nowMono: (): number => {
    throw new Error('Not implemented');
  },
};
