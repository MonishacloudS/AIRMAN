declare module "supertest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- type stub when @types/supertest not resolved
  const request: (app: import("express").Application) => any;
  export = request;
}
