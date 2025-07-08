// GENERATED CODE -- DO NOT EDIT!

// package: user
// file: user_service.proto

import * as user_service_pb from "./user_service_pb";
import * as grpc from "@grpc/grpc-js";

interface IUserServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  createUser: grpc.MethodDefinition<user_service_pb.CreateUserRequest, user_service_pb.UserResponse>;
  getUser: grpc.MethodDefinition<user_service_pb.GetUserRequest, user_service_pb.UserResponse>;
  updateUser: grpc.MethodDefinition<user_service_pb.UpdateUserRequest, user_service_pb.UserResponse>;
  deleteUser: grpc.MethodDefinition<user_service_pb.DeleteUserRequest, user_service_pb.DeleteUserResponse>;
}

export const UserServiceService: IUserServiceService;

export interface IUserServiceServer extends grpc.UntypedServiceImplementation {
  createUser: grpc.handleUnaryCall<user_service_pb.CreateUserRequest, user_service_pb.UserResponse>;
  getUser: grpc.handleUnaryCall<user_service_pb.GetUserRequest, user_service_pb.UserResponse>;
  updateUser: grpc.handleUnaryCall<user_service_pb.UpdateUserRequest, user_service_pb.UserResponse>;
  deleteUser: grpc.handleUnaryCall<user_service_pb.DeleteUserRequest, user_service_pb.DeleteUserResponse>;
}

export class UserServiceClient extends grpc.Client {
  constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
  createUser(argument: user_service_pb.CreateUserRequest, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  createUser(argument: user_service_pb.CreateUserRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  createUser(argument: user_service_pb.CreateUserRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  getUser(argument: user_service_pb.GetUserRequest, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  getUser(argument: user_service_pb.GetUserRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  getUser(argument: user_service_pb.GetUserRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  updateUser(argument: user_service_pb.UpdateUserRequest, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  updateUser(argument: user_service_pb.UpdateUserRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  updateUser(argument: user_service_pb.UpdateUserRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.UserResponse>): grpc.ClientUnaryCall;
  deleteUser(argument: user_service_pb.DeleteUserRequest, callback: grpc.requestCallback<user_service_pb.DeleteUserResponse>): grpc.ClientUnaryCall;
  deleteUser(argument: user_service_pb.DeleteUserRequest, metadataOrOptions: grpc.Metadata | grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.DeleteUserResponse>): grpc.ClientUnaryCall;
  deleteUser(argument: user_service_pb.DeleteUserRequest, metadata: grpc.Metadata | null, options: grpc.CallOptions | null, callback: grpc.requestCallback<user_service_pb.DeleteUserResponse>): grpc.ClientUnaryCall;
}
