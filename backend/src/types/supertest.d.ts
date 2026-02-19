declare module "supertest" {
  const request: (app: import("express").Application) => any;
  export = request;
}
