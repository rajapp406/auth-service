import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { join } from "path";

const PROTO_PATH = join(__dirname, "protos/user_service.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const userProto = grpc.loadPackageDefinition(packageDefinition).user;

export const createUserClient = () => {
  return new (userProto as any).UserService(
    "localhost:50054", // Connect to local user service
    grpc.credentials.createInsecure()
  );
};

export const createUser = (userData: {
  firstName: string;
  lastName: string;
  email: string;
}) => {
  return new Promise((resolve, reject) => {
    const client = createUserClient();
    console.log("Sending user data:", userData);
    client.createUser(userData, (error: any, response: any) => {
      if (error) {
        console.error("gRPC Error:", error);
        reject(error);
        return;
      }
      resolve(response);
    });
  });
};
