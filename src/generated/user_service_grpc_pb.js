// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var user_service_pb = require('./user_service_pb.js');

function serialize_user_CreateUserRequest(arg) {
  if (!(arg instanceof user_service_pb.CreateUserRequest)) {
    throw new Error('Expected argument of type user.CreateUserRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_user_CreateUserRequest(buffer_arg) {
  return user_service_pb.CreateUserRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_user_DeleteUserRequest(arg) {
  if (!(arg instanceof user_service_pb.DeleteUserRequest)) {
    throw new Error('Expected argument of type user.DeleteUserRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_user_DeleteUserRequest(buffer_arg) {
  return user_service_pb.DeleteUserRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_user_DeleteUserResponse(arg) {
  if (!(arg instanceof user_service_pb.DeleteUserResponse)) {
    throw new Error('Expected argument of type user.DeleteUserResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_user_DeleteUserResponse(buffer_arg) {
  return user_service_pb.DeleteUserResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_user_GetUserRequest(arg) {
  if (!(arg instanceof user_service_pb.GetUserRequest)) {
    throw new Error('Expected argument of type user.GetUserRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_user_GetUserRequest(buffer_arg) {
  return user_service_pb.GetUserRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_user_UpdateUserRequest(arg) {
  if (!(arg instanceof user_service_pb.UpdateUserRequest)) {
    throw new Error('Expected argument of type user.UpdateUserRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_user_UpdateUserRequest(buffer_arg) {
  return user_service_pb.UpdateUserRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_user_UserResponse(arg) {
  if (!(arg instanceof user_service_pb.UserResponse)) {
    throw new Error('Expected argument of type user.UserResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_user_UserResponse(buffer_arg) {
  return user_service_pb.UserResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var UserServiceService = exports.UserServiceService = {
  createUser: {
    path: '/user.UserService/CreateUser',
    requestStream: false,
    responseStream: false,
    requestType: user_service_pb.CreateUserRequest,
    responseType: user_service_pb.UserResponse,
    requestSerialize: serialize_user_CreateUserRequest,
    requestDeserialize: deserialize_user_CreateUserRequest,
    responseSerialize: serialize_user_UserResponse,
    responseDeserialize: deserialize_user_UserResponse,
  },
  getUser: {
    path: '/user.UserService/GetUser',
    requestStream: false,
    responseStream: false,
    requestType: user_service_pb.GetUserRequest,
    responseType: user_service_pb.UserResponse,
    requestSerialize: serialize_user_GetUserRequest,
    requestDeserialize: deserialize_user_GetUserRequest,
    responseSerialize: serialize_user_UserResponse,
    responseDeserialize: deserialize_user_UserResponse,
  },
  updateUser: {
    path: '/user.UserService/UpdateUser',
    requestStream: false,
    responseStream: false,
    requestType: user_service_pb.UpdateUserRequest,
    responseType: user_service_pb.UserResponse,
    requestSerialize: serialize_user_UpdateUserRequest,
    requestDeserialize: deserialize_user_UpdateUserRequest,
    responseSerialize: serialize_user_UserResponse,
    responseDeserialize: deserialize_user_UserResponse,
  },
  deleteUser: {
    path: '/user.UserService/DeleteUser',
    requestStream: false,
    responseStream: false,
    requestType: user_service_pb.DeleteUserRequest,
    responseType: user_service_pb.DeleteUserResponse,
    requestSerialize: serialize_user_DeleteUserRequest,
    requestDeserialize: deserialize_user_DeleteUserRequest,
    responseSerialize: serialize_user_DeleteUserResponse,
    responseDeserialize: deserialize_user_DeleteUserResponse,
  },
};

exports.UserServiceClient = grpc.makeGenericClientConstructor(UserServiceService, 'UserService');
