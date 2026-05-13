export type JwtPayload = {
  sub: string;
  sid: string;
  org: string;
  branch?: string | undefined;
  role: string;
};
