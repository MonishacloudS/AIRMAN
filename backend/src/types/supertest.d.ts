declare module "supertest" {
  import { Application } from "express";
  function request(app: Application): {
    get(url: string): unknown;
    post(url: string): unknown;
    patch(url: string): unknown;
    put(url: string): unknown;
    delete(url: string): unknown;
  };
  export = request;
}
