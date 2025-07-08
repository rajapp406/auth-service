import { createUser } from "./modules/user/user.grpc.client";

async function testGrpcClient() {
  console.log("🚀 Starting gRPC client test...");
  
  const testUser = {
    firstName: "Test",
    lastName: "User",
    email: `test-${Date.now()}@example.com`
  };

  console.log("📤 Sending user data:", testUser);
  
  try {
    const response = await createUser(testUser);
    console.log("✅ Success! Response from user service:", response);
  } catch (error: any) {
    console.error("❌ Error calling user service:", error.message);
    if (error.details) {
      console.error("Error details:", error.details);
    }
  }
}

testGrpcClient();
